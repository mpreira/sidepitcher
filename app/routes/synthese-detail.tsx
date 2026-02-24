import fs from "fs";
import path from "path";
import { Link, useLoaderData } from "react-router";
import type { Event } from "~/routes/tracker.types";
import { formatTime } from "~/utils/TimeUtils";

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

export async function loader({ params }: { params: { summaryId?: string } }) {
    const summaryId = params.summaryId;
    try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const data = JSON.parse(content) as SummariesData;
        const summary = data.summaries.find((item) => item.id === summaryId);
        if (!summary) {
            throw new Response("Not Found", { status: 404 });
        }
        return summary;
    } catch (e) {
        throw new Response("Not Found", { status: 404 });
    }
}

export function meta() {
    return [{ title: "Synthese" }];
}

export default function SyntheseDetailPage() {
    const summary = useLoaderData<typeof loader>();

    return (
        <main className="p-6 max-w-screen-md mx-auto px-4 space-y-4">
            <h1 className="text-2xl font-bold">Synthese</h1>
            <p className="text-sm text-gray-700">
                Date: {new Date(summary.createdAt).toLocaleString("fr-FR")}
            </p>

            <section className="space-y-2">
                <h2 className="font-semibold">Resume</h2>
                {Object.keys(summary.summary).length === 0 ? (
                    <p className="text-sm text-gray-600">Pas de donnees.</p>
                ) : (
                    <ul className="space-y-1">
                        {Object.entries(summary.summary).map(([type, count]) => (
                            <li key={type}>
                                {type}: {count}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Timeline</h2>
                {summary.events.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucun evenement.</p>
                ) : (
                    <ul className="space-y-1">
                        {summary.events.map((event, index) => (
                            <li key={`${event.time}-${index}`}>
                                {formatTime(event.time)} - {event.type}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <Link to="/syntheses" className="underline text-blue-600 text-sm">
                Retour aux syntheses
            </Link>
        </main>
    );
}
