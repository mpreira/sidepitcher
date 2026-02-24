import { useEffect, useState } from "react";
import type { Route } from "./+types/tracker";
import type { Event } from "./tracker.types";

import TimerControls from "~/components/TimerControls";
import CommandPanel from "~/components/CommandPanel";
import EventForm from "~/components/EventForm";
import EventsList from "~/components/EventsList";
import Summary from "~/components/Summary";
import Scoreboard from "~/components/Scoreboard";
import { useTeams } from "~/context/TeamsContext";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Side Pitcher" }];
}

const COMMAND_TYPES = [
    "Essai",
    "Pénalité",
    "Transformation",
    "Drop",
    "Carton jaune",
    "Carton rouge",
    "Carton orange",
    "Changement",
];

export default function Tracker() {
    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [currentHalf, setCurrentHalf] = useState<1 | 2>(1);

    function formatTime(sec: number) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    // compute display times based on current half
    function getDisplayTimes() {
        const HALF_SECONDS = 40 * 60; // 40 minutes
        if (currentHalf === 1) {
            const mainTime = Math.min(time, HALF_SECONDS);
            const secondaryTime = time > HALF_SECONDS ? time - HALF_SECONDS : null;
            return { mainTime, secondaryTime };
        } else {
            // 2nd half: time continues from 1st half
            const displayTime = time >= HALF_SECONDS ? time - HALF_SECONDS : 0;
            const secondaryTime = time > 2 * HALF_SECONDS ? time - 2 * HALF_SECONDS : null;
            return { mainTime: displayTime, secondaryTime };
        }
    }
    const [events, setEvents] = useState<Event[]>([]);
    const { rosters, teams, activeRosterId, matchDay, championship } = useTeams();
    const activeRoster = rosters.find((r) => r.id === activeRosterId) ?? null;
    const activeTeams = teams.filter((t) => t.rosterId === activeRosterId);
    const [activeCommand, setActiveCommand] = useState<string | null>(null);

    // manual score adjustments (on top of computed values)
    const [manualScores, setManualScores] = useState<number[]>([]);

    useEffect(() => {
        // reset manual scores whenever activeTeams change
        setManualScores(activeTeams.map(() => 0));
    }, [activeTeams]);

// timer interval
    useEffect(() => {
        let handle: number;
        if (running) {
            handle = window.setInterval(() => setTime((t) => t + 1), 1000);
        }
        return () => {
            if (handle) window.clearInterval(handle);
        };
    }, [running]);

    function addEvent(e: Event) {
        setEvents((ev) => [...ev, e]);
        setActiveCommand(null);
    }

    function adjustTime(delta: number) {
        setTime((t) => Math.max(0, t + delta));
    }

    function computeScores(): number[] {
        const points: Record<string, number> = {
            Essai: 5,
            Transformation: 2,
            Pénalité: 3,
            Drop: 3,
        };
        const base = activeTeams.map(() => 0);
        events.forEach((e) => {
            if (e.team) {
                const idx = activeTeams.indexOf(e.team);
                if (idx !== -1 && points[e.type]) {
                    base[idx] += points[e.type] || 0;
                }
            }
        });
        // add manual adjustments
        return base.map((v, i) => v + (manualScores[i] || 0));
    }

    function adjustScore(idx: number, delta: number) {
        setManualScores((prev) => {
            const copy = [...prev];
            copy[idx] = (copy[idx] || 0) + delta;
            return copy;
        });
    }

    function removeEvent(index: number) {
        setEvents((ev) => ev.filter((_, i) => i !== index));
    }

    return (
        <main className="p-6 space-y-6 max-w-screen-md mx-auto px-4">
            <h1 className="text-2xl font-bold">Feuille de match</h1>
            <p className="text-sm">
                {matchDay && <>Journée : {matchDay} — </>}
                Championnat : {championship}
            </p>

            {!activeRoster && (
                <p className="text-red-600">
                    Aucun roster actif. Allez sur la page « Rosters » pour en sélectionner un ou en créer un.
                </p>
            )}

            {/* scoreboard showing teams, computed score and timers */}
            {(() => {
                const times = getDisplayTimes();
                return (
                    <Scoreboard
                        teams={activeTeams}
                        scores={computeScores()}
                        onAdjust={adjustScore}
                        mainTimerText={formatTime(times.mainTime)}
                        secondaryTimerText={times.secondaryTime !== null ? formatTime(times.secondaryTime) : undefined}
                    />
                );
            })()}

            {/* half selector */}
            <div className="flex items-center gap-2 justify-center">
                <label className="font-semibold">Mi-temps:</label>
                <button
                    className={`px-4 py-2 rounded ${
                        currentHalf === 1
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-300 text-gray-700'
                    }`}
                    onClick={() => {
                        setCurrentHalf(1);
                        setTime(0);
                    }}
                >
                    1ère
                </button>
                <button
                    className={`px-4 py-2 rounded ${
                        currentHalf === 2
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-300 text-gray-700'
                    }`}
                    onClick={() => {
                        setCurrentHalf(2);
                        setTime(40 * 60); // start 2nd half at 40:00
                    }}
                >
                    2ème
                </button>
            </div>

            <TimerControls
                time={time}
                running={running}
                onStartStop={() => setRunning((r) => !r)}
                onAdjust={adjustTime}
                onReset={() => setTime(0)}
            />

            <CommandPanel
                types={COMMAND_TYPES}
                onSelect={(type) => setActiveCommand(type)}
            />

            {activeCommand && (
                <EventForm
                type={activeCommand}
                teams={activeTeams}
                currentTime={time}
                onSubmit={addEvent}
                onCancel={() => setActiveCommand(null)}
                />
            )}

            <section className="space-y-2">
                <h2 className="font-semibold">Events</h2>
                <EventsList events={events} remove={removeEvent} />
            </section>

            <Summary events={events} currentTime={time} />
        </main>
    );
}
