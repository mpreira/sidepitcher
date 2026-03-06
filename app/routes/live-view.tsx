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

  useEffect(() => {
    let mounted = true;

    fetch(`/api/live/${publicSlug}/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { state: LiveSnapshot; updatedAt: string } | null) => {
        if (!mounted || !data) return;
        setSnapshot(data.state);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => {
        // Keep UI state as-is when initial fetch fails.
      });

    const source = new EventSource(`/api/live/${publicSlug}/stream`);
    source.onmessage = (message) => {
      const parsed = JSON.parse(message.data) as LiveStreamMessage;
      if (parsed.type !== "snapshot") return;
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

  if (!snapshot) {
    return (
      <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Feuille de match en direct</h1>
        <p className="text-sm text-neutral-400">Chargement du direct...</p>
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
      {updatedAt && <p className="text-center text-sm text-neutral-400">Mise a jour: {new Date(updatedAt).toLocaleTimeString("fr-FR")}</p>}

      <Scoreboard teams={teams} scores={snapshot.scores} mainTimerText={mainTimerText} />

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatBlock label="Pénalités" values={snapshot.penalties} />
        <StatBlock label="En-avant" values={snapshot.enAvant} />
        <StatBlock label="Touches gagnées" values={snapshot.toucheGagnee} />
        <StatBlock label="Touches perdues" values={snapshot.touchePerdue} />
        <StatBlock label="Mêlées gagnées" values={snapshot.meleeGagnee} />
        <StatBlock label="Mêlées perdues" values={snapshot.meleePerdue} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Événements</h2>
        {snapshot.events.length === 0 ? (
          <p className="text-sm text-neutral-400">Aucun événement pour le moment.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {snapshot.events.map((event, index) => (
              <li key={`${event.time}-${index}`}>
                {formatTime(event.time)} - {event.summary ? <strong>{event.summary}</strong> : event.type}
                {event.team?.name ? ` (${event.team.name.replace(/\s+J\d+$/, "")})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
