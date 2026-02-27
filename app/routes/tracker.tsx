import { useEffect, useState, useMemo } from "react";
import type { Route } from "./+types/tracker";
import type { Event } from "~/types/tracker";
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
    "Transformation",
    "Pénalité réussie",
    "Drop",
    "Essai de pénalité",
    "Pénalité manquée",
    "Carton jaune",
    "Carton rouge",
    "Carton orange",
    "Changement",
    "Saignement",
    "Blessure",
];

export default function Tracker() {
    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [currentHalf, setCurrentHalf] = useState<1 | 2>(1);
    const [manualTimeInput, setManualTimeInput] = useState("");
    const [matchEnded, setMatchEnded] = useState(false);

    function formatTime(sec: number) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    // compute display times based on current half
    function getDisplayTimes() {
        const HALF_SECONDS = 40 * 60; // 40 minutes
        const isSecondHalf = currentHalf === 2;
        
        if (currentHalf === 1) {
            const mainTime = Math.min(time, HALF_SECONDS);
            const secondaryTime = time > HALF_SECONDS ? time - HALF_SECONDS : null;
            return { mainTime, secondaryTime };
        } else {
            // 2nd half: main time goes from 40:00 to 80:00, then secondary shows extra time
            const effectiveTime = time - HALF_SECONDS; // time since start of 2nd half
            const mainTime = Math.min(effectiveTime, HALF_SECONDS) + HALF_SECONDS; // display from 40:00 to 80:00
            const secondaryTime = effectiveTime > HALF_SECONDS ? effectiveTime - HALF_SECONDS : null;
            return { mainTime, secondaryTime };
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

    // penalty counts (fouls) for each team - computed from events
    const [teamPenalties, setTeamPenalties] = useState<number[]>([0, 0]);
    // manual penalty adjustments (on top of computed values)
    const [manualPenaltyAdjustments, setManualPenaltyAdjustments] = useState<number[]>([0, 0]);
    // en-avant counts for each team - computed from events
    const [teamEnAvant, setTeamEnAvant] = useState<number[]>([0, 0]);
    // manual en-avant adjustments (on top of computed values)
    const [manualEnAvantAdjustments, setManualEnAvantAdjustments] = useState<number[]>([0, 0]);
    const [teamToucheGagnee, setTeamToucheGagnee] = useState<number[]>([0, 0]);
    const [teamTouchePerdue, setTeamTouchePerdue] = useState<number[]>([0, 0]);
    const [teamMeleeGagnee, setTeamMeleeGagnee] = useState<number[]>([0, 0]);
    const [teamMeleePerdue, setTeamMeleePerdue] = useState<number[]>([0, 0]);

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
        // reset manual penalty adjustments when teams change
        setManualPenaltyAdjustments([0, 0]);
        // reset manual en-avant adjustments when teams change
        setManualEnAvantAdjustments([0, 0]);
        setTeamToucheGagnee([0, 0]);
        setTeamTouchePerdue([0, 0]);
        setTeamMeleeGagnee([0, 0]);
        setTeamMeleePerdue([0, 0]);
    }, [selectedTeams.length]);

    // count penalties (fouls) from events
    useEffect(() => {
        const counts = [0, 0];
        events.forEach((e) => {
            if (e.type === "Pénalité" && e.team) {
                const idx = selectedTeams.indexOf(e.team);
                if (idx !== -1) {
                    counts[idx]++;
                }
            }
        });
        setTeamPenalties(counts);
    }, [events, selectedTeams]);

    // count en-avant from events
    useEffect(() => {
        const counts = [0, 0];
        events.forEach((e) => {
            if (e.type === "En-avant" && e.team) {
                const idx = selectedTeams.indexOf(e.team);
                if (idx !== -1) {
                    counts[idx]++;
                }
            }
        });
        setTeamEnAvant(counts);
    }, [events, selectedTeams]);

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

    function addStatsSummary(halfLabel: string) {
        if (selectedTeams.length !== 2) return;
        const team1Name = selectedTeams[0].name.replace(/\s+J\d+$/, "");
        const team2Name = selectedTeams[1].name.replace(/\s+J\d+$/, "");
        const displayedPenalties = getDisplayedPenalties();
        const displayedEnAvant = getDisplayedEnAvant();
        const summary = `${halfLabel} : ${team1Name} : ${displayedPenalties[0]} pénalités, ${displayedEnAvant[0]} en-avants / ${team2Name} : ${displayedPenalties[1]} pénalités, ${displayedEnAvant[1]} en-avants`;
        
        const summaryEvent: Event = {
            type: "Récapitulatif",
            time: time,
            summary: summary
        };
        
        setEvents((ev) => [...ev, summaryEvent]);
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
            "Essai de pénalité": 7,
            Transformation: 2,
            "Pénalité réussie": 3,
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
        return base.map((v) => Math.max(0, v));
    }

    function adjustPenalties(idx: number, delta: number) {
        setManualPenaltyAdjustments((prev) => {
            const copy = [...prev];
            const newValue = (copy[idx] || 0) + delta;
            copy[idx] = newValue;
            return copy;
        });
    }

    function adjustEnAvant(idx: number, delta: number) {
        setManualEnAvantAdjustments((prev) => {
            const copy = [...prev];
            const newValue = (copy[idx] || 0) + delta;
            copy[idx] = newValue;
            return copy;
        });
    }

    function adjustToucheGagnee(idx: number, delta: number) {
        setTeamToucheGagnee((prev) => {
            const copy = [...prev];
            copy[idx] = Math.max(0, (copy[idx] || 0) + delta);
            return copy;
        });
    }

    function adjustTouchePerdue(idx: number, delta: number) {
        setTeamTouchePerdue((prev) => {
            const copy = [...prev];
            copy[idx] = Math.max(0, (copy[idx] || 0) + delta);
            return copy;
        });
    }

    function adjustMeleeGagnee(idx: number, delta: number) {
        setTeamMeleeGagnee((prev) => {
            const copy = [...prev];
            copy[idx] = Math.max(0, (copy[idx] || 0) + delta);
            return copy;
        });
    }

    function adjustMeleePerdue(idx: number, delta: number) {
        setTeamMeleePerdue((prev) => {
            const copy = [...prev];
            copy[idx] = Math.max(0, (copy[idx] || 0) + delta);
            return copy;
        });
    }

    function getDisplayedPenalties(): number[] {
        return teamPenalties.map((count, idx) => {
            const total = count + (manualPenaltyAdjustments[idx] || 0);
            return Math.max(0, total); // cannot be negative
        });
    }

    function getDisplayedEnAvant(): number[] {
        return teamEnAvant.map((count, idx) => {
            const total = count + (manualEnAvantAdjustments[idx] || 0);
            return Math.max(0, total); // cannot be negative
        });
    }

    function removeEvent(index: number) {
        setEvents((ev) => ev.filter((_, i) => i !== index));
    }

    return (
        <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
            <h1 className="leading-[0.95] font-bold tracking-[-0.03em] text-4xl text-center text-white">Feuille de match</h1>
            <p className="text-foreground max-w-3xl text-base font-light text-white text-balance sm:text-lg text-center mx-auto mb-8">
                {matchDay && <>Journée : {matchDay} — </>}
                Championnat : {championship}
            </p>

            {!activeRoster && (
                <p className="text-red-600">
                    Aucun effectif actif. Allez sur la page « Effectifs » pour en sélectionner un ou en créer un.
                </p>
            )}

            <section className="space-y-2">
                {teamsForDay.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucune composition pour cette journée.</p>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                id="team1Select"
                                className="md:w-1/2 border-0 bg-neutral-900 py-1 px-2 text-center text-sm md:text-base font-light leading-none shadow-none focus:ring-0 focus:border-0"
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
                                id="team2Select"
                                className="md:w-1/2 border-0 bg-neutral-900 py-1 px-2 text-center text-sm md:text-base font-light leading-none shadow-none focus:ring-0 focus:border-0"
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
                            Valider
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
                const mainTimerText = matchEnded ? "Match terminé" : formatTime(times.mainTime);
                const secondaryTimerText = matchEnded || times.secondaryTime === null
                    ? undefined
                    : formatTime(times.secondaryTime);
                return (
                    <Scoreboard
                        teams={selectedTeams}
                        scores={computeScores()}
                        mainTimerText={mainTimerText}
                        secondaryTimerText={secondaryTimerText}
                    />
                );
            })()}

            <TimerControls
                time={time}
                running={running}
                onStartStop={() => setRunning((r) => !r)}
                onAdjust={adjustTime}
                onReset={() => {
                    setTime(0);
                    setMatchEnded(false);
                }}
                manualTimeInput={manualTimeInput}
                onManualTimeInputChange={setManualTimeInput}
                onApplyManualTime={applyManualTime}
                currentHalf={currentHalf}
                matchEnded={matchEnded}
                onSetFirstHalf={() => {
                    setCurrentHalf(1);
                    setTime(0);
                    setRunning(false);
                }}
                onSetSecondHalf={() => {
                    addStatsSummary("MT1");
                    setCurrentHalf(2);
                    setTime(40 * 60);
                    setRunning(false);
                }}
                onEndMatch={() => {
                    addStatsSummary("MT2");
                    setMatchEnded(true);
                    setRunning(false);
                }}
            />

            {selectedTeams.length === 2 && (() => {
                const displayedPenalties = getDisplayedPenalties();
                const displayedEnAvant = getDisplayedEnAvant();

                const teamStats = [
                    {
                        label: "Pénalité",
                        values: displayedPenalties,
                        onAdjust: adjustPenalties,
                    },
                    {
                        label: "En Avant",
                        values: displayedEnAvant,
                        onAdjust: adjustEnAvant,
                    },
                    {
                        label: "Touche Gagnée",
                        values: teamToucheGagnee,
                        onAdjust: adjustToucheGagnee,
                    },
                    {
                        label: "Touche Perdue",
                        values: teamTouchePerdue,
                        onAdjust: adjustTouchePerdue,
                    },
                    {
                        label: "Mêlée Gagnée",
                        values: teamMeleeGagnee,
                        onAdjust: adjustMeleeGagnee,
                    },
                    {
                        label: "Mêlée Perdue",
                        values: teamMeleePerdue,
                        onAdjust: adjustMeleePerdue,
                    },
                ];

                return (
                    <section className="space-y-3">
                        <h3 className="font-semibold text-center">Statistiques</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedTeams.map((team, teamIdx) => (
                                <div key={team.id} className="border-neutral-700 bg-neutral-900 rounded p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-center">
                                        {team.name.replace(/\s+J\d+$/, "")}
                                    </h4>
                                    <ul className="space-y-2">
                                        {teamStats.map((stat) => (
                                            <li key={stat.label} className="flex items-center justify-between gap-2">
                                                <span className="text-sm">{stat.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        className="px-2 py-1 bg-neutral-400 text-white rounded hover:bg-red-600"
                                                        onClick={() => stat.onAdjust(teamIdx, -1)}
                                                    >
                                                        −
                                                    </button>
                                                    <span className="min-w-8 text-center font-semibold">{stat.values[teamIdx] || 0}</span>
                                                    <button
                                                        className="px-2 py-1 bg-neutral-400 text-white rounded hover:bg-green-600"
                                                        onClick={() => stat.onAdjust(teamIdx, 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })()}

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
                <h2 className="font-semibold">Faits de match</h2>
                <EventsList events={events} remove={removeEvent} />
            </section>

            <Summary events={events} currentTime={time} teams={selectedTeams} matchDay={typeof matchDay === 'number' ? matchDay : undefined} />
        </main>
    );
}
