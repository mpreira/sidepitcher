import React, { createContext, useContext, useState, useEffect } from "react";
import type { Team, Player } from "~/routes/tracker.types";
import { v4 as uuidv4 } from "uuid";

export interface Roster {
  id: string;
  name: string;
  teams: Team[];
}

interface TeamsContextValue {
  rosters: Roster[];
  activeRosterId: string | null;
  globalPlayers: Player[];
  setRosters: React.Dispatch<React.SetStateAction<Roster[]>>;
  setActiveRosterId: React.Dispatch<React.SetStateAction<string | null>>;
  setGlobalPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

const TeamsContext = createContext<TeamsContextValue | null>(null);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [activeRosterId, setActiveRosterId] = useState<string | null>(null);
  const [globalPlayers, setGlobalPlayers] = useState<Player[]>([]);

  // load from backend on mount
  useEffect(() => {
    fetch("/api/rosters")
      .then((r) => r.json())
      .then((data) => {
        setRosters(data.rosters || []);
        setActiveRosterId(data.activeRosterId || null);
        setGlobalPlayers(data.globalPlayers || []);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  // sync to backend whenever rosters or active id changes
  const lastSent = React.useRef<{rosters: Roster[]; activeId: string | null} | null>(null);

  useEffect(() => {
    // nothing to persist if both empty/null, or same as last sent
    if (rosters.length === 0 && activeRosterId == null) {
      return;
    }
    if (
      lastSent.current &&
      lastSent.current.activeId === activeRosterId &&
      JSON.stringify(lastSent.current.rosters) === JSON.stringify(rosters)
    ) {
      return;
    }

    fetch("/api/rosters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rosters, activeRosterId, globalPlayers }),
    })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        lastSent.current = { rosters, activeId: activeRosterId };
      });
  }, [rosters, activeRosterId]);

  return (
    <TeamsContext.Provider
      value={{ rosters, activeRosterId, globalPlayers, setRosters, setActiveRosterId, setGlobalPlayers }}
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
