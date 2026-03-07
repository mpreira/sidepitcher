import type { ActionFunction, LoaderFunction } from "react-router";
import { resolveDataScopeFromRequest } from "~/utils/account.server";
import {
    getMatchDaySelection,
    listMatchDaySelections,
    saveMatchDaySelection,
} from "~/utils/database.server";

export const loader: LoaderFunction = async ({ request }) => {
    const scope = await resolveDataScopeFromRequest(request);
    const url = new URL(request.url);
    const championship = url.searchParams.get("championship");
    const matchDay = url.searchParams.get("matchDay");

    if (championship && matchDay) {
        const normalizedMatchDay = parseInt(matchDay, 10);
        if (Number.isNaN(normalizedMatchDay)) {
            return { selection: null };
        }
        const payload = {
            selection: await getMatchDaySelection(
                scope.scopeId,
                championship,
                normalizedMatchDay
            ),
        };

        if (!scope.setCookieHeader) {
            return payload;
        }

        return Response.json(payload, {
            headers: {
                "Set-Cookie": scope.setCookieHeader,
            },
        });
    }

    const payload = { selections: await listMatchDaySelections(scope.scopeId) };

    if (!scope.setCookieHeader) {
        return payload;
    }

    return Response.json(payload, {
        headers: {
            "Set-Cookie": scope.setCookieHeader,
        },
    });
};

export const action: ActionFunction = async ({ request }) => {
    const scope = await resolveDataScopeFromRequest(request);

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
            accountId: scope.scopeId,
            championship: payload.championship,
            matchDay: normalizedMatchDay,
            team1Id: payload.team1Id,
            team2Id: payload.team2Id,
        });
        if (!scope.setCookieHeader) {
            return { ok: true };
        }

        return Response.json(
            { ok: true },
            {
                headers: {
                    "Set-Cookie": scope.setCookieHeader,
                },
            }
        );
    }

    return null;
};
