import React, { useState, useEffect } from "react";
import type { Team, Player, Event } from "~/routes/tracker.types";
import { createPlayerEvent, createSubstitutionEvent, findPlayerNumberInTeam } from "~/utils/EventUtils";

interface Props {
    type: string;
    teams: Team[];
    onSubmit: (event: Event) => void;
    onCancel: () => void;
    currentTime: number;
}

export default function EventForm({
    type,
    teams,
    onSubmit,
    onCancel,
    currentTime,
    }: Props) {
    const [teamIdx, setTeamIdx] = useState(0);
    const [playerId, setPlayerId] = useState("");
    const [concussion, setConcussion] = useState(false);
    const [outPlayerId, setOutPlayerId] = useState("");
    const [inPlayerId, setInPlayerId] = useState("");

    useEffect(() => {
        // reset when type or teams change
        setPlayerId("");
        setConcussion(false);
        setOutPlayerId("");
        setInPlayerId("");
    }, [type, teams]);

    const team = teams[teamIdx];
    const players: Player[] = team
      ? [
          ...team.starters.map((e) => e.player),
          ...team.substitutes.map((e) => e.player),
        ]
      : [];

    function handleSubmit() {
        if (type === "Changement") {
            const playerOut = players.find((p) => p.id === outPlayerId);
            const playerIn = players.find((p) => p.id === inPlayerId);
            const event = createSubstitutionEvent(currentTime, team, playerOut, playerIn, concussion);
            onSubmit(event);
        } else {
            const player = players.find((p) => p.id === playerId);
            const playerNumber = team && player ? findPlayerNumberInTeam(team, player.id) : undefined;
            const event = createPlayerEvent(type, currentTime, team, player, playerNumber, concussion);
            onSubmit(event);
        }
    }

    return (
        <div className="p-4 border rounded-md bg-gray-50">
        <h3 className="font-semibold">{type}</h3>
        <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="mr-2">Équipe:</label>
            <select
                className="flex-1"
                value={teamIdx}
                onChange={(e) => setTeamIdx(Number(e.target.value))}
            >
                {teams.map((t, idx) => (
                <option key={idx} value={idx}>
                    {t.name}
                </option>
                ))}
            </select>
            </div>
            {type === "Changement" ? (
            <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="mr-2">Sortant:</label>
                <select
                    className="flex-1"
                    value={outPlayerId}
                    onChange={(e) => setOutPlayerId(e.target.value)}
                >
                    <option value="">--</option>
                    {players.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                    ))}
                </select>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="mr-2">Entrant:</label>
                <select
                    className="flex-1"
                    value={inPlayerId}
                    onChange={(e) => setInPlayerId(e.target.value)}
                >
                    <option value="">--</option>
                    {players.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                    ))}
                </select>
                </div>
            </>
            ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="mr-2">Joueur:</label>
                <select
                className="flex-1"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                >
                <option value="">--</option>
                {players.map((p) => (
                    <option key={p.id} value={p.id}>
                    {p.name}
                    </option>
                ))}
                </select>
            </div>
            )}
            <div>
            <label>
                <input
                type="checkbox"
                checked={concussion}
                onChange={(e) => setConcussion(e.target.checked)}
                className="mr-1"
                />
                Protocole commotion
            </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
            <button
                className="px-3 py-1 bg-green-500 text-white rounded"
                onClick={handleSubmit}
            >
                Valider
            </button>
            <button
                className="px-3 py-1 bg-gray-300 rounded"
                onClick={onCancel}
            >
                Annuler
            </button>
            </div>
        </div>
        </div>
    );
}
