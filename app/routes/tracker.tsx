import { useEffect, useState } from "react";
import type { Route } from "./+types/tracker";

interface Event {
  type: string;
  time: number; // seconds since match start
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Rugby Match Tracker" }];
}

export default function Tracker() {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  // interval for timer
  useEffect(() => {
    let handle: number;
    if (running) {
      handle = window.setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => {
      if (handle) window.clearInterval(handle);
    };
  }, [running]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function record(type: string) {
    setEvents((ev) => [...ev, { type, time }]);
  }

  function removeEvent(index: number) {
    setEvents((ev) => ev.filter((_, i) => i !== index));
  }

  function adjustTime(delta: number) {
    setTime((t) => Math.max(0, t + delta));
  }

  const summary = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function exportSummary() {
    const lines = [`Match summary (time ${formatTime(time)})`];
    for (const [type, count] of Object.entries(summary)) {
      lines.push(`${type}: ${count}`);
    }
    lines.push("\nEvent timeline:");
    events.forEach((e) => {
      lines.push(`${formatTime(e.time)} - ${e.type}`);
    });
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    alert("Summary copied to clipboard");
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rugby Match Tracker</h1>

      <section className="space-y-2">
        <div className="text-xl">Time: {formatTime(time)}</div>
        <div className="space-x-2">
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={() => setRunning(!running)}
          >
            {running ? "Stop" : "Start"}
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={() => adjustTime(-10)}
          >
            -10s
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={() => adjustTime(10)}
          >
            +10s
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={() => setTime(0)}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Commands</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Essai",
            "Pénalité",
            "Transformation",
            "Drop",
            "Carton jaune",
            "Carton rouge",
            "Carton orange",
          ].map((label) => (
            <button
              key={label}
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => record(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Events</h2>
        {events.length === 0 ? (
          <p>Aucune action enregistrée.</p>
        ) : (
          <ul className="space-y-1">
            {events.map((e, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <span>
                  {formatTime(e.time)} - {e.type}
                </span>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => removeEvent(idx)}
                >
                  supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Synthèse</h2>
        {Object.keys(summary).length === 0 ? (
          <p>Pas de données.</p>
        ) : (
          <ul>
            {Object.entries(summary).map(([type, count]) => (
              <li key={type}>
                {type}: {count}
              </li>
            ))}
          </ul>
        )}
        <button
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded"
          onClick={exportSummary}
        >
          Copier la synthèse
        </button>
      </section>
    </main>
  );
}
