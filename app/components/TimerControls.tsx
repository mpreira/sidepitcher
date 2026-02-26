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
    <section className="space-y-2">
      <div className="flex items-center gap-2 justify-center">
        <button
          id="halfSelect"
          className={`px-4 py-2 rounded ${
            currentHalf === 1 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
          }`}
          onClick={onSetFirstHalf}
        >
          1ère
        </button>
        <button
          className={`px-4 py-2 rounded ${
            currentHalf === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
          }`}
          onClick={onSetSecondHalf}
          disabled={currentHalf === 2 || matchEnded}
        >
          2ème
        </button>
        <button
          className={`px-4 py-2 rounded ${
            matchEnded ? "bg-red-600 text-white" : "bg-gray-300 text-gray-700"
          }`}
          onClick={onEndMatch}
          disabled={matchEnded || currentHalf === 1}
        >
          Fin de match
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={onStartStop}
        >
          {running ? "Stop" : "Start"}
        </button>
        <button
          className="px-3 py-1 bg-gray-200 rounded"
          onClick={() => onAdjust(-10)}
        >
          -10s
        </button>
        <button
          className="px-3 py-1 bg-gray-200 rounded"
          onClick={() => onAdjust(10)}
        >
          +10s
        </button>
        <button
          className="px-3 py-1 bg-gray-200 rounded"
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      <div className="border rounded p-4 space-y-2">
        <label htmlFor="manualTimeInput" className="block font-semibold">Temps manuel (mm:ss)</label>
        <div className="flex gap-2">
          <input
            id="manualTimeInput"
            type="text"
            placeholder="05:30"
            className="border p-2 flex-1"
            value={manualTimeInput}
            onChange={(e) => onManualTimeInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyManualTime()}
          />
          <button
            id="applyManualTimeButton"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={onApplyManualTime}
          >
            Appliquer
          </button>
        </div>
      </div>
    </section>
  );
}
