import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import type { Event } from "~/types/tracker";
import { formatTime } from "~/utils/TimeUtils";

interface Props {
  events: Event[];
  remove: (index: number) => void;
}

export default function EventsList({ events, remove }: Props) {
  if (events.length === 0) {
    return <p>Aucune action enregistrée.</p>;
  }

  const displayTeamName = (name: string) => name.replace(/\s+J\d+$/, "");

  return (
    <ul className="space-y-1">
      {events.map((e, idx) => (
        <li key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-white">
          <span className="min-w-0 break-words">
            {e.summary ? (
              <>
                {formatTime(e.time)} - <strong>{e.summary}</strong>
              </>
            ) : (
              <>
                {e.type === "Arbitrage Vidéo" ? (
                  <>
                    {formatTime(e.time)} - {e.type}
                    {e.team && ` (${displayTeamName(e.team.name)})`}
                    {e.videoReason && ` — raison: ${e.videoReason}`}
                  </>
                ) : (
                  <>
                    {formatTime(e.time)} - {e.type} de{" "}
                    {e.player && (
                      <>
                        <strong>{e.player.name}</strong>
                        {e.playerNumber ? ` (#${e.playerNumber})` : ""}
                      </>
                    )}
                    {e.team && ` (${displayTeamName(e.team.name)})`}
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
