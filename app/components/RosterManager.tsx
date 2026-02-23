import React, { useState } from "react";
import type { Team, Player } from "~/routes/tracker.types";
import type { Roster } from "~/routes/tracker.types";
import { v4 as uuidv4 } from "uuid";
import TeamEditor from "~/components/TeamEditor";

interface Props {
    rosters: Roster[];
    activeRosterId: string | null;
    globalPlayers: Player[];
    setRosters: React.Dispatch<React.SetStateAction<Roster[]>>;
    setActiveRosterId: React.Dispatch<React.SetStateAction<string | null>>;
    setGlobalPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

export default function RosterManager({
    rosters,
    activeRosterId,
    globalPlayers,
    setRosters,
    setActiveRosterId,
    setGlobalPlayers,
}: Props) {
    const [jsonInput, setJsonInput] = useState("");
    const [teamName, setTeamName] = useState("");
    const [newRosterName, setNewRosterName] = useState("");
    const [newPlayerFirst, setNewPlayerFirst] = useState("");
    const [newPlayerLast, setNewPlayerLast] = useState("");

    const activeRoster = rosters.find((r) => r.id === activeRosterId);
    const teams = activeRoster?.teams ?? [];

    // globalPlayers comes from props

    function saveRosters(updated: Roster[]) {
        setRosters(updated);
    }

    function addGlobalPlayer() {
        if (!newPlayerFirst && !newPlayerLast) return;
        const name = `${newPlayerFirst} ${newPlayerLast}`.trim();
        setGlobalPlayers((p) => [...p, { id: uuidv4(), name }]);
        setNewPlayerFirst("");
        setNewPlayerLast("");
    }

    function removeGlobalPlayer(id: string) {
        setGlobalPlayers((p) => p.filter((pp) => pp.id !== id));
    }

    function createRoster() {
        if (!newRosterName) return;
        const id = uuidv4();
        saveRosters([...rosters, { id, name: newRosterName, teams: [] }]);
        setActiveRosterId(id);
        setNewRosterName("");
    }

    function deleteRoster(id: string) {
        saveRosters(rosters.filter((r) => r.id !== id));
        if (activeRosterId === id) {
            setActiveRosterId(null);
        }
    }

    function addTeam() {
        if (!teamName || !activeRoster) return;
        const updated = {
            ...activeRoster,
            teams: [...activeRoster.teams, { name: teamName, starters: [], substitutes: [] }],
        };
        saveRosters(rosters.map((r) => (r.id === activeRoster.id ? updated : r)));
        setTeamName("");
    }

    function importRoster() {
        if (!activeRoster) return;
        try {
            const data = JSON.parse(jsonInput);
            if (data.name && Array.isArray(data.starters)) {
                const team: Team = {
                    name: data.name,
                    starters: data.starters.map((p: any, idx: number) => ({
                        player: { id: p.id || String(idx), name: p.name },
                        number: idx + 1,
                    })),
                    substitutes: Array.isArray(data.substitutes)
                        ? data.substitutes.map((p: any, idx: number) => ({
                              player: { id: p.id || String(idx), name: p.name },
                              number: 16 + idx,
                          }))
                        : [],
                };
                const updated = {
                    ...activeRoster,
                    teams: [...activeRoster.teams, team],
                };
                saveRosters(rosters.map((r) => (r.id === activeRoster.id ? updated : r)));
                setJsonInput("");
            } else {
                alert("JSON invalide : il manque un nom d'équipe ou des titulaires");
            }
        } catch (e) {
            alert("Erreur de parsing JSON");
        }
    }

    return (
        <section className="space-y-4 max-w-screen-md mx-auto px-4">
            <h2 className="font-semibold">Rosters saved</h2>
            {/* global roster management */}
            <section className="space-y-4">
                <h3 className="font-semibold">Effectif global</h3>
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
                    <button
                        className="px-3 py-1 bg-green-500 text-white rounded"
                        onClick={addGlobalPlayer}
                    >
                        Ajouter joueur
                    </button>
                </div>
                <ul className="list-disc ml-6">
                    {globalPlayers.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                            {p.name}
                            <button
                                className="text-red-600 text-sm"
                                onClick={() => removeGlobalPlayer(p.id)}
                            >
                                ✖
                            </button>
                        </li>
                    ))}
                </ul>
            </section>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
                <div key={r.id} className="flex items-center gap-2">
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
                    <h3 className="font-semibold mt-4">Équipes & effectifs</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                            className="border p-1 flex-1"
                            placeholder="Nom de l'équipe"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                        />
                        <button
                            className="px-3 py-1 bg-blue-500 text-white rounded"
                            onClick={addTeam}
                        >
                            Ajouter équipe vide
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <textarea
                            className="w-full h-24 border p-2"
                            placeholder={
                                "Coller JSON de la forme {\n  name: string,\n  starters: [{id?,name}],\n  substitutes: [{id?,name}]\n}\nles numéros seront attribués automatiquement (1..15 / 16..23)"
                            }
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        />
                        <button
                            className="px-3 py-1 bg-blue-500 text-white rounded self-start"
                            onClick={importRoster}
                        >
                            Importer équipe
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {teams.map((team, i) => (
                        <div key={i} className="border p-2">
                            <strong>{team.name}</strong>
                    <TeamEditor
                        team={team}
                        globalPlayers={globalPlayers}
                        onChange={(updatedTeam) => {
                            const updatedRoster: Roster = {
                                ...activeRoster,
                                teams: activeRoster.teams.map((t) =>
                                    t === team ? updatedTeam : t
                                ),
                            } as Roster;
                            saveRosters(
                                rosters.map((r) =>
                                    r.id === activeRoster.id ? updatedRoster : r
                                )
                            );
                        }}
                    />
                </div>
            ))}
                    </div>
                </>
            )}
        </section>
    );
}
