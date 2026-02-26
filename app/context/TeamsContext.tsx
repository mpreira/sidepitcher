import React, { createContext, useContext, useState, useEffect } from "react";
import type { Team, Player, Roster } from "~/types/tracker";
import { v4 as uuidv4 } from "uuid";

interface TeamsContextValue {
    rosters: Roster[];
    teams: Team[]; // all teams across rosters
    activeRosterId: string | null;
    matchDay: string;
    championship: 'Top 14' | 'Pro D2';
    setRosters: React.Dispatch<React.SetStateAction<Roster[]>>;
    setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
    setActiveRosterId: React.Dispatch<React.SetStateAction<string | null>>;
    setMatchDay: React.Dispatch<React.SetStateAction<string>>;
    setChampionship: React.Dispatch<React.SetStateAction<'Top 14' | 'Pro D2'>>;
}

const TeamsContext = createContext<TeamsContextValue | null>(null);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
    const [rosters, setRosters] = useState<Roster[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeRosterId, setActiveRosterId] = useState<string | null>(null);
    const [matchDay, setMatchDay] = useState<string>('');
    const [championship, setChampionship] = useState<'Top 14' | 'Pro D2'>('Top 14');

  // load from backend on mount
    useEffect(() => {
        fetch("/api/rosters")
        .then((r) => r.json())
        .then((data) => {
            setRosters(data.rosters || []);
            setTeams(data.teams || []);
            setActiveRosterId(data.activeRosterId || null);
            setMatchDay(data.matchDay || '');
            setChampionship(data.championship || 'Top 14');
        })
        .catch(() => {
            // ignore
        });
    }, []);

  // sync to backend whenever anything changes
    const lastSent = React.useRef<{
        rosters: Roster[];
        teams: Team[];
        activeId: string | null;
        matchDay: string;
        championship: 'Top 14' | 'Pro D2';
    } | null>(null);

    useEffect(() => {
        if (
        rosters.length === 0 &&
        teams.length === 0 &&
        activeRosterId == null &&
        matchDay === '' &&
        championship === 'Top 14'
        ) {
        return;
        }
        if (
        lastSent.current &&
        lastSent.current.activeId === activeRosterId &&
        lastSent.current.matchDay === matchDay &&
        lastSent.current.championship === championship &&
        JSON.stringify(lastSent.current.rosters) === JSON.stringify(rosters) &&
        JSON.stringify(lastSent.current.teams) === JSON.stringify(teams)
        ) {
        return;
        }

        fetch("/api/rosters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            rosters,
            teams,
            activeRosterId,
            matchDay,
            championship,
        }),
        })
        .catch(() => {
            // ignore
        })
        .finally(() => {
            lastSent.current = {
            rosters,
            teams,
            activeId: activeRosterId,
            matchDay,
            championship,
            };
        });
    }, [rosters, teams, activeRosterId, matchDay, championship]);

    return (
        <TeamsContext.Provider
        value={{
            rosters,
            teams,
            activeRosterId,
            matchDay,
            championship,
            setRosters,
            setTeams,
            setActiveRosterId,
            setMatchDay,
            setChampionship,
        }}
        >
        {children}
        </TeamsContext.Provider>
    );
}

export function useTeams() {
    const ctx = useContext(TeamsContext);
    if (!ctx) {
        throw new Error("useTeams must be used within a TeamsProvider");
    }
    return ctx;
}
