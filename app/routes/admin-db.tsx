import { Link, useLoaderData } from "react-router";
import {
  getRostersStateForAccount,
  listMatchDaySelections,
  listSummaries,
} from "~/utils/database.server";
import { resolveAccountFromRequest } from "~/utils/account.server";

export function meta() {
  return [{ title: "Diagnostic DB" }];
}

export async function loader({ request }: { request: Request }) {
  const resolved = await resolveAccountFromRequest(request);
  const rostersState = await getRostersStateForAccount(resolved.account.id);
  const selections = await listMatchDaySelections(resolved.account.id);
  const summaries = await listSummaries(resolved.account.id);

  return {
    rostersCount: Array.isArray(rostersState.rosters) ? rostersState.rosters.length : 0,
    teamsCount: Array.isArray(rostersState.teams) ? rostersState.teams.length : 0,
    accountId: resolved.account.id,
    accountName: resolved.account.name,
    activeRosterId: rostersState.activeRosterId,
    matchDay: rostersState.matchDay ?? "",
    sport: rostersState.sport ?? "Rugby",
    championship: rostersState.championship ?? "Top 14",
    selectionsCount: selections.length,
    summariesCount: summaries.length,
    selectionsPreview: selections.slice(0, 20),
    summariesPreview: summaries.slice(0, 20).map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      matchDay: item.matchDay,
      teams: item.teams ?? [],
      eventsCount: Array.isArray(item.events) ? item.events.length : 0,
    })),
  };
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="text-xs overflow-x-auto bg-neutral-950 border border-neutral-700 rounded p-3">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminDbPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4 overflow-x-hidden">
      <h1 className="text-2xl font-bold">Diagnostic base de donnees</h1>
      <p className="text-sm text-gray-300">
        Page de lecture seule pour verifier les donnees PostgreSQL (Render).
      </p>

      <section className="space-y-2">
        <h2 className="font-semibold">Compte</h2>
        <ul className="text-sm space-y-1">
          <li>Nom: {data.accountName}</li>
          <li className="break-all">ID: {data.accountId}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Etat effectifs</h2>
        <ul className="text-sm space-y-1">
          <li>Effectifs: {data.rostersCount}</li>
          <li>Equipes composees: {data.teamsCount}</li>
          <li>Effectif actif: {data.activeRosterId || "(aucun)"}</li>
          <li>Journee: {data.matchDay || "(vide)"}</li>
          <li>Sport: {data.sport}</li>
          <li>Championnat: {data.championship}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Selections match sauvegardees ({data.selectionsCount})</h2>
        <JsonBlock value={data.selectionsPreview} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Syntheses sauvegardees ({data.summariesCount})</h2>
        <JsonBlock value={data.summariesPreview} />
      </section>

      <Link to="/" className="text-white text-base underline">
        Retour accueil
      </Link>
    </main>
  );
}
