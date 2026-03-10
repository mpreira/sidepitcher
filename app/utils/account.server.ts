import crypto from "crypto";
import {
  authenticateAccountByEmail,
  createAccount,
  getAccountById,
  listAccountsForAdmin,
  renameAccount,
  updateAccountByAdmin,
  updateAccountCredentials,
  deleteAccountByAdmin,
  type AccountListItem,
  type Account,
} from "~/utils/database.server";

const ACCOUNT_COOKIE_NAME = "sp_account_id";
const ANONYMOUS_COOKIE_NAME = "sp_anon_session";
const ACCOUNT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ANONYMOUS_DATA_TTL_SECONDS = 60 * 60 * 24;

function toBase64Url(value: Buffer | string): string {
  const input = typeof value === "string" ? Buffer.from(value, "utf-8") : value;
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value + "=".repeat((4 - (value.length % 4 || 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function getAccountCookieSecret(): string {
  const secret = process.env.ACCOUNT_COOKIE_SECRET;
  if (secret && secret.trim().length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ACCOUNT_COOKIE_SECRET must be set in production and contain at least 32 chars.");
  }

  return "dev-only-account-cookie-secret-change-me-32+";
}

function signAccountId(accountId: string): string {
  const secret = getAccountCookieSecret();
  return toBase64Url(crypto.createHmac("sha256", secret).update(accountId).digest());
}

function buildSignedAccountCookieValue(accountId: string): string {
  const idPart = toBase64Url(accountId);
  const signature = signAccountId(accountId);
  return `${idPart}.${signature}`;
}

function parseSignedAccountCookieValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const idPart = raw.slice(0, dotIndex);
  const signaturePart = raw.slice(dotIndex + 1);
  if (!idPart || !signaturePart) return null;

  let accountId: string;
  try {
    accountId = fromBase64Url(idPart).toString("utf-8").trim();
  } catch {
    return null;
  }
  if (!accountId) return null;

  const expected = signAccountId(accountId);
  const providedBuf = Buffer.from(signaturePart, "utf-8");
  const expectedBuf = Buffer.from(expected, "utf-8");
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  return accountId;
}

export const ANONYMOUS_DATA_TTL_HOURS = 24;

export interface DataScope {
  scopeId: string;
  isAnonymous: boolean;
  account: Account | null;
  setCookieHeader?: string;
}

function parseCookies(headerValue: string | null): Record<string, string> {
  if (!headerValue) return {};

  return headerValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const separatorIndex = item.indexOf("=");
      if (separatorIndex <= 0) return acc;
      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();
      if (!key) return acc;
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

export function buildAccountCookie(accountId: string): string {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookieValue = buildSignedAccountCookieValue(accountId);
  return `${ACCOUNT_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCOUNT_COOKIE_MAX_AGE_SECONDS}${secureFlag}`;
}

function buildAnonymousSessionCookie(sessionId: string): string {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ANONYMOUS_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ANONYMOUS_DATA_TTL_SECONDS}${secureFlag}`;
}

function normalizeAnonymousSessionId(raw?: string): string | null {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  if (!/^[A-Za-z0-9-]{8,128}$/.test(normalized)) return null;
  return normalized;
}

export function buildAccountLogoutCookie(): string {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ACCOUNT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

export function buildAnonymousLogoutCookie(): string {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ANONYMOUS_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

export async function getConnectedAccountFromRequest(request: Request): Promise<Account | null> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const accountId = parseSignedAccountCookieValue(cookies[ACCOUNT_COOKIE_NAME]);
  if (!accountId) return null;
  return getAccountById(accountId);
}

export async function resolveDataScopeFromRequest(request: Request): Promise<DataScope> {
  const connectedAccount = await getConnectedAccountFromRequest(request);
  if (connectedAccount) {
    return {
      scopeId: connectedAccount.id,
      isAnonymous: false,
      account: connectedAccount,
    };
  }

  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const existingSession = normalizeAnonymousSessionId(cookies[ANONYMOUS_COOKIE_NAME]);

  if (existingSession) {
    return {
      scopeId: `anon:${existingSession}`,
      isAnonymous: true,
      account: null,
      setCookieHeader: buildAnonymousSessionCookie(existingSession),
    };
  }

  const generatedSession = crypto.randomUUID();
  return {
    scopeId: `anon:${generatedSession}`,
    isAnonymous: true,
    account: null,
    setCookieHeader: buildAnonymousSessionCookie(generatedSession),
  };
}

export async function createAndAssignAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  account: Account;
  setCookieHeaders: string[];
}> {
  const created = await createAccount(input);
  return {
    account: created.account,
    setCookieHeaders: [
      buildAccountCookie(created.account.id),
      buildAnonymousLogoutCookie(),
    ],
  };
}

export async function authenticateAndAssignAccount(input: {
  email: string;
  password: string;
}): Promise<{
  account: Account | null;
  setCookieHeaders: string[];
}> {
  const account = await authenticateAccountByEmail(input);
  if (!account) {
    return { account: null, setCookieHeaders: [] };
  }

  return {
    account,
    setCookieHeaders: [buildAccountCookie(account.id), buildAnonymousLogoutCookie()],
  };
}

export async function renameCurrentAccount(accountId: string, name: string): Promise<Account> {
  return renameAccount(accountId, name);
}

export async function listAdminAccounts(): Promise<AccountListItem[]> {
  return listAccountsForAdmin();
}

export async function updateManagedAccount(input: {
  accountId: string;
  name?: string;
  email?: string;
  password?: string;
  isAdmin?: boolean;
}): Promise<Account> {
  return updateAccountByAdmin(input);
}

export async function updateCurrentAccountProfile(input: {
  accountId: string;
  email: string;
  currentPassword?: string;
  password?: string;
}): Promise<Account> {
  return updateAccountCredentials(input);
}

export async function deleteManagedAccount(accountId: string): Promise<void> {
  return deleteAccountByAdmin(accountId);
}
