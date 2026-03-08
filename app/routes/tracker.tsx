import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { faCaretLeft, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
import { useAccount } from "~/context/AccountContext";
import { getTimelineMomentFromClock, getTimelineSortKey } from "~/utils/TimeUtils";

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
    "Arbitrage Vidéo",
];

const TRACKER_ACTION_TAB_STORAGE_KEY = "sidepitcher.tracker.actionTab";

export default function Tracker() {
    const { account } = useAccount();
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
    const rosterNicknameById = useMemo(
        () => new Map(rosters.map((roster) => [roster.id, roster.nickname || ""])),
        [rosters]
    );
    
    const teamsForDay = useMemo(
        () => matchDay
            ? teams
                .filter((t) => t.name.includes(`J${matchDay}`))
                .map((team) => ({ ...team, nickname: team.nickname || rosterNicknameById.get(team.rosterId) || undefined }))
            : teams.map((team) => ({ ...team, nickname: team.nickname || rosterNicknameById.get(team.rosterId) || undefined })),
        [teams, matchDay, rosterNicknameById]
    );
    
    const [team1Id, setTeam1Id] = useState<string>("");
    const [team2Id, setTeam2Id] = useState<string>("");
    const [activeCommand, setActiveCommand] = useState<string | null>(null);
    const [actionTab, setActionTab] = useState<"events" | "stats">("events");
    const [saveMessage, setSaveMessage] = useState<string>("");
    const [savedTrackingSignature, setSavedTrackingSignature] = useState<string | null>(null);
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

    function getEventSortKey(event: Event): number {
        if (event.timelineHalf && typeof event.timelineMinute === "number") {
            return getTimelineSortKey({
                half: event.timelineHalf,
                minute: event.timelineMinute,
                additionalMinute: event.timelineAdditionalMinute || 0,
                second: event.timelineSecond || 0,
            });
        }

        return event.time;
    }

    function sortEventsByTimeline(list: Event[]): Event[] {
        return [...list].sort((firstEvent, secondEvent) => {
            const firstSortKey = getEventSortKey(firstEvent);
            const secondSortKey = getEventSortKey(secondEvent);
            if (firstSortKey !== secondSortKey) return firstSortKey - secondSortKey;
            return firstEvent.time - secondEvent.time;
        });
    }

    function getSelectedTeamIndex(teamId?: string): number {
        if (!teamId) return -1;
        return selectedTeamIds.findIndex((id) => id === teamId);
    }

    function getDisplayTeamLabel(team: { name: string; nickname?: string }): string {
        return team.nickname || team.name.replace(/\s+J\d+$/, "");
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
    const [teamTurnover, setTeamTurnover] = useState<number[]>([0, 0]);
    const [teamOffloads, setTeamOffloads] = useState<number[]>([0, 0]);
    const [teamJeuAuPied, setTeamJeuAuPied] = useState<number[]>([0, 0]);

    useEffect(() => {
        const storedTab = window.localStorage.getItem(TRACKER_ACTION_TAB_STORAGE_KEY);
        if (storedTab === "events" || storedTab === "stats") {
            setActionTab(storedTab);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(TRACKER_ACTION_TAB_STORAGE_KEY, actionTab);
    }, [actionTab]);

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
        setTeamTurnover([0, 0]);
        setTeamOffloads([0, 0]);
        setTeamJeuAuPied([0, 0]);
        setLiveMatchId(null);
        setLivePublicSlug(null);
        setLiveAdminToken(null);
        setLiveMessage("");
        setSavedTrackingSignature(null);
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
        setEvents((ev) => sortEventsByTimeline([...ev, e]));
        setActiveCommand(null);
    }

    function addStatsSummary(halfLabel: string) {
        if (selectedTeams.length !== 2) return;
        const summaryMoment = getTimelineMomentFromClock(time, currentHalf);
        const team1Name = getDisplayTeamLabel(selectedTeams[0]);
        const team2Name = getDisplayTeamLabel(selectedTeams[1]);
        const displayedPenalties = getDisplayedPenalties();
        const displayedEnAvant = getDisplayedEnAvant();
        const statRows = [
            { label: "Pénalités", left: displayedPenalties[0] || 0, right: displayedPenalties[1] || 0 },
            { label: "En-avants", left: displayedEnAvant[0] || 0, right: displayedEnAvant[1] || 0 },
            { label: "Touches volées", left: teamToucheGagnee[0] || 0, right: teamToucheGagnee[1] || 0 },
            { label: "Touches perdues", left: teamTouchePerdue[0] || 0, right: teamTouchePerdue[1] || 0 },
            { label: "Mêlées gagnées", left: teamMeleeGagnee[0] || 0, right: teamMeleeGagnee[1] || 0 },
            { label: "Mêlées perdues", left: teamMeleePerdue[0] || 0, right: teamMeleePerdue[1] || 0 },
            { label: "Turnovers", left: teamTurnover[0] || 0, right: teamTurnover[1] || 0 },
            { label: "Offloads", left: teamOffloads[0] || 0, right: teamOffloads[1] || 0 },
            { label: "Jeu au pied", left: teamJeuAuPied[0] || 0, right: teamJeuAuPied[1] || 0 },
        ];
        const summary = `${halfLabel} : ${team1Name} : ${displayedPenalties[0]} pénalités, ${displayedEnAvant[0]} en-avants, ${teamToucheGagnee[0] || 0} touches volées, ${teamTouchePerdue[0] || 0} touches perdues, ${teamMeleeGagnee[0] || 0} mêlées gagnées, ${teamMeleePerdue[0] || 0} mêlées perdues, ${teamTurnover[0] || 0} turnovers, ${teamOffloads[0] || 0} offloads, ${teamJeuAuPied[0] || 0} jeux au pied / ${team2Name} : ${displayedPenalties[1]} pénalités, ${displayedEnAvant[1]} en-avants, ${teamToucheGagnee[1] || 0} touches volées, ${teamTouchePerdue[1] || 0} touches perdues, ${teamMeleeGagnee[1] || 0} mêlées gagnées, ${teamMeleePerdue[1] || 0} mêlées perdues, ${teamTurnover[1] || 0} turnovers, ${teamOffloads[1] || 0} offloads, ${teamJeuAuPied[1] || 0} jeux au pied`;
        
        const summaryEvent: Event = {
            type: "Récapitulatif",
            time: time,
            timelineHalf: summaryMoment.half,
            timelineMinute: summaryMoment.minute,
            timelineAdditionalMinute: summaryMoment.additionalMinute,
            timelineSecond: summaryMoment.second,
            summary: summary,
            summaryTable: {
                halfLabel,
                teams: [
                    {
                        teamName: team1Name,
                        stats: statRows.map((row) => ({ label: row.label, value: row.left })),
                    },
                    {
                        teamName: team2Name,
                        stats: statRows.map((row) => ({ label: row.label, value: row.right })),
                    },
                ],
            },
        };

        addEvent(summaryEvent);
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
            
            setSaveMessage("Affiche enregistrée ✓");
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

    function adjustTurnover(idx: number, delta: number) {
        setTeamTurnover((prev) => {
            const copy = [...prev];
            copy[idx] = Math.max(0, (copy[idx] || 0) + delta);
            return copy;
        });
    }

    function adjustOffloads(idx: number, delta: number) {
        setTeamOffloads((prev) => {
            const copy = [...prev];
            copy[idx] = Math.max(0, (copy[idx] || 0) + delta);
            return copy;
        });
    }

    function adjustJeuAuPied(idx: number, delta: number) {
        setTeamJeuAuPied((prev) => {
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

    const hasTrackingContent =
        time !== 0 ||
        running ||
        currentHalf !== 1 ||
        matchEnded ||
        events.length > 0 ||
        teamPenalties.some((value) => value !== 0) ||
        manualPenaltyAdjustments.some((value) => value !== 0) ||
        teamEnAvant.some((value) => value !== 0) ||
        manualEnAvantAdjustments.some((value) => value !== 0) ||
        teamToucheGagnee.some((value) => value !== 0) ||
        teamTouchePerdue.some((value) => value !== 0) ||
        teamMeleeGagnee.some((value) => value !== 0) ||
        teamMeleePerdue.some((value) => value !== 0) ||
        teamTurnover.some((value) => value !== 0) ||
        teamOffloads.some((value) => value !== 0) ||
        teamJeuAuPied.some((value) => value !== 0);

    const getTrackingSignature = useCallback(() => {
        return JSON.stringify({
            time,
            running,
            currentHalf,
            matchEnded,
            events,
            teamPenalties,
            manualPenaltyAdjustments,
            teamEnAvant,
            manualEnAvantAdjustments,
            teamToucheGagnee,
            teamTouchePerdue,
            teamMeleeGagnee,
            teamMeleePerdue,
            teamTurnover,
            teamOffloads,
            teamJeuAuPied,
        });
    }, [
        time,
        running,
        currentHalf,
        matchEnded,
        events,
        teamPenalties,
        manualPenaltyAdjustments,
        teamEnAvant,
        manualEnAvantAdjustments,
        teamToucheGagnee,
        teamTouchePerdue,
        teamMeleeGagnee,
        teamMeleePerdue,
        teamTurnover,
        teamOffloads,
        teamJeuAuPied,
    ]);

    function handleResetTracker() {
        const currentSignature = getTrackingSignature();
        const hasUnsavedSynthesis = hasTrackingContent && savedTrackingSignature !== currentSignature;

        if (hasUnsavedSynthesis) {
            const confirmed = window.confirm(
                "La synthèse n'est pas sauvegardée. Voulez-vous réinitialiser quand même ?"
            );
            if (!confirmed) return;
        }

        // Match user expectation: fully reinitialize the page state.
        window.location.reload();
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
            teams: selectedTeams.map((team) => ({ id: team.id, name: team.name, nickname: team.nickname })),
            team1Id,
            team2Id,
            scores: computeScores(),
            penalties: displayedPenalties,
            enAvant: displayedEnAvant,
            toucheGagnee: teamToucheGagnee,
            touchePerdue: teamTouchePerdue,
            meleeGagnee: teamMeleeGagnee,
            meleePerdue: teamMeleePerdue,
            turnover: teamTurnover,
            offloads: teamOffloads,
            jeuAuPied: teamJeuAuPied,
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
        teamTurnover,
        teamOffloads,
        teamJeuAuPied,
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

    async function closeLivePublic() {
        if (!liveMatchId || !liveAdminToken) return;

        const confirmed = window.confirm("Fermer la diffusion live pour les spectateurs ?");
        if (!confirmed) return;

        setLiveBusy(true);
        try {
            const response = await fetch(`/api/live-matches/${liveMatchId}/close`, {
                method: "POST",
                headers: {
                    "x-live-admin-token": liveAdminToken,
                },
            });
            const data = await response.json();
            if (!response.ok || !data?.ok) {
                setLiveMessage("Impossible de fermer le live.");
                return;
            }

            setLiveMatchId(null);
            setLivePublicSlug(null);
            setLiveAdminToken(null);
            setLiveMessage("Live fermé.");
        } catch {
            setLiveMessage("Impossible de fermer le live.");
        } finally {
            setLiveBusy(false);
        }
    }

    return (
        <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
            <h1 className="leading-[0.95] font-bold tracking-[-0.03em] text-4xl text-center text-white">Feuille de match</h1>
            {account?.name && (
                <p className="text-xs text-neutral-400 text-center mt-1">Compte: {account.name}</p>
            )}
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
                        <button
                            className="w-full px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:bg-gray-500"
                            onClick={closeLivePublic}
                            disabled={liveBusy}
                        >
                            Fermer le live
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
                onReset={handleResetTracker}
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

            <section className="space-y-2">
                <div className="flex items-center gap-2">
                    <button
                        className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
                            actionTab === "events"
                                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                        }`}
                        onClick={() => setActionTab("events")}
                    >
                        Événements
                    </button>
                    <button
                        className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
                            actionTab === "stats"
                                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                        }`}
                        onClick={() => {
                            setActionTab("stats");
                            setActiveCommand(null);
                        }}
                    >
                        Statistiques
                    </button>
                </div>
            </section>

            {actionTab === "stats" && (
                <section className="space-y-3">
                    <h3 className="font-semibold text-center">Statistiques</h3>
                    {selectedTeams.length !== 2 ? (
                        <p className="text-sm text-gray-500 text-center">
                            Sélectionne et valide deux équipes pour afficher les statistiques.
                        </p>
                    ) : (() => {
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
                                label: "Touche volée",
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
                            {
                                label: "Turnover",
                                values: teamTurnover,
                                onAdjust: adjustTurnover,
                            },
                            {
                                label: "Offloads",
                                values: teamOffloads,
                                onAdjust: adjustOffloads,
                            },
                            {
                                label: "Jeu au pied",
                                values: teamJeuAuPied,
                                onAdjust: adjustJeuAuPied,
                            },
                        ];

                        const formatStatLabel = (label: string, value: number) => {
                            const forms: Record<string, { singular: string; plural: string }> = {
                                "Pénalité": { singular: "Pénalité", plural: "Pénalités" },
                                "En Avant": { singular: "En-avant", plural: "En-avants" },
                                "Touche volée": { singular: "Touche volée", plural: "Touches volées" },
                                "Touche Perdue": { singular: "Touche perdue", plural: "Touches perdues" },
                                "Mêlée Gagnée": { singular: "Mêlée gagnée", plural: "Mêlées gagnées" },
                                "Mêlée Perdue": { singular: "Mêlée perdue", plural: "Mêlées perdues" },
                                "Turnover": { singular: "Turnover", plural: "Turnovers" },
                                "Offloads": { singular: "Offload", plural: "Offloads" },
                                "Jeu au pied": { singular: "Jeu au pied", plural: "Jeux au pied" },
                            };

                            const form = forms[label];
                            if (!form) return label;
                            return value > 1 ? form.plural : form.singular;
                        };

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedTeams.map((team, teamIdx) => (
                                    <div key={team.id} className="border border-neutral-700 bg-neutral-900 rounded p-3 space-y-3">
                                        <h4 className="text-sm sm:text-base font-semibold text-center text-white">
                                            {getDisplayTeamLabel(team)}
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {teamStats.map((stat) => {
                                                const statValue = stat.values[teamIdx] || 0;
                                                return (
                                                    <div key={stat.label} className="rounded border border-neutral-800 bg-neutral-950 p-2 text-center">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <button
                                                                className="h-7 w-7 text-white hover:bg-red-700"
                                                                onClick={() => stat.onAdjust(teamIdx, -1)}
                                                                aria-label={`Diminuer ${stat.label}`}
                                                            >
                                                                <FontAwesomeIcon icon={faCaretLeft} />
                                                            </button>
                                                            <span className="text-2xl leading-none text-white font-bold min-w-8">{statValue}</span>
                                                            <button
                                                                className="h-7 w-7 text-white hover:bg-green-700"
                                                                onClick={() => stat.onAdjust(teamIdx, 1)}
                                                                aria-label={`Augmenter ${stat.label}`}
                                                            >
                                                                <FontAwesomeIcon icon={faCaretRight} />
                                                            </button>
                                                        </div>
                                                        <p className="mt-1 text-[11px] sm:text-xs text-neutral-300 font-light">
                                                            {formatStatLabel(stat.label, statValue)}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </section>
            )}

            {actionTab === "events" && (
                <>
                    <CommandPanel
                        types={COMMAND_TYPES}
                        onSelect={(type) => setActiveCommand(type)}
                    />

                    {activeCommand && team1Id && team2Id && team1Id !== team2Id && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
                            onClick={() => setActiveCommand(null)}
                        >
                            <div onClick={(event) => event.stopPropagation()}>
                                <EventForm
                                    type={activeCommand}
                                    teams={selectedTeams}
                                    currentTime={time}
                                    currentHalf={currentHalf}
                                    onSubmit={addEvent}
                                    onCancel={() => setActiveCommand(null)}
                                />
                            </div>
                        </div>
                    )}
                    {activeCommand && (!team1Id || !team2Id || team1Id === team2Id) && (
                        <p className="text-sm text-red-600">
                            Sélectionne deux équipes différentes pour enregistrer un événement.
                        </p>
                    )}
                </>
            )}

            <section className="space-y-2">
                <h2 className="font-semibold">Faits de match</h2>
                <div className="max-h-[28rem] overflow-y-auto pr-1">
                    <EventsList events={events} remove={removeEvent} />
                </div>
            </section>

            <Summary
                events={events}
                currentTime={time}
                teams={selectedTeams}
                matchDay={typeof matchDay === 'number' ? matchDay : undefined}
                onSaved={() => setSavedTrackingSignature(getTrackingSignature())}
            />
        </main>
    );
}
