import { fa1, fa2, faArrowRotateLeft, faCheck, faPause, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

interface Props {
  time: number;
  running: boolean;
  onStartStop: () => void;
  onAdjust: (delta: number) => void;
  onReset: () => void;
  manualTimeInput: string;
  onManualTimeInputChange: (value: string) => void;
  onApplyManualTime: () => void;
  currentHalf: 1 | 2;
  matchEnded: boolean;
  onSetFirstHalf: () => void;
  onSetSecondHalf: () => void;
  onEndMatch: () => void;
}

export default function TimerControls({
  time,
  running,
  onStartStop,
  onAdjust,
  onReset,
  manualTimeInput,
  onManualTimeInputChange,
  onApplyManualTime,
  currentHalf,
  matchEnded,
  onSetFirstHalf,
  onSetSecondHalf,
  onEndMatch,
}: Props) {

  return (
    <section className="space-y-2 w-full max-w-full">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <button
          className={`px-4 py-2 text-white rounded shrink-0 ${running ? "border-orange-500 bg-orange-500/20 text-orange-300 hover:bg-orange-500/30" : "border-green-500 bg-green-500/20 text-green-300 hover:bg-green-500/30"}`}
          onClick={onStartStop}
        >
          {running ? (
            <>
              <FontAwesomeIcon icon={faPause} className="sm:mr-2" />
              <span className="hidden sm:inline">Pause</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPlay} className="sm:mr-2" />
              <span className="hidden sm:inline">Départ</span>
            </>
          )}
        </button>
        <button
          id="halfSelect"
          className={`px-4 py-2 rounded shrink-0 ${
            currentHalf === 1 ? "border-sky-500 bg-sky-500/20 text-sky-300" : "border-neutral-500 bg-neutral-500/20 text-neutral-300"
          }`}
          onClick={onSetFirstHalf}
        >
          <FontAwesomeIcon icon={fa1} className="sm:mr-2" />
          <span className="hidden sm:inline">1ère</span>
        </button>
        <button
          className={`px-4 py-2 rounded shrink-0 ${
            currentHalf === 2 ? "border-sky-500 bg-sky-500/20 text-sky-300" : "border-neutral-500 bg-neutral-500/20 text-neutral-300"
          }`}
          onClick={onSetSecondHalf}
          disabled={currentHalf === 2 || matchEnded}
        >
          <FontAwesomeIcon icon={fa2} className="sm:mr-2" />
          <span className="hidden sm:inline">2ème</span>
        </button>
        <button
          className={`px-4 py-2 rounded shrink-0 ${
            matchEnded ? "border-neutral-500 bg-neutral-500/20 text-neutral-300": "border-red-600 bg-red-600/20 text-red-300" 
          }`}
          onClick={onEndMatch}
          disabled={matchEnded || currentHalf === 1}
        >
          <FontAwesomeIcon icon={faStop} className="sm:mr-2" />
          <span className="hidden sm:inline">Fin de match</span>
        </button>
        <button
          className="px-4 py-2 border-neutral-500 bg-neutral-500/20 text-neutral-300 rounded"
          onClick={onReset}
        >
          <FontAwesomeIcon icon={faArrowRotateLeft} className="sm:mr-2" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      <div className="border border-neutral-700 rounded p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="manualTimeInput" className="font-semibold">Temps</label>
          <input
            id="manualTimeInput"
            type="text"
            placeholder="05:30"
            className="text-base p-2 flex-1 min-w-0"
            value={manualTimeInput}
            onChange={(e) => onManualTimeInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyManualTime()}
          />
          <button
            id="applyManualTimeButton"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={onApplyManualTime}
          >
            <FontAwesomeIcon icon={faCheck} className="sm:mr-2" />
            <span className="hidden sm:inline">Appliquer</span>
          </button>
        </div>
      </div>
    </section>
  );
}
