import type { Route } from "./+types/roster";
import RosterManager from "~/components/RosterManager";
import { useTeams } from "~/context/TeamsContext";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Rosters" }];
}

export default function RosterPage() {
    const {
        rosters,
        teams,
        activeRosterId,
        setRosters,
        setTeams,
        setActiveRosterId,
        matchDay,
        championship,
    } = useTeams();

    return (
        <main className="p-6 max-w-screen-md mx-auto px-4">
            <h1 className="text-2xl font-bold">Effectifs</h1>
            <p className="text-sm mb-4">
                {matchDay && <>Journée : {matchDay} — </>}
                Championnat : {championship}
            </p>
            <RosterManager
                rosters={rosters}
                teams={teams}
                activeRosterId={activeRosterId}
                setRosters={setRosters}
                setTeams={setTeams}
                setActiveRosterId={setActiveRosterId}
            />
        </main>
    );
}
