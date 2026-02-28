import type { ActionFunction, LoaderFunction } from "react-router";
import fs from "fs";
import path from "path";
import { dbQuery, hasDatabase } from "data/serverDb";

interface StoredData {
    rosters: unknown;
    teams: unknown;
    activeRosterId: string | null;
    matchDay?: string;
    sport?: 'Rugby' | 'Football';
    championship?: 'Top 14' | 'Pro D2';
}

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "rosters.json");
const ROSTERS_STATE_KEY = "rosters_state";

async function readStoredData(): Promise<StoredData> {
    try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        return JSON.parse(content) as StoredData;
    } catch (e) {
        return {
            rosters: [],
            teams: [],
            activeRosterId: null,
            matchDay: "",
            sport: "Rugby",
            championship: "Top 14",
        };
    }
}

export const loader: LoaderFunction = async () => {
    if (hasDatabase) {
        const rows = await dbQuery<{ value: StoredData }>(
            "SELECT value FROM app_state WHERE key = $1 LIMIT 1",
            [ROSTERS_STATE_KEY]
        );

        if (rows.length > 0 && rows[0].value) {
            return rows[0].value;
        }

        return {
            rosters: [],
            teams: [],
            activeRosterId: null,
            matchDay: "",
            sport: "Rugby",
            championship: "Top 14",
        };
    }

    return readStoredData();
};

export const action: ActionFunction = async ({ request }) => {
    const data: StoredData = await request.json();
    const current = hasDatabase
        ? ((await dbQuery<{ value: StoredData }>(
              "SELECT value FROM app_state WHERE key = $1 LIMIT 1",
              [ROSTERS_STATE_KEY]
          ))[0]?.value ?? {
              rosters: [],
              teams: [],
              activeRosterId: null,
              matchDay: "",
              sport: "Rugby",
              championship: "Top 14",
          })
        : await readStoredData();

    const incomingRosters = Array.isArray(data.rosters) ? data.rosters : [];
    const incomingTeams = Array.isArray(data.teams) ? data.teams : [];
    const currentRosters = Array.isArray(current.rosters) ? current.rosters : [];
    const currentTeams = Array.isArray(current.teams) ? current.teams : [];

    const wouldWipeExistingData =
        currentRosters.length > 0 &&
        currentTeams.length > 0 &&
        incomingRosters.length === 0 &&
        incomingTeams.length === 0;

    if (wouldWipeExistingData) {
        return {
            ok: false,
            prevented: true,
            message: "Écrasement des effectifs empêché pour préserver la persistance.",
        };
    }

    const payload: StoredData = {
        rosters: data.rosters,
        teams: data.teams,
        activeRosterId: data.activeRosterId,
        matchDay: data.matchDay ?? "",
        sport: data.sport ?? "Rugby",
        championship: data.championship ?? "Top 14",
    };

    if (hasDatabase) {
        await dbQuery(
            `
            INSERT INTO app_state (key, value, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (key)
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `,
            [ROSTERS_STATE_KEY, JSON.stringify(payload)]
        );
    } else {
        try {
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(
                filePath,
                JSON.stringify(payload, null, 2),
                "utf-8"
            );
        } catch (e) {
            console.error("Failed to write rosters", e);
        }
    }

    return { ok: true };
};

