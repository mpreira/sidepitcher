import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Team, Player, Roster } from "~/types/tracker";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faPlus } from "@fortawesome/free-solid-svg-icons";

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
    const championshipOptions = ['Top 14', 'Pro D2'] as const;
    const [showCreateRosterForm, setShowCreateRosterForm] = useState(false);
    const [activeCategoryTab, setActiveCategoryTab] = useState<'Top 14' | 'Pro D2'>('Top 14');
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
        setRosterFeedbackMessage("Effectif créé avec succès.");
        closeCreateRosterForm();
    }

    function closeCreateRosterForm() {
        setShowCreateRosterForm(false);
        setNewRosterName("");
        setNewRosterCategory('Top 14');
    }

    function deleteRoster(id: string) {
        const rosterToDelete = rosters.find((r) => r.id === id);
        const label = rosterToDelete?.name ?? "cet effectif";
        const confirmed = window.confirm(`Confirmer la suppression de ${label} ?`);
        if (!confirmed) return;

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

    const { matchDay, championship } = useTeams();

    useEffect(() => {
        setActiveCategoryTab(championship);
    }, [championship]);

    const filteredRosters = rosters
        .filter((r) => r.category === activeCategoryTab)
        .sort((firstRoster, secondRoster) =>
            firstRoster.name.localeCompare(secondRoster.name, "fr", { sensitivity: "base" })
        );

    return (
        <section className="space-y-4 max-w-screen-md mx-auto px-4">
            <div className="flex items-center gap-2">
                <button
                    className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
                        activeCategoryTab === 'Top 14'
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                    }`}
                    onClick={() => setActiveCategoryTab('Top 14')}
                >
                    Top 14
                </button>
                <button
                    className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
                        activeCategoryTab === 'Pro D2'
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                    }`}
                    onClick={() => setActiveCategoryTab('Pro D2')}
                >
                    Pro D2
                </button>
            </div>
            <button
                className="px-3 py-2 bg-sky-500/20 text-sky-300 rounded border hover:bg-sky-600 flex items-center font-medium"
                onClick={() => {
                    setShowCreateRosterForm((value) => !value);
                    setRosterFeedbackMessage("");
                }}
            >
                <FontAwesomeIcon icon={faPlus} className="mr-1 text-white" />
                Créer un effectif
            </button>

            {showCreateRosterForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
                    onClick={closeCreateRosterForm}
                >
                    <div
                        className="w-full max-w-lg flex flex-col items-stretch gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 transition-shadow focus-within:border-sky-500/70 focus-within:shadow-md focus-within:shadow-sky-500/30"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <input
                            id="newRosterName"
                            className="h-auto w-full min-w-0 self-stretch border-0 bg-transparent p-0 text-left text-sm font-light leading-none shadow-none focus:ring-0 focus:border-0"
                            placeholder="Nom de l'effectif"
                            value={newRosterName}
                            onChange={(e) => setNewRosterName(e.target.value)}
                        />
                        <select
                            id="newRosterCategory"
                            className="h-auto w-full min-w-0 self-stretch border-0 bg-transparent p-0 text-left text-sm font-light leading-none shadow-none focus:ring-0 focus:border-0"
                            value={newRosterCategory}
                            onChange={(e) => setNewRosterCategory(e.target.value as 'Top 14' | 'Pro D2')}
                        >
                            {championshipOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                className="px-3 py-2 bg-blue-500 text-white rounded"
                                onClick={createRoster}
                            >
                                Valider
                            </button>
                            <button
                                className="px-3 py-2 bg-gray-200 text-gray-800 rounded"
                                onClick={closeCreateRosterForm}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rosters.length === 0 ? (
                <p className="text-sm text-gray-600">Aucun effectif existant</p>
            ) : filteredRosters.length === 0 ? (
                <p className="text-sm text-gray-600">Aucun effectif dans {activeCategoryTab}</p>
            ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {filteredRosters.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 rounded bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 py-2 px-4">
                            <button
                                className="text-white font-semibold text-base md:text-lg w-full"
                                onClick={() => {
                                    setActiveRosterId(r.id);
                                    navigate(getRosterPath(r));
                                }}
                            >
                                {r.name}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {rosterFeedbackMessage && (
                <p className="flex items-center gap-2 text-sm text-green-400">
                    <FontAwesomeIcon icon={faCircleCheck} />
                    {rosterFeedbackMessage}
                </p>
            )}
        </section>
    );
}
