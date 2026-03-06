import type { ActionFunction, LoaderFunction } from "react-router";
import {
    getMatchDaySelection,
    listMatchDaySelections,
    saveMatchDaySelection,
} from "~/utils/database.server";

export const loader: LoaderFunction = async ({ request }) => {
    const url = new URL(request.url);
    const championship = url.searchParams.get("championship");
    const matchDay = url.searchParams.get("matchDay");

    if (championship && matchDay) {
        const normalizedMatchDay = parseInt(matchDay, 10);
        if (Number.isNaN(normalizedMatchDay)) {
            return { selection: null };
        }
        return { selection: await getMatchDaySelection(championship, normalizedMatchDay) };
    }

    return { selections: await listMatchDaySelections() };
};

export const action: ActionFunction = async ({ request }) => {
    if (request.method === "POST") {
        const payload = (await request.json()) as {
            championship?: string;
            matchDay?: number | string;
            team1Id?: string;
            team2Id?: string;
        };

        const normalizedMatchDay = Number(payload.matchDay);
        if (
            !payload.championship ||
            !payload.team1Id ||
            !payload.team2Id ||
            Number.isNaN(normalizedMatchDay)
        ) {
            return { ok: false };
        }

        await saveMatchDaySelection({
            championship: payload.championship,
            matchDay: normalizedMatchDay,
            team1Id: payload.team1Id,
            team2Id: payload.team2Id,
        });
        return { ok: true };
    }

    return null;
};
