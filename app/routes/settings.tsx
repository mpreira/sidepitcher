import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAccount } from "~/context/AccountContext";

export function meta() {
  return [{ title: "Reglages" }];
}

export default function SettingsPage() {
  const { account, connected, loading, refreshAccount, logout } = useAccount();
  const [renameName, setRenameName] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRenameName(account?.name ?? "");
  }, [account?.id, account?.name]);

  async function createNewAccount() {
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setError("Renseigne nom, email et mot de passe.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "create",
          name: newName,
          email: newEmail,
          password: newPassword,
        }),
      });

      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        setError("Impossible de creer le compte.");
        return;
      }

      await refreshAccount();
      setMessage("Nouveau compte cree et active.");
      setNewName("");
      setNewEmail("");
      setNewPassword("");
    } catch {
      setError("Impossible de creer le compte.");
    } finally {
      setBusy(false);
    }
  }

  async function loginAccount() {
    if (!loginEmail.trim() || !loginPassword) {
      setError("Entre ton email et ton mot de passe.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "login",
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        setError("Identifiants invalides.");
        return;
      }

      await refreshAccount();
      setMessage("Connexion reussie.");
      setLoginEmail("");
      setLoginPassword("");
    } catch {
      setError("Impossible de se connecter.");
    } finally {
      setBusy(false);
    }
  }

  async function renameAccount() {
    if (!renameName.trim()) {
      setError("Entre un nom de compte.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "rename", name: renameName }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        setError("Impossible de renommer le compte.");
        return;
      }

      await refreshAccount();
      setMessage("Nom du compte mis a jour.");
    } catch {
      setError("Impossible de renommer le compte.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    try {
      await logout();
      setMessage("Deconnexion effectuee.");
    } catch {
      setError("Impossible de se deconnecter.");
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
        ) : connected && account ? (
          <>
            <p className="text-sm text-neutral-200">Nom: {account.name}</p>
            <p className="text-sm text-neutral-200">Email: {account.email}</p>
            <p className="text-sm text-neutral-200">Role: {account.isAdmin ? "Admin" : "Utilisateur"}</p>
            <p className="text-xs text-neutral-400 break-all">ID: {account.id}</p>
            <button
              onClick={disconnect}
              className="mt-2 px-3 py-1 rounded bg-red-700 text-white hover:bg-red-800"
            >
              Deconnexion
            </button>
          </>
        ) : (
          <p className="text-sm text-neutral-300">Aucun compte connecte (mode invite).</p>
        )}
      </section>

      <section id="rename-account" className="border border-neutral-700 rounded p-4 bg-neutral-900 space-y-3">
        <h2 className="font-semibold">Renommer le compte actif</h2>
        <input
          type="text"
          value={renameName}
          onChange={(event) => setRenameName(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Nom du compte"
        />
        <button
          onClick={renameAccount}
          disabled={busy || loading || !connected || !account}
          className="w-full px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:bg-gray-500"
        >
          {busy ? "Mise a jour..." : "Mettre a jour le nom"}
        </button>
      </section>

      <section id="create-account" className="border border-neutral-700 rounded p-4 bg-neutral-900 space-y-3">
        <h2 className="font-semibold">Creer un compte</h2>
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Nom d'utilisateur"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Adresse email"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Mot de passe"
        />
        <button
          onClick={createNewAccount}
          disabled={busy}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500"
        >
          {busy ? "Creation..." : "Creer et utiliser ce compte"}
        </button>
      </section>

      <section id="switch-account" className="border border-neutral-700 rounded p-4 bg-neutral-900 space-y-3">
        <h2 className="font-semibold">Se connecter</h2>
        <input
          type="email"
          value={loginEmail}
          onChange={(event) => setLoginEmail(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Adresse email"
        />
        <input
          type="password"
          value={loginPassword}
          onChange={(event) => setLoginPassword(event.target.value)}
          className="w-full border border-neutral-700 bg-neutral-950 rounded px-3 py-2"
          placeholder="Mot de passe"
        />
        <button
          onClick={loginAccount}
          disabled={busy}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500"
        >
          {busy ? "Connexion..." : "Se connecter"}
        </button>
      </section>

      {connected && account?.isAdmin && (
        <section className="border border-neutral-700 rounded p-4 bg-neutral-900 space-y-3">
          <h2 className="font-semibold">Administration</h2>
          <p className="text-sm text-neutral-300">Le compte admin peut gerer tous les comptes via la page dediee.</p>
          <Link
            to="/admin/accounts"
            className="inline-block px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
          >
            Ouvrir la page admin
          </Link>
        </section>
      )}

      {message && <p className="text-sm text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
