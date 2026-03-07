import crypto from "crypto";
import {
  createAccount,
  findAccountByAccessCode,
  getAccountById,
  renameAccount,
  type Account,
} from "~/utils/database.server";

const ACCOUNT_COOKIE_NAME = "sp_account_id";
const ANONYMOUS_COOKIE_NAME = "sp_anon_session";
const LEGACY_ACCOUNT_ID = "legacy-account";
const ACCOUNT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ANONYMOUS_DATA_TTL_SECONDS = 60 * 60 * 24;

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
  return `${ACCOUNT_COOKIE_NAME}=${encodeURIComponent(accountId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCOUNT_COOKIE_MAX_AGE_SECONDS}${secureFlag}`;
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

export async function getConnectedAccountFromRequest(request: Request): Promise<Account | null> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const accountId = cookies[ACCOUNT_COOKIE_NAME];
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

export async function resolveAccountFromRequest(request: Request): Promise<{
  account: Account;
  setCookieHeader?: string;
}> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const accountId = cookies[ACCOUNT_COOKIE_NAME];

  if (accountId) {
    const account = await getAccountById(accountId);
    if (account) {
      return { account };
    }
  }

  const fallback = await getAccountById(LEGACY_ACCOUNT_ID);
  if (fallback) {
    return { account: fallback };
  }

  const created = await createAccount("Compte SidePitcher");
  return {
    account: created.account,
    setCookieHeader: buildAccountCookie(created.account.id),
  };
}

export async function switchAccountFromAccessCode(accessCode: string): Promise<Account | null> {
  return findAccountByAccessCode(accessCode);
}

export async function createAndAssignAccount(name?: string): Promise<{
  account: Account;
  accessCode: string;
  setCookieHeader: string;
}> {
  const created = await createAccount(name);
  return {
    account: created.account,
    accessCode: created.accessCode,
    setCookieHeader: buildAccountCookie(created.account.id),
  };
}

export async function renameCurrentAccount(accountId: string, name: string): Promise<Account> {
  return renameAccount(accountId, name);
}
