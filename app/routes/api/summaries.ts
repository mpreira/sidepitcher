import type { ActionFunction, LoaderFunction } from "react-router";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Event } from "~/types/tracker";
import { dbQuery, hasDatabase } from "data/serverDb";

interface StoredSummary {
    id: string;
    createdAt: string;
    currentTime: number;
    summary: Record<string, number>;
    events: Event[];
    teams?: Array<{ id: string; name: string }>;
    matchDay?: number;
}

interface SummariesData {
    summaries: StoredSummary[];
}

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "summaries.json");
const allowSummaryDelete = process.env.ALLOW_SUMMARY_DELETE === "true";

async function readSummaries(): Promise<SummariesData> {
    try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        return JSON.parse(content) as SummariesData;
    } catch (e) {
        return { summaries: [] };
    }
}

async function writeSummaries(data: SummariesData): Promise<void> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export const loader: LoaderFunction = async () => {
    if (hasDatabase) {
        const rows = await dbQuery<{
            id: string;
            created_at: string;
            current_time: number;
            summary: Record<string, number>;
            events: Event[];
            teams?: Array<{ id: string; name: string }>;
            match_day?: number;
        }>(
            `
            SELECT id, created_at, current_time, summary, events, teams, match_day
            FROM summaries
            ORDER BY created_at DESC
            `
        );

        return {
            summaries: rows.map((row) => ({
                id: row.id,
                createdAt: row.created_at,
                currentTime: row.current_time,
                summary: row.summary,
                events: row.events,
                teams: row.teams,
                matchDay: row.match_day,
            })),
        } as SummariesData;
    }

    return readSummaries();
};

export const action: ActionFunction = async ({ request }) => {
    const data = hasDatabase ? { summaries: [] as StoredSummary[] } : await readSummaries();

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

        if (hasDatabase) {
            await dbQuery(
                `
                INSERT INTO summaries (id, created_at, current_time, summary, events, teams, match_day)
                VALUES ($1, $2::timestamptz, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
                `,
                [
                    summary.id,
                    summary.createdAt,
                    summary.currentTime,
                    JSON.stringify(summary.summary),
                    JSON.stringify(summary.events),
                    JSON.stringify(summary.teams ?? null),
                    summary.matchDay ?? null,
                ]
            );
        } else {
            data.summaries.unshift(summary);
            await writeSummaries(data);
        }

        return { ok: true, id: summary.id };
    }

    if (request.method === "DELETE") {
        if (!allowSummaryDelete) {
            return { ok: false, message: "Suppression désactivée pour conserver les synthèses." };
        }
        const payload = (await request.json()) as { id?: string };
        if (!payload.id) return { ok: false };

        if (hasDatabase) {
            await dbQuery("DELETE FROM summaries WHERE id = $1", [payload.id]);
        } else {
            data.summaries = data.summaries.filter((item) => item.id !== payload.id);
            await writeSummaries(data);
        }

        return { ok: true };
    }

    return null;
};