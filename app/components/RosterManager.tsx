import React, { useState } from "react";
import type { Team, Player, Roster } from "~/routes/tracker.types";
import TeamEditor from "~/components/TeamEditor";
import { useTeams } from "~/context/TeamsContext";
import {
    createNewRoster,
    deleteRosterFromList,
    deleteTeamsFromRoster,
    addPlayerToRosterList,
    deletePlayerFromRoster,
    updatePlayerInRoster,
    createPlayerFromNames,
    parsePlayerName,
    createTeam,
    deleteTeamFromList,
    updateTeamInList,
    deletePlayerFromTeamData,
    importTeamFromJSON,
    getTeamPlayers,
} from "~/utils/RosterUtils";

interface Props {
    rosters: Roster[];
    teams: Team[];
    activeRosterId: string | null;
    setRosters: React.Dispatch<React.SetStateAction<Roster[]>>;
    setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
    setActiveRosterId: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function RosterManager({
    rosters,
    teams,
    activeRosterId,
    setRosters,
    setTeams,
    setActiveRosterId,
}: Props) {
    const [jsonInput, setJsonInput] = useState("");
    const [teamName, setTeamName] = useState("");
    const [newRosterName, setNewRosterName] = useState("");
    const [newRosterCategory, setNewRosterCategory] = useState<'Top 14' | 'Pro D2'>('Top 14');
    const [newPlayerFirst, setNewPlayerFirst] = useState("");
    const [newPlayerLast, setNewPlayerLast] = useState("");
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editingPlayerFirst, setEditingPlayerFirst] = useState("");
    const [editingPlayerLast, setEditingPlayerLast] = useState("");
    const [selectedRosterForPlayer, setSelectedRosterForPlayer] = useState<string | null>(null);
    const [viewTeamId, setViewTeamId] = useState<string | null>(null);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

    const activeRoster = rosters.find((r) => r.id === activeRosterId);
    const activeTeams = (teams || []).filter((t) => t.rosterId === activeRosterId);
    const rosterViewPlayers = viewTeamId
        ? getTeamPlayers(activeTeams.find(t => t.id === viewTeamId) || { id: "", name: "", rosterId: "", starters: [], substitutes: [] })
        : activeRoster?.players || []; 

    function createRoster() {
        if (!newRosterName) return;
        const newRoster = createNewRoster(newRosterName, newRosterCategory);
        setRosters([...rosters, newRoster]);
        setActiveRosterId(newRoster.id);
        setNewRosterName("");
        setNewRosterCategory('Top 14');
    }

    function deleteRoster(id: string) {
        setRosters(deleteRosterFromList(rosters, id));
        setTeams(deleteTeamsFromRoster(teams, id));
        if (activeRosterId === id) {
            setActiveRosterId(null);
        }
    }

    function addPlayerToRoster() {
        const targetRoster = selectedRosterForPlayer 
            ? rosters.find(r => r.id === selectedRosterForPlayer)
            : activeRoster;
        if (!targetRoster) return;
        if (!newPlayerFirst && !newPlayerLast) return;
        
        const player = createPlayerFromNames(newPlayerFirst, newPlayerLast);
        const updated = addPlayerToRosterList(targetRoster, player);
        setRosters(rosters.map(r => r.id === targetRoster.id ? updated : r));

        setNewPlayerFirst("");
        setNewPlayerLast("");
        setSelectedRosterForPlayer(null);
    }

    function deletePlayer(playerId: string) {
        if (!activeRoster) return;
        const updated = deletePlayerFromRoster(activeRoster, playerId);
        setRosters(rosters.map(r => r.id === activeRoster.id ? updated : r));
    }

    function deletePlayerFromTeam(teamId: string, playerId: string) {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        const updatedTeam = deletePlayerFromTeamData(team, playerId);
        updateTeam(updatedTeam);
    }

    function removePlayerFromView(playerId: string) {
        if (viewTeamId) {
            deletePlayerFromTeam(viewTeamId, playerId);
        } else {
            deletePlayer(playerId);
        }
    }



    function startEditPlayer(player: Player) {
        const { first, last } = parsePlayerName(player.name);
        setEditingPlayerId(player.id);
        setEditingPlayerFirst(first);
        setEditingPlayerLast(last);
    }

    function saveEditPlayer() {
        if (!activeRoster || !editingPlayerId) return;
        if (!editingPlayerFirst && !editingPlayerLast) return;
        const newName = `${editingPlayerFirst} ${editingPlayerLast}`.trim();
        const updated = updatePlayerInRoster(activeRoster, editingPlayerId, newName);
        setRosters(rosters.map(r => r.id === activeRoster.id ? updated : r));
        setEditingPlayerId(null);
        setEditingPlayerFirst("");
        setEditingPlayerLast("");
    }

    function cancelEditPlayer() {
        setEditingPlayerId(null);
        setEditingPlayerFirst("");
        setEditingPlayerLast("");
    }

    function addTeam() {
        if (!activeRoster) return;
        const name = `${activeRoster.name}${matchDay ? ` J${matchDay}` : ""}`;
        const newTeam = createTeam(name, activeRoster.id);
        setTeams([...(teams || []), newTeam]);
    }

    function importTeam() {
        if (!activeRoster) return;
        try {
            const newTeam = importTeamFromJSON(jsonInput, activeRoster.id, activeRoster.name, matchDay ? parseInt(matchDay) : undefined);
            setTeams([...(teams || []), newTeam]);
            setJsonInput("");
        } catch (e) {
            alert(e instanceof Error ? e.message : "Erreur de parsing JSON");
        }
    }

    function deleteTeam(teamToDelete: Team) {
        setTeams(deleteTeamFromList(teams || [], teamToDelete.id));
    }

    function updateTeam(updatedTeam: Team) {
        setTeams(updateTeamInList(teams || [], updatedTeam));
    }

    const { matchDay } = useTeams();

    return (
        <section className="space-y-4 max-w-screen-md mx-auto px-4">
            <h2 className="font-semibold">Rosters</h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                    className="border p-1"
                    value={newRosterCategory}
                    onChange={(e) => setNewRosterCategory(e.target.value as 'Top 14' | 'Pro D2')}
                >
                    <option value="Top 14">Top 14</option>
                    <option value="Pro D2">Pro D2</option>
                </select>
                <input
                    className="border p-1 flex-1"
                    placeholder="Nom du roster"
                    value={newRosterName}
                    onChange={(e) => setNewRosterName(e.target.value)}
                />
                <button
                    className="px-3 py-1 bg-green-500 text-white rounded"
                    onClick={createRoster}
                >
                    Créer nouveau roster
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {rosters.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 p-2 border rounded">
                        <div className="text-sm text-gray-600">{r.category || 'N/A'}</div>
                        <button
                            className="underline text-blue-600"
                            onClick={() => setActiveRosterId(r.id)}
                        >
                            {r.name}
                        </button>
                        <button
                            className="text-red-600"
                            onClick={() => deleteRoster(r.id)}
                        >
                            supprimer
                        </button>
                    </div>
                ))}
            </div>

            {activeRoster && (
                <>
                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* teams column */}
                        <div className="w-full sm:w-1/2">
                            <h3 className="font-semibold">Équipes</h3>
                            <div className="space-y-2 mb-4">
                                {(() => {
                                const name = `${activeRoster.name}${matchDay ? ` J${matchDay}` : ""}`;
                                const already = activeTeams.some(t => t.name === name);
                                if (already) return null;
                                return (
                                    <button
                                        className="px-3 py-1 bg-blue-500 text-white rounded"
                                        onClick={addTeam}
                                        disabled={!matchDay}
                                    >
                                        Créer « {activeRoster.name} {matchDay && `J${matchDay}`} »
                                    </button>
                                );
                            })()}
                            </div>
                            <ul className="space-y-1">
                                {activeTeams.map((team) => (
                                    <li key={team.id} className="flex items-center justify-between">
                                        <button
                                            className="text-left flex-1"
                                            onClick={() => {
                                                setViewTeamId(team.id);
                                                setEditingTeamId(team.id);
                                            }}
                                        >
                                            {team.name}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button
                                                className="px-2 py-1 bg-yellow-500 text-white text-sm rounded"
                                                onClick={() => {
                                                    setViewTeamId(team.id);
                                                    setEditingTeamId(team.id);
                                                }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="px-2 py-1 bg-red-500 text-white text-sm rounded"
                                                onClick={() => deleteTeam(team)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                        {editingTeamId === team.id && (
                                            <TeamEditor
                                                team={team}
                                                rosterPlayers={activeRoster.players || []}
                                                onChange={(updated) => {
                                                    updateTeam(updated);
                                                    setViewTeamId(updated.id);
                                                }}
                                                onClose={() => setEditingTeamId(null)}
                                            />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* players column */}
                        <div className="w-full sm:w-1/2">
                            <h3 className="font-semibold">
                                Composition {viewTeamId ? `de ${activeTeams.find(t => t.id === viewTeamId)?.name}` : 'du roster'}
                            </h3>
                            <ul className="space-y-1 mt-2">
                                {rosterViewPlayers.map((p) => (
                                    <li key={p.id} className="flex items-center justify-between gap-2">
                                        <span>{p.name}</span>
                                        <button
                                            className="px-2 py-1 bg-red-500 text-white text-sm rounded"
                                            onClick={() => removePlayerFromView(p.id)}
                                        >
                                            🗑️
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* add player form below columns */}
                    <h3 className="font-semibold mt-6">Ajouter un joueur à l'effectif</h3>
                    <div className="space-y-2 border p-4 rounded bg-gray-90">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input
                                className="border p-1 flex-1"
                                placeholder="Prénom"
                                value={newPlayerFirst}
                                onChange={(e) => setNewPlayerFirst(e.target.value)}
                            />
                            <input
                                className="border p-1 flex-1"
                                placeholder="Nom"
                                value={newPlayerLast}
                                onChange={(e) => setNewPlayerLast(e.target.value)}
                            />
                            <select
                                className="border p-1 flex-1"
                                value={selectedRosterForPlayer || activeRosterId || ""}
                                onChange={(e) => setSelectedRosterForPlayer(e.target.value)}
                            >
                                <option value="">-- Roster --</option>
                                {rosters.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <button
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                                onClick={addPlayerToRoster}
                                disabled={!(selectedRosterForPlayer || activeRoster) || (!newPlayerFirst && !newPlayerLast)}
                            >
                                Ajouter
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
