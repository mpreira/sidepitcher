import React from "react";
import type { Event } from "~/routes/tracker.types";
import { jsPDF } from "jspdf";

interface Props {
    events: Event[];
    currentTime: number;
}

export default function Summary({ events, currentTime }: Props) {
    const summary = events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    function formatTime(sec: number) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function exportSummary() {
        const lines = [`Match summary (time ${formatTime(currentTime)})`];
        for (const [type, count] of Object.entries(summary)) {
        lines.push(`${type}: ${count}`);
        }
        lines.push("\nEvent timeline:");
        events.forEach((e) => {
        let line = `${formatTime(e.time)} - ${e.type}`;
        if (e.team) line += ` (${e.team.name})`;
        if (e.player)
            line += ` — ${e.player.name}${e.playerNumber ? ` (#${e.playerNumber})` : ""}`;
        if (e.playerOut && e.playerIn)
            line += ` — ${e.playerOut.name} → ${e.playerIn.name}`;
        if (e.concussion) line += " 🚨 commotion";
        lines.push(line);
        });
        const text = lines.join("\n");
        navigator.clipboard.writeText(text).catch(() => {});
        alert("Summary copied to clipboard");
    }

    function downloadPdf() {
        const doc = new jsPDF();
        let y = 10;
        doc.setFontSize(12);
        doc.text(`Match summary (time ${formatTime(currentTime)})`, 10, y);
        y += 10;
        for (const [type, count] of Object.entries(summary)) {
            doc.text(`${type}: ${count}`, 10, y);
            y += 7;
        }
        y += 5;
        doc.text("Event timeline:", 10, y);
        y += 7;
        events.forEach((e) => {
            let line = `${formatTime(e.time)} - ${e.type}`;
            if (e.team) line += ` (${e.team.name})`;
            if (e.player)
                line += ` — ${e.player.name}${e.playerNumber ? ` (#${e.playerNumber})` : ""}`;
            if (e.playerOut && e.playerIn)
                line += ` — ${e.playerOut.name} → ${e.playerIn.name}`;
            if (e.concussion) line += " 🚨 commotion";
            doc.text(line, 10, y);
            y += 7;
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
        });
        doc.save("summary.pdf");
    }

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
            onClick={exportSummary}
          >
            Copier la synthèse
          </button>
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded w-full sm:w-auto"
            onClick={downloadPdf}
          >
            Télécharger PDF
          </button>
        </div>
        </section>
    );
}
