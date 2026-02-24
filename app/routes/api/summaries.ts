import type { ActionFunction, LoaderFunction } from "react-router";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Event } from "~/routes/tracker.types";

interface StoredSummary {
    id: string;
    createdAt: string;
    currentTime: number;
    summary: Record<string, number>;
    events: Event[];
}

interface SummariesData {
    summaries: StoredSummary[];
}

const filePath = path.join(process.cwd(), "data", "summaries.json");

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
    return readSummaries();
};

export const action: ActionFunction = async ({ request }) => {
    const data = await readSummaries();

    if (request.method === "POST") {
        const payload = (await request.json()) as Omit<StoredSummary, "id" | "createdAt">;
        const summary: StoredSummary = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            currentTime: payload.currentTime,
            summary: payload.summary,
            events: payload.events,
        };
        data.summaries.unshift(summary);
        await writeSummaries(data);
        return { ok: true, id: summary.id };
    }

    if (request.method === "DELETE") {
        const payload = (await request.json()) as { id?: string };
        if (!payload.id) return { ok: false };
        data.summaries = data.summaries.filter((item) => item.id !== payload.id);
        await writeSummaries(data);
        return { ok: true };
    }

    return null;
};