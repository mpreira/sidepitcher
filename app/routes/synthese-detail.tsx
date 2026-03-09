import { Link, useLoaderData } from "react-router";
import { useLayoutEffect, useState } from "react";
import type { Event } from "~/types/tracker";
import { formatTimelineMoment } from "~/utils/TimeUtils";
import { exportSummaryToPdf } from "~/utils/EventUtils";
import { useTeams } from "~/context/TeamsContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowCircleLeft } from "@fortawesome/free-solid-svg-icons";
import { getSummaryById } from "~/utils/database.server";
import { resolveDataScopeFromRequest } from "~/utils/account.server";

interface StoredSummary {
    id: string;
    createdAt: string;
    currentTime: number;
    summary: Record<string, number>;
    events: Event[];
    teams?: Array<{ id: string; name: string }>;
    matchDay?: number;
}

export async function loader({ request, params }: { request: Request; params: { summaryId?: string } }) {
    const summaryId = params.summaryId;
    if (!summaryId) {
        throw new Response("Not Found", { status: 404 });
    }

    const scope = await resolveDataScopeFromRequest(request);
    const summary = (await getSummaryById(summaryId, scope.scopeId)) as StoredSummary | null;
    if (!summary) {
        throw new Response("Not Found", { status: 404 });
    }

    if (!scope.setCookieHeader) {
        return summary;
    }

    return Response.json(summary, {
        headers: {
            "Set-Cookie": scope.setCookieHeader,
        },
    });
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
    const EVENT_ICONS: Record<string, string> = {
        "Essai": "🏉",
        "Transformation": "🎯",
        "Pénalité réussie": "✅",
        "Pénalité manquée": "❌",
        "Drop": "🦶",
        "Essai de pénalité": "⚖️",
        "Carton jaune": "🟨",
        "Carton rouge": "🟥",
        "Carton orange": "🟧",
        "Changement": "🔁",
        "Saignement": "🩸",
        "Blessure": "🩹",
        "Arbitrage Vidéo": "📺",
        "Récapitulatif": "📝",
    };

    const displayTeamName = (name: string) => name.replace(/\s+J\d+$/, "");
    const displayEventTeamName = (eventTeam: Event["team"]) => {
        if (!eventTeam) return "";
        return eventTeam.nickname || displayTeamName(eventTeam.name);
    };

    const isCardEvent = (type: Event["type"]) =>
        type === "Carton jaune" || type === "Carton rouge" || type === "Carton orange";

    const formatEventTimeline = (event: Event) => {
        if (typeof event.timelineMinute === "number") {
            return formatTimelineMoment(
                event.timelineMinute,
                event.timelineAdditionalMinute || 0,
                event.timelineSecond || 0,
                event.timelineHalf
            );
        }

        const minute = Math.floor(event.time / 60);
        const second = event.time % 60;
        return formatTimelineMoment(minute, 0, second);
    };

    const formatSummaryStatLabel = (label: string, value: number) => {
        const forms: Record<string, { singular: string; plural: string }> = {
            "Essais": { singular: "Essai", plural: "Essais" },
            "Pénalités": { singular: "Pénalité", plural: "Pénalités" },
            "En-avants": { singular: "En-avant", plural: "En-avants" },
            "Touches volées": { singular: "Touche volée", plural: "Touches volées" },
            "Touches perdues": { singular: "Touche perdue", plural: "Touches perdues" },
            "Mêlées gagnées": { singular: "Mêlée gagnée", plural: "Mêlées gagnées" },
            "Mêlées perdues": { singular: "Mêlée perdue", plural: "Mêlées perdues" },
            "Turnovers": { singular: "Turnover", plural: "Turnovers" },
            "Offloads": { singular: "Offload", plural: "Offloads" },
            "Jeu au pied": { singular: "Jeu au pied", plural: "Jeux au pied" },
        };

        const form = forms[label];
        if (!form) return label;
        return value > 1 ? form.plural : form.singular;
    };

    function getEventLabel(event: Event): string {
        const icon = EVENT_ICONS[event.type] || "📍";

        if (event.type === "Arbitrage Vidéo") {
            return `${icon} ${event.type}${event.videoReason ? ` (${event.videoReason})` : ""}`;
        }

        return `${icon} ${event.type}`;
    }
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
            .find((event) => event.type === "Récapitulatif" && event.summaryTable);

        const selectedTeams = summary.teams || [];
        const teamIds = selectedTeams.map((team) => team.id);

        const triesByTeamId = new Map<string, number>();
        summary.events.forEach((event) => {
            if ((event.type === "Essai" || event.type === "Essai de pénalité") && event.team?.id) {
                triesByTeamId.set(event.team.id, (triesByTeamId.get(event.team.id) || 0) + 1);
            }
        });

        const getTryCountForIndex = (index: number) => {
            const teamId = teamIds[index];
            if (!teamId) return 0;
            return triesByTeamId.get(teamId) || 0;
        };

        if (!recapEvent?.summaryTable) {
            if (selectedTeams.length >= 2) {
                return {
                    leftTeam: {
                        teamName: displayTeamName(selectedTeams[0].name),
                        stats: [{ label: "Essais", value: getTryCountForIndex(0) }],
                    },
                    rightTeam: {
                        teamName: displayTeamName(selectedTeams[1].name),
                        stats: [{ label: "Essais", value: getTryCountForIndex(1) }],
                    },
                };
            }
            return null;
        }

        const [leftTeam, rightTeam] = recapEvent.summaryTable.teams;

        return {
            leftTeam: {
                teamName: leftTeam.teamName,
                stats: [{ label: "Essais", value: getTryCountForIndex(0) }, ...leftTeam.stats],
            },
            rightTeam: {
                teamName: rightTeam.teamName,
                stats: [{ label: "Essais", value: getTryCountForIndex(1) }, ...rightTeam.stats],
            },
        };
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white">
                        <div className="border border-neutral-700 bg-neutral-900 rounded p-3">
                            <h3 className="font-semibold mb-2">{teamStats.leftTeam.teamName}</h3>
                            <ul className="space-y-1 text-sm">
                                {teamStats.leftTeam.stats.map((stat, idx) => (
                                    <li key={`left-${idx}`}>
                                        <span>{formatSummaryStatLabel(stat.label, stat.value)}: </span>
                                        <span className="font-bold text-green-400">{stat.value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="border border-neutral-700 bg-neutral-900 rounded p-3">
                            <h3 className="font-semibold mb-2">{teamStats.rightTeam.teamName}</h3>
                            <ul className="space-y-1 text-sm">
                                {teamStats.rightTeam.stats.map((stat, idx) => (
                                    <li key={`right-${idx}`}>
                                        <span>{formatSummaryStatLabel(stat.label, stat.value)}: </span>
                                        <span className="font-bold text-blue-400">{stat.value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Faits de match</h2>
                {summary.events.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucun evenement.</p>
                ) : (
                    <ul className="space-y-1 text-white">
                        {summary.events.map((event, index) => (
                            <li key={`${event.time}-${index}`} className="flex flex-col gap-2 text-sm">
                                {event.summary && event.summaryTable ? (
                                    <div className="w-full space-y-2">
                                        <div>
                                            {formatEventTimeline(event)} - <strong>{event.summaryTable.halfLabel}</strong>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs sm:text-sm border border-neutral-700 rounded">
                                                <thead>
                                                    <tr className="bg-neutral-900">
                                                        <th className="w-1/2 px-2 py-1 text-left border-b border-neutral-700">{event.summaryTable.teams[0].teamName}</th>
                                                        <th className="w-1/2 px-2 py-1 text-left border-b border-neutral-700">{event.summaryTable.teams[1].teamName}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Array.from({ length: Math.max(event.summaryTable.teams[0].stats.length, event.summaryTable.teams[1].stats.length) }).map((_, idx) => {
                                                        const leftStat = event.summaryTable?.teams[0].stats[idx];
                                                        const rightStat = event.summaryTable?.teams[1].stats[idx];
                                                        return (
                                                            <tr key={idx} className="border-b border-neutral-800 last:border-b-0">
                                                                <td className="px-2 py-1">
                                                                    {leftStat ? (
                                                                        <>
                                                                            <span>{formatSummaryStatLabel(leftStat.label, leftStat.value)}: </span>
                                                                            <span className="font-bold text-green-400">{leftStat.value}</span>
                                                                        </>
                                                                    ) : "-"}
                                                                </td>
                                                                <td className="px-2 py-1">
                                                                    {rightStat ? (
                                                                        <>
                                                                            <span>{formatSummaryStatLabel(rightStat.label, rightStat.value)}: </span>
                                                                            <span className="font-bold text-blue-400">{rightStat.value}</span>
                                                                        </>
                                                                    ) : "-"}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <span>
                                        {formatEventTimeline(event)} - {getEventLabel(event)}
                                        {event.type !== "Arbitrage Vidéo" && event.player && (
                                            <>
                                                {isCardEvent(event.type) ? " pour " : " de "}
                                                <strong>{event.player.name}</strong>
                                            </>
                                        )}
                                        {event.team && ` ${displayEventTeamName(event.team)}`}
                                        {event.playerOut && event.playerIn && (
                                            <>
                                                {" — "}
                                                <strong>{event.playerOutNumber ? `#${event.playerOutNumber} ` : ""}{event.playerOut.name}</strong>
                                                {" → "}
                                                <strong>{event.playerInNumber ? `#${event.playerInNumber} ` : ""}{event.playerIn.name}</strong>
                                            </>
                                        )}
                                        {event.concussion && " 🚨 commotion"}
                                    </span>
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
