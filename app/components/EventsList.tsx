import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { useRef, useEffect, useState } from "react";
import type { Event } from "~/types/tracker";
import {
  displayTeamName,
  formatEventTimeline,
  formatSummaryStatLabel,
  getEventLabel,
  isCardEvent,
} from "~/utils/eventPresentation";

interface Props {
  events: Event[];
  remove: (index: number) => void;
}

export default function EventsList({ events, remove }: Props) {
  const prevCountRef = useRef(events.length);
  // We track a flash generation counter: when it's non-null, the first item
  // in the received list (index 0) is the newest and gets highlighted.
  const [flashGeneration, setFlashGeneration] = useState<number | null>(null);

  useEffect(() => {
    const currentCount = events.length;
    if (currentCount > prevCountRef.current) {
      const gen = Date.now();
      setFlashGeneration(gen);
      const timer = setTimeout(() => setFlashGeneration(null), 8000);
      prevCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = currentCount;
  }, [events.length]);

  if (events.length === 0) {
    return <p>Aucune action enregistrée.</p>;
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
                    <td className="px-2 py-1">
                      {leftStat ? (
                        <>
                          <span>{formatSummaryStatLabel(leftStat.label, leftStat.value)}: </span>
                          <span className="font-bold text-green-400">{leftStat.value}</span>
                        </>
                      ) : "-"}
                    </td>
                    <td className="px-2 py-1">
                      {rightStat ? (
                        <>
                          <span>{formatSummaryStatLabel(rightStat.label, rightStat.value)}: </span>
                          <span className="font-bold text-blue-400">{rightStat.value}</span>
                        </>
                      ) : "-"}
                    </td>
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
          <span className={`min-w-0 break-words${idx === 0 && flashGeneration !== null ? " new-event-flash" : ""}`}>
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
            className="sp-button sp-button-xs sp-button-red"
            onClick={() => remove(idx)}
          >
            <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
          </button>
        </li>
      ))}
    </ul>
  );
}
