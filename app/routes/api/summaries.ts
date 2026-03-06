import type { ActionFunction, LoaderFunction } from "react-router";
import crypto from "crypto";
import type { Event } from "~/types/tracker";
import {
    deleteSummary,
    insertSummary,
    listSummaries,
    type StoredSummary,
} from "~/utils/database.server";

interface SummariesData {
    summaries: StoredSummary[];
}

export const loader: LoaderFunction = async () => {
    return { summaries: await listSummaries() };
};

export const action: ActionFunction = async ({ request }) => {
    if (request.method === "POST") {
        const payload = (await request.json()) as Omit<StoredSummary, "id" | "createdAt">;
        const summary: StoredSummary = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            currentTime: payload.currentTime,
            summary: payload.summary,
            events: payload.events,
            teams: payload.teams,
            matchDay: payload.matchDay,
        };
        await insertSummary(summary);
        return { ok: true, id: summary.id };
    }

    if (request.method === "DELETE") {
        const payload = (await request.json()) as { id?: string };
        if (!payload.id) return { ok: false };
        await deleteSummary(payload.id);
        return { ok: true };
    }

    return null;
};