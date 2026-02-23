import React from "react";

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
  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <section className="space-y-2">
      <div className="text-xl">Time: {formatTime(time)}</div>
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
