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
  championship: string;
  matchDay: number;
  team1Id: string;
  team2Id: string;
  savedAt: string;
}

export interface StoredSummary {
  id: string;
  createdAt: string;
  currentTime: number;
  summary: Record<string, number>;
  events: unknown[];
  teams?: Array<{ id: string; name: string }>;
  matchDay?: number;
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

async function initializeSchema(pool: Pool) {
  await pool.query(`
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
  `);
}

async function migrateFromJsonFiles(pool: Pool) {
  const rostersCountResult = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM rosters_state");
  const summariesCountResult = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM summaries");
  const selectionsCountResult = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM match_day_selections"
  );

  const rostersCount = Number(rostersCountResult.rows[0]?.count ?? "0");
  const summariesCount = Number(summariesCountResult.rows[0]?.count ?? "0");
  const selectionsCount = Number(selectionsCountResult.rows[0]?.count ?? "0");

  if (rostersCount === 0) {
    const legacyRostersPath = path.join(dataDir, "rosters.json");
    if (fs.existsSync(legacyRostersPath)) {
      const raw = fs.readFileSync(legacyRostersPath, "utf-8");
      const parsed = parseJsonOrNull<RosterStatePayload>(raw);
      if (parsed) {
        await pool.query(
          `INSERT INTO rosters_state (id, payload, updated_at)
           VALUES (1, $1, $2)
           ON CONFLICT(id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
          [JSON.stringify(parsed), new Date().toISOString()]
        );
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
            `INSERT INTO summaries (id, created_at, payload)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO NOTHING`,
            [summary.id, summary.createdAt, JSON.stringify(summary)]
          );
        }
      }
    }
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
             (championship, match_day, team1_id, team2_id, saved_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (championship, match_day)
             DO UPDATE SET
               team1_id = EXCLUDED.team1_id,
               team2_id = EXCLUDED.team2_id,
               saved_at = EXCLUDED.saved_at`,
            [
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
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{ payload: string }>("SELECT payload FROM rosters_state WHERE id = 1");
  const row = result.rows[0];

  if (!row) return defaultRosterState;
  const parsed = parseJsonOrNull<RosterStatePayload>(row.payload);
  return parsed ?? defaultRosterState;
}

export async function saveRostersState(payload: RosterStatePayload): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await pool.query(
    `INSERT INTO rosters_state (id, payload, updated_at)
     VALUES (1, $1, $2)
     ON CONFLICT(id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
    [JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getMatchDaySelection(
  championship: string,
  matchDay: number
): Promise<MatchDayTeamSelection | null> {
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{
    championship: string;
    match_day: number;
    team1_id: string;
    team2_id: string;
    saved_at: string;
  }>(
    `SELECT championship, match_day, team1_id, team2_id, saved_at
     FROM match_day_selections
     WHERE championship = $1 AND match_day = $2`,
    [championship, matchDay]
  );
  const row = result.rows[0];

  if (!row) return null;
  return {
    championship: row.championship,
    matchDay: row.match_day,
    team1Id: row.team1_id,
    team2Id: row.team2_id,
    savedAt: new Date(row.saved_at).toISOString(),
  };
}

export async function listMatchDaySelections(): Promise<MatchDayTeamSelection[]> {
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{
    championship: string;
    match_day: number;
    team1_id: string;
    team2_id: string;
    saved_at: string;
  }>(
    `SELECT championship, match_day, team1_id, team2_id, saved_at
     FROM match_day_selections
     ORDER BY saved_at DESC`
  );
  const rows = result.rows;

  return rows.map((row) => ({
    championship: row.championship,
    matchDay: row.match_day,
    team1Id: row.team1_id,
    team2Id: row.team2_id,
    savedAt: new Date(row.saved_at).toISOString(),
  }));
}

export async function saveMatchDaySelection(input: {
  championship: string;
  matchDay: number;
  team1Id: string;
  team2Id: string;
}): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await pool.query(
    `INSERT INTO match_day_selections
     (championship, match_day, team1_id, team2_id, saved_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (championship, match_day)
     DO UPDATE SET
       team1_id = EXCLUDED.team1_id,
       team2_id = EXCLUDED.team2_id,
       saved_at = EXCLUDED.saved_at`,
    [input.championship, input.matchDay, input.team1Id, input.team2Id, new Date().toISOString()]
  );
}

export async function listSummaries(): Promise<StoredSummary[]> {
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{ payload: string }>(
    `SELECT payload FROM summaries ORDER BY created_at DESC`
  );
  const rows = result.rows;

  return rows
    .map((row) => parseJsonOrNull<StoredSummary>(row.payload))
    .filter((item): item is StoredSummary => Boolean(item));
}

export async function getSummaryById(summaryId: string): Promise<StoredSummary | null> {
  await ensureInitialized();
  const pool = getPool();
  const result = await pool.query<{ payload: string }>(
    `SELECT payload FROM summaries WHERE id = $1`,
    [summaryId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return parseJsonOrNull<StoredSummary>(row.payload);
}

export async function insertSummary(summary: StoredSummary): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await pool.query(`INSERT INTO summaries (id, created_at, payload) VALUES ($1, $2, $3)`, [
    summary.id,
    summary.createdAt,
    JSON.stringify(summary),
  ]);
}

export async function deleteSummary(summaryId: string): Promise<void> {
  await ensureInitialized();
  const pool = getPool();
  await pool.query(`DELETE FROM summaries WHERE id = $1`, [summaryId]);
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

export function getLiveAvailability(record: LiveMatchRecord): "active" | "expired" | "closed" {
  if (record.closedAt) return "closed";
  if (isLiveMatchExpired(record.expiresAt)) return "expired";
  return "active";
}
