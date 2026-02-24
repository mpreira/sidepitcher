import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTeams } from "~/context/TeamsContext";
import type { Team } from "~/routes/tracker.types";
import {
    addPlayerToRosterList,
    createPlayerFromNames,
    createTeam,
    deleteTeamFromList,
    deletePlayerFromRoster,
    updatePlayerInRoster,
    parsePlayerName,
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
    const [playerMessage, setPlayerMessage] = useState("");
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editingPlayerFirst, setEditingPlayerFirst] = useState("");
    const [editingPlayerLast, setEditingPlayerLast] = useState("");
    const [newPlayerFirstError, setNewPlayerFirstError] = useState("");
    const [newPlayerLastError, setNewPlayerLastError] = useState("");

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

    function formatName(value: string) {
        const cleaned = value.replace(/\s+/g, " ").trim();
        if (!cleaned) return "";
        return cleaned
            .split("-")
            .map((part) =>
                part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""
            )
            .join("-");
    }

    function validateName(value: string) {
        if (!value) return "";
        const valid = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(value);
        return valid
            ? ""
            : "Utilise uniquement des lettres (y compris accentuées) et le trait d'union.";
    }

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
        const formattedFirst = formatName(newPlayerFirst);
        const formattedLast = formatName(newPlayerLast);
        const firstError = validateName(formattedFirst);
        const lastError = validateName(formattedLast);
        setNewPlayerFirstError(firstError);
        setNewPlayerLastError(lastError);
        if (firstError || lastError) return;
        if (!newPlayerFirst && !newPlayerLast) return;

        const player = createPlayerFromNames(formattedFirst, formattedLast);
        const updatedRoster = addPlayerToRosterList(roster, player);

        setRosters(rosters.map((r) => (r.id === roster.id ? updatedRoster : r)));
        setNewPlayerFirst("");
        setNewPlayerLast("");
        setShowAddPlayerForm(false);
        setPlayerMessage("Joueur ajouté à l'effectif.");
        setNewPlayerFirstError("");
        setNewPlayerLastError("");
    }

    function startEditPlayer(player: { id: string; name: string }) {
        const { first, last } = parsePlayerName(player.name);
        setEditingPlayerId(player.id);
        setEditingPlayerFirst(first);
        setEditingPlayerLast(last);
        setPlayerMessage("");
    }

    function cancelEditPlayer() {
        setEditingPlayerId(null);
        setEditingPlayerFirst("");
        setEditingPlayerLast("");
    }

    function saveEditPlayer() {
        if (!roster || !editingPlayerId) return;
        if (!editingPlayerFirst && !editingPlayerLast) return;
        const newName = `${editingPlayerFirst} ${editingPlayerLast}`.trim();
        const updatedRoster = updatePlayerInRoster(roster, editingPlayerId, newName);
        setRosters(rosters.map((r) => (r.id === roster.id ? updatedRoster : r)));
        cancelEditPlayer();
        setPlayerMessage("Joueur modifié.");
    }

    function deletePlayer(playerId: string, playerName: string) {
        if (!roster) return;
        const confirmed = window.confirm(
            `Supprimer le joueur "${playerName}" de l'effectif ?`
        );
        if (!confirmed) return;
        const updatedRoster = deletePlayerFromRoster(roster, playerId);
        setRosters(rosters.map((r) => (r.id === roster.id ? updatedRoster : r)));
        if (editingPlayerId === playerId) {
            cancelEditPlayer();
        }
        setPlayerMessage("Joueur supprimé.");
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
                <h2 className="font-semibold">Effectif</h2>
                {roster.players.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucun joueur dans cet effectif.</p>
                ) : (
                    <ul className="space-y-1">
                        {roster.players.map((player) => (
                            <li key={player.id} className="border rounded p-2 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span>{player.name}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="px-2 py-1 bg-yellow-500 text-white text-sm rounded"
                                            onClick={() => startEditPlayer(player)}
                                        >
                                            Modifier
                                        </button>
                                        <button
                                            className="px-2 py-1 bg-red-500 text-white text-sm rounded"
                                            onClick={() => deletePlayer(player.id, player.name)}
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                                {editingPlayerId === player.id && (
                                    <div className="space-y-2 border border-gray-700 p-3 rounded bg-gray-900 text-white">
                                        <input
                                            className="border border-gray-600 bg-gray-800 text-white p-2 w-full"
                                            placeholder="Prénom"
                                            value={editingPlayerFirst}
                                            onChange={(e) => setEditingPlayerFirst(e.target.value)}
                                        />
                                        <input
                                            className="border border-gray-600 bg-gray-800 text-white p-2 w-full"
                                            placeholder="Nom"
                                            value={editingPlayerLast}
                                            onChange={(e) => setEditingPlayerLast(e.target.value)}
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="px-3 py-2 bg-blue-500 text-white rounded"
                                                onClick={saveEditPlayer}
                                                disabled={!editingPlayerFirst && !editingPlayerLast}
                                            >
                                                Valider
                                            </button>
                                            <button
                                                className="px-3 py-2 bg-gray-200 text-gray-800 rounded"
                                                onClick={cancelEditPlayer}
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                <button
                    className="px-3 py-1 bg-green-500 text-white rounded"
                    onClick={() => setShowAddPlayerForm((value) => !value)}
                >
                    Ajouter un joueur à l'effectif
                </button>

                {showAddPlayerForm && (
                    <div className="space-y-2 border border-gray-700 p-3 rounded bg-gray-900 text-white">
                        <input
                            className={`border bg-gray-800 text-white p-2 w-full ${
                                newPlayerFirstError ? "border-red-500" : "border-gray-600"
                            }`}
                            placeholder="Prénom"
                            value={newPlayerFirst}
                            onChange={(e) => {
                                const formatted = formatName(e.target.value);
                                setNewPlayerFirst(formatted);
                                setNewPlayerFirstError(validateName(formatted));
                            }}
                        />
                        {newPlayerFirstError && (
                            <p className="text-sm text-red-400">{newPlayerFirstError}</p>
                        )}
                        <input
                            className={`border bg-gray-800 text-white p-2 w-full ${
                                newPlayerLastError ? "border-red-500" : "border-gray-600"
                            }`}
                            placeholder="Nom"
                            value={newPlayerLast}
                            onChange={(e) => {
                                const formatted = formatName(e.target.value);
                                setNewPlayerLast(formatted);
                                setNewPlayerLastError(validateName(formatted));
                            }}
                        />
                        {newPlayerLastError && (
                            <p className="text-sm text-red-400">{newPlayerLastError}</p>
                        )}
                        <button
                            className="px-3 py-2 bg-blue-500 text-white rounded"
                            onClick={addPlayerToRoster}
                            disabled={!newPlayerFirst && !newPlayerLast}
                        >
                            Valider
                        </button>
                    </div>
                )}
                {playerMessage && (
                    <p className="text-sm text-green-700">{playerMessage}</p>
                )}
            </section>
        </main>
    );
}