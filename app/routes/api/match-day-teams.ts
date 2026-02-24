import type { ActionFunction, LoaderFunction } from "react-router";
import fs from "fs";
import path from "path";

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

const filePath = path.join(process.cwd(), "data", "match-day-teams.json");

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
    const data = await readFile();

    if (request.method === "POST") {
        const payload = (await request.json()) as Omit<MatchDayTeamSelection, "savedAt">;

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
