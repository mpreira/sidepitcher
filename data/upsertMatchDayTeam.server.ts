import { dbQuery } from "./serverDb";

export async function upsertMatchDayTeam(selection: any) {
    if (
        !selection?.championship ||
        typeof selection?.matchDay !== "number"
    ) return;

    await dbQuery(
        `
    INSERT INTO match_day_teams (
      championship,
      match_day,
      team1_id,
      team2_id,
      saved_at
    )
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
}

export async function upsertMatchDayTeams(selections: any[]) {
    for (const s of selections) {
        await upsertMatchDayTeam(s);
    }
}