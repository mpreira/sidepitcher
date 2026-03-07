import React, { createContext, useContext, useState, useEffect } from "react";
import type { Team, Player, Roster } from "~/types/tracker";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "~/context/AccountContext";

interface TeamsContextValue {
    rosters: Roster[];
    teams: Team[]; // all teams across rosters
    activeRosterId: string | null;
    matchDay: string;
    sport: 'Rugby' | 'Football';
    championship: 'Top 14' | 'Pro D2';
    setRosters: React.Dispatch<React.SetStateAction<Roster[]>>;
    setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
    setActiveRosterId: React.Dispatch<React.SetStateAction<string | null>>;
    setMatchDay: React.Dispatch<React.SetStateAction<string>>;
    setSport: React.Dispatch<React.SetStateAction<'Rugby' | 'Football'>>;
    setChampionship: React.Dispatch<React.SetStateAction<'Top 14' | 'Pro D2'>>;
}

const TeamsContext = createContext<TeamsContextValue | null>(null);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
    const { account, loading: accountLoading } = useAccount();
    const [rosters, setRosters] = useState<Roster[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeRosterId, setActiveRosterId] = useState<string | null>(null);
    const [matchDay, setMatchDay] = useState<string>('');
    const [sport, setSport] = useState<'Rugby' | 'Football'>('Rugby');
    const [championship, setChampionship] = useState<'Top 14' | 'Pro D2'>('Top 14');

    const lastSent = React.useRef<{
        rosters: Roster[];
        teams: Team[];
        activeId: string | null;
        matchDay: string;
        sport: 'Rugby' | 'Football';
        championship: 'Top 14' | 'Pro D2';
    } | null>(null);

  // load from backend on mount
    useEffect(() => {
        if (accountLoading) return;

        lastSent.current = null;
        fetch("/api/rosters")
        .then((r) => r.json())
        .then((data) => {
            setRosters(data.rosters || []);
            setTeams(data.teams || []);
            setActiveRosterId(data.activeRosterId || null);
            setMatchDay(data.matchDay || '');
            setSport(data.sport || 'Rugby');
            setChampionship(data.championship || 'Top 14');
        })
        .catch(() => {
            // ignore
        });
    }, [account?.id, accountLoading]);

    // sync to backend whenever anything changes
    useEffect(() => {
        if (accountLoading) {
            return;
        }

        if (
        rosters.length === 0 &&
        teams.length === 0 &&
        activeRosterId == null &&
        matchDay === '' &&
        sport === 'Rugby' &&
        championship === 'Top 14'
        ) {
        return;
        }
        if (
        lastSent.current &&
        lastSent.current.activeId === activeRosterId &&
        lastSent.current.matchDay === matchDay &&
        lastSent.current.sport === sport &&
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
            sport,
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
            sport,
            championship,
            };
        });
    }, [rosters, teams, activeRosterId, matchDay, sport, championship, accountLoading]);

    return (
        <TeamsContext.Provider
        value={{
            rosters,
            teams,
            activeRosterId,
            matchDay,
            sport,
            championship,
            setRosters,
            setTeams,
            setActiveRosterId,
            setMatchDay,
            setSport,
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
