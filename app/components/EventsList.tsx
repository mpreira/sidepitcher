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
      return formatTimelineMoment(event.timelineMinute, event.timelineAdditionalMinute || 0);
    }

    return `${Math.floor(event.time / 60)}'`;
  };

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
                {e.type === "Arbitrage Vidéo" ? (
                  <>
                    {formatEventTimeline(e)} - {e.type}
                    {e.team && ` (${displayTeamName(e.team)})`}
                    {e.videoReason && ` — TMO - ${e.videoReason}`}
                  </>
                ) : (
                  <>
                    {formatEventTimeline(e)} - {e.type} de{" "}
                    {e.player && (
                      <>
                        <strong>{e.player.name}</strong>
                        {e.playerNumber ? ` (#${e.playerNumber})` : ""}
                      </>
                    )}
                    {e.team && ` (${displayTeamName(e.team)})`}
                  </>
                )}
                {e.playerOut && e.playerIn && (
                  <>
                    {" — "}
                    <strong>{e.playerOut.name}</strong>
                    {" → "}
                    <strong>{e.playerIn.name}</strong>
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
