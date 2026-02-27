import type { ActionFunction, LoaderFunction } from "react-router";
import fs from "fs";
import path from "path";
import { dbQuery, hasDatabase } from "~/utils/serverDb";

interface MatchDayTeamSelection {
    championship: string;
    matchDay: number;
    team1Id: string;
    team2Id: string;
    savedAt: string;
}

interface MatchDayTeamsData {
    selections: MatchDayTeamSelection[];
}

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "match-day-teams.json");

async function readFile(): Promise<MatchDayTeamsData> {
    try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        return JSON.parse(content) as MatchDayTeamsData;
    } catch (e) {
        return { selections: [] };
    }
}

async function writeFile(data: MatchDayTeamsData): Promise<void> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export const loader: LoaderFunction = async ({ request }) => {
    const url = new URL(request.url);
    const championship = url.searchParams.get("championship");
    const matchDay = url.searchParams.get("matchDay");

    if (hasDatabase) {
        if (championship && matchDay) {
            const rows = await dbQuery<{
                championship: string;
                match_day: number;
                team1_id: string;
                team2_id: string;
                saved_at: string;
            }>(
                `
                SELECT championship, match_day, team1_id, team2_id, saved_at
                FROM match_day_teams
                WHERE championship = $1 AND match_day = $2
                LIMIT 1
                `,
                [championship, parseInt(matchDay, 10)]
            );

            const row = rows[0];
            if (!row) return { selection: null };

            return {
                selection: {
                    championship: row.championship,
                    matchDay: row.match_day,
                    team1Id: row.team1_id,
                    team2Id: row.team2_id,
                    savedAt: row.saved_at,
                },
            };
        }

        const rows = await dbQuery<{
            championship: string;
            match_day: number;
            team1_id: string;
            team2_id: string;
            saved_at: string;
        }>(
            `
            SELECT championship, match_day, team1_id, team2_id, saved_at
            FROM match_day_teams
            ORDER BY saved_at DESC
            `
        );

        return {
            selections: rows.map((row) => ({
                championship: row.championship,
                matchDay: row.match_day,
                team1Id: row.team1_id,
                team2Id: row.team2_id,
                savedAt: row.saved_at,
            })),
        };
    }

    const data = await readFile();

    if (championship && matchDay) {
        const selection = data.selections.find(
            (s) => s.championship === championship && s.matchDay === parseInt(matchDay)
        );
        return { selection: selection || null };
    }

    return { selections: data.selections };
};

export const action: ActionFunction = async ({ request }) => {
    const data = hasDatabase ? { selections: [] as MatchDayTeamSelection[] } : await readFile();

    if (request.method === "POST") {
        const payload = (await request.json()) as Omit<MatchDayTeamSelection, "savedAt">;

        if (hasDatabase) {
            await dbQuery(
                `
                INSERT INTO match_day_teams (championship, match_day, team1_id, team2_id, saved_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (championship, match_day)
                DO UPDATE SET team1_id = EXCLUDED.team1_id, team2_id = EXCLUDED.team2_id, saved_at = NOW()
                `,
                [payload.championship, payload.matchDay, payload.team1Id, payload.team2Id]
            );
            return { ok: true };
        }

        // Find and replace existing selection or add new one
        const index = data.selections.findIndex(
            (s) => s.championship === payload.championship && s.matchDay === payload.matchDay
        );

        const selection: MatchDayTeamSelection = {
            ...payload,
            savedAt: new Date().toISOString(),
        };

        if (index >= 0) {
            data.selections[index] = selection;
        } else {
            data.selections.push(selection);
        }

        await writeFile(data);
        return { ok: true };
    }

    return null;
};
