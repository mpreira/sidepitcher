import React from "react";
import { formatTime } from "~/utils/TimeUtils";

interface Props {
  time: number;
  running: boolean;
  onStartStop: () => void;
  onAdjust: (delta: number) => void;
  onReset: () => void;
}

export default function TimerControls({
  time,
  running,
  onStartStop,
  onAdjust,
  onReset,
}: Props) {

  return (
    <section className="space-y-2">
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
    </section>
  );
}
