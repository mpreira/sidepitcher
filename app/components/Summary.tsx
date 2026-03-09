import { faCopy, faDownload, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import type { Event, Team } from "~/types/tracker";
import { buildEventSummary, exportSummaryToClipboard, exportSummaryToPdf } from "~/utils/EventUtils";

interface Props {
    events: Event[];
    currentTime: number;
    teams: Team[];
    matchDay?: number;
    onSaved?: () => void;
}

export default function Summary({ events, currentTime, teams, matchDay, onSaved }: Props) {
    const summary = buildEventSummary(events);

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
            onSaved?.();
            alert("Synthese sauvegardee.");
        } catch (e) {
            alert("Impossible de sauvegarder la synthese.");
        }
    }

    return (
        <section className="space-y-2">
            <div className="mt-2 flex flex-col justify-center sm:flex-row gap-2">
                <button
                    className="bg-gradient-to-br from-green-400 to-green-600 px-4 py-2 text-white rounded w-full sm:w-auto"
                    onClick={saveSummary}
                >
                    <FontAwesomeIcon icon={faFloppyDisk} className="mr-2" />
                    Sauvegarder la synthese
                </button>
                <button
                    className="bg-gradient-to-br from-indigo-400 to-indigo-600 px-4 py-2 text-white rounded w-full sm:w-auto"
                    onClick={() => exportSummaryToClipboard(events, currentTime, summary)}
                >
                    <FontAwesomeIcon icon={faCopy} className="mr-2" />
                    Copier la synthèse
                </button>
                <button
                    className="bg-gradient-to-br from-gray-600 to-gray-800 px-4 py-2 text-white rounded w-full sm:w-auto"
                    onClick={() => exportSummaryToPdf(events, currentTime, summary)}
                >
                    <FontAwesomeIcon icon={faDownload} className="mr-2" />
                    Télécharger PDF
                </button>
            </div>
        </section>
    );
}
