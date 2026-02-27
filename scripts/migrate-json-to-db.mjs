import fs from "fs";
import path from "path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL est requis pour migrer les données.");
  process.exit(1);
}

const useSsl = !databaseUrl.includes("localhost");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const rostersPath = path.join(dataDir, "rosters.json");
const summariesPath = path.join(dataDir, "summaries.json");
const matchDayTeamsPath = path.join(dataDir, "match-day-teams.json");

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      current_time INTEGER NOT NULL,
      summary JSONB NOT NULL,
      events JSONB NOT NULL,
      teams JSONB,
      match_day INTEGER
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS match_day_teams (
      championship TEXT NOT NULL,
      match_day INTEGER NOT NULL,
      team1_id TEXT NOT NULL,
      team2_id TEXT NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (championship, match_day)
    )
  `);
}

function readJsonFile(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function migrateRosters(client) {
  const rostersData = readJsonFile(rostersPath, {
    rosters: [],
    teams: [],
    activeRosterId: null,
    matchDay: "",
    sport: "Rugby",
    championship: "Top 14",
  });

  await client.query(
    `
      INSERT INTO app_state (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `,
    ["rosters_state", JSON.stringify(rostersData)]
  );

  console.log("✅ Effectifs migrés vers app_state.");
}

async function migrateSummaries(client) {
  const summariesData = readJsonFile(summariesPath, { summaries: [] });

  const summaries = Array.isArray(summariesData?.summaries)
    ? summariesData.summaries
    : [];

  let migrated = 0;
  for (const item of summaries) {
    if (!item?.id || !item?.createdAt) continue;

    await client.query(
      `
        INSERT INTO summaries (id, created_at, current_time, summary, events, teams, match_day)
        VALUES ($1, $2::timestamptz, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
        ON CONFLICT (id)
        DO UPDATE SET
          created_at = EXCLUDED.created_at,
          current_time = EXCLUDED.current_time,
          summary = EXCLUDED.summary,
          events = EXCLUDED.events,
          teams = EXCLUDED.teams,
          match_day = EXCLUDED.match_day
      `,
      [
        item.id,
        item.createdAt,
        item.currentTime ?? 0,
        JSON.stringify(item.summary ?? {}),
        JSON.stringify(item.events ?? []),
        JSON.stringify(item.teams ?? null),
        item.matchDay ?? null,
      ]
    );

    migrated += 1;
  }

  console.log(`✅ Synthèses migrées: ${migrated}`);
}

async function migrateMatchDayTeams(client) {
  const data = readJsonFile(matchDayTeamsPath, { selections: [] });
  const selections = Array.isArray(data?.selections) ? data.selections : [];

  let migrated = 0;
  for (const selection of selections) {
    if (!selection?.championship || typeof selection?.matchDay !== "number") continue;
    if (!selection?.team1Id || !selection?.team2Id) continue;

    await client.query(
      `
        INSERT INTO match_day_teams (championship, match_day, team1_id, team2_id, saved_at)
        VALUES ($1, $2, $3, $4, $5::timestamptz)
        ON CONFLICT (championship, match_day)
        DO UPDATE SET
          team1_id = EXCLUDED.team1_id,
          team2_id = EXCLUDED.team2_id,
          saved_at = EXCLUDED.saved_at
      `,
      [
        selection.championship,
        selection.matchDay,
        selection.team1Id,
        selection.team2Id,
        selection.savedAt ?? new Date().toISOString(),
      ]
    );

    migrated += 1;
  }

  console.log(`✅ Match-day teams migrées: ${migrated}`);
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await ensureSchema(client);
    await migrateRosters(client);
    await migrateSummaries(client);
    await migrateMatchDayTeams(client);

    await client.query("COMMIT");
    console.log("🎉 Migration JSON -> PostgreSQL terminée.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur de migration:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
