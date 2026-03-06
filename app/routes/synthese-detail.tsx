import { Link, useLoaderData } from "react-router";
import { useLayoutEffect, useState } from "react";
import type { Event } from "~/types/tracker";
import { formatTime } from "~/utils/TimeUtils";
import { exportSummaryToPdf } from "~/utils/EventUtils";
import { useTeams } from "~/context/TeamsContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { getSummaryById } from "~/utils/database.server";

interface StoredSummary {
    id: string;
    createdAt: string;
    currentTime: number;
    summary: Record<string, number>;
    events: Event[];
    teams?: Array<{ id: string; name: string }>;
    matchDay?: number;
}

export async function loader({ params }: { params: { summaryId?: string } }) {
    const summaryId = params.summaryId;
    if (!summaryId) {
        throw new Response("Not Found", { status: 404 });
    }

    const summary = (await getSummaryById(summaryId)) as StoredSummary | null;
    if (!summary) {
        throw new Response("Not Found", { status: 404 });
    }
    return summary;
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

    const getTeamStatsFromRecap = () => {
        const recapEvent = [...summary.events]
            .reverse()
            .find((event) => event.type === "Récapitulatif" && event.summary);

        if (!recapEvent?.summary) return null;

        const [rawLeft, rawRight] = recapEvent.summary.split(" / ");
        if (!rawLeft || !rawRight) return null;

        const leftAfterHalf = rawLeft.includes(" : ")
            ? rawLeft.split(" : ").slice(1).join(" : ").trim()
            : rawLeft.trim();

        const parseTeamBlock = (block: string) => {
            const separatorIndex = block.indexOf(" : ");
            if (separatorIndex === -1) return null;

            const teamName = block.slice(0, separatorIndex).trim();
            const statsText = block.slice(separatorIndex + 3).trim();
            const stats = statsText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            return { teamName, stats };
        };

        const leftTeam = parseTeamBlock(leftAfterHalf);
        const rightTeam = parseTeamBlock(rawRight.trim());

        if (!leftTeam || !rightTeam) return null;

        return { leftTeam, rightTeam };
    };

    const teamStats = getTeamStatsFromRecap();

    return (
        <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4 overflow-x-hidden">
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
                <h2 className="font-semibold">Statistiques équipes</h2>
                {!teamStats ? (
                    <p className="text-sm text-gray-600">Statistiques par équipe indisponibles.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="border border-neutral-700 rounded p-3">
                            <h3 className="font-semibold mb-2">{teamStats.leftTeam.teamName}</h3>
                            <ul className="space-y-1 text-sm">
                                {teamStats.leftTeam.stats.map((stat, idx) => (
                                    <li key={`left-${idx}`}>{stat}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="border border-neutral-700 rounded p-3">
                            <h3 className="font-semibold mb-2">{teamStats.rightTeam.teamName}</h3>
                            <ul className="space-y-1 text-sm">
                                {teamStats.rightTeam.stats.map((stat, idx) => (
                                    <li key={`right-${idx}`}>{stat}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
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

            <Link to="/syntheses" className="text-white text-base">
                <FontAwesomeIcon icon={faArrowCircleLeft} className="mr-1" />
                Retour aux syntheses
            </Link>
        </main>
    );
}
