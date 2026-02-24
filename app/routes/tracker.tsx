import { useEffect, useState, useMemo } from "react";
import type { Route } from "./+types/tracker";
import type { Event } from "./tracker.types";
import { loadTrackerTeamSelection, saveTrackerTeamSelection } from "~/utils/TrackerStorage";

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
    const [manualTimeInput, setManualTimeInput] = useState("");

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
    
    const activeRoster = useMemo(() => rosters.find((r) => r.id === activeRosterId) ?? null, [rosters, activeRosterId]);
    
    const activeTeams = useMemo(() => teams.filter((t) => t.rosterId === activeRosterId), [teams, activeRosterId]);
    
    const teamsForDay = useMemo(
        () => matchDay
            ? teams.filter((t) => t.name.includes(`J${matchDay}`))
            : teams,
        [teams, matchDay]
    );
    
    const [team1Id, setTeam1Id] = useState<string>("");
    const [team2Id, setTeam2Id] = useState<string>("");
    const [activeCommand, setActiveCommand] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string>("");

    const selectedTeams = useMemo(
        () => [
            teamsForDay.find((t) => t.id === team1Id),
            teamsForDay.find((t) => t.id === team2Id),
        ].filter(Boolean) as typeof teams,
        [teamsForDay, team1Id, team2Id]
    );

    // manual score adjustments (on top of computed values)
    const [manualScores, setManualScores] = useState<number[]>([]);

    // Load team selection from localStorage on mount
    useEffect(() => {
        if (!championship || !matchDay) return;

        const matchDayNum = typeof matchDay === "number" ? matchDay : parseInt(matchDay, 10);
        if (isNaN(matchDayNum)) return;

        const saved = loadTrackerTeamSelection(championship, matchDayNum);
        if (saved) {
            setTeam1Id(saved.team1Id);
            setTeam2Id(saved.team2Id);
        }
    }, [championship, matchDay]);

    useEffect(() => {
        // reset manual scores whenever selected teams change
        const newScores = selectedTeams.map(() => 0);
        setManualScores((prev) => {
            // Only update if the number of teams actually changed
            if (prev.length !== newScores.length) {
                return newScores;
            }
            return prev;
        });
    }, [selectedTeams.length]);

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

    function parseManualTime(input: string): number | null {
        const trimmed = input.trim();
        if (!trimmed) return null;
        const parts = trimmed.split(':');
        if (parts.length === 2) {
            const mins = parseInt(parts[0], 10);
            const secs = parseInt(parts[1], 10);
            if (!isNaN(mins) && !isNaN(secs) && mins >= 0 && secs >= 0 && secs < 60) {
                return mins * 60 + secs;
            }
        }
        return null;
    }

    function applyManualTime() {
        const parsedTime = parseManualTime(manualTimeInput);
        if (parsedTime !== null) {
            setTime(parsedTime);
            setManualTimeInput("");
        }
    }

    async function saveTeamSelection() {
        if (!team1Id || !team2Id || !championship || !matchDay) {
            setSaveMessage("Veuillez sélectionner les deux équipes.");
            return;
        }
        if (team1Id === team2Id) {
            setSaveMessage("Les équipes doivent être différentes.");
            return;
        }
        try {
            // Save to API
            await fetch("/api/match-day-teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    championship,
                    matchDay,
                    team1Id,
                    team2Id,
                }),
            });
            
            // Save to localStorage
            const matchDayNum = typeof matchDay === "number" ? matchDay : parseInt(matchDay, 10);
            if (!isNaN(matchDayNum)) {
                saveTrackerTeamSelection(championship, matchDayNum, team1Id, team2Id);
            }
            
            setSaveMessage("Composition validée ✓");
            setTimeout(() => setSaveMessage(""), 3000);
        } catch (e) {
            setSaveMessage("Erreur lors de la sauvegarde.");
        }
    }

    function computeScores(): number[] {
        const points: Record<string, number> = {
            Essai: 5,
            Transformation: 2,
            Pénalité: 3,
            Drop: 3,
        };
        const base = selectedTeams.map(() => 0);
        events.forEach((e) => {
            if (e.team) {
                const idx = selectedTeams.indexOf(e.team);
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

            <section className="space-y-2">
                <h2 className="font-semibold">Sélection des équipes</h2>
                {teamsForDay.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucune composition pour cette journée.</p>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                className="border p-2 flex-1"
                                value={team1Id}
                                onChange={(e) => setTeam1Id(e.target.value)}
                            >
                                <option value="">-- Équipe 1 --</option>
                                {teamsForDay.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border p-2 flex-1"
                                value={team2Id}
                                onChange={(e) => setTeam2Id(e.target.value)}
                            >
                                <option value="">-- Équipe 2 --</option>
                                {teamsForDay.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {team1Id && team2Id && team1Id === team2Id && (
                            <p className="text-sm text-red-600">Équipe 1 et Équipe 2 doivent être différentes.</p>
                        )}
                        <button
                            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                            onClick={saveTeamSelection}
                            disabled={!team1Id || !team2Id || team1Id === team2Id}
                        >
                            Valider la composition
                        </button>
                        {saveMessage && (
                            <p className={`text-sm ${saveMessage.includes("✓") ? "text-green-700" : "text-red-600"}`}>
                                {saveMessage}
                            </p>
                        )}
                    </>
                )}
            </section>

            {/* scoreboard showing teams, computed score and timers */}
            {(() => {
                const times = getDisplayTimes();
                return (
                    <Scoreboard
                        teams={selectedTeams}
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

            <div className="border rounded p-4 space-y-2">
                <label className="block font-semibold">Temps manuel (mm:ss)</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="05:30"
                        className="border p-2 flex-1"
                        value={manualTimeInput}
                        onChange={(e) => setManualTimeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyManualTime()}
                    />
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={applyManualTime}
                    >
                        Appliquer
                    </button>
                </div>
            </div>

            <CommandPanel
                types={COMMAND_TYPES}
                onSelect={(type) => setActiveCommand(type)}
            />

            {activeCommand && team1Id && team2Id && team1Id !== team2Id && (
                <EventForm
                type={activeCommand}
                teams={selectedTeams}
                currentTime={time}
                onSubmit={addEvent}
                onCancel={() => setActiveCommand(null)}
                />
            )}
            {activeCommand && (!team1Id || !team2Id || team1Id === team2Id) && (
                <p className="text-sm text-red-600">
                    Sélectionne deux équipes différentes pour enregistrer un événement.
                </p>
            )}

            <section className="space-y-2">
                <h2 className="font-semibold">Events</h2>
                <EventsList events={events} remove={removeEvent} />
            </section>

            <Summary events={events} currentTime={time} teams={selectedTeams} matchDay={typeof matchDay === 'number' ? matchDay : undefined} />
        </main>
    );
}
