import { dbQuery } from "./serverDb";

export async function upsertAppState(
    key: string,
    value: unknown
) {
    await dbQuery(
        `
    INSERT INTO app_state (key, value, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW()
    `,
        [key, JSON.stringify(value)]
    );
}