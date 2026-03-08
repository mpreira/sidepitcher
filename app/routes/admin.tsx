import { Link } from "react-router";
import { getConnectedAccountFromRequest } from "~/utils/account.server";

export function meta() {
  return [{ title: "Administration" }];
}

export async function loader({ request }: { request: Request }) {
  const account = await getConnectedAccountFromRequest(request);
  if (!account) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (!account.isAdmin) {
    throw new Response("Forbidden", { status: 403 });
  }

  return { accountName: account.name };
}

export default function AdminPage() {
  return (
    <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4 overflow-x-hidden">
      <h1 className="text-2xl font-bold">Administration</h1>
      <p className="text-sm text-neutral-300">Choisissez une section d'administration.</p>

      <section className="rounded border border-neutral-700 bg-neutral-900 p-4 space-y-2">
        <h2 className="font-semibold">Comptes</h2>
        <p className="text-sm text-neutral-300">Gerer les comptes utilisateurs et les droits admin.</p>
        <Link
          to="/admin/accounts"
          className="inline-block px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
        >
          Administration des comptes
        </Link>
      </section>

      <Link to="/account" className="text-sm underline text-neutral-300">
        Retour compte
      </Link>
    </main>
  );
}