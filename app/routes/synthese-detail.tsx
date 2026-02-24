import fs from "fs";
import path from "path";
import { Link, useLoaderData } from "react-router";
import { useLayoutEffect, useState } from "react";
import type { Event } from "~/routes/tracker.types";
import { formatTime } from "~/utils/TimeUtils";
import { exportSummaryToPdf } from "~/utils/EventUtils";
import { useTeams } from "~/context/TeamsContext";

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

function FormattedDateTime({ dateString }: { dateString: string }) {
    const [formatted, setFormatted] = useState("");

    useLayoutEffect(() => {
        const date = new Date(dateString);
        setFormatted(date.toLocaleString("fr-FR"));
    }, [dateString]);

    return <span suppressHydrationWarning>{formatted}</span>;
}

export default function SyntheseDetailPage() {
    const summary = useLoaderData<typeof loader>();
    const { teams: allTeams } = useTeams();

    const displayTeamName = (name: string) => name.replace(/\s+J\d+$/, "");
    const getTeamsLabel = () => {
        const storedTeams: Array<{ id: string; name: string }> = summary.teams || [];
        let teamsLabel = "";
        if (storedTeams.length > 0) {
            const names = storedTeams.map((team) => displayTeamName(team.name));
            if (names.length >= 2) teamsLabel = `${names[0]} vs ${names[1]}`;
            else if (names.length === 1) teamsLabel = names[0];
        } else {
            const names: string[] = [];
            for (const event of summary.events) {
                if (!event.team?.name) continue;
                const cleaned = displayTeamName(event.team.name);
                if (!names.includes(cleaned)) {
                    names.push(cleaned);
                }
                if (names.length === 2) break;
            }
            if (names.length === 0 && summary.matchDay) {
                const fallback: string[] = [];
                for (const team of allTeams) {
                    if (!team.name.includes(`J${summary.matchDay}`)) continue;
                    const cleaned = displayTeamName(team.name);
                    if (!fallback.includes(cleaned)) {
                        fallback.push(cleaned);
                    }
                    if (fallback.length === 2) break;
                }
                if (fallback.length === 1) teamsLabel = fallback[0];
                else if (fallback.length >= 2) teamsLabel = `${fallback[0]} vs ${fallback[1]}`;
                else teamsLabel = "Match";
            } else if (names.length === 0) {
                teamsLabel = "Match";
            } else if (names.length === 1) teamsLabel = names[0];
            else teamsLabel = `${names[0]} vs ${names[1]}`;
        }
        
        if (summary.matchDay) {
            return `J${summary.matchDay} - ${teamsLabel}`;
        }
        return teamsLabel;
    };

    return (
        <main className="p-6 max-w-screen-md mx-auto px-4 space-y-4">
            <h1 className="text-2xl font-bold">Synthèse - {getTeamsLabel()}</h1>
            <p className="text-sm text-gray-700">
                Date: <FormattedDateTime dateString={summary.createdAt} />
            </p>
            <button
                className="px-4 py-2 bg-gray-800 text-white rounded w-full sm:w-auto"
                onClick={() => exportSummaryToPdf(summary.events, summary.currentTime, summary.summary)}
            >
                Télécharger PDF
            </button>

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
                    <ul className="space-y-1 text-sm">
                        {summary.events.map((event, index) => (
                            <li key={`${event.time}-${index}`}>
                                {event.summary ? (
                                    <>
                                        {formatTime(event.time)} - <span className="font-bold text-blue-700">{event.summary}</span>
                                    </>
                                ) : (
                                    <>
                                        {formatTime(event.time)} - <span className="font-semibold">{event.type}</span>
                                        {event.team && <span> ({displayTeamName(event.team.name)})</span>}
                                        {event.player && <span> — {event.player.name}{event.playerNumber ? ` (#${event.playerNumber})` : ""}</span>}
                                        {event.playerOut && event.playerIn && <span> — {event.playerOut.name} → {event.playerIn.name}</span>}
                                        {event.concussion && <span> 🚨 commotion</span>}
                                    </>
                                )}
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
