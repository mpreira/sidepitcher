import React from "react";
import type { Event } from "~/routes/tracker.types";

interface Props {
  events: Event[];
  remove: (index: number) => void;
}

export default function EventsList({ events, remove }: Props) {
  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (events.length === 0) {
    return <p>Aucune action enregistrée.</p>;
  }

  return (
    <ul className="space-y-1">
      {events.map((e, idx) => (
        <li key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>
            {formatTime(e.time)} - {e.type}
            {e.team && ` (${e.team.name})`}
            {e.player && ` — ${e.player.name}${e.playerNumber ? ` (#${e.playerNumber})` : ""}`}
            {e.playerOut && e.playerIn &&
              ` — ${e.playerOut.name} → ${e.playerIn.name}`}
            {e.concussion && " 🚨 commotion"}
          </span>
          <button
            className="text-red-600 hover:underline"
            onClick={() => remove(idx)}
          >
            supprimer
          </button>
        </li>
      ))}
    </ul>
  );
}
