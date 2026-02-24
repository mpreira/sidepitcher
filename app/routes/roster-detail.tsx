import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTeams } from "~/context/TeamsContext";
import type { Team } from "~/routes/tracker.types";
import {
    addPlayerToRosterList,
    createPlayerFromNames,
    createTeam,
    deleteTeamFromList,
} from "~/utils/RosterUtils";

export function meta() {
    return [{ title: "Détail roster" }];
}

function getRosterIdFromParam(rosterSlugId: string | undefined): string | null {
    if (!rosterSlugId) return null;
    const idx = rosterSlugId.lastIndexOf("_");
    if (idx === -1) return rosterSlugId;
    return rosterSlugId.slice(idx + 1);
}

export default function RosterDetailPage() {
    const { rosterSlugId } = useParams();
    const {
        rosters,
        teams,
        setRosters,
        setTeams,
        setActiveRosterId,
        matchDay,
    } = useTeams();

    const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
    const [newPlayerFirst, setNewPlayerFirst] = useState("");
    const [newPlayerLast, setNewPlayerLast] = useState("");
    const [compositionMessage, setCompositionMessage] = useState("");

    const rosterId = getRosterIdFromParam(rosterSlugId);
    const roster = useMemo(
        () => rosters.find((r) => r.id === rosterId) ?? null,
        [rosters, rosterId]
    );

    const rosterTeams = useMemo(
        () => (teams || []).filter((team) => team.rosterId === roster?.id),
        [teams, roster?.id]
    );

    const compositionName = matchDay ? `${roster?.name} J${matchDay}` : null;
    const hasCompositionForDay = Boolean(
        compositionName && rosterTeams.some((team) => team.name === compositionName)
    );

    function addTeam() {
        if (!roster) return;
        const name = `${roster.name}${matchDay ? ` J${matchDay}` : ""}`;
        const newTeam = createTeam(name, roster.id);
        setTeams([...(teams || []), newTeam]);
        setCompositionMessage("");
    }

    function deleteTeam(teamToDelete: Team) {
        const confirmed = window.confirm(
            `Supprimer la composition "${teamToDelete.name}" ?`
        );
        if (!confirmed) return;
        setTeams(deleteTeamFromList(teams || [], teamToDelete.id));
        setCompositionMessage("Composition supprimée.");
    }

    function addPlayerToRoster() {
        if (!roster) return;
        if (!newPlayerFirst && !newPlayerLast) return;

        const player = createPlayerFromNames(newPlayerFirst, newPlayerLast);
        const updatedRoster = addPlayerToRosterList(roster, player);

        setRosters(rosters.map((r) => (r.id === roster.id ? updatedRoster : r)));
        setNewPlayerFirst("");
        setNewPlayerLast("");
        setShowAddPlayerForm(false);
    }

    if (!roster) {
        return (
            <main className="p-6 max-w-screen-md mx-auto px-4 space-y-4">
                <p className="text-sm text-gray-700">Roster introuvable.</p>
                <Link to="/roster" className="underline text-blue-600">
                    Retour aux rosters
                </Link>
            </main>
        );
    }

    useEffect(() => {
        setActiveRosterId(roster.id);
    }, [roster.id, setActiveRosterId]);

    return (
        <main className="p-6 max-w-screen-md mx-auto px-4 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">{roster.name}</h1>
                <p className="text-sm text-gray-700">Championnat : {roster.category || "N/A"}</p>
                <Link to="/roster" className="underline text-blue-600 text-sm">
                    Retour aux rosters
                </Link>
            </div>

            <section className="space-y-2">
                <h2 className="font-semibold">Compositions</h2>
                {rosterTeams.length === 0 ? (
                    <p className="text-sm text-gray-600">aucune composition disponible</p>
                ) : (
                    <ul className="space-y-1">
                        {rosterTeams.map((team: Team) => (
                            <li key={team.id} className="border rounded p-2 flex items-center justify-between">
                                <span>{team.name}</span>
                                <button
                                    className="px-2 py-1 bg-red-500 text-white text-sm rounded"
                                    onClick={() => deleteTeam(team)}
                                >
                                    Supprimer
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {!hasCompositionForDay && (
                    <button
                        className="px-3 py-1 bg-blue-500 text-white rounded"
                        onClick={addTeam}
                        disabled={!matchDay}
                    >
                        Créer « {roster.name} {matchDay && `J${matchDay}`} »
                    </button>
                )}
                {compositionMessage && (
                    <p className="text-sm text-green-700">{compositionMessage}</p>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Joueurs du roster</h2>
                {roster.players.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucun joueur dans ce roster.</p>
                ) : (
                    <ul className="space-y-1">
                        {roster.players.map((player) => (
                            <li key={player.id} className="border rounded p-2">
                                {player.name}
                            </li>
                        ))}
                    </ul>
                )}

                <button
                    className="px-3 py-1 bg-green-500 text-white rounded"
                    onClick={() => setShowAddPlayerForm((value) => !value)}
                >
                    Ajouter un joueur au roster
                </button>

                {showAddPlayerForm && (
                    <div className="space-y-2 border border-gray-700 p-3 rounded bg-gray-900 text-white">
                        <input
                            className="border border-gray-600 bg-gray-800 text-white p-2 w-full"
                            placeholder="Prénom"
                            value={newPlayerFirst}
                            onChange={(e) => setNewPlayerFirst(e.target.value)}
                        />
                        <input
                            className="border border-gray-600 bg-gray-800 text-white p-2 w-full"
                            placeholder="Nom"
                            value={newPlayerLast}
                            onChange={(e) => setNewPlayerLast(e.target.value)}
                        />
                        <button
                            className="px-3 py-2 bg-blue-500 text-white rounded"
                            onClick={addPlayerToRoster}
                            disabled={!newPlayerFirst && !newPlayerLast}
                        >
                            Valider
                        </button>
                    </div>
                )}
            </section>
        </main>
    );
}