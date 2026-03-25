import { faRepeat } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CompositionEntry, Event, Team } from "~/types/tracker";

interface Props {
  selectedTeams: Team[];
  events: Event[];
  getDisplayTeamLabel: (team: { name: string; nickname?: string }) => string;
}

interface SubstitutionInfo {
  playerInName: string;
  playerInNumber?: number;
}

export default function TrackerTeamsPanel({ selectedTeams, events, getDisplayTeamLabel }: Props) {
  if (selectedTeams.length !== 2) {
    return (
      <p className="text-sm text-gray-500 text-center">
        Sélectionne et valide deux équipes pour afficher les compositions.
      </p>
    );
  }

  // Build substitution map: playerOut.id -> substitution info, per team
  function getSubstitutionsByTeam(team: Team): Map<string, SubstitutionInfo> {
    const map = new Map<string, SubstitutionInfo>();
    for (const event of events) {
      if (event.type === "Changement" && event.team?.id === team.id && event.playerOut && event.playerIn) {
        map.set(event.playerOut.id, {
          playerInName: event.playerIn.name,
          playerInNumber: event.playerInNumber,
        });
      }
    }
    return map;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {selectedTeams.map((team) => {
        const substitutions = getSubstitutionsByTeam(team);
        const starters = [...team.starters].sort((a, b) => a.number - b.number);
        const substitutes = [...team.substitutes].sort((a, b) => a.number - b.number);

        return (
          <section key={team.id} className="sp-panel space-y-3">
            <h3 className="font-semibold text-sm text-center">{getDisplayTeamLabel(team)}</h3>

            {starters.length === 0 && substitutes.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center">Aucun joueur dans la composition.</p>
            ) : (
              <>
                {starters.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">Titulaires</p>
                    <ul className="space-y-1">
                      {starters.map((entry) => (
                        <PlayerRow
                          key={entry.player.id}
                          entry={entry}
                          substitution={substitutions.get(entry.player.id)}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {substitutes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">Remplaçants</p>
                    <ul className="space-y-1">
                      {substitutes.map((entry) => (
                        <PlayerRow
                          key={entry.player.id}
                          entry={entry}
                          substitution={substitutions.get(entry.player.id)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PlayerRow({
  entry,
  substitution,
}: {
  entry: CompositionEntry;
  substitution?: SubstitutionInfo;
}) {
  return (
    <li className="text-sm">
      <div className={`flex items-center gap-2 ${substitution ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
        <span className="w-6 shrink-0 text-right text-xs text-neutral-400 no-underline" style={{ textDecoration: "none" }}>
          {entry.number}
        </span>
        <span>{entry.player.name}</span>
      </div>
      {substitution && (
        <div className="flex items-center gap-2 pl-8 text-xs text-sky-300 mt-0.5">
          <FontAwesomeIcon icon={faRepeat} className="shrink-0" />
          <span>
            {substitution.playerInNumber != null ? `${substitution.playerInNumber} · ` : ""}
            {substitution.playerInName}
          </span>
        </div>
      )}
    </li>
  );
}
