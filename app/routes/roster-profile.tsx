import { Link, useParams } from "react-router";
import type { Route } from "./+types/roster-profile";
import { useMemo, useState } from "react";
import { useTeams } from "~/context/TeamsContext";
import { toShortId, findFullId } from "~/utils/shortId";
import { parsePlayerName } from "~/utils/RosterUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCrown, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { getFlagUrl } from "~/utils/countries";
import { faPenToSquare as faPenToSquareRegular } from "@fortawesome/free-regular-svg-icons";
import { CURRENT_SEASON, type PlayerPosition, type Title } from "~/types/tracker";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Vue effectif" }];
}

function getRosterBackPath(rosterId: string | null | undefined): string {
  if (!rosterId) return "/roster";
  return `/r/${toShortId(rosterId)}`;
}

function getPlayerProfilePath(rosterId: string | null | undefined, playerId: string): string {
  if (!rosterId) return "/roster";
  return `/r/${toShortId(rosterId)}/p/${toShortId(playerId)}`;
}


function getSortableFirstName(fullName: string): string {
  const { first, last } = parsePlayerName(fullName.trim());
  return (first || last).trim();
}

const POSITION_PRIORITY: PlayerPosition[] = [
  "première ligne",
  "talonneur",
  "deuxième ligne",
  "troisième ligne",
  "demi de mêlée",
  "demi d'ouverture",
  "centre",
  "ailier",
  "arrière",
];

function getPositionRank(positions?: PlayerPosition[]): number {
  if (!positions || positions.length === 0) return POSITION_PRIORITY.length;
  const rankedPositions = positions
    .map((position) => POSITION_PRIORITY.indexOf(position))
    .filter((index) => index >= 0);
  return rankedPositions.length > 0 ? Math.min(...rankedPositions) : POSITION_PRIORITY.length;
}

function comparePlayersByPositionThenName(
  firstPlayer: { name: string; positions?: PlayerPosition[] },
  secondPlayer: { name: string; positions?: PlayerPosition[] }
): number {
  const firstRank = getPositionRank(firstPlayer.positions);
  const secondRank = getPositionRank(secondPlayer.positions);
  if (firstRank !== secondRank) return firstRank - secondRank;

  const firstFirstName = getSortableFirstName(firstPlayer.name);
  const secondFirstName = getSortableFirstName(secondPlayer.name);
  const firstNameComparison = firstFirstName.localeCompare(secondFirstName, "fr", { sensitivity: "base" });
  if (firstNameComparison !== 0) return firstNameComparison;

  return firstPlayer.name.localeCompare(secondPlayer.name, "fr", { sensitivity: "base" });
}

export default function RosterProfilePage() {
  const { rosterId: shortRosterId } = useParams();
  const { rosters, teams, setRosters } = useTeams();
  const [selectedSeason, setSelectedSeason] = useState(CURRENT_SEASON);

  // Convert short ID to full ID
  const rosterId = useMemo(
    () => findFullId(shortRosterId, rosters),
    [shortRosterId, rosters]
  );

  const roster = useMemo(
    () => rosters.find((item) => item.id === rosterId) ?? null,
    [rosters, rosterId]
  );

  // Available seasons, sorted descending
  const availableSeasons = useMemo(() => {
    if (!roster) return [CURRENT_SEASON];
    const keys = Object.keys(roster.seasons ?? {});
    if (!keys.includes(CURRENT_SEASON)) keys.push(CURRENT_SEASON);
    return keys.sort().reverse();
  }, [roster]);

  const isCurrentSeason = selectedSeason === CURRENT_SEASON;

  const seasonPlayers = useMemo(() => {
    if (!roster) return [];
    if (isCurrentSeason) return roster.players;
    return roster.seasons?.[selectedSeason]?.players ?? [];
  }, [roster, selectedSeason, isCurrentSeason]);

  const seasonCoach = useMemo(() => {
    if (!roster) return undefined;
    if (isCurrentSeason) return roster.coach;
    return roster.seasons?.[selectedSeason]?.coach;
  }, [roster, selectedSeason, isCurrentSeason]);

  const rosterTeams = useMemo(() => {
    if (!roster) return [];
    return teams.filter((item) => item.rosterId === roster.id);
  }, [teams, roster]);

  const sortedPlayers = useMemo(() => {
    if (!roster) return [];

    return [...seasonPlayers].sort(comparePlayersByPositionThenName);
  }, [roster, seasonPlayers]);

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

  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [coachInput, setCoachInput] = useState("");
  const [isEditingPresident, setIsEditingPresident] = useState(false);
  const [presidentInput, setPresidentInput] = useState("");
  const [isEditingFoundedIn, setIsEditingFoundedIn] = useState(false);
  const [foundedInInput, setFoundedInInput] = useState("");
  const [isEditingTitles, setIsEditingTitles] = useState(false);
  const [titlesDraft, setTitlesDraft] = useState<Title[]>([]);

  function saveCoach() {
    if (!roster) return;
    const name = coachInput.trim() || undefined;
    setRosters((current) =>
      current.map((item) =>
        item.id === roster.id
          ? {
              ...item,
              coach: name,
              coachData: name
                ? { ...(item.coachData ?? {}), name }
                : undefined,
            }
          : item,
      ),
    );
    setIsEditingCoach(false);
  }

  function savePresident() {
    if (!roster) return;
    const name = presidentInput.trim() || undefined;
    setRosters((current) =>
      current.map((item) =>
        item.id === roster.id
          ? {
              ...item,
              president: name,
              presidentData: name
                ? { ...(item.presidentData ?? {}), name }
                : undefined,
            }
          : item,
      ),
    );
    setIsEditingPresident(false);
  }

  function saveFoundedIn() {
    if (!roster) return;
    const parsed = parseInt(foundedInInput, 10);
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    setRosters((current) =>
      current.map((item) =>
        item.id === roster.id ? { ...item, founded_in: value } : item,
      ),
    );
    setIsEditingFoundedIn(false);
  }

  function startEditingTitles() {
    setTitlesDraft(roster?.titles ? roster.titles.map((t) => ({ ...t })) : []);
    setIsEditingTitles(true);
  }

  function addTitleRow() {
    setTitlesDraft((prev) => [...prev, { competition: "", ranking: "Vainqueur", year: new Date().getFullYear() }]);
  }

  function removeTitleRow(index: number) {
    setTitlesDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTitleDraft(index: number, field: keyof Title, value: string | number) {
    setTitlesDraft((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  }

  function saveTitles() {
    if (!roster) return;
    const cleaned = titlesDraft.filter((t) => t.competition.trim() && t.year > 0);
    setRosters((current) =>
      current.map((item) =>
        item.id === roster.id ? { ...item, titles: cleaned.length > 0 ? cleaned : undefined } : item,
      ),
    );
    setIsEditingTitles(false);
  }

  function getCoachProfilePath(): string {
    if (!rosterId) return "#";
    return `/r/${toShortId(rosterId)}/coach`;
  }

  function getPresidentProfilePath(): string {
    if (!rosterId) return "#";
    return `/r/${toShortId(rosterId)}/president`;
  }

  const backPath = getRosterBackPath(rosterId);

  if (!roster) {
    return (
      <main className="sp-page space-y-4">
        <h1 className="text-2xl font-bold">Vue effectif introuvable</h1>
        <Link to={backPath} className="sp-link-muted">
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs mr-1" />
          Retour à l'effectif
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
          Retour à l'effectif
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
        <section className="sp-panel space-y-3 md:col-span-2">
          <h2 className="font-semibold">Informations</h2>
          <p className="text-sm text-neutral-200">
            <strong>Championnat:</strong> {roster.category || "Non renseigné"}
          </p>
          <div className="flex items-center justify-between">
            {isEditingFoundedIn ? (
              <input
                type="number"
                className="sp-input-control flex-1 text-sm border-l-2 border-l-sky-500"
                autoFocus
                min={1800}
                max={new Date().getFullYear()}
                value={foundedInInput}
                onChange={(e) => setFoundedInInput(e.target.value)}
                onBlur={saveFoundedIn}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveFoundedIn();
                  if (e.key === "Escape") setIsEditingFoundedIn(false);
                }}
              />
            ) : (
              <p className="text-sm text-neutral-200">
                <strong>Cr\u00e9ation :</strong> {roster.founded_in || "Non renseign\u00e9"}
              </p>
            )}
            {!isEditingFoundedIn && (
              <button
                type="button"
                className="ml-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                onClick={() => {
                  setFoundedInInput(roster.founded_in?.toString() ?? "");
                  setIsEditingFoundedIn(true);
                }}
                aria-label="Modifier l'ann\u00e9e de cr\u00e9ation"
              >
                <FontAwesomeIcon icon={faPenToSquareRegular} />
              </button>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              {!isEditingTitles ? (
                <p className="text-sm text-neutral-200">
                  <strong>Palmar\u00e8s :</strong>{" "}
                  {roster.titles && roster.titles.length > 0
                    ? roster.titles
                        .map(
                          (title) =>
                            `${title.ranking} ${title.competition} (${title.year})`,
                        )
                        .join(", ")
                    : "Non renseign\u00e9"}
                </p>
              ) : (
                <p className="text-sm text-neutral-200 font-semibold">Palmar\u00e8s</p>
              )}
              {!isEditingTitles && (
                <button
                  type="button"
                  className="ml-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  onClick={startEditingTitles}
                  aria-label="Modifier le palmar\u00e8s"
                >
                  <FontAwesomeIcon icon={faPenToSquareRegular} />
                </button>
              )}
            </div>
            {isEditingTitles && (
              <div className="mt-2 space-y-2">
                {titlesDraft.map((title, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      className="sp-input-control text-sm flex-1"
                      placeholder="Comp\u00e9tition"
                      value={title.competition}
                      onChange={(e) => updateTitleDraft(index, "competition", e.target.value)}
                    />
                    <select
                      className="sp-input-control text-sm w-32"
                      value={title.ranking}
                      onChange={(e) => updateTitleDraft(index, "ranking", e.target.value)}
                    >
                      <option value="Vainqueur">Vainqueur</option>
                      <option value="Finaliste">Finaliste</option>
                    </select>
                    <input
                      type="number"
                      className="sp-input-control text-sm w-20"
                      placeholder="Ann\u00e9e"
                      value={title.year}
                      onChange={(e) => updateTitleDraft(index, "year", parseInt(e.target.value, 10) || 0)}
                    />
                    <button
                      type="button"
                      className="sp-button sp-button-xs sp-button-red sp-button-icon"
                      onClick={() => removeTitleRow(index)}
                      aria-label="Supprimer ce titre"
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="sp-button sp-button-xs sp-button-blue"
                  onClick={addTitleRow}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1" />
                  Ajouter un titre
                </button>
                <div className="flex items-center gap-2 mt-1">
                  <button type="button" className="sp-button sp-button-xs sp-button-blue" onClick={saveTitles}>
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="sp-button sp-button-xs sp-button-light"
                    onClick={() => setIsEditingTitles(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            {isCurrentSeason && isEditingCoach ? (
              <input
                type="text"
                className="sp-input-control flex-1 text-sm border-l-2 border-l-sky-500"
                autoFocus
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                onBlur={saveCoach}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveCoach();
                  if (e.key === "Escape") setIsEditingCoach(false);
                }}
              />
            ) : (
              <p className="text-sm text-neutral-200">
                <strong>Entraineur :</strong>{" "}
                {seasonCoach ? (
                  <Link to={getCoachProfilePath()} className="hover:text-sky-300 underline-offset-2 hover:underline">
                    {seasonCoach}
                  </Link>
                ) : "Non renseigné"}
              </p>
            )}
            {isCurrentSeason && !isEditingCoach && (
              <button
                type="button"
                className="ml-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                onClick={() => {
                  setCoachInput(roster.coach || "");
                  setIsEditingCoach(true);
                }}
                aria-label="Modifier l'entraîneur"
              >
                <FontAwesomeIcon icon={faPenToSquareRegular} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            {isCurrentSeason && isEditingPresident ? (
              <input
                type="text"
                className="sp-input-control flex-1 text-sm border-l-2 border-l-sky-500"
                autoFocus
                value={presidentInput}
                onChange={(e) => setPresidentInput(e.target.value)}
                onBlur={savePresident}
                onKeyDown={(e) => {
                  if (e.key === "Enter") savePresident();
                  if (e.key === "Escape") setIsEditingPresident(false);
                }}
              />
            ) : (
              <p className="text-sm text-neutral-200">
                <strong>Président :</strong>{" "}
                {roster.president ? (
                  <Link to={getPresidentProfilePath()} className="hover:text-sky-300 underline-offset-2 hover:underline">
                    {roster.president}
                  </Link>
                ) : "Non renseigné"}
              </p>
            )}
            {isCurrentSeason && !isEditingPresident && (
              <button
                type="button"
                className="ml-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                onClick={() => {
                  setPresidentInput(roster.president || "");
                  setIsEditingPresident(true);
                }}
                aria-label="Modifier le président"
              >
                <FontAwesomeIcon icon={faPenToSquareRegular} />
              </button>
            )}
          </div>
          <p className="text-sm text-neutral-200">
            <strong>Joueurs dans l'effectif:</strong> {seasonPlayers.length}
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

      {/* Season tabs */}
      <nav className="flex gap-1 border-b border-neutral-700 pb-0">
        {availableSeasons.map((season) => (
          <button
            key={season}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              selectedSeason === season
                ? "border-b-2 border-sky-500 text-sky-400"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            onClick={() => setSelectedSeason(season)}
          >
            {season}
          </button>
        ))}
      </nav>

      <section className="sp-panel space-y-3">
        <h2 className="font-semibold">Joueurs de l'effectif</h2>
        {playerRows.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Aucun joueur dans cet effectif.
          </p>
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
                        to={getPlayerProfilePath(rosterId, row.player.id)}
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
                    {row.player.nationality && (
                      <img
                        src={getFlagUrl(row.player.nationality)}
                        alt={row.player.nationality}
                        className="inline-block"
                        width={16}
                        height={12}
                      />
                    )}
                  </div>
                </div>
                {row.compositions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {row.compositions.map((entry) => (
                      <li
                        key={`${row.player.id}-${entry.teamName}-${entry.number}`}
                        className="text-xs text-neutral-300"
                      >
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
