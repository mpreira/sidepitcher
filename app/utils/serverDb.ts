import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

export const hasDatabase = Boolean(databaseUrl);

let pool: Pool | null = null;
let schemaInitPromise: Promise<void> | null = null;

function getPool(): Pool {
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not defined.");
    }

    if (!pool) {
        const useSsl = !databaseUrl.includes("localhost");
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        });
    }

    return pool;
}

export async function ensureDbSchema(): Promise<void> {
    if (!hasDatabase) return;

    if (!schemaInitPromise) {
        schemaInitPromise = (async () => {
            const client = await getPool().connect();
            try {
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
            } finally {
                client.release();
            }
        })();
    }

    return schemaInitPromise;
}

export async function dbQuery<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
    if (!hasDatabase) {
        throw new Error("Database is not configured.");
    }

    await ensureDbSchema();
    const result = await getPool().query(text, params);
    return result.rows as T[];
}
