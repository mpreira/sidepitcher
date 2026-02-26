import React from "react";
import type { Event, Team } from "~/types/tracker";
import { buildEventSummary, buildDetailedEventSummary, exportSummaryToClipboard, exportSummaryToPdf } from "~/utils/EventUtils";
import { formatTime } from "~/utils/TimeUtils";

interface Props {
    events: Event[];
    currentTime: number;
    teams: Team[];
    matchDay?: number;
}

export default function Summary({ events, currentTime, teams, matchDay }: Props) {
    const summary = buildEventSummary(events);
    const detailedSummary = buildDetailedEventSummary(events);

    async function saveSummary() {
        try {
            await fetch("/api/summaries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentTime,
                    summary,
                    events,
                    teams: teams.map((team) => ({ id: team.id, name: team.name })),
                    matchDay,
                }),
            });
            alert("Synthese sauvegardee.");
        } catch (e) {
            alert("Impossible de sauvegarder la synthese.");
        }
    }

    return (
        <section className="space-y-2">
            <h2 className="font-semibold">Synthèse</h2>
            {detailedSummary.length === 0 ? (
                <p>Pas de données.</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {detailedSummary.map((event, idx) => (
                        <li key={idx}>
                            {event.summary ? (
                                <span className="font-bold text-blue-700">{event.summary}</span>
                            ) : (
                                <>
                                    <span className="font-semibold">{event.type}</span>
                                    {event.team && <span> ({event.team})</span>}
                                    {event.player && <span> — {event.player}{event.playerNumber ? ` (#${event.playerNumber})` : ""}</span>}
                                    {event.playerOut && event.playerIn && <span> — {event.playerOut} → {event.playerIn}</span>}
                                    {event.concussion && <span> 🚨 commotion</span>}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <button
                    className="px-4 py-2 bg-green-600 text-white rounded w-full sm:w-auto"
                    onClick={saveSummary}
                >
                    Sauvegarder la synthese
                </button>
                <button
                    className="px-4 py-2 bg-indigo-600 text-white rounded w-full sm:w-auto"
                    onClick={() => exportSummaryToClipboard(events, currentTime, summary)}
                >
                    Copier la synthèse
                </button>
                <button
                    className="px-4 py-2 bg-gray-800 text-white rounded w-full sm:w-auto"
                    onClick={() => exportSummaryToPdf(events, currentTime, summary)}
                >
                    Télécharger PDF
                </button>
            </div>
        </section>
    );
}
