import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import type { Event } from "~/types/tracker";
import { formatTimelineMoment } from "~/utils/TimeUtils";

interface Props {
  events: Event[];
  remove: (index: number) => void;
}

export default function EventsList({ events, remove }: Props) {
  if (events.length === 0) {
    return <p>Aucune action enregistrée.</p>;
  }

  const displayTeamName = (team: Event["team"]) => {
    if (!team) return "";
    return team.nickname || team.name.replace(/\s+J\d+$/, "");
  };

  const formatEventTimeline = (event: Event) => {
    if (typeof event.timelineMinute === "number") {
      return formatTimelineMoment(
        event.timelineMinute,
        event.timelineAdditionalMinute || 0,
        event.timelineSecond || 0
      );
    }

    const minute = Math.floor(event.time / 60);
    const second = event.time % 60;
    return formatTimelineMoment(minute, 0, second);
  };

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

  function getEventLabel(event: Event): string {
    const icon = EVENT_ICONS[event.type] || "📍";

    if (event.type === "Arbitrage Vidéo") {
      return `${icon} ${event.type}${event.videoReason ? ` (${event.videoReason})` : ""}`;
    }

    return `${icon} ${event.type}`;
  }

  return (
    <ul className="space-y-1">
      {events.map((e, idx) => (
        <li key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-white">
          <span className="min-w-0 break-words">
            {e.summary ? (
              <>
                {formatEventTimeline(e)} - <strong>{e.summary}</strong>
              </>
            ) : (
              <>
                {formatEventTimeline(e)} - {getEventLabel(e)}
                {e.type !== "Arbitrage Vidéo" && e.player && (
                  <>
                    {" de "}
                    <strong>{e.player.name}</strong>
                    
                  </>
                )}
                {e.team && ` ${displayTeamName(e.team)}`}
                {e.playerOut && e.playerIn && (
                  <>
                    {" — "}
                    <strong>{e.playerNumber ? ` ${e.playerNumber} ` : "" } {e.playerOut.name}</strong>
                    {" → "}
                    <strong>{e.playerNumber ? ` ${e.playerNumber} ` : "" } {e.playerIn.name}</strong>
                  </>
                )}
                {e.concussion && " 🚨 commotion"}
              </>
            )}
          </span>
          <button
            className="text-red-600 text-sm px-2 py-1"
            onClick={() => remove(idx)}
          >
            <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
          </button>
        </li>
      ))}
    </ul>
  );
}
