import { useState } from "react";
import { useAccount } from "~/context/AccountContext";

export function meta() {
  return [{ title: "Reglages" }];
}

export default function SettingsPage() {
  const { account, loading, refreshAccount } = useAccount();
  const [newName, setNewName] = useState("");
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [newAccountCode, setNewAccountCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createNewAccount() {
    setBusy(true);
    setError("");
    setMessage("");
    setNewAccountCode("");

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create", name: newName }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        accessCode?: string;
      };

      if (!response.ok || !data.ok || !data.accessCode) {
        setError("Impossible de creer le compte.");
        return;
      }

      await refreshAccount();
      setNewAccountCode(data.accessCode);
      setMessage("Nouveau compte cree et active.");
      setNewName("");
    } catch {
      setError("Impossible de creer le compte.");
    } finally {
      setBusy(false);
    }
  }

  async function switchAccount() {
    if (!accessCodeInput.trim()) {
      setError("Entre un code d'acces valide.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "switch", accessCode: accessCodeInput }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        setError("Compte introuvable. Verifie le code.");
        return;
      }

      await refreshAccount();
      setMessage("Compte active.");
      setAccessCodeInput("");
      setNewAccountCode("");
    } catch {
      setError("Impossible de changer de compte.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <h1 className="leading-[0.95] font-bold tracking-[-0.03em] text-4xl text-center text-white">
        Reglages du compte
      </h1>

      <section className="border border-neutral-700 rounded p-4 bg-neutral-900 space-y-2">
        <h2 className="font-semibold">Compte actif</h2>
        {loading ? (
          <p className="text-sm text-neutral-300">Chargement du compte...</p>
        ) : account ? (
          <>
            <p className="text-sm text-neutral-200">Nom: {account.name}</p>
            <p className="text-xs text-neutral-400 break-all">ID: {account.id}</p>
          </>
        ) : (
          <p className="text-sm text-neutral-300">Aucun compte charge.</p>
        )}
      </section>

      <section className="border border-neutral-700 rounded p-4 bg-neutral-900 space-y-3">
        <h2 className="font-semibold">Creer un compte</h2>
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Nom du compte (optionnel)"
        />
        <button
          onClick={createNewAccount}
          disabled={busy}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500"
        >
          {busy ? "Creation..." : "Creer et utiliser ce compte"}
        </button>
        {newAccountCode && (
          <p className="text-sm text-green-400 break-all">
            Code d'acces a conserver: <span className="font-semibold">{newAccountCode}</span>
          </p>
        )}
      </section>

      <section className="border border-neutral-700 rounded p-4 bg-neutral-900 space-y-3">
        <h2 className="font-semibold">Changer de compte</h2>
        <input
          type="text"
          value={accessCodeInput}
          onChange={(event) => setAccessCodeInput(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Code d'acces du compte"
        />
        <button
          onClick={switchAccount}
          disabled={busy}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500"
        >
          {busy ? "Activation..." : "Activer ce compte"}
        </button>
      </section>

      {message && <p className="text-sm text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
