import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useTeams } from "~/context/TeamsContext";
import type { Team } from "~/types/tracker";
import {
    addPlayerToRosterList,
    createPlayerFromNames,
    createTeam,
    addMultiplePlayersToTeam,
    deleteTeamFromList,
    deletePlayerFromRoster,
    deletePlayerFromTeamData,
    updatePlayerInRoster,
    updateTeamInList,
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
    const [editingPlayerFirstError, setEditingPlayerFirstError] = useState("");
    const [editingPlayerLastError, setEditingPlayerLastError] = useState("");
    const [compositionEditTeamId, setCompositionEditTeamId] = useState<string | null>(null);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [playerNumbers, setPlayerNumbers] = useState<Record<string, number>>({});
    const [compositionEditMessage, setCompositionEditMessage] = useState("");
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

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

    function openCompositionEditor(teamId: string) {
        setCompositionEditTeamId(teamId);
        setSelectedPlayerIds(new Set());
        setPlayerNumbers({});
        setCompositionEditMessage("");
        setExpandedTeams((prev) => {
            const next = new Set(prev);
            next.add(teamId);
            return next;
        });
    }

    function closeCompositionEditor() {
        setCompositionEditTeamId(null);
        setSelectedPlayerIds(new Set());
        setPlayerNumbers({});
        setCompositionEditMessage("");
    }

    function toggleTeamExpanded(teamId: string) {
        setExpandedTeams((prev) => {
            const next = new Set(prev);
            if (next.has(teamId)) {
                next.delete(teamId);
            } else {
                next.add(teamId);
            }
            return next;
        });
    }

    function togglePlayerSelection(playerId: string) {
        setSelectedPlayerIds((prev) => {
            const next = new Set(prev);
            if (next.has(playerId)) {
                next.delete(playerId);
            } else {
                next.add(playerId);
                setPlayerNumbers((numbers) =>
                    numbers[playerId] ? numbers : { ...numbers, [playerId]: 1 }
                );
            }
            return next;
        });
    }

    function updatePlayerNumber(playerId: string, value: number) {
        const clamped = Math.min(23, Math.max(1, value));
        setPlayerNumbers((prev) => ({ ...prev, [playerId]: clamped }));
    }

    function addPlayersToComposition(team: Team) {
        if (!roster) return;
        if (selectedPlayerIds.size === 0) {
            setCompositionEditMessage("Sélectionne au moins un joueur.");
            return;
        }

        const allEntries = [...team.starters, ...team.substitutes];
        const existingPlayerIds = new Set(allEntries.map((entry) => entry.player.id));
        const selectedPlayers = roster.players.filter(
            (player) => selectedPlayerIds.has(player.id) && !existingPlayerIds.has(player.id)
        );

        if (selectedPlayers.length === 0) {
            setCompositionEditMessage("Tous les joueurs sélectionnés sont déjà dans la composition.");
            return;
        }

        for (const player of selectedPlayers) {
            const number = playerNumbers[player.id] || 1;
            if (number < 1 || number > 23) {
                setCompositionEditMessage("Les numéros doivent être compris entre 1 et 23.");
                return;
            }
        }

        const updatedTeam = addMultiplePlayersToTeam(team, selectedPlayers, playerNumbers);
        setTeams(updateTeamInList(teams || [], updatedTeam));
        setCompositionEditMessage("Joueurs ajoutés à la composition.");
        setSelectedPlayerIds(new Set());
        setPlayerNumbers({});
    }

    function removePlayerFromComposition(team: Team, playerId: string) {
        const updatedTeam = deletePlayerFromTeamData(team, playerId);
        setTeams(updateTeamInList(teams || [], updatedTeam));
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
        const formattedFirst = formatName(first);
        const formattedLast = formatName(last);
        setEditingPlayerId(player.id);
        setEditingPlayerFirst(formattedFirst);
        setEditingPlayerLast(formattedLast);
        setEditingPlayerFirstError(validateName(formattedFirst));
        setEditingPlayerLastError(validateName(formattedLast));
        setPlayerMessage("");
    }

    function cancelEditPlayer() {
        setEditingPlayerId(null);
        setEditingPlayerFirst("");
        setEditingPlayerLast("");
        setEditingPlayerFirstError("");
        setEditingPlayerLastError("");
    }

    function saveEditPlayer() {
        if (!roster || !editingPlayerId) return;
        const formattedFirst = formatName(editingPlayerFirst);
        const formattedLast = formatName(editingPlayerLast);
        const firstError = validateName(formattedFirst);
        const lastError = validateName(formattedLast);
        setEditingPlayerFirstError(firstError);
        setEditingPlayerLastError(lastError);
        if (firstError || lastError) return;
        if (!editingPlayerFirst && !editingPlayerLast) return;
        const newName = `${formattedFirst} ${formattedLast}`.trim();
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

    useEffect(() => {
        document.title = roster.name;
    }, [roster.name]);

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
                            <li key={team.id} className="border rounded p-2 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="px-2 py-1 text-sm rounded border"
                                            onClick={() => toggleTeamExpanded(team.id)}
                                            aria-label={expandedTeams.has(team.id) ? "Réduire la composition" : "Afficher la composition"}
                                        >
                                            {expandedTeams.has(team.id) ? "▼" : "▶"}
                                        </button>
                                        <span>{team.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="px-2 py-1 bg-blue-500 text-white text-sm rounded"
                                            onClick={() =>
                                                compositionEditTeamId === team.id
                                                    ? closeCompositionEditor()
                                                    : openCompositionEditor(team.id)
                                            }
                                        >
                                            + joueurs
                                        </button>
                                        <button
                                            className="px-2 py-1 bg-red-500 text-white text-sm rounded"
                                            onClick={() => deleteTeam(team)}
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>

                                {expandedTeams.has(team.id) && (
                                    <>
                                        {compositionEditTeamId === team.id && roster && (
                                            <div className="space-y-3 border border-gray-300 rounded p-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold">Ajouter des joueurs</h3>
                                                    <button
                                                        className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm"
                                                        onClick={closeCompositionEditor}
                                                    >
                                                        Fermer
                                                    </button>
                                                </div>

                                                {(() => {
                                                    const allEntries = [...team.starters, ...team.substitutes];
                                                    const existingIds = new Set(allEntries.map((entry) => entry.player.id));
                                                    const availablePlayers = roster.players.filter(
                                                        (player) => !existingIds.has(player.id)
                                                    );

                                                    if (availablePlayers.length === 0) {
                                                        return (
                                                            <p className="text-sm text-gray-600">
                                                                Aucun joueur disponible pour cette composition.
                                                            </p>
                                                        );
                                                    }

                                                    return (
                                                        <ul className="space-y-2">
                                                            {availablePlayers.map((player) => (
                                                                <li key={player.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                    <label className="flex items-center gap-2 flex-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedPlayerIds.has(player.id)}
                                                                            onChange={() => togglePlayerSelection(player.id)}
                                                                        />
                                                                        <span>{player.name}</span>
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={23}
                                                                        className="border p-1 w-24"
                                                                        value={playerNumbers[player.id] || 1}
                                                                        onChange={(e) =>
                                                                            updatePlayerNumber(player.id, Number(e.target.value))
                                                                        }
                                                                        disabled={!selectedPlayerIds.has(player.id)}
                                                                    />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    );
                                                })()}

                                                <button
                                                    className="px-3 py-2 bg-green-600 text-white rounded"
                                                    onClick={() => addPlayersToComposition(team)}
                                                >
                                                    Ajouter
                                                </button>

                                                {compositionEditMessage && (
                                                    <p className="text-sm text-green-700">{compositionEditMessage}</p>
                                                )}
                                            </div>
                                        )}

                                        {team.starters.length + team.substitutes.length > 0 ? (
                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-sm">Composition actuelle</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">Titulaires (1-15)</p>
                                                        <ul className="space-y-1 text-sm">
                                                            {team.starters.map((entry) => (
                                                                <li key={entry.player.id} className="flex items-center gap-2">
                                                                    <span className="font-semibold w-6">{entry.number}</span>
                                                                    <span className="flex-1">{entry.player.name}</span>
                                                                    <button
                                                                        className="text-red-600 text-xs px-2 py-1"
                                                                        onClick={() => removePlayerFromComposition(team, entry.player.id)}
                                                                    >
                                                                        Retirer
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-600 mb-1">Remplaçants (16-23)</p>
                                                        <ul className="space-y-1 text-sm">
                                                            {team.substitutes.map((entry) => (
                                                                <li key={entry.player.id} className="flex items-center gap-2">
                                                                    <span className="font-semibold w-6">{entry.number}</span>
                                                                    <span className="flex-1">{entry.player.name}</span>
                                                                    <button
                                                                        className="text-red-600 text-xs px-2 py-1"
                                                                        onClick={() => removePlayerFromComposition(team, entry.player.id)}
                                                                    >
                                                                        Retirer
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-600">aucun joueur dans la composition.</p>
                                        )}
                                    </>
                                )}
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
                                            className={`border bg-gray-800 text-white p-2 w-full ${
                                                editingPlayerFirstError ? "border-red-500" : "border-gray-600"
                                            }`}
                                            placeholder="Prénom"
                                            value={editingPlayerFirst}
                                            onChange={(e) => {
                                                const formatted = formatName(e.target.value);
                                                setEditingPlayerFirst(formatted);
                                                setEditingPlayerFirstError(validateName(formatted));
                                            }}
                                        />
                                        {editingPlayerFirstError && (
                                            <p className="text-sm text-red-400">{editingPlayerFirstError}</p>
                                        )}
                                        <input
                                            className={`border bg-gray-800 text-white p-2 w-full ${
                                                editingPlayerLastError ? "border-red-500" : "border-gray-600"
                                            }`}
                                            placeholder="Nom"
                                            value={editingPlayerLast}
                                            onChange={(e) => {
                                                const formatted = formatName(e.target.value);
                                                setEditingPlayerLast(formatted);
                                                setEditingPlayerLastError(validateName(formatted));
                                            }}
                                        />
                                        {editingPlayerLastError && (
                                            <p className="text-sm text-red-400">{editingPlayerLastError}</p>
                                        )}
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