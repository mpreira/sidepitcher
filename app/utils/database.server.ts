import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Pool } from "pg";
import type { LiveSnapshot } from "~/types/live";

type Sport = "Rugby" | "Football";
type Championship = "Top 14" | "Pro D2";

export interface RosterStatePayload {
  rosters: unknown;
  teams: unknown;
  activeRosterId: string | null;
  matchDay?: string;
  sport?: Sport;
  championship?: Championship;
}

export interface MatchDayTeamSelection {
  accountId: string;
  championship: string;
  matchDay: number;
  team1Id: string;
  team2Id: string;
  savedAt: string;
}

export interface StoredSummary {
  accountId: string;
  id: string;
  createdAt: string;
  currentTime: number;
  summary: Record<string, number>;
  events: unknown[];
  teams?: Array<{ id: string; name: string }>;
  matchDay?: number;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountResult {
  account: Account;
}

export interface AccountListItem {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveMatchRecord {
  id: string;
  publicSlug: string;
  adminToken: string;
  adminTokenHash: string;
  championship: string | null;
  matchDay: number | null;
  state: LiveSnapshot | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  closedAt: string | null;
}

export type LiveMatchUpdateError =
  | "not-found"
  | "invalid-token"
  | "expired"
  | "closed";

export interface LiveMatchUpdateResult {
  record: LiveMatchRecord | null;
  error: LiveMatchUpdateError | null;
}

const dataDir = path.join(process.cwd(), "data");
const LEGACY_ACCOUNT_ID = "legacy-account";
const LEGACY_ACCOUNT_NAME = "Compte historique";
const LEGACY_ACCOUNT_ACCESS_CODE = "SIDEPITCHERLEGACY";
const LEGACY_ACCOUNT_EMAIL = "legacy@sidepitcher.local";
const LEGACY_ACCOUNT_PASSWORD = "legacy-unsafe-password";
const ADMIN_ACCOUNT_ID = "admin-account";
const ADMIN_ACCOUNT_NAME = "Admin";
const ADMIN_ACCOUNT_EMAIL = "mlpreira@gmail.com";
const ADMIN_ACCOUNT_PASSWORD = "test01";
const ANONYMOUS_SCOPE_PREFIX = "anon:";
const ANONYMOUS_DATA_TTL_MS = 24 * 60 * 60 * 1000;
const ANONYMOUS_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const defaultRosterState: RosterStatePayload = {
  rosters: [],
  teams: [],
  activeRosterId: null,
  matchDay: "",
  sport: "Rugby",
  championship: "Top 14",
};

let singletonPool: Pool | null = null;
let initializationPromise: Promise<void> | null = null;
let lastAnonymousCleanupAt = 0;

const DEFAULT_LIVE_SESSION_TTL_HOURS = 12;

function parseJsonOrNull<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Configure your Render PostgreSQL connection string in environment variables."
    );
  }
  return url;
}

function getPool(): Pool {
  if (singletonPool) return singletonPool;

  const connectionString = getDatabaseUrl();
  const ssl = process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };

  singletonPool = new Pool({
    connectionString,
    ssl,
  });

  return singletonPool;
}

function getLiveSessionTtlMs(): number {
  const raw = process.env.LIVE_SESSION_TTL_HOURS;
  const parsed = Number(raw);
  const hours = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIVE_SESSION_TTL_HOURS;
  return hours * 60 * 60 * 1000;
}

function hashLiveAdminToken(token: string): string {
  const pepper = process.env.LIVE_TOKEN_PEPPER ?? "";
  return crypto.createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isLiveMatchExpired(expiresAt: string): boolean {
  return Date.now() > new Date(expiresAt).getTime();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashAccountAccessCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(`account:${normalizeAccessCode(code)}`)
    .digest("hex");
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const separatorIndex = hash.indexOf(":");
  if (separatorIndex === -1) return false;
  const salt = hash.slice(0, separatorIndex);
  const expectedHex = hash.slice(separatorIndex + 1);
  const computed = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== computed.length) return false;
  return crypto.timingSafeEqual(expected, computed);
}

function generateAccountAccessCode(): string {
  return `SP${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function trimAccountName(name?: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return "Compte SidePitcher";
  }
  return trimmed.slice(0, 80);
}

function validatePasswordInput(password: string): void {
  if (password.trim().length < 6) {
    throw new Error("Password must contain at least 6 characters");
  }
}

function mapAccountRow(row: {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}): Account {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isAdmin: row.is_admin,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function isAnonymousScopeId(scopeId: string): boolean {
  return scopeId.startsWith(ANONYMOUS_SCOPE_PREFIX);
}

async function cleanupExpiredAnonymousData(pool: Pool): Promise<void> {
  const now = Date.now();
  if (now - lastAnonymousCleanupAt < ANONYMOUS_CLEANUP_INTERVAL_MS) {
    return;
  }
  lastAnonymousCleanupAt = now;

  const thresholdIso = new Date(now - ANONYMOUS_DATA_TTL_MS).toISOString();
  await pool.query(
    `DELETE FROM account_rosters_state
     WHERE account_id LIKE $1 AND updated_at < $2`,
    [`${ANONYMOUS_SCOPE_PREFIX}%`, thresholdIso]
  );
  await pool.query(
    `DELETE FROM match_day_selections
     WHERE account_id LIKE $1 AND saved_at < $2`,
    [`${ANONYMOUS_SCOPE_PREFIX}%`, thresholdIso]
  );
  await pool.query(
    `DELETE FROM summaries
     WHERE account_id LIKE $1 AND created_at < $2`,
    [`${ANONYMOUS_SCOPE_PREFIX}%`, thresholdIso]
  );
}

async function ensureLegacyAccount(pool: Pool): Promise<void> {
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO accounts (id, name, email, password_hash, is_admin, access_code_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, FALSE, $5, $6, $6)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       email = COALESCE(accounts.email, EXCLUDED.email),
       password_hash = COALESCE(accounts.password_hash, EXCLUDED.password_hash),
       access_code_hash = COALESCE(accounts.access_code_hash, EXCLUDED.access_code_hash),
       updated_at = EXCLUDED.updated_at`,
    [
      LEGACY_ACCOUNT_ID,
      LEGACY_ACCOUNT_NAME,
      LEGACY_ACCOUNT_EMAIL,
      hashPassword(LEGACY_ACCOUNT_PASSWORD),
      hashAccountAccessCode(LEGACY_ACCOUNT_ACCESS_CODE),
      createdAt,
    ]
  );
}

async function ensureAdminAccount(pool: Pool): Promise<void> {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO accounts (id, name, email, password_hash, is_admin, access_code_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, $5, $6, $6)
     ON CONFLICT (id)
     DO UPDATE SET
       name = COALESCE(accounts.name, EXCLUDED.name),
       email = COALESCE(accounts.email, EXCLUDED.email),
       password_hash = COALESCE(accounts.password_hash, EXCLUDED.password_hash),
       is_admin = TRUE,
       updated_at = EXCLUDED.updated_at`,
    [
      ADMIN_ACCOUNT_ID,
      ADMIN_ACCOUNT_NAME,
      ADMIN_ACCOUNT_EMAIL,
      hashPassword(ADMIN_ACCOUNT_PASSWORD),
      hashAccountAccessCode("ADMINACCESS"),
      now,
    ]
  );
}

async function initializeSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      access_code_hash TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS account_rosters_state (
      account_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rosters_state (
      id INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_day_selections (
      championship TEXT NOT NULL,
      match_day INTEGER NOT NULL,
      team1_id TEXT NOT NULL,
      team2_id TEXT NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (championship, match_day)
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      payload TEXT NOT NULL
    );

    ALTER TABLE summaries ADD COLUMN IF NOT EXISTS account_id TEXT;

    CREATE TABLE IF NOT EXISTS live_matches (
      id TEXT PRIMARY KEY,
      public_slug TEXT UNIQUE NOT NULL,
      admin_token TEXT NOT NULL,
      admin_token_hash TEXT,
      championship TEXT,
      match_day INTEGER,
      payload TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ
    );

    ALTER TABLE live_matches ADD COLUMN IF NOT EXISTS admin_token_hash TEXT;
    ALTER TABLE live_matches ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    ALTER TABLE live_matches ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_live_matches_public_slug ON live_matches(public_slug);
    CREATE INDEX IF NOT EXISTS idx_live_matches_expires_at ON live_matches(expires_at);
    CREATE INDEX IF NOT EXISTS idx_summaries_account_created_at ON summaries(account_id, created_at DESC);

    ALTER TABLE match_day_selections ADD COLUMN IF NOT EXISTS account_id TEXT;
  `);

  await pool.query(
    `UPDATE accounts
     SET email = CONCAT(id, '@sidepitcher.local')
     WHERE email IS NULL OR TRIM(email) = ''`
  );
  await pool.query(
    `UPDATE accounts
     SET password_hash = $1
     WHERE password_hash IS NULL OR TRIM(password_hash) = ''`,
    [hashPassword("temporary-password")]
  );
  await pool.query(
    `UPDATE accounts
     SET updated_at = COALESCE(updated_at, created_at, NOW())`
  );
  await pool.query(`ALTER TABLE accounts ALTER COLUMN email SET NOT NULL`);
  await pool.query(`ALTER TABLE accounts ALTER COLUMN password_hash SET NOT NULL`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email_unique
     ON accounts ((LOWER(email)))`
  );

  await pool.query(
    `UPDATE match_day_selections
     SET account_id = $1
     WHERE account_id IS NULL`,
    [LEGACY_ACCOUNT_ID]
  );

  await pool.query(`ALTER TABLE match_day_selections DROP CONSTRAINT IF EXISTS match_day_selections_pkey`);
  await pool.query(`ALTER TABLE match_day_selections ALTER COLUMN account_id SET NOT NULL`);
  await pool.query(`ALTER TABLE match_day_selections ADD PRIMARY KEY (account_id, championship, match_day)`);
}

async function migrateFromJsonFiles(pool: Pool) {
  await ensureLegacyAccount(pool);
  await ensureAdminAccount(pool);

  const rostersCountResult = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM account_rosters_state"
  );
  const summariesCountResult = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM summaries");
  const selectionsCountResult = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM match_day_selections"
  );

  const rostersCount = Number(rostersCountResult.rows[0]?.count ?? "0");
  const summariesCount = Number(summariesCountResult.rows[0]?.count ?? "0");
  const selectionsCount = Number(selectionsCountResult.rows[0]?.count ?? "0");

  if (rostersCount === 0) {
    const legacyDbRostersResult = await pool.query<{ payload: string }>(
      "SELECT payload FROM rosters_state WHERE id = 1"
    );
    const legacyDbPayload = legacyDbRostersResult.rows[0]?.payload;
    if (legacyDbPayload) {
      await pool.query(
        `INSERT INTO account_rosters_state (account_id, payload, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT(account_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
        [LEGACY_ACCOUNT_ID, legacyDbPayload, new Date().toISOString()]
      );
    } else {
      const legacyRostersPath = path.join(dataDir, "rosters.json");
      if (fs.existsSync(legacyRostersPath)) {
        const raw = fs.readFileSync(legacyRostersPath, "utf-8");
        const parsed = parseJsonOrNull<RosterStatePayload>(raw);
        if (parsed) {
          await pool.query(
            `INSERT INTO account_rosters_state (account_id, payload, updated_at)
             VALUES ($1, $2, $3)
             ON CONFLICT(account_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
            [LEGACY_ACCOUNT_ID, JSON.stringify(parsed), new Date().toISOString()]
          );
        }
      }
    }
  }

  if (summariesCount === 0) {
    const legacySummariesPath = path.join(dataDir, "summaries.json");
    if (fs.existsSync(legacySummariesPath)) {
      const raw = fs.readFileSync(legacySummariesPath, "utf-8");
      const parsed = parseJsonOrNull<{ summaries?: StoredSummary[] }>(raw);
      if (parsed?.summaries?.length) {
        for (const summary of parsed.summaries) {
          await pool.query(
            `INSERT INTO summaries (id, created_at, payload, account_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [summary.id, summary.createdAt, JSON.stringify({ ...summary, accountId: LEGACY_ACCOUNT_ID }), LEGACY_ACCOUNT_ID]
          );
        }
      }
    }
  } else {
    await pool.query(
      `UPDATE summaries
       SET account_id = $1
       WHERE account_id IS NULL`,
      [LEGACY_ACCOUNT_ID]
    );
  }

  if (selectionsCount === 0) {
    const legacySelectionsPath = path.join(dataDir, "match-day-teams.json");
    if (fs.existsSync(legacySelectionsPath)) {
      const raw = fs.readFileSync(legacySelectionsPath, "utf-8");
      const parsed = parseJsonOrNull<{ selections?: MatchDayTeamSelection[] }>(raw);
      if (parsed?.selections?.length) {
        for (const selection of parsed.selections) {
          await pool.query(
            `INSERT INTO match_day_selections
             (account_id, championship, match_day, team1_id, team2_id, saved_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (account_id, championship, match_day)
             DO UPDATE SET
               team1_id = EXCLUDED.team1_id,
               team2_id = EXCLUDED.team2_id,
               saved_at = EXCLUDED.saved_at`,
            [
              LEGACY_ACCOUNT_ID,
              selection.championship,
              selection.matchDay,
              selection.team1Id,
              selection.team2Id,
              selection.savedAt,
            ]
          );
        }
      }
    }
  } else {
    await pool.query(
      `UPDATE match_day_selections
       SET account_id = $1
       WHERE account_id IS NULL`,
      [LEGACY_ACCOUNT_ID]
    );
  }
}

async function ensureInitialized() {
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  const pool = getPool();
  initializationPromise = (async () => {
    await initializeSchema(pool);
    await migrateFromJsonFiles(pool);
  })();

  await initializationPromise;
}

export async function getRostersState(): Promise<RosterStatePayload> {
  return getRostersStateForAccount(LEGACY_ACCOUNT_ID);
}

export async function getRostersStateForAccount(accountId: string): Promise<RosterStatePayload> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  const result = await pool.query<{ payload: string }>(
    "SELECT payload FROM account_rosters_state WHERE account_id = $1",
    [accountId]
  );
  const row = result.rows[0];

  if (!row) return defaultRosterState;
  const parsed = parseJsonOrNull<RosterStatePayload>(row.payload);
  return parsed ?? defaultRosterState;
}

export async function saveRostersState(payload: RosterStatePayload): Promise<void> {
  return saveRostersStateForAccount(LEGACY_ACCOUNT_ID, payload);
}

export async function saveRostersStateForAccount(accountId: string, payload: RosterStatePayload): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  await pool.query(
    `INSERT INTO account_rosters_state (account_id, payload, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(account_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
    [accountId, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getAccountById(accountId: string): Promise<Account | null> {
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, name, email, is_admin, created_at, updated_at
     FROM accounts
     WHERE id = $1`,
    [accountId]
  );

  const row = result.rows[0];
  if (!row) return null;
  return mapAccountRow(row);
}

export async function authenticateAccountByEmail(input: {
  email: string;
  password: string;
}): Promise<Account | null> {
  await ensureInitialized();
  const normalized = normalizeEmail(input.email);
  if (!normalized) return null;

  const pool = getPool();
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
    password_hash: string;
  }>(
    `SELECT id, name, email, is_admin, created_at, updated_at, password_hash
     FROM accounts
     WHERE LOWER(email) = $1`,
    [normalized]
  );

  const row = result.rows[0];
  if (!row) return null;
  const valid = verifyPassword(input.password, row.password_hash);
  if (!valid) return null;
  return mapAccountRow(row);
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  isAdmin?: boolean;
}): Promise<CreateAccountResult> {
  await ensureInitialized();
  const pool = getPool();
  const accountName = trimAccountName(input.name);
  const email = normalizeEmail(input.email);
  validatePasswordInput(input.password);
  if (!email) {
    throw new Error("Email is required");
  }

  const passwordHash = hashPassword(input.password);
  const isAdmin = Boolean(input.isAdmin);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = crypto.randomUUID();
    const accessCode = generateAccountAccessCode();
    const accessCodeHash = hashAccountAccessCode(accessCode);
    const createdAt = new Date().toISOString();

    try {
      const result = await pool.query<{
        id: string;
        name: string;
        email: string;
        is_admin: boolean;
        created_at: string;
        updated_at: string;
      }>(
        `INSERT INTO accounts (id, name, email, password_hash, is_admin, access_code_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         RETURNING id, name, email, is_admin, created_at, updated_at`,
        [id, accountName, email, passwordHash, isAdmin, accessCodeHash, createdAt]
      );

      const account = mapAccountRow(result.rows[0]);
      return { account };
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== "23505") {
        throw error;
      }
    }
  }

  throw new Error("Unable to create account");
}

export async function renameAccount(accountId: string, name: string): Promise<Account> {
  await ensureInitialized();
  const pool = getPool();
  const nextName = trimAccountName(name);

  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `UPDATE accounts
     SET name = $2,
         updated_at = $3
     WHERE id = $1
     RETURNING id, name, email, is_admin, created_at, updated_at`,
    [accountId, nextName, new Date().toISOString()]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Account not found");
  }

  return mapAccountRow(row);
}

export async function listAccountsForAdmin(): Promise<AccountListItem[]> {
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, name, email, is_admin, created_at, updated_at
     FROM accounts
     ORDER BY created_at DESC`
  );

  return result.rows.map((row) => mapAccountRow(row));
}

export async function updateAccountByAdmin(input: {
  accountId: string;
  name?: string;
  email?: string;
  password?: string;
  isAdmin?: boolean;
}): Promise<Account> {
  await ensureInitialized();
  const pool = getPool();
  const existing = await getAccountById(input.accountId);
  if (!existing) {
    throw new Error("Account not found");
  }

  const nextName = input.name ? trimAccountName(input.name) : existing.name;
  const nextEmail = input.email ? normalizeEmail(input.email) : existing.email;
  const nextIsAdmin = typeof input.isAdmin === "boolean" ? input.isAdmin : existing.isAdmin;
  const nextPasswordHash = input.password?.trim()
    ? (() => {
        validatePasswordInput(input.password ?? "");
        return hashPassword(input.password ?? "");
      })()
    : null;

  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `UPDATE accounts
     SET name = $2,
         email = $3,
         is_admin = $4,
         password_hash = COALESCE($5, password_hash),
         updated_at = $6
     WHERE id = $1
     RETURNING id, name, email, is_admin, created_at, updated_at`,
    [
      input.accountId,
      nextName,
      nextEmail,
      nextIsAdmin,
      nextPasswordHash,
      new Date().toISOString(),
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Account not found");
  }
  return mapAccountRow(row);
}

export async function updateAccountCredentials(input: {
  accountId: string;
  email: string;
  currentPassword?: string;
  password?: string;
}): Promise<Account> {
  await ensureInitialized();
  const pool = getPool();

  const nextEmail = normalizeEmail(input.email);
  if (!nextEmail) {
    throw new Error("Email is required");
  }

  if (input.password?.trim()) {
    if (!input.currentPassword) {
      throw new Error("Current password is required");
    }

    const passwordCheck = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM accounts WHERE id = $1`,
      [input.accountId]
    );
    const currentHash = passwordCheck.rows[0]?.password_hash;
    if (!currentHash || !verifyPassword(input.currentPassword, currentHash)) {
      throw new Error("Invalid current password");
    }
  }

  const nextPasswordHash = input.password?.trim()
    ? (() => {
        validatePasswordInput(input.password ?? "");
        return hashPassword(input.password ?? "");
      })()
    : null;

  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
  }>(
    `UPDATE accounts
     SET email = $2,
         password_hash = COALESCE($3, password_hash),
         updated_at = $4
     WHERE id = $1
     RETURNING id, name, email, is_admin, created_at, updated_at`,
    [input.accountId, nextEmail, nextPasswordHash, new Date().toISOString()]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Account not found");
  }
  return mapAccountRow(row);
}

export async function deleteAccountByAdmin(accountId: string): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);

  await pool.query(`DELETE FROM account_rosters_state WHERE account_id = $1`, [accountId]);
  await pool.query(`DELETE FROM match_day_selections WHERE account_id = $1`, [accountId]);
  await pool.query(`DELETE FROM summaries WHERE account_id = $1`, [accountId]);
  await pool.query(`DELETE FROM accounts WHERE id = $1`, [accountId]);
}

export async function getMatchDaySelection(
  accountId: string,
  championship: string,
  matchDay: number
): Promise<MatchDayTeamSelection | null> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  const result = await pool.query<{
    championship: string;
    match_day: number;
    team1_id: string;
    team2_id: string;
    saved_at: string;
  }>(
    `SELECT championship, match_day, team1_id, team2_id, saved_at
     FROM match_day_selections
     WHERE account_id = $1 AND championship = $2 AND match_day = $3`,
    [accountId, championship, matchDay]
  );
  const row = result.rows[0];

  if (!row) return null;
  return {
    accountId,
    championship: row.championship,
    matchDay: row.match_day,
    team1Id: row.team1_id,
    team2Id: row.team2_id,
    savedAt: new Date(row.saved_at).toISOString(),
  };
}

export async function listMatchDaySelections(accountId: string): Promise<MatchDayTeamSelection[]> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  const result = await pool.query<{
    championship: string;
    match_day: number;
    team1_id: string;
    team2_id: string;
    saved_at: string;
  }>(
    `SELECT championship, match_day, team1_id, team2_id, saved_at
     FROM match_day_selections
      WHERE account_id = $1
      ORDER BY saved_at DESC`,
     [accountId]
  );
  const rows = result.rows;

  return rows.map((row) => ({
    accountId,
    championship: row.championship,
    matchDay: row.match_day,
    team1Id: row.team1_id,
    team2Id: row.team2_id,
    savedAt: new Date(row.saved_at).toISOString(),
  }));
}

export async function saveMatchDaySelection(input: {
  accountId: string;
  championship: string;
  matchDay: number;
  team1Id: string;
  team2Id: string;
}): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  await pool.query(
    `INSERT INTO match_day_selections
     (account_id, championship, match_day, team1_id, team2_id, saved_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (account_id, championship, match_day)
     DO UPDATE SET
       team1_id = EXCLUDED.team1_id,
       team2_id = EXCLUDED.team2_id,
       saved_at = EXCLUDED.saved_at`,
    [
      input.accountId,
      input.championship,
      input.matchDay,
      input.team1Id,
      input.team2Id,
      new Date().toISOString(),
    ]
  );
}

export async function listSummaries(accountId: string): Promise<StoredSummary[]> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  const result = await pool.query<{ payload: string }>(
    `SELECT payload FROM summaries
     WHERE account_id = $1
     ORDER BY created_at DESC`,
    [accountId]
  );
  const rows = result.rows;

  return rows
    .map((row) => {
      const parsed = parseJsonOrNull<StoredSummary>(row.payload);
      if (!parsed) return null;
      return {
        ...parsed,
        accountId: parsed.accountId ?? accountId,
      };
    })
    .filter((item): item is StoredSummary => Boolean(item));
}

export async function getSummaryById(summaryId: string, accountId: string): Promise<StoredSummary | null> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  const result = await pool.query<{ payload: string }>(
    `SELECT payload FROM summaries WHERE id = $1 AND account_id = $2`,
    [summaryId, accountId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const parsed = parseJsonOrNull<StoredSummary>(row.payload);
  if (!parsed) return null;
  return {
    ...parsed,
    accountId: parsed.accountId ?? accountId,
  };
}

export async function insertSummary(summary: StoredSummary): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  await pool.query(`INSERT INTO summaries (id, created_at, payload, account_id) VALUES ($1, $2, $3, $4)`, [
    summary.id,
    summary.createdAt,
    JSON.stringify(summary),
    summary.accountId,
  ]);
}

export async function deleteSummary(summaryId: string, accountId: string): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await cleanupExpiredAnonymousData(pool);
  await pool.query(`DELETE FROM summaries WHERE id = $1 AND account_id = $2`, [summaryId, accountId]);
}

function mapLiveMatchRow(row: {
  id: string;
  public_slug: string;
  admin_token: string;
  admin_token_hash: string | null;
  championship: string | null;
  match_day: number | null;
  payload: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  closed_at: string | null;
}): LiveMatchRecord {
  const expiresAt = row.expires_at ? new Date(row.expires_at).toISOString() : new Date(Date.now() + getLiveSessionTtlMs()).toISOString();

  return {
    id: row.id,
    publicSlug: row.public_slug,
    adminToken: "",
    adminTokenHash: row.admin_token_hash ?? "",
    championship: row.championship,
    matchDay: row.match_day,
    state: row.payload ? parseJsonOrNull<LiveSnapshot>(row.payload) : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    expiresAt,
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
  };
}

export async function createLiveMatch(input: {
  id: string;
  publicSlug: string;
  adminToken: string;
  championship?: string;
  matchDay?: number;
  state: LiveSnapshot;
}): Promise<LiveMatchRecord> {
  await ensureInitialized();
  const pool = getPool();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + getLiveSessionTtlMs()).toISOString();
  const adminTokenHash = hashLiveAdminToken(input.adminToken);
  const result = await pool.query<{
    id: string;
    public_slug: string;
    admin_token: string;
    admin_token_hash: string | null;
    championship: string | null;
    match_day: number | null;
    payload: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
    closed_at: string | null;
  }>(
    `INSERT INTO live_matches
      (id, public_slug, admin_token, admin_token_hash, championship, match_day, payload, created_at, updated_at, expires_at, closed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)
     RETURNING id, public_slug, admin_token, admin_token_hash, championship, match_day, payload, created_at, updated_at, expires_at, closed_at`,
    [
      input.id,
      input.publicSlug,
      "__redacted__",
      adminTokenHash,
      input.championship ?? null,
      input.matchDay ?? null,
      JSON.stringify(input.state),
      now,
      now,
      expiresAt,
    ]
  );

  return {
    ...mapLiveMatchRow(result.rows[0]),
    adminToken: input.adminToken,
  };
}

export async function getLiveMatchByPublicSlug(publicSlug: string): Promise<LiveMatchRecord | null> {
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    public_slug: string;
    admin_token: string;
    admin_token_hash: string | null;
    championship: string | null;
    match_day: number | null;
    payload: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
    closed_at: string | null;
  }>(
    `SELECT id, public_slug, admin_token, admin_token_hash, championship, match_day, payload, created_at, updated_at, expires_at, closed_at
     FROM live_matches
     WHERE public_slug = $1`,
    [publicSlug]
  );

  const row = result.rows[0];
  if (!row) return null;
  return mapLiveMatchRow(row);
}

export async function updateLiveMatchState(input: {
  matchId: string;
  adminToken: string;
  state: LiveSnapshot;
}): Promise<LiveMatchUpdateResult> {
  await ensureInitialized();
  const pool = getPool();

  const existingResult = await pool.query<{
    id: string;
    public_slug: string;
    admin_token: string;
    admin_token_hash: string | null;
    championship: string | null;
    match_day: number | null;
    payload: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
    closed_at: string | null;
  }>(
    `SELECT id, public_slug, admin_token, admin_token_hash, championship, match_day, payload, created_at, updated_at, expires_at, closed_at
     FROM live_matches
     WHERE id = $1`,
    [input.matchId]
  );

  const existing = existingResult.rows[0];
  if (!existing) {
    return { record: null, error: "not-found" };
  }

  const storedHash = existing.admin_token_hash;
  const incomingHash = hashLiveAdminToken(input.adminToken);
  const validToken = storedHash
    ? constantTimeEqual(storedHash, incomingHash)
    : constantTimeEqual(existing.admin_token, input.adminToken);

  if (!validToken) {
    return { record: null, error: "invalid-token" };
  }

  const expiresAt = existing.expires_at ? new Date(existing.expires_at).toISOString() : new Date(Date.now() + getLiveSessionTtlMs()).toISOString();
  if (isLiveMatchExpired(expiresAt)) {
    return { record: null, error: "expired" };
  }

  if (existing.closed_at) {
    return { record: null, error: "closed" };
  }

  const shouldCloseNow = input.state.matchEnded;
  const now = new Date().toISOString();

  const result = await pool.query<{
    id: string;
    public_slug: string;
    admin_token: string;
    admin_token_hash: string | null;
    championship: string | null;
    match_day: number | null;
    payload: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
    closed_at: string | null;
  }>(
    `UPDATE live_matches
     SET payload = $2,
         updated_at = $3,
         admin_token_hash = COALESCE(admin_token_hash, $4),
         admin_token = CASE WHEN admin_token_hash IS NULL THEN '__redacted__' ELSE admin_token END,
         expires_at = COALESCE(expires_at, $5),
         closed_at = CASE WHEN $6::boolean THEN $3 ELSE closed_at END
     WHERE id = $1
     RETURNING id, public_slug, admin_token, admin_token_hash, championship, match_day, payload, created_at, updated_at, expires_at, closed_at`,
    [input.matchId, JSON.stringify(input.state), now, incomingHash, expiresAt, shouldCloseNow]
  );

  const row = result.rows[0];
  if (!row) {
    return { record: null, error: "not-found" };
  }

  return {
    record: mapLiveMatchRow(row),
    error: null,
  };
}

export async function closeLiveMatchSession(input: {
  matchId: string;
  adminToken: string;
}): Promise<LiveMatchUpdateResult> {
  await ensureInitialized();
  const pool = getPool();

  const existingResult = await pool.query<{
    id: string;
    public_slug: string;
    admin_token: string;
    admin_token_hash: string | null;
    championship: string | null;
    match_day: number | null;
    payload: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
    closed_at: string | null;
  }>(
    `SELECT id, public_slug, admin_token, admin_token_hash, championship, match_day, payload, created_at, updated_at, expires_at, closed_at
     FROM live_matches
     WHERE id = $1`,
    [input.matchId]
  );

  const existing = existingResult.rows[0];
  if (!existing) {
    return { record: null, error: "not-found" };
  }

  const storedHash = existing.admin_token_hash;
  const incomingHash = hashLiveAdminToken(input.adminToken);
  const validToken = storedHash
    ? constantTimeEqual(storedHash, incomingHash)
    : constantTimeEqual(existing.admin_token, input.adminToken);

  if (!validToken) {
    return { record: null, error: "invalid-token" };
  }

  const expiresAt = existing.expires_at
    ? new Date(existing.expires_at).toISOString()
    : new Date(Date.now() + getLiveSessionTtlMs()).toISOString();

  if (isLiveMatchExpired(expiresAt)) {
    return { record: null, error: "expired" };
  }

  if (existing.closed_at) {
    return { record: null, error: "closed" };
  }

  const now = new Date().toISOString();
  const parsedState = existing.payload ? parseJsonOrNull<LiveSnapshot>(existing.payload) : null;
  const nextState = parsedState ? { ...parsedState, matchEnded: true, running: false } : null;

  const result = await pool.query<{
    id: string;
    public_slug: string;
    admin_token: string;
    admin_token_hash: string | null;
    championship: string | null;
    match_day: number | null;
    payload: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
    closed_at: string | null;
  }>(
    `UPDATE live_matches
     SET payload = COALESCE($2, payload),
         updated_at = $3,
         admin_token_hash = COALESCE(admin_token_hash, $4),
         admin_token = CASE WHEN admin_token_hash IS NULL THEN '__redacted__' ELSE admin_token END,
         expires_at = COALESCE(expires_at, $5),
         closed_at = $3
     WHERE id = $1
     RETURNING id, public_slug, admin_token, admin_token_hash, championship, match_day, payload, created_at, updated_at, expires_at, closed_at`,
    [input.matchId, nextState ? JSON.stringify(nextState) : null, now, incomingHash, expiresAt]
  );

  const row = result.rows[0];
  if (!row) {
    return { record: null, error: "not-found" };
  }

  return {
    record: mapLiveMatchRow(row),
    error: null,
  };
}

export function getLiveAvailability(record: LiveMatchRecord): "active" | "expired" | "closed" {
  if (record.closedAt) return "closed";
  if (isLiveMatchExpired(record.expiresAt)) return "expired";
  return "active";
}
