import { dbQuery } from "./serverDb";

export async function upsertSummary(item: any) {
    if (!item?.id) return;

    await dbQuery(
        `
    INSERT INTO summaries (
      id,
      created_at,
      current_time,
      summary,
      events,
      teams,
      match_day
    )
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
            item.createdAt ?? new Date().toISOString(),
            item.currentTime ?? 0,
            JSON.stringify(item.summary ?? {}),
            JSON.stringify(item.events ?? []),
            JSON.stringify(item.teams ?? null),
            item.matchDay ?? null,
        ]
    );
}

export async function upsertSummaries(items: any[]) {
    for (const item of items) {
        await upsertSummary(item);
    }
}