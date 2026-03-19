import { Link, useParams } from "react-router";
import type { Route } from "./+types/roster-profile";
import { useMemo } from "react";
import { useTeams } from "~/context/TeamsContext";
import { parsePlayerName } from "~/utils/RosterUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCrown } from "@fortawesome/free-solid-svg-icons";

export function meta({ params }: Route.MetaArgs) {
  const teamId = params.teamId;
  return [{ title: teamId ? "Vue effectif" : "Effectif" }];
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

function getPlayerProfilePath(
  rosterSlugId: string | undefined,
  championshipSlug: string | undefined,
  playerId: string
): string {
  if (!rosterSlugId) return "/roster";
  if (championshipSlug) {
    return `/roster/${championshipSlug}/${rosterSlugId}/player/${playerId}`;
  }
  return `/roster/${rosterSlugId}/player/${playerId}`;
}

function getSortableFirstName(fullName: string): string {
  const { first, last } = parsePlayerName(fullName.trim());
  return (first || last).trim();
}

export default function RosterProfilePage() {
  const { rosterSlugId, championshipSlug, teamId } = useParams();
  const { rosters, teams } = useTeams();

  const rosterId = getRosterIdFromParam(rosterSlugId);
  const roster = useMemo(
    () => rosters.find((item) => item.id === rosterId) ?? null,
    [rosters, rosterId]
  );

  const team = useMemo(() => {
    if (!roster || !teamId) return null;
    return teams.find((item) => item.id === teamId && item.rosterId === roster.id) ?? null;
  }, [teams, roster, teamId]);

  const sortedPlayers = useMemo(() => {
    if (!roster) return [];

    return [...roster.players].sort((firstPlayer, secondPlayer) => {
      const firstFirstName = getSortableFirstName(firstPlayer.name);
      const secondFirstName = getSortableFirstName(secondPlayer.name);
      const firstNameComparison = firstFirstName.localeCompare(secondFirstName, "fr", { sensitivity: "base" });
      if (firstNameComparison !== 0) return firstNameComparison;
      return firstPlayer.name.localeCompare(secondPlayer.name, "fr", { sensitivity: "base" });
    });
  }, [roster]);

  const playerRows = useMemo(() => {
    if (!team) return [];

    const numberByPlayerId = new Map<string, number>();
    const roleByPlayerId = new Map<string, "Titulaire" | "Remplaçant">();

    [...team.starters, ...team.substitutes].forEach((entry) => {
      numberByPlayerId.set(entry.player.id, entry.number);
      roleByPlayerId.set(entry.player.id, entry.number <= 15 ? "Titulaire" : "Remplaçant");
    });

    return sortedPlayers.map((player) => ({
      player,
      number: numberByPlayerId.get(player.id) ?? null,
      role: roleByPlayerId.get(player.id) ?? null,
      isCaptain: team.captainPlayerId === player.id,
    }));
  }, [sortedPlayers, team]);

  const backPath = getRosterBackPath(rosterSlugId, championshipSlug);

  if (!roster || !team) {
    return (
      <main className="sp-page space-y-4">
        <h1 className="text-2xl font-bold">Vue effectif introuvable</h1>
        <Link to={backPath} className="sp-link-muted">
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs mr-1" />
          Retour a l'effectif
        </Link>
      </main>
    );
  }

  return (
    <main className="sp-page space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-sm text-neutral-400">Effectif source: {roster.name}</p>
        <Link to={backPath} className="sp-link-muted">
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs mr-1" />
          Retour a l'effectif
        </Link>
      </div>

      <section className="sp-panel space-y-3">
        <h2 className="font-semibold">Informations</h2>
        <p className="text-sm text-neutral-200">
          <strong>Championnat:</strong> {roster.category || "Non renseigne"}
        </p>
        <p className="text-sm text-neutral-200">
          <strong>Surnom:</strong> {team.nickname || roster.nickname || "Non renseigne"}
        </p>
        <p className="text-sm text-neutral-200">
          <strong>Couleur:</strong> {team.color || roster.color || "Non renseignee"}
        </p>
        <p className="text-sm text-neutral-200">
          <strong>Titulaires:</strong> {team.starters.length} / 15
        </p>
        <p className="text-sm text-neutral-200">
          <strong>Remplaçants:</strong> {team.substitutes.length} / 8
        </p>
        <p className="text-sm text-neutral-200">
          <strong>Joueurs dans la composition:</strong> {team.starters.length + team.substitutes.length}
        </p>
        <p className="text-sm text-neutral-200">
          <strong>Joueurs dans l'effectif:</strong> {roster.players.length}
        </p>
      </section>

      <section className="sp-panel space-y-3">
        <h2 className="font-semibold">Joueurs de l'effectif</h2>
        {playerRows.length === 0 ? (
          <p className="text-sm text-neutral-400">Aucun joueur dans cet effectif.</p>
        ) : (
          <ul className="space-y-2">
            {playerRows.map((row) => (
              <li
                key={row.player.id}
                className="rounded border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-sm text-neutral-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      <Link
                        to={getPlayerProfilePath(rosterSlugId, championshipSlug, row.player.id)}
                        className="hover:text-sky-300 underline-offset-2 hover:underline"
                      >
                        {row.player.name}
                      </Link>
                    </p>
                    <p className="text-xs text-neutral-400">
                      {row.player.positions && row.player.positions.length > 0
                        ? row.player.positions.join(" / ")
                        : "Postes non renseignes"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-neutral-300 shrink-0">
                    <p>{row.number ? `#${row.number}` : "Hors composition"}</p>
                    <p>{row.role || "-"}</p>
                  </div>
                </div>
                {row.isCaptain && (
                  <p className="mt-1 text-xs text-sky-300">
                    <FontAwesomeIcon icon={faCrown} className="mr-1" />
                    Capitaine
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
