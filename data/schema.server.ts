import { dbQuery } from "./serverDb";

export async function ensureSchema() {
    await dbQuery(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

    await dbQuery(`
    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      current_time INTEGER NOT NULL,
      summary JSONB NOT NULL,
      events JSONB NOT NULL,
      teams JSONB,
      match_day INTEGER
    )
  `);

    await dbQuery(`
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