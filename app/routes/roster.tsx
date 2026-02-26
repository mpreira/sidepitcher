import type { Route } from "./+types/roster";
import RosterManager from "~/components/RosterManager";
import { useTeams } from "~/context/TeamsContext";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Effectifs" }];
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
            <h1 className="leading-[0.95] font-bold tracking-[-0.03em] text-4xl text-center text-white">Effectifs</h1>
            <p className="text-foreground max-w-3xl text-base font-light text-white text-balance sm:text-lg text-center mx-auto mb-8">
                {matchDay && <>Journée {matchDay} — </>}
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
