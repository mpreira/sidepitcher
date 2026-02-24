import React from "react";
import type { Event } from "~/routes/tracker.types";
import { buildEventSummary, exportSummaryToClipboard, exportSummaryToPdf } from "~/utils/EventUtils";

interface Props {
    events: Event[];
    currentTime: number;
}

export default function Summary({ events, currentTime }: Props) {
    const summary = buildEventSummary(events);

    return (
        <section className="space-y-2">
            <h2 className="font-semibold">Synthèse</h2>
            {Object.keys(summary).length === 0 ? (
                <p>Pas de données.</p>
            ) : (
                <ul>
                    {Object.entries(summary).map(([type, count]) => (
                        <li key={type}>
                            {type}: {count}
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
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
