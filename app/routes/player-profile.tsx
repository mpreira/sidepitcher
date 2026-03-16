import { Link, useParams } from "react-router";
import type { Route } from "./+types/player-profile";
import { useMemo } from "react";
import { useTeams } from "~/context/TeamsContext";

export function meta({ params }: Route.MetaArgs) {
  const playerId = params.playerId;
  return [{ title: playerId ? "Profil joueur" : "Joueur" }];
}

function getRosterIdFromParam(rosterSlugId: string | undefined): string | null {
  if (!rosterSlugId) return null;
  const idx = rosterSlugId.lastIndexOf("_");
  if (idx === -1) return rosterSlugId;
  return rosterSlugId.slice(idx + 1);
}

function getRosterBackPath(rosterSlugId: string | undefined, championshipSlug: string | undefined): string {
  if (!rosterSlugId) return "/roster";
  if (championshipSlug) {
    return `/roster/${championshipSlug}/${rosterSlugId}`;
  }
  return `/roster/${rosterSlugId}`;
}

export default function PlayerProfilePage() {
  const { rosterSlugId, championshipSlug, playerId } = useParams();
  const { rosters, teams } = useTeams();

  const rosterId = getRosterIdFromParam(rosterSlugId);
  const roster = useMemo(
    () => rosters.find((item) => item.id === rosterId) ?? null,
    [rosters, rosterId]
  );

  const player = useMemo(
    () => roster?.players.find((item) => item.id === playerId) ?? null,
    [roster?.players, playerId]
  );

  const playerCompositions = useMemo(() => {
    if (!roster || !player) return [];

    return teams
      .filter((team) => team.rosterId === roster.id)
      .flatMap((team) => {
        const entries = [...team.starters, ...team.substitutes];
        return entries
          .filter((entry) => entry.player.id === player.id)
          .map((entry) => ({
            teamId: team.id,
            teamName: team.name,
            number: entry.number,
            isCaptain: team.captainPlayerId === player.id,
          }));
      })
      .sort((first, second) => first.number - second.number);
  }, [teams, roster, player]);

  const backPath = getRosterBackPath(rosterSlugId, championshipSlug);

  if (!roster || !player) {
    return (
      <main className="sp-page space-y-4">
        <h1 className="text-2xl font-bold">Profil joueur introuvable</h1>
        <Link to={backPath} className="sp-link-muted">
          Retour a l'effectif
        </Link>
      </main>
    );
  }

  return (
    <main className="sp-page space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{player.name}</h1>
        <p className="text-sm text-neutral-400">Effectif: {roster.name}</p>
        <Link to={backPath} className="sp-link-muted">
          Retour a l'effectif
        </Link>
      </div>

      <section className="sp-panel space-y-3">
        <h2 className="font-semibold">Informations</h2>
        <p className="text-sm text-neutral-200">
          <strong>Postes:</strong>{" "}
          {player.positions && player.positions.length > 0
            ? player.positions.join(" / ")
            : "Non renseignes"}
        </p>
        <p className="text-sm text-neutral-200 break-all">
          <strong>Photo URL:</strong> {player.photoUrl || "Non renseignee"}
        </p>
        {player.photoUrl && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">Apercu photo</p>
            <img
              src={player.photoUrl}
              alt={`Photo de ${player.name}`}
              className="h-36 w-36 rounded-md object-cover border border-neutral-700"
            />
          </div>
        )}
      </section>

      <section className="sp-panel space-y-3">
        <h2 className="font-semibold">Compositions</h2>
        {playerCompositions.length === 0 ? (
          <p className="text-sm text-neutral-400">Aucune composition pour ce joueur.</p>
        ) : (
          <ul className="space-y-2">
            {playerCompositions.map((entry) => (
              <li key={`${entry.teamId}-${entry.number}`} className="rounded border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-sm text-neutral-200">
                {entry.teamName} - #{entry.number}
                {entry.isCaptain ? " (Capitaine)" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
