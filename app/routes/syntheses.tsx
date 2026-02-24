import fs from "fs";
import path from "path";
import { Link, useLoaderData } from "react-router";
import { useState, useLayoutEffect } from "react";

interface StoredSummaryListItem {
    id: string;
    createdAt: string;
    currentTime: number;
    summary: Record<string, number>;
    teams?: Array<{ id: string; name: string }>;
    matchDay?: number;
    events?: Array<{
        team?: { name: string };
    }>;
}

interface SummariesData {
    summaries: StoredSummaryListItem[];
}

const filePath = path.join(process.cwd(), "data", "summaries.json");

export async function loader() {
    try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        return JSON.parse(content) as SummariesData;
    } catch (e) {
        return { summaries: [] } as SummariesData;
    }
}

export function meta() {
    return [{ title: "Syntheses" }];
}

function FormattedDate({ dateString }: { dateString: string }) {
    const [formatted, setFormatted] = useState("");

    useLayoutEffect(() => {
        const date = new Date(dateString);
        const f = date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
        setFormatted(f);
    }, [dateString]);

    return <span suppressHydrationWarning>{formatted}</span>;
}

export default function SynthesesPage() {
    const data = useLoaderData<typeof loader>();
    const [summaries, setSummaries] = useState<StoredSummaryListItem[]>(() => data.summaries || []);
    const [deleteMessage, setDeleteMessage] = useState("");

    function displayTeamName(name: string) {
        return name.replace(/\s+J\d+$/, "");
    }

    function getTeamsLabel(
        teams?: Array<{ id: string; name: string }>,
        events?: Array<{ team?: { name: string } }>,
        matchDay?: number
    ) {
        let label = "";
        if (teams && teams.length > 0) {
            const names = teams.map((team) => displayTeamName(team.name));
            if (names.length >= 2) label = `${names[0]} vs ${names[1]}`;
            else if (names.length === 1) label = names[0];
        } else if (events && events.length > 0) {
            const names: string[] = [];
            for (const event of events) {
                if (!event.team?.name) continue;
                const cleaned = displayTeamName(event.team.name);
                if (!names.includes(cleaned)) {
                    names.push(cleaned);
                }
                if (names.length === 2) break;
            }
            if (names.length > 0) {
                label = names.length >= 2 ? `${names[0]} vs ${names[1]}` : names[0];
            }
        }
        if (matchDay) {
            return `J${matchDay} - ${label}`;
        }
        return label;
    }

    async function deleteSummary(id: string) {
        const confirmed = window.confirm("Supprimer cette synthese ?");
        if (!confirmed) return;
        try {
            await fetch("/api/summaries", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            setSummaries((prev) => prev.filter((item) => item.id !== id));
            setDeleteMessage("Synthese supprimee.");
        } catch (e) {
            setDeleteMessage("Impossible de supprimer la synthese.");
        }
    }

    return (
        <main className="p-6 max-w-screen-md mx-auto px-4 space-y-4">
            <h1 className="text-2xl font-bold">Anciennes syntheses</h1>
            {summaries.length === 0 ? (
                <p className="text-sm text-gray-600">Aucune synthese disponible.</p>
            ) : (
                <ul className="space-y-2">
                    {summaries.map((summary) => (
                        <li key={summary.id} className="border rounded p-3 flex items-center justify-between gap-2">
                            <Link
                                to={`/syntheses/${summary.id}`}
                                className="underline text-blue-600"
                            >
                                {getTeamsLabel(summary.teams, summary.events, summary.matchDay) || "Match"} (
                                <FormattedDate dateString={summary.createdAt} />
                                )
                            </Link>
                            <button
                                className="px-2 py-1 bg-red-500 text-white text-sm rounded"
                                onClick={() => deleteSummary(summary.id)}
                            >
                                Supprimer
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {deleteMessage && (
                <p className="text-sm text-green-700">{deleteMessage}</p>
            )}
            <Link to="/tracker" className="underline text-blue-600 text-sm">
                Retour au suivi
            </Link>
        </main>
    );
}
