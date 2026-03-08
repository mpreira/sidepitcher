import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { getConnectedAccountFromRequest, listAdminAccounts } from "~/utils/account.server";

interface AdminAccountItem {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export function meta() {
  return [{ title: "Administration comptes" }];
}

export async function loader({ request }: { request: Request }) {
  const account = await getConnectedAccountFromRequest(request);
  if (!account) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (!account.isAdmin) {
    throw new Response("Forbidden", { status: 403 });
  }

  const accounts = await listAdminAccounts();
  return {
    adminId: account.id,
    accounts,
  };
}

export default function AdminAccountsPage() {
  const data = useLoaderData<typeof loader>();
  const [accounts, setAccounts] = useState<AdminAccountItem[]>(() => data.accounts ?? []);
  const [passwordDraft, setPasswordDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshAccounts() {
    const response = await fetch("/api/admin/accounts");
    const payload = (await response.json()) as { accounts?: AdminAccountItem[] };
    setAccounts(payload.accounts ?? []);
  }

  async function updateAccount(item: AdminAccountItem) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: item.id,
          name: item.name,
          email: item.email,
          isAdmin: item.isAdmin,
          password: passwordDraft[item.id]?.trim() ? passwordDraft[item.id] : undefined,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean };
      if (!response.ok || !payload.ok) {
        setError("Impossible de mettre a jour ce compte.");
        return;
      }

      await refreshAccounts();
      setPasswordDraft((prev) => ({ ...prev, [item.id]: "" }));
      setMessage("Compte mis a jour.");
    } catch {
      setError("Impossible de mettre a jour ce compte.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(accountId: string) {
    if (accountId === data.adminId) {
      setError("Impossible de supprimer votre propre compte admin.");
      return;
    }

    const confirmed = window.confirm("Supprimer ce compte ?");
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const payload = (await response.json()) as { ok?: boolean };
      if (!response.ok || !payload.ok) {
        setError("Impossible de supprimer ce compte.");
        return;
      }

      await refreshAccounts();
      setMessage("Compte supprime.");
    } catch {
      setError("Impossible de supprimer ce compte.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-4 overflow-x-hidden">
      <h1 className="text-2xl font-bold">Administration des comptes</h1>
      <p className="text-sm text-neutral-300">Visible uniquement pour le compte admin connecte.</p>

      <ul className="space-y-3">
        {accounts.map((item) => (
          <li key={item.id} className="rounded border border-neutral-700 p-3 space-y-2 bg-neutral-900">
            <input
              type="text"
              value={item.name}
              onChange={(event) =>
                setAccounts((prev) =>
                  prev.map((entry) =>
                    entry.id === item.id ? { ...entry, name: event.target.value } : entry
                  )
                )
              }
              className="w-full border border-neutral-700 bg-neutral-950 rounded px-2 py-1"
            />
            <input
              type="email"
              value={item.email}
              onChange={(event) =>
                setAccounts((prev) =>
                  prev.map((entry) =>
                    entry.id === item.id ? { ...entry, email: event.target.value } : entry
                  )
                )
              }
              className="w-full border border-neutral-700 bg-neutral-950 rounded px-2 py-1"
            />
            <input
              type="password"
              value={passwordDraft[item.id] ?? ""}
              onChange={(event) =>
                setPasswordDraft((prev) => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="Nouveau mot de passe (optionnel)"
              className="w-full border border-neutral-700 bg-neutral-950 rounded px-2 py-1"
            />
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.isAdmin}
                onChange={(event) =>
                  setAccounts((prev) =>
                    prev.map((entry) =>
                      entry.id === item.id ? { ...entry, isAdmin: event.target.checked } : entry
                    )
                  )
                }
              />
              Admin
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateAccount(item)}
                disabled={busy}
                className="flex-1 px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-500"
              >
                Mettre a jour
              </button>
              <button
                onClick={() => deleteAccount(item.id)}
                disabled={busy || item.id === data.adminId}
                className="flex-1 px-3 py-1 rounded bg-red-700 text-white hover:bg-red-800 disabled:bg-gray-500"
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>

      {message && <p className="text-sm text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <Link to="/account" className="text-sm underline text-neutral-300">
        Retour reglages
      </Link>
    </main>
  );
}
