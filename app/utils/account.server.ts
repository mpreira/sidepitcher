import {
  createAccount,
  findAccountByAccessCode,
  getAccountById,
  renameAccount,
  type Account,
} from "~/utils/database.server";

const ACCOUNT_COOKIE_NAME = "sp_account_id";
const LEGACY_ACCOUNT_ID = "legacy-account";
const ACCOUNT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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
