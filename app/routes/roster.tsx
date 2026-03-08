import type { Route } from "./+types/roster";
import RosterManager from "~/components/RosterManager";
import { useTeams } from "~/context/TeamsContext";
import { useAccount } from "~/context/AccountContext";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Effectifs" }];
}

export default function RosterPage() {
    const { account } = useAccount();
    const { search } = useLocation();
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

    const [liveTeamIds, setLiveTeamIds] = useState<[string, string] | null>(null);
    const [liveModeLoading, setLiveModeLoading] = useState(false);
    const [liveModeError, setLiveModeError] = useState<string>("");

    const searchParams = useMemo(() => new URLSearchParams(search), [search]);
    const isLiveMode = searchParams.get("live") === "1";
    const liveSlug = searchParams.get("slug") || "";

    useEffect(() => {
        if (!isLiveMode || !liveSlug) {
            setLiveTeamIds(null);
            setLiveModeError("");
            setLiveModeLoading(false);
            return;
        }

        let cancelled = false;
        setLiveModeLoading(true);
        setLiveModeError("");

        fetch(`/api/live/${encodeURIComponent(liveSlug)}/state`)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error("Le live n'est pas accessible.");
                }
                return response.json();
            })
            .then((data: { state?: { team1Id?: string; team2Id?: string } }) => {
                if (cancelled) return;
                const team1Id = data?.state?.team1Id;
                const team2Id = data?.state?.team2Id;
                if (!team1Id || !team2Id) {
                    setLiveModeError("Impossible de retrouver les compositions du match en cours.");
                    setLiveTeamIds(null);
                    return;
                }
                setLiveTeamIds([team1Id, team2Id]);
            })
            .catch(() => {
                if (cancelled) return;
                setLiveModeError("Impossible de charger les compositions du live.");
                setLiveTeamIds(null);
            })
            .finally(() => {
                if (!cancelled) {
                    setLiveModeLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isLiveMode, liveSlug]);

    const liveTeams = useMemo(() => {
        if (!liveTeamIds) return [];
        return liveTeamIds
            .map((teamId) => teams.find((team) => team.id === teamId))
            .filter(Boolean);
    }, [liveTeamIds, teams]);

    return (
        <main className="w-full max-w-screen-md mx-auto px-4 py-6 overflow-x-hidden">
            <h1 className="leading-[0.95] font-bold tracking-[-0.03em] text-4xl text-center text-white">Effectifs</h1>
            {account?.name && (
                <p className="text-xs text-neutral-400 text-center mt-1">Compte: {account.name}</p>
            )}
            <p className="text-foreground max-w-3xl text-base font-light text-white text-balance sm:text-lg text-center mx-auto mb-8">
                {matchDay && <>Journée {matchDay} — </>}
                Championnat : {championship}
            </p>
            {isLiveMode ? (
                <section className="space-y-4">
                    {liveModeLoading && (
                        <p className="text-sm text-neutral-400">Chargement des compositions du live...</p>
                    )}
                    {!liveModeLoading && liveModeError && (
                        <p className="text-sm text-red-500">{liveModeError}</p>
                    )}
                    {!liveModeLoading && !liveModeError && liveTeams.length === 0 && (
                        <p className="text-sm text-neutral-400">Aucune composition disponible pour ce live.</p>
                    )}
                    {!liveModeLoading && !liveModeError && liveTeams.length > 0 && (
                        <div className="space-y-4">
                            {liveTeams.map((team) => (
                                <article key={team!.id} className="rounded border border-neutral-700 bg-neutral-900 p-4 space-y-3">
                                    <h2 className="text-lg font-semibold text-white text-center">
                                        {team!.nickname || team!.name.replace(/\s+J\d+$/, "")}
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <section className="space-y-2">
                                            <h3 className="text-sm font-semibold text-white">Titulaires</h3>
                                            <ul className="space-y-1 text-sm text-neutral-200">
                                                {team!.starters
                                                    .slice()
                                                    .sort((a, b) => a.number - b.number)
                                                    .map((entry) => (
                                                        <li key={`${team!.id}-starter-${entry.player.id}`}>
                                                            #{entry.number} {entry.player.name}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </section>
                                        <section className="space-y-2">
                                            <h3 className="text-sm font-semibold text-white">Remplaçants</h3>
                                            <ul className="space-y-1 text-sm text-neutral-200">
                                                {team!.substitutes
                                                    .slice()
                                                    .sort((a, b) => a.number - b.number)
                                                    .map((entry) => (
                                                        <li key={`${team!.id}-sub-${entry.player.id}`}>
                                                            #{entry.number} {entry.player.name}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </section>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <RosterManager
                    rosters={rosters}
                    teams={teams}
                    activeRosterId={activeRosterId}
                    setRosters={setRosters}
                    setTeams={setTeams}
                    setActiveRosterId={setActiveRosterId}
                />
            )}
        </main>
    );
}
