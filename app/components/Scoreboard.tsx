import React from "react";
import type { Team } from "~/types/tracker";

interface Props {
  teams: Team[];
  scores: number[];
  mainTimerText?: string;
  secondaryTimerText?: string;
}

export default function Scoreboard({
  teams,
  scores,
  mainTimerText,
  secondaryTimerText,
}: Props) {
  const displayScore = (idx: number) => scores[idx] || 0;
  const displayTeamName = (name: string) => name.replace(/\s+J\d+$/, "");

  return (
    <div className="shadow-lg rounded-lg overflow-hidden flex flex-col sm:flex-row items-stretch">
      {/* left team*/}
      <div className="flex-1 bg-blue-700 text-white p-6 flex flex-col items-center">
        {teams[0] ? (
          <>
            <div className="text-lg font-semibold mb-1">{displayTeamName(teams[0].name)}</div>
            <div className="text-6xl font-bold">{displayScore(0)}</div>
          </>
        ) : (
          <div className="text-lg italic">No team</div>
        )}
      </div>

      {/* timer / center */}
      <div className="bg-gray-900 text-white flex flex-col items-center justify-center px-8 py-6 gap-2">
        {mainTimerText && (
          <div className="text-5xl font-mono font-bold">{mainTimerText}</div>
        )}
        {secondaryTimerText && (
          <div className="text-2xl font-mono text-yellow-300">{secondaryTimerText}</div>
        )}
      </div>

      {/* right team */}
      <div className="flex-1 bg-red-700 text-white p-6 flex flex-col items-center">
        {teams[1] ? (
          <>
            <div className="text-lg font-semibold mb-1">{displayTeamName(teams[1].name)}</div>
            <div className="text-6xl font-bold">{displayScore(1)}</div>
          </>
        ) : (
          <div className="text-lg italic">No team</div>
        )}
      </div>
    </div>
  );
}
