import type { Route } from "./+types/roster";
import RosterManager from "~/components/RosterManager";
import { useTeams } from "~/context/TeamsContext";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Rosters" }];
}

export default function RosterPage() {
  const { rosters, activeRosterId, setRosters, setActiveRosterId, globalPlayers, setGlobalPlayers } = useTeams();
  return (
    <main className="p-6 max-w-screen-md mx-auto px-4">
      <h1 className="text-2xl font-bold">Rosters</h1>
      <RosterManager
        rosters={rosters}
        activeRosterId={activeRosterId}
        globalPlayers={globalPlayers}
        setRosters={setRosters}
        setActiveRosterId={setActiveRosterId}
        setGlobalPlayers={setGlobalPlayers}
      />
    </main>
  );
}
