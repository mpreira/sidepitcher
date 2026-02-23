import React, { useState } from "react";
import type { Team, Player } from "~/routes/tracker.types";

interface Props {
  teams: Team[];
  setTeams: (t: Team[]) => void;
}

export default function RosterManager({ teams, setTeams }: Props) {
  const [jsonInput, setJsonInput] = useState("");
  const [teamName, setTeamName] = useState("");

  function addTeam() {
    if (!teamName) return;
    setTeams([...teams, { name: teamName, starters: [], substitutes: [] }]);
    setTeamName("");
  }

  function importRoster() {
    try {
      const data = JSON.parse(jsonInput);
      if (data.name && Array.isArray(data.starters)) {
        const team: Team = {
          name: data.name,
          starters: data.starters.map((p: any, idx: number) => ({ id: p.id || String(idx), name: p.name })),
          substitutes: Array.isArray(data.substitutes)
            ? data.substitutes.map((p: any, idx: number) => ({ id: p.id || String(idx), name: p.name }))
            : [],
        };
        setTeams([...teams, team]);
        setJsonInput("");
      } else {
        alert("JSON invalide : il manque un nom d'équipe ou des titulaires");
      }
    } catch (e) {
      alert("Erreur de parsing JSON");
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Équipes & effectifs</h2>
      <div className="flex gap-2">
        <input
          className="border p-1"
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

      <div>
        <textarea
          className="w-full h-24 border p-2"
          placeholder={
            "Coller JSON de la forme {\n  name: string,\n  starters: [{id?,name}],\n  substitutes: [{id?,name}]\n}"
          }
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />
        <button
          className="mt-1 px-3 py-1 bg-green-500 text-white rounded"
          onClick={importRoster}
        >
          Importer
        </button>
      </div>

      {teams.map((team, i) => (
        <div key={i} className="border p-2">
          <strong>{team.name}</strong>
          <div>Titulaires: {team.starters.map((p) => p.name).join(", ")}</div>
          <div>Remplaçants: {team.substitutes.map((p) => p.name).join(", ")}</div>
        </div>
      ))}
    </section>
  );
}
