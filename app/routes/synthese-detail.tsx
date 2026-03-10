import { Link, useLoaderData } from "react-router";
import { useLayoutEffect, useState } from "react";
import type { Event } from "~/types/tracker";
import { formatTimelineMoment } from "~/utils/TimeUtils";
import { exportSummaryToPdf } from "~/utils/EventUtils";
import { useTeams } from "~/context/TeamsContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowCircleLeft, faDownload } from "@fortawesome/free-solid-svg-icons";
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
    const STAT_LABEL_ORDER = [
        "Essais",
        "Pénalités",
        "En-avants",
        "Touches volées",
        "Touches perdues",
        "Mêlées gagnées",
        "Mêlées perdues",
        "Turnovers",
        "Offloads",
        "Jeu au pied",
    ];
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

    const getOrderedTeams = () => {
        const storedTeams = summary.teams || [];
        if (storedTeams.length >= 2) {
            return storedTeams.slice(0, 2).map((team) => ({ id: team.id, name: displayTeamName(team.name) }));
        }

        const inferred: Array<{ id: string; name: string }> = [];
        for (const event of summary.events) {
            if (!event.team?.id || !event.team.name) continue;
            if (inferred.some((team) => team.id === event.team?.id)) continue;
            inferred.push({ id: event.team.id, name: displayTeamName(event.team.name) });
            if (inferred.length === 2) break;
        }

        if (inferred.length >= 2) {
            return inferred;
        }

        if (summary.matchDay) {
            const fallback: Array<{ id: string; name: string }> = [];
            for (const team of allTeams) {
                if (!team.name.includes(`J${summary.matchDay}`)) continue;
                if (fallback.some((entry) => entry.id === team.id)) continue;
                fallback.push({ id: team.id, name: displayTeamName(team.name) });
                if (fallback.length === 2) break;
            }
            return fallback;
        }

        return inferred;
    };

    const orderedTeams = getOrderedTeams();

    const getSummaryByTeam = () => {
        if (orderedTeams.length < 2) return null;

        const counters = [new Map<string, number>(), new Map<string, number>()];

        summary.events.forEach((event) => {
            if (!event.team?.id) return;
            if (event.type === "Récapitulatif" || event.summaryTable || event.summary) return;

            const teamIndex = orderedTeams.findIndex((team) => team.id === event.team?.id);
            if (teamIndex === -1) return;

            const current = counters[teamIndex].get(event.type) || 0;
            counters[teamIndex].set(event.type, current + 1);
        });

        return {
            leftTeam: {
                teamName: orderedTeams[0].name,
                values: counters[0],
            },
            rightTeam: {
                teamName: orderedTeams[1].name,
                values: counters[1],
            },
        };
    };

    const getTeamStatsByHalf = () => {
        if (orderedTeams.length < 2) return null;

        type StatHalfValue = { mt1: number; mt2: number };
        const teamStats = [new Map<string, StatHalfValue>(), new Map<string, StatHalfValue>()];

        const ensureStat = (teamIndex: number, label: string) => {
            const current = teamStats[teamIndex].get(label);
            if (current) return current;
            const next = { mt1: 0, mt2: 0 };
            teamStats[teamIndex].set(label, next);
            return next;
        };

        summary.events.forEach((event) => {
            if ((event.type === "Essai" || event.type === "Essai de pénalité") && event.team?.id) {
                const teamIndex = orderedTeams.findIndex((team) => team.id === event.team?.id);
                if (teamIndex === -1) return;

                const half = event.timelineHalf || (event.time >= 40 * 60 ? 2 : 1);
                const tries = ensureStat(teamIndex, "Essais");
                if (half === 1) tries.mt1 += 1;
                else tries.mt2 += 1;
            }
        });

        summary.events.forEach((event) => {
            if (event.type !== "Récapitulatif" || !event.summaryTable) return;

            const half = event.summaryTable.halfLabel.toUpperCase().includes("2") ? 2 : 1;
            event.summaryTable.teams.slice(0, 2).forEach((team, teamIndex) => {
                team.stats.forEach((stat) => {
                    const values = ensureStat(teamIndex, stat.label);
                    if (half === 1) values.mt1 = stat.value;
                    else values.mt2 = stat.value;
                });
            });
        });

        const sortStats = (entries: Array<[string, StatHalfValue]>) => {
            return entries.sort((first, second) => {
                const firstIndex = STAT_LABEL_ORDER.indexOf(first[0]);
                const secondIndex = STAT_LABEL_ORDER.indexOf(second[0]);

                if (firstIndex === -1 && secondIndex === -1) {
                    return first[0].localeCompare(second[0], "fr", { sensitivity: "base" });
                }
                if (firstIndex === -1) return 1;
                if (secondIndex === -1) return -1;
                return firstIndex - secondIndex;
            });
        };

        return {
            leftTeam: {
                teamName: orderedTeams[0].name,
                stats: sortStats(Array.from(teamStats[0].entries())),
            },
            rightTeam: {
                teamName: orderedTeams[1].name,
                stats: sortStats(Array.from(teamStats[1].entries())),
            },
        };
    };

    const recapStats = getTeamStatsByHalf();
    const summaryByTeam = getSummaryByTeam();
    const factEvents = summary.events.filter((event) => !(event.type === "Récapitulatif" || event.summaryTable || event.summary));

    return (
        <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4 overflow-x-hidden">
            <h1 className="text-2xl font-bold">Synthèse - {getTeamsLabel()}</h1>
            <p className="text-sm text-gray-700">
                Date: <FormattedDateTime dateString={summary.createdAt} />
            </p>
            <Link to="/syntheses" className="text-white text-base">
                <FontAwesomeIcon icon={faArrowCircleLeft} className="mr-1" />
                Retour aux synthèses
            </Link>
            <br /><br /> 
            <button
                className="px-4 py-2 bg-gray-800 text-white rounded w-full sm:w-auto"
                onClick={() =>
                    exportSummaryToPdf(summary.events, summary.currentTime, summary.summary, {
                        title: `Synthèse - ${getTeamsLabel()}`,
                        fileName: getTeamsLabel(),
                        layout: {
                            dateLine: `Date: ${new Date(summary.createdAt).toLocaleString("fr-FR")}`,
                            resumeColumns: summaryByTeam
                                ? [
                                    {
                                        title: summaryByTeam.leftTeam.teamName,
                                        lines:
                                            Array.from(summaryByTeam.leftTeam.values.entries()).map(
                                                ([type, count]) => `${type}: ${count}`
                                            ) || [],
                                    },
                                    {
                                        title: summaryByTeam.rightTeam.teamName,
                                        lines:
                                            Array.from(summaryByTeam.rightTeam.values.entries()).map(
                                                ([type, count]) => `${type}: ${count}`
                                            ) || [],
                                    },
                                ]
                                : undefined,
                            statsColumns: recapStats
                                ? [
                                    {
                                        title: recapStats.leftTeam.teamName,
                                        lines: recapStats.leftTeam.stats.map(
                                            ([label, values]) =>
                                                `${formatSummaryStatLabel(label, values.mt2 || values.mt1)}: ${values.mt1} -> ${values.mt2}`
                                        ),
                                    },
                                    {
                                        title: recapStats.rightTeam.teamName,
                                        lines: recapStats.rightTeam.stats.map(
                                            ([label, values]) =>
                                                `${formatSummaryStatLabel(label, values.mt2 || values.mt1)}: ${values.mt1} -> ${values.mt2}`
                                        ),
                                    },
                                ]
                                : undefined,
                            factsTitle: "Faits de match",
                            factLines: factEvents.map((event) => {
                                let line = `${formatEventTimeline(event)} - ${getEventLabel(event)}`;

                                if (event.type !== "Arbitrage Vidéo" && event.player) {
                                    line += `${isCardEvent(event.type) ? " pour " : " de "}${event.player.name}`;
                                }
                                if (event.team) {
                                    line += ` ${displayEventTeamName(event.team)}`;
                                }
                                if (event.playerOut && event.playerIn) {
                                    line += ` - ${event.playerOutNumber ? `#${event.playerOutNumber} ` : ""}${event.playerOut.name}`;
                                    line += ` -> ${event.playerInNumber ? `#${event.playerInNumber} ` : ""}${event.playerIn.name}`;
                                }
                                if (event.concussion) {
                                    line += " - commotion";
                                }

                                return line;
                            }),
                        },
                    })
                }
            >
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Télécharger PDF
            </button>

            <section className="space-y-2">
                <h2 className="font-semibold">Résumé</h2>
                {!summaryByTeam ? (
                    <p className="text-sm text-gray-600">Résumé par équipe indisponible.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white">
                        <div className="border border-neutral-700 bg-neutral-900 rounded p-3">
                            <h3 className="font-semibold mb-2">{summaryByTeam.leftTeam.teamName}</h3>
                            {summaryByTeam.leftTeam.values.size === 0 ? (
                                <p className="text-sm text-gray-400">Aucun événement d'équipe.</p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {Array.from(summaryByTeam.leftTeam.values.entries()).map(([type, count]) => (
                                        <li key={`summary-left-${type}`}>
                                            <span>{type}: </span>
                                            <span className="font-bold text-green-400">{count}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="border border-neutral-700 bg-neutral-900 rounded p-3">
                            <h3 className="font-semibold mb-2">{summaryByTeam.rightTeam.teamName}</h3>
                            {summaryByTeam.rightTeam.values.size === 0 ? (
                                <p className="text-sm text-gray-400">Aucun événement d'équipe.</p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {Array.from(summaryByTeam.rightTeam.values.entries()).map(([type, count]) => (
                                        <li key={`summary-right-${type}`}>
                                            <span>{type}: </span>
                                            <span className="font-bold text-blue-400">{count}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Statistiques équipes</h2>
                {!recapStats ? (
                    <p className="text-sm text-gray-600">Statistiques par équipe indisponibles.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white">
                        <div className="border border-neutral-700 bg-neutral-900 rounded p-3">
                            <h3 className="font-semibold mb-2">{recapStats.leftTeam.teamName}</h3>
                            <ul className="space-y-1 text-sm">
                                {recapStats.leftTeam.stats.map(([label, values], idx) => (
                                    <li key={`left-${idx}`}>
                                        <span>{formatSummaryStatLabel(label, values.mt2 || values.mt1)}: </span>
                                        <span className="font-bold text-green-400">{values.mt1} -&gt; {values.mt2}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="border border-neutral-700 bg-neutral-900 rounded p-3">
                            <h3 className="font-semibold mb-2">{recapStats.rightTeam.teamName}</h3>
                            <ul className="space-y-1 text-sm">
                                {recapStats.rightTeam.stats.map(([label, values], idx) => (
                                    <li key={`right-${idx}`}>
                                        <span>{formatSummaryStatLabel(label, values.mt2 || values.mt1)}: </span>
                                        <span className="font-bold text-blue-400">{values.mt1} -&gt; {values.mt2}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Faits de match</h2>
                {factEvents.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucun événement.</p>
                ) : (
                    <ul className="space-y-1 text-white">
                        {factEvents.map((event, index) => (
                            <li key={`${event.time}-${index}`} className="flex flex-col gap-2 text-sm">
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
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
