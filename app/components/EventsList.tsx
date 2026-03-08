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

  const isCardEvent = (type: Event["type"]) =>
    type === "Carton jaune" || type === "Carton rouge" || type === "Carton orange";

  function getEventLabel(event: Event): string {
    const icon = EVENT_ICONS[event.type] || "📍";

    if (event.type === "Arbitrage Vidéo") {
      return `${icon} ${event.type}${event.videoReason ? ` (${event.videoReason})` : ""}`;
    }

    return `${icon} ${event.type}`;
  }

  function renderSummaryEvent(event: Event) {
    if (!event.summaryTable) {
      return (
        <>
          {formatEventTimeline(event)} - <strong>{event.summary}</strong>
        </>
      );
    }

    const [leftTeam, rightTeam] = event.summaryTable.teams;
    const rowCount = Math.max(leftTeam.stats.length, rightTeam.stats.length);

    return (
      <div className="w-full space-y-2">
        <div>
          {formatEventTimeline(event)} - <strong>{event.summaryTable.halfLabel}</strong>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border border-neutral-700 rounded">
            <thead>
              <tr className="bg-neutral-900">
                <th className="w-1/2 px-2 py-1 text-left border-b border-neutral-700">{leftTeam.teamName}</th>
                <th className="w-1/2 px-2 py-1 text-left border-b border-neutral-700">{rightTeam.teamName}</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, idx) => {
                const leftStat = leftTeam.stats[idx];
                const rightStat = rightTeam.stats[idx];
                return (
                  <tr key={idx} className="border-b border-neutral-800 last:border-b-0">
                    <td className="px-2 py-1">{leftStat ? `${leftStat.label}: ${leftStat.value}` : "-"}</td>
                    <td className="px-2 py-1">{rightStat ? `${rightStat.label}: ${rightStat.value}` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {events.map((e, idx) => (
        <li key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-white">
          <span className="min-w-0 break-words">
            {e.summary ? (
              renderSummaryEvent(e)
            ) : (
              <>
                {formatEventTimeline(e)} - {getEventLabel(e)}
                {e.type !== "Arbitrage Vidéo" && e.player && (
                  <>
                    {isCardEvent(e.type) ? " pour " : " de "}
                    <strong>{e.player.name}</strong>
                    
                  </>
                )}
                {e.team && ` ${displayTeamName(e.team)}`}
                {e.playerOut && e.playerIn && (
                  <>
                    {" — "}
                    <strong>{e.playerOutNumber ? `#${e.playerOutNumber} ` : ""}{e.playerOut.name}</strong>
                    {" → "}
                    <strong>{e.playerInNumber ? `#${e.playerInNumber} ` : ""}{e.playerIn.name}</strong>
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
