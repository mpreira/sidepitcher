import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import type { Route } from "./+types/tracker";
import type { Event } from "~/types/tracker";
import type { LiveSnapshot } from "~/types/live";

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
    const { rosters, teams, activeRosterId, matchDay, championship, sport } = useTeams();
    
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
    const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
    const [livePublicSlug, setLivePublicSlug] = useState<string | null>(null);
    const [liveAdminToken, setLiveAdminToken] = useState<string | null>(null);
    const [liveMessage, setLiveMessage] = useState<string>("");
    const [liveBusy, setLiveBusy] = useState(false);
    const publishTimerRef = useRef<number | null>(null);
    const contextInitializedRef = useRef(false);
    const prevContextRef = useRef<{ matchDay: string | number; championship: string; sport: string } | null>(null);

    const selectedTeams = useMemo(
        () => [
            teamsForDay.find((t) => t.id === team1Id),
            teamsForDay.find((t) => t.id === team2Id),
        ].filter(Boolean) as typeof teams,
        [teamsForDay, team1Id, team2Id]
    );

    const selectedTeamIds = useMemo(() => [team1Id, team2Id], [team1Id, team2Id]);

    function getSelectedTeamIndex(teamId?: string): number {
        if (!teamId) return -1;
        return selectedTeamIds.findIndex((id) => id === teamId);
    }

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

    // Load saved selection for the current championship/matchday.
    useEffect(() => {
        if (!championship || !matchDay) return;

        const matchDayNum = typeof matchDay === "number" ? matchDay : parseInt(matchDay, 10);
        if (isNaN(matchDayNum)) return;

        let cancelled = false;

        fetch(`/api/match-day-teams?championship=${encodeURIComponent(championship)}&matchDay=${matchDayNum}`)
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                const saved = data?.selection as { team1Id?: string; team2Id?: string } | null;
                if (!saved?.team1Id || !saved?.team2Id) {
                    setTeam1Id("");
                    setTeam2Id("");
                    return;
                }
                setTeam1Id(saved.team1Id);
                setTeam2Id(saved.team2Id);
            })
            .catch(() => {
                if (cancelled) return;
                setTeam1Id("");
                setTeam2Id("");
            });

        return () => {
            cancelled = true;
        };
    }, [championship, matchDay]);

    function resetTrackerInfos() {
        setEvents([]);
        setTime(0);
        setRunning(false);
        setCurrentHalf(1);
        setMatchEnded(false);
        setManualTimeInput("");
        setActiveCommand(null);
        setTeamPenalties([0, 0]);
        setManualPenaltyAdjustments([0, 0]);
        setTeamEnAvant([0, 0]);
        setManualEnAvantAdjustments([0, 0]);
        setTeamToucheGagnee([0, 0]);
        setTeamTouchePerdue([0, 0]);
        setTeamMeleeGagnee([0, 0]);
        setTeamMeleePerdue([0, 0]);
        setLiveMatchId(null);
        setLivePublicSlug(null);
        setLiveAdminToken(null);
        setLiveMessage("");
    }

    useEffect(() => {
        if (!contextInitializedRef.current) {
            contextInitializedRef.current = true;
            prevContextRef.current = { matchDay, championship, sport };
            return;
        }

        const prev = prevContextRef.current;
        if (!prev) {
            prevContextRef.current = { matchDay, championship, sport };
            return;
        }

        const contextChanged =
            prev.matchDay !== matchDay ||
            prev.championship !== championship ||
            prev.sport !== sport;

        if (contextChanged) {
            resetTrackerInfos();
        }

        prevContextRef.current = { matchDay, championship, sport };
    }, [matchDay, championship, sport]);

    // count penalties (fouls) from events
    useEffect(() => {
        const counts = [0, 0];
        events.forEach((e) => {
            if (e.type === "Pénalité" && e.team) {
                const idx = getSelectedTeamIndex(e.team.id);
                if (idx !== -1) {
                    counts[idx]++;
                }
            }
        });
        setTeamPenalties(counts);
    }, [events, selectedTeamIds]);

    // count en-avant from events
    useEffect(() => {
        const counts = [0, 0];
        events.forEach((e) => {
            if (e.type === "En-avant" && e.team) {
                const idx = getSelectedTeamIndex(e.team.id);
                if (idx !== -1) {
                    counts[idx]++;
                }
            }
        });
        setTeamEnAvant(counts);
    }, [events, selectedTeamIds]);

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
        const summary = `${halfLabel} : ${team1Name} : ${displayedPenalties[0]} pénalités, ${displayedEnAvant[0]} en-avants, ${teamToucheGagnee[0] || 0} touches gagnées, ${teamTouchePerdue[0] || 0} touches perdues, ${teamMeleeGagnee[0] || 0} mêlées gagnées, ${teamMeleePerdue[0] || 0} mêlées perdues / ${team2Name} : ${displayedPenalties[1]} pénalités, ${displayedEnAvant[1]} en-avants, ${teamToucheGagnee[1] || 0} touches gagnées, ${teamTouchePerdue[1] || 0} touches perdues, ${teamMeleeGagnee[1] || 0} mêlées gagnées, ${teamMeleePerdue[1] || 0} mêlées perdues`;
        
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
                    matchDay: typeof matchDay === "number" ? matchDay : parseInt(matchDay, 10),
                    team1Id,
                    team2Id,
                }),
            });
            
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
                const idx = getSelectedTeamIndex(e.team.id);
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

    const canPublishLive = selectedTeams.length === 2 && Boolean(team1Id) && Boolean(team2Id) && team1Id !== team2Id;

    const buildLiveSnapshot = useCallback((): LiveSnapshot => {
        const displayedPenalties = getDisplayedPenalties();
        const displayedEnAvant = getDisplayedEnAvant();

        return {
            currentTime: time,
            running,
            currentHalf,
            matchEnded,
            events,
            teams: selectedTeams.map((team) => ({ id: team.id, name: team.name })),
            team1Id,
            team2Id,
            scores: computeScores(),
            penalties: displayedPenalties,
            enAvant: displayedEnAvant,
            toucheGagnee: teamToucheGagnee,
            touchePerdue: teamTouchePerdue,
            meleeGagnee: teamMeleeGagnee,
            meleePerdue: teamMeleePerdue,
        };
    }, [
        currentHalf,
        events,
        matchEnded,
        running,
        selectedTeams,
        team1Id,
        team2Id,
        teamEnAvant,
        teamMeleeGagnee,
        teamMeleePerdue,
        teamPenalties,
        teamToucheGagnee,
        teamTouchePerdue,
        time,
        manualEnAvantAdjustments,
        manualPenaltyAdjustments,
    ]);

    const liveViewerUrl = useMemo(() => {
        if (!livePublicSlug || typeof window === "undefined") return "";
        return `${window.location.origin}/live/${livePublicSlug}`;
    }, [livePublicSlug]);

    async function activateLivePublic() {
        if (!canPublishLive) {
            setLiveMessage("Sélectionnez deux équipes différentes pour activer le live.");
            return;
        }

        if (liveMatchId && liveAdminToken && livePublicSlug) {
            setLiveMessage("Le live public est déjà actif.");
            return;
        }

        setLiveBusy(true);
        try {
            const response = await fetch("/api/live-matches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    championship,
                    matchDay: typeof matchDay === "number" ? matchDay : parseInt(matchDay || "", 10),
                    state: buildLiveSnapshot(),
                }),
            });

            const data = await response.json();
            if (!response.ok || !data?.ok) {
                setLiveMessage("Impossible d'activer le live public.");
                return;
            }

            setLiveMatchId(data.matchId);
            setLivePublicSlug(data.publicSlug);
            setLiveAdminToken(data.adminToken);
            setLiveMessage("Live public activé.");
        } catch {
            setLiveMessage("Impossible d'activer le live public.");
        } finally {
            setLiveBusy(false);
        }
    }

    async function publishLiveSnapshot() {
        if (!liveMatchId || !liveAdminToken || !canPublishLive) return;

        try {
            await fetch(`/api/live-matches/${liveMatchId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-live-admin-token": liveAdminToken,
                },
                body: JSON.stringify({ state: buildLiveSnapshot() }),
            });
        } catch {
            // Keep tracker usable even if publication fails temporarily.
        }
    }

    useEffect(() => {
        if (!liveMatchId || !liveAdminToken || !canPublishLive) return;

        if (publishTimerRef.current) {
            window.clearTimeout(publishTimerRef.current);
        }

        publishTimerRef.current = window.setTimeout(() => {
            void publishLiveSnapshot();
        }, 350);

        return () => {
            if (publishTimerRef.current) {
                window.clearTimeout(publishTimerRef.current);
                publishTimerRef.current = null;
            }
        };
    }, [
        liveMatchId,
        liveAdminToken,
        canPublishLive,
        buildLiveSnapshot,
    ]);

    function removeEvent(index: number) {
        setEvents((ev) => ev.filter((_, i) => i !== index));
    }

    function handleTeam1Change(nextTeamId: string) {
        if (nextTeamId !== team1Id) {
            resetTrackerInfos();
        }
        setTeam1Id(nextTeamId);
    }

    function handleTeam2Change(nextTeamId: string) {
        if (nextTeamId !== team2Id) {
            resetTrackerInfos();
        }
        setTeam2Id(nextTeamId);
    }

    async function copyLiveViewerUrl() {
        if (!liveViewerUrl) return;
        try {
            await navigator.clipboard.writeText(liveViewerUrl);
            setLiveMessage("Lien spectateur copié.");
        } catch {
            setLiveMessage("Impossible de copier le lien.");
        }
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
                                onChange={(e) => handleTeam1Change(e.target.value)}
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
                                onChange={(e) => handleTeam2Change(e.target.value)}
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

            <section className="space-y-2 border border-neutral-700 rounded p-3 bg-neutral-900">
                <p className="text-sm text-neutral-300">Diffusion externe en lecture seule</p>
                {!livePublicSlug ? (
                    <button
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-500"
                        onClick={activateLivePublic}
                        disabled={!canPublishLive || liveBusy}
                    >
                        {liveBusy ? "Activation..." : "Activer le live public"}
                    </button>
                ) : (
                    <>
                        <p className="text-xs break-all text-neutral-200">{liveViewerUrl}</p>
                        <button
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            onClick={copyLiveViewerUrl}
                        >
                            Copier le lien spectateur
                        </button>
                    </>
                )}
                {!canPublishLive && !livePublicSlug && (
                    <p className="text-xs text-neutral-400">Sélectionne deux équipes différentes pour activer le live.</p>
                )}
                {liveMessage && <p className="text-sm text-green-700">{liveMessage}</p>}
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
                    setTime(currentHalf === 2 ? 40 * 60 : 0);
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
