import type { ActionFunction, LoaderFunction } from "react-router";
import crypto from "crypto";
import { resolveDataScopeFromRequest } from "~/utils/account.server";
import {
    deleteSummary,
    insertSummary,
    listSummaries,
    type StoredSummary,
} from "~/utils/database.server";

interface SummariesData {
    summaries: StoredSummary[];
}

export const loader: LoaderFunction = async ({ request }) => {
    const scope = await resolveDataScopeFromRequest(request);
    const payload: SummariesData = { summaries: await listSummaries(scope.scopeId) };

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
        const payload = (await request.json()) as Omit<StoredSummary, "id" | "createdAt" | "accountId">;
        const summary: StoredSummary = {
            accountId: scope.scopeId,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            currentTime: payload.currentTime,
            summary: payload.summary,
            events: payload.events,
            teams: payload.teams,
            matchDay: payload.matchDay,
        };
        await insertSummary(summary);
        if (!scope.setCookieHeader) {
            return { ok: true, id: summary.id };
        }
        return Response.json(
            { ok: true, id: summary.id },
            {
                headers: {
                    "Set-Cookie": scope.setCookieHeader,
                },
            }
        );
    }

    if (request.method === "DELETE") {
        const payload = (await request.json()) as { id?: string };
        if (!payload.id) return { ok: false };
        await deleteSummary(payload.id, scope.scopeId);

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