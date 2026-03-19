import { Link, useParams } from "react-router";
import type { Route } from "./+types/roster-profile";
import { useMemo } from "react";
import { useTeams } from "~/context/TeamsContext";
import { parsePlayerName } from "~/utils/RosterUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCrown } from "@fortawesome/free-solid-svg-icons";

export function meta({ params }: Route.MetaArgs) {
  const rosterSlugId = params.rosterSlugId;
  return [{ title: rosterSlugId ? "Vue effectif" : "Effectif" }];
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
  const { rosterSlugId, championshipSlug } = useParams();
  const { rosters, teams } = useTeams();

  const rosterId = getRosterIdFromParam(rosterSlugId);
  const roster = useMemo(
    () => rosters.find((item) => item.id === rosterId) ?? null,
    [rosters, rosterId]
  );

  const rosterTeams = useMemo(() => {
    if (!roster) return [];
    return teams.filter((item) => item.rosterId === roster.id);
  }, [teams, roster]);

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
    if (!roster) return [];

    const compositionsByPlayerId = new Map<string, { teamName: string; number: number; role: "Titulaire" | "Remplaçant"; isCaptain: boolean }[]>();

    rosterTeams.forEach((team) => {
      [...team.starters, ...team.substitutes].forEach((entry) => {
        const existing = compositionsByPlayerId.get(entry.player.id) ?? [];
        existing.push({
          teamName: team.name,
          number: entry.number,
          role: entry.number <= 15 ? "Titulaire" : "Remplaçant",
          isCaptain: team.captainPlayerId === entry.player.id,
        });
        compositionsByPlayerId.set(entry.player.id, existing);
      });
    });

    return sortedPlayers.map((player) => ({
      player,
      compositions: (compositionsByPlayerId.get(player.id) ?? []).sort((first, second) => first.number - second.number),
    }));
  }, [sortedPlayers, roster, rosterTeams]);

  const backPath = getRosterBackPath(rosterSlugId, championshipSlug);

  if (!roster) {
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
        <h1 className="text-2xl font-bold">{roster.name}</h1>
        <p className="text-sm text-neutral-400">Vue globale de l'effectif</p>
        <Link to={backPath} className="sp-link-muted">
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs mr-1" />
          Retour a l'effectif
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
        <section className="sp-panel space-y-3 md:col-span-2">
          <h2 className="font-semibold">Informations</h2>
          <p className="text-sm text-neutral-200">
            <strong>Championnat:</strong> {roster.category || "Non renseigne"}
          </p>
          <p className="text-sm text-neutral-200">
            <strong>Surnom:</strong> {roster.nickname || "Non renseigne"}
          </p>
          <p className="text-sm text-neutral-200">
            <strong>Couleur:</strong> {roster.color || "Non renseignee"}
          </p>
          <p className="text-sm text-neutral-200">
            <strong>Compositions:</strong> {rosterTeams.length}
          </p>
          <p className="text-sm text-neutral-200">
            <strong>Joueurs selectionnables:</strong> {roster.players.length}
          </p>
          <p className="text-sm text-neutral-200">
            <strong>Joueurs dans l'effectif:</strong> {roster.players.length}
          </p>
        </section>

        {roster.logo && (
          <aside className="md:col-span-1 md:justify-self-end w-full md:w-auto">
            <img
              src={roster.logo}
              alt={`Logo de ${roster.name}`}
              className="mx-auto md:mx-0 h-auto w-full max-w-[12rem] md:max-w-full rounded-md bg-neutral-900/40 object-contain"
            />
          </aside>
        )}
      </div>

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
                      <p>{row.compositions.length > 0 ? `${row.compositions.length} composition(s)` : "Hors composition"}</p>
                  </div>
                </div>
                  {row.compositions.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {row.compositions.map((entry) => (
                        <li key={`${row.player.id}-${entry.teamName}-${entry.number}`} className="text-xs text-neutral-300">
                          {entry.teamName} - #{entry.number} ({entry.role})
                          {entry.isCaptain && (
                            <span className="ml-1 text-sky-300">
                              <FontAwesomeIcon icon={faCrown} className="mr-1" />
                              Capitaine
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
