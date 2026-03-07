import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";
import Scoreboard from "~/components/Scoreboard";
import type { LiveSnapshot, LiveStreamMessage } from "~/types/live";
import type { Team } from "~/types/tracker";
import { formatTime } from "~/utils/TimeUtils";
import { getLiveMatchByPublicSlug } from "~/utils/database.server";

export async function loader({ params }: { params: { publicSlug?: string } }) {
  const publicSlug = params.publicSlug;
  if (!publicSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  const liveMatch = await getLiveMatchByPublicSlug(publicSlug);
  if (!liveMatch) {
    throw new Response("Not Found", { status: 404 });
  }

  return { publicSlug };
}

export function meta() {
  return [{ title: "Live Match" }];
}

type LiveAvailability = "active" | "closed" | "expired";

function StatusBadge({ availability }: { availability: LiveAvailability }) {
  if (availability === "closed") {
    return <span className="inline-block rounded bg-amber-700 px-2 py-1 text-xs font-semibold text-white">Live termine</span>;
  }

  if (availability === "expired") {
    return <span className="inline-block rounded bg-neutral-700 px-2 py-1 text-xs font-semibold text-white">Session expiree</span>;
  }

  return <span className="inline-block rounded bg-green-700 px-2 py-1 text-xs font-semibold text-white">Live actif</span>;
}

function StatBlock({ label, values }: { label: string; values: number[] }) {
  return (
    <div className="border border-neutral-700 rounded p-3 bg-neutral-900">
      <p className="text-sm text-neutral-300">{label}</p>
      <p className="text-lg font-semibold">{values[0] || 0} - {values[1] || 0}</p>
    </div>
  );
}

export default function LiveViewPage() {
  const { publicSlug } = useLoaderData<typeof loader>();
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [availability, setAvailability] = useState<LiveAvailability>("active");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`/api/live/${publicSlug}/state`)
      .then(async (r) => {
        if (r.status === 410) {
          return { availability: "expired" as LiveAvailability };
        }
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: { state?: LiveSnapshot; updatedAt?: string; availability?: LiveAvailability } | null) => {
        if (!mounted || !data) return;
        if (data.availability) {
          setAvailability(data.availability);
        }
        if (!data.state || !data.updatedAt) return;
        setSnapshot(data.state);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => {
        // Keep UI state as-is when initial fetch fails.
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const source = new EventSource(`/api/live/${publicSlug}/stream`);
    source.onmessage = (message) => {
      const parsed = JSON.parse(message.data) as LiveStreamMessage;
      if (parsed.type !== "snapshot") return;
      if (parsed.availability) {
        setAvailability(parsed.availability);
      } else if (parsed.payload.matchEnded) {
        setAvailability("closed");
      }
      setSnapshot(parsed.payload);
      setUpdatedAt(parsed.updatedAt);
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      mounted = false;
      source.close();
    };
  }, [publicSlug]);

  if (!snapshot && isLoading) {
    return (
      <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Feuille de match en direct</h1>
        <p className="text-sm text-neutral-400">Chargement du direct...</p>
      </main>
    );
  }

  if (!snapshot && availability === "expired") {
    return (
      <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Feuille de match en direct</h1>
        <StatusBadge availability={availability} />
        <p className="text-sm text-neutral-300">Cette session de diffusion n'est plus disponible.</p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Feuille de match en direct</h1>
        <StatusBadge availability={availability} />
        <p className="text-sm text-neutral-300">Le live n'est pas accessible pour le moment.</p>
      </main>
    );
  }

  const mainTimerText = snapshot.matchEnded ? "Match termine" : formatTime(snapshot.currentTime);
  const teams: Team[] = snapshot.teams.map((team) => ({
    id: team.id,
    name: team.name,
    rosterId: "live",
    starters: [],
    substitutes: [],
  }));

  return (
    <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <h1 className="text-3xl font-bold text-center">Feuille de match en direct</h1>
      <div className="text-center">
        <StatusBadge availability={availability} />
      </div>
      {updatedAt && <p className="text-center text-sm text-neutral-400">Mise a jour: {new Date(updatedAt).toLocaleTimeString("fr-FR")}</p>}

      <Scoreboard teams={teams} scores={snapshot.scores} mainTimerText={mainTimerText} />

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatBlock label="Pénalités" values={snapshot.penalties} />
        <StatBlock label="En-avant" values={snapshot.enAvant} />
        <StatBlock label="Touches volées" values={snapshot.toucheGagnee} />
        <StatBlock label="Touches perdues" values={snapshot.touchePerdue} />
        <StatBlock label="Mêlées gagnées" values={snapshot.meleeGagnee} />
        <StatBlock label="Mêlées perdues" values={snapshot.meleePerdue} />
        <StatBlock label="Turnover" values={snapshot.turnover || [0, 0]} />
        <StatBlock label="Offloads" values={snapshot.offloads || [0, 0]} />
        <StatBlock label="Jeu au pied" values={snapshot.jeuAuPied || [0, 0]} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Événements</h2>
        {snapshot.events.length === 0 ? (
          <p>Aucune action enregistrée.</p>
        ) : (
          <ul className="space-y-1">
            {snapshot.events.map((event, index) => (
              <li key={`${event.time}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-white">
                <span className="min-w-0 break-words">
                  {event.summary ? (
                    <>
                      {formatTime(event.time)} - <strong>{event.summary}</strong>
                    </>
                  ) : (
                    <>
                      {event.type === "Arbitrage Vidéo" ? (
                        <>
                          {formatTime(event.time)} - {event.type}
                          {event.team && ` (${event.team.name.replace(/\s+J\d+$/, "")})`}
                          {event.videoReason && ` — raison: ${event.videoReason}`}
                        </>
                      ) : (
                        <>
                          {formatTime(event.time)} - {event.type} de{" "}
                          {event.player && (
                            <>
                              <strong>{event.player.name}</strong>
                              {event.playerNumber ? ` (#${event.playerNumber})` : ""}
                            </>
                          )}
                          {event.team && ` (${event.team.name.replace(/\s+J\d+$/, "")})`}
                        </>
                      )}
                      {event.playerOut && event.playerIn && (
                        <>
                          {" — "}
                          <strong>{event.playerOut.name}</strong>
                          {" → "}
                          <strong>{event.playerIn.name}</strong>
                        </>
                      )}
                      {event.concussion && " 🚨 commotion"}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
