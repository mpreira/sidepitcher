import { Link, useLoaderData } from "react-router";
import { useState, useLayoutEffect } from "react";
import { useTeams } from "~/context/TeamsContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowCircleLeft, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { listSummaries } from "~/utils/database.server";
import { resolveAccountFromRequest } from "~/utils/account.server";

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

export async function loader({ request }: { request: Request }) {
    const resolved = await resolveAccountFromRequest(request);
    return { summaries: (await listSummaries(resolved.account.id)) as StoredSummaryListItem[] };
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
    const { teams: allTeams } = useTeams();

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
        } else if (matchDay && allTeams.length > 0) {
            const names: string[] = [];
            for (const team of allTeams) {
                if (!team.name.includes(`J${matchDay}`)) continue;
                const cleaned = displayTeamName(team.name);
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
        <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4 overflow-x-hidden">
            <h1 className="text-2xl font-bold">Anciennes syntheses</h1>
            {summaries.length === 0 ? (
                <p className="text-sm text-gray-600">Aucune synthese disponible.</p>
            ) : (
                <ul className="space-y-2">
                    {summaries.map((summary) => (
                        <li key={summary.id} className="border-b border-neutral-700 w-full rounded p-3 flex items-center justify-between gap-2">
                            <Link
                                to={`/syntheses/${summary.id}`}
                                className="text-white text-lg font-semibold min-w-0 break-words pr-2"
                            >
                                {getTeamsLabel(summary.teams, summary.events, summary.matchDay) || "Match"} (
                                <FormattedDate dateString={summary.createdAt} />
                                )
                            </Link>
                            <button
                                className="px-2 py-1 bg-red-500 text-white text-sm rounded"
                                onClick={() => deleteSummary(summary.id)}
                            >
                                <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {deleteMessage && (
                <p className="text-sm text-green-700">{deleteMessage}</p>
            )}
            <Link to="/tracker" className="text-white text-base font-medium">
                <FontAwesomeIcon icon={faArrowCircleLeft} className="mr-1" />
                Retour au suivi
            </Link>
        </main>
    );
}
