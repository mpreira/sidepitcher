import React, { useState } from "react";
import { useNavigate } from "react-router";
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
    const navigate = useNavigate();
    const [jsonInput, setJsonInput] = useState("");
    const [teamName, setTeamName] = useState("");
    const [newRosterName, setNewRosterName] = useState("");
    const [newRosterCategory, setNewRosterCategory] = useState<'Top 14' | 'Pro D2'>('Top 14');
    const [showCreateRosterForm, setShowCreateRosterForm] = useState(false);
    const [rosterFeedbackMessage, setRosterFeedbackMessage] = useState("");
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
        setRosterFeedbackMessage("Roster créé avec succès.");
        setShowCreateRosterForm(false);
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

    function getRosterPath(roster: Roster) {
        const championshipSlug = roster.category === 'Pro D2' ? 'prod2' : 'top14';
        const slug = roster.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        return `/roster/${championshipSlug}/${slug}_${roster.id}`;
    }

    const { matchDay } = useTeams();

    return (
        <section className="space-y-4 max-w-screen-md mx-auto px-4">
            <h2 className="font-semibold">Rosters</h2>

            {rosters.length === 0 ? (
                <p className="text-sm text-gray-600">Aucun roster existant</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {rosters.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 p-2 border rounded">
                            <div className="text-sm text-gray-600">{r.category || 'N/A'}</div>
                            <button
                                className="underline text-blue-600"
                                onClick={() => {
                                    setActiveRosterId(r.id);
                                    navigate(getRosterPath(r));
                                }}
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
            )}

            <button
                className="px-3 py-2 bg-green-500 text-white rounded"
                onClick={() => {
                    setShowCreateRosterForm((value) => !value);
                    setRosterFeedbackMessage("");
                }}
            >
                Créer un roster
            </button>

            {showCreateRosterForm && (
                <div className="space-y-2 border border-gray-700 p-3 rounded bg-gray-900 text-white">
                    <input
                        id="newRosterName"
                        className="border border-gray-600 bg-gray-800 text-white p-2 w-full"
                        placeholder="Nom du roster"
                        value={newRosterName}
                        onChange={(e) => setNewRosterName(e.target.value)}
                    />
                    <select
                        id="newRosterCategory"
                        className="border border-gray-600 bg-gray-800 text-white p-2 w-full"
                        value={newRosterCategory}
                        onChange={(e) => setNewRosterCategory(e.target.value as 'Top 14' | 'Pro D2')}
                    >
                        <option value="Top 14">Top 14</option>
                        <option value="Pro D2">Pro D2</option>
                    </select>
                    <button
                        className="px-3 py-2 bg-blue-500 text-white rounded"
                        onClick={createRoster}
                    >
                        Valider
                    </button>
                </div>
            )}

            {rosterFeedbackMessage && (
                <p className="text-sm text-green-700">{rosterFeedbackMessage}</p>
            )}

        {/*{activeRoster && (
                <>
                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* teams column */}
                        {/*
                        <div className="w-full sm:w-1/2">
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
                        </div>
                        }
                    </div>
                </>
            )}*/}
        </section>
    );
}
