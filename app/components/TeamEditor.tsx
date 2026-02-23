import React, { useState } from "react";
import type { Team, Player } from "~/routes/tracker.types";
import { v4 as uuidv4 } from "uuid";

interface Props {
  team: Team;
  globalPlayers: Player[];
  onChange: (team: Team) => void;
}

export default function TeamEditor({ team, globalPlayers, onChange }: Props) {
  const [newStarterId, setNewStarterId] = useState("");
  const [newStarterNumber, setNewStarterNumber] = useState(1);

  const [newSubId, setNewSubId] = useState("");
  const [newSubNumber, setNewSubNumber] = useState(16);

  function addStarter() {
    if (!newStarterId) return;
    const player = globalPlayers.find((p) => p.id === newStarterId);
    if (!player) return;
    const updated: Team = {
      ...team,
      starters: [...team.starters, { player, number: newStarterNumber }],
    };
    onChange(updated);
    setNewStarterId("");
    setNewStarterNumber(1);
  }

  function addSub() {
    if (!newSubId) return;
    const player = globalPlayers.find((p) => p.id === newSubId);
    if (!player) return;
    const updated: Team = {
      ...team,
      substitutes: [...team.substitutes, { player, number: newSubNumber }],
    };
    onChange(updated);
    setNewSubId("");
    setNewSubNumber(16);
  }

  function removePlayer(id: string) {
    const updated: Team = {
      ...team,
      starters: team.starters.filter((entry) => entry.player.id !== id),
      substitutes: team.substitutes.filter((entry) => entry.player.id !== id),
    };
    onChange(updated);
  }

  return (
    <div className="space-y-2 mt-2">
      <div>
        <div className="font-semibold">Titulaires</div>
        <ul className="list-disc ml-6">
          {team.starters.map((entry) => (
            <li key={entry.player.id} className="flex items-center gap-2">
              {entry.player.name} ({entry.number})
              <button
                className="text-red-600 text-sm"
                onClick={() => removePlayer(entry.player.id)}
              >
                ✖
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            className="border p-1 flex-1"
            value={newStarterId}
            onChange={(e) => setNewStarterId(e.target.value)}
          >
            <option value="">-- joueur --</option>
            {globalPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="border p-1 w-16"
            min={1}
            max={15}
            value={newStarterNumber}
            onChange={(e) => setNewStarterNumber(Number(e.target.value))}
          />
          <button
            className="px-2 py-1 bg-blue-500 text-white rounded"
            onClick={addStarter}
          >
            +
          </button>
        </div>
      </div>
      <div>
        <div className="font-semibold">Remplaçants</div>
        <ul className="list-disc ml-6">
          {team.substitutes.map((entry) => (
            <li key={entry.player.id} className="flex items-center gap-2">
              {entry.player.name} ({entry.number})
              <button
                className="text-red-600 text-sm"
                onClick={() => removePlayer(entry.player.id)}
              >
                ✖
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            className="border p-1 flex-1"
            value={newSubId}
            onChange={(e) => setNewSubId(e.target.value)}
          >
            <option value="">-- joueur --</option>
            {globalPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="border p-1 w-16"
            min={16}
            max={23}
            value={newSubNumber}
            onChange={(e) => setNewSubNumber(Number(e.target.value))}
          />
          <button
            className="px-2 py-1 bg-blue-500 text-white rounded"
            onClick={addSub}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
