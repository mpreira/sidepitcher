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

  const getTeamColor = (team: Team | undefined): string | undefined => {
    const color = team?.color?.trim();
    if (!color) return undefined;
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : undefined;
  };

  const displayTeamName = (team?: Team) => {
    if (!team) return "";
    return team.nickname || team.name.replace(/\s+J\d+$/, "");
  };

  const leftTeamColor = getTeamColor(teams[0]);
  const rightTeamColor = getTeamColor(teams[1]);

  return (
    <div className="shadow-lg rounded-lg overflow-hidden flex flex-col sm:flex-row items-stretch">
      {/* left team*/}
      <div
        className={`flex-1 text-white p-6 flex flex-col items-center ${leftTeamColor ? "" : "bg-blue-700"}`}
        style={leftTeamColor ? { backgroundColor: leftTeamColor } : undefined}
      >
        {teams[0] ? (
          <>
            <div className="text-lg font-semibold mb-1">{displayTeamName(teams[0])}</div>
            <div className="text-6xl font-bold">{displayScore(0)}</div>
          </>
        ) : (
          <div className="text-lg italic">Aucune équipe</div>
        )}
      </div>

      {/* timer / center */}
      <div className="bg-gray-900 text-white flex flex-col items-center justify-center px-8 py-6 gap-2">
        {mainTimerText && (
          <div className="text-3xl sm:text-5xl font-mono font-bold text-center break-words">{mainTimerText}</div>
        )}
        {secondaryTimerText && (
          <div className="text-xl sm:text-2xl font-mono text-yellow-300 text-center break-words">{secondaryTimerText}</div>
        )}
      </div>

      {/* right team */}
      <div
        className={`flex-1 text-white p-6 flex flex-col items-center ${rightTeamColor ? "" : "bg-red-700"}`}
        style={rightTeamColor ? { backgroundColor: rightTeamColor } : undefined}
      >
        {teams[1] ? (
          <>
            <div className="text-lg font-semibold mb-1">{displayTeamName(teams[1])}</div>
            <div className="text-6xl font-bold">{displayScore(1)}</div>
          </>
        ) : (
          <div className="text-lg italic">Aucune équipe</div>
        )}
      </div>
    </div>
  );
}
