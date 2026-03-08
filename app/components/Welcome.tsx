import { useTeams } from "~/context/TeamsContext";
import { useAccount } from "~/context/AccountContext";
import logoSP from "~/assets/images/logo_800.svg";
import { useState } from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser } from "@fortawesome/free-solid-svg-icons";

export function Welcome() {
  const { account, connected, logout } = useAccount();
  const { matchDay, sport, championship, setMatchDay, setSport, setChampionship } = useTeams();
  const [successMessage, setSuccessMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");

  const sportOptions = ["Rugby", "Football"] as const;
  const championshipOptions = ["Top 14", "Pro D2"] as const;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMessage("Formulaire validé avec succès.");
  }

  async function handleLogout() {
    try {
      await logout();
      setAccountMessage("Deconnexion effectuee.");
    } catch {
      setAccountMessage("Impossible de se deconnecter.");
    }
  }

  return (
    <main className="relative flex h-full min-h-0 w-full items-center justify-center py-4">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        {connected && account ? (
          <>
            <span className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-200">
              <FontAwesomeIcon icon={faCircleUser} /> {account.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-800"
            >
              Deconnexion
            </button>
          </>
        ) : (
          <>
            <Link
              to="/account#switch-account"
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            >
              Se connecter
            </Link>
            <Link
              to="/account#create-account"
              className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faCircleUser} className="sm:mr-2" />
              Creer un compte
            </Link>
          </>
        )}
      </div>
      {!connected && (
        <p className="absolute left-4 top-4 z-20 rounded border border-amber-700/60 bg-amber-900/40 px-3 py-1 text-[11px] text-amber-200">
          Mode invite: les donnees sont conservees 24h.
        </p>
      )}
      <div className="flex w-full flex-1 flex-col items-center gap-16 min-h-0">
        <header className="flex w-full flex-col items-center gap-9">
            <div className="mx-auto w-full max-w-[1100px] px-2">
            <img
              src={logoSP}
              alt="Sidepitcher Logo"
              className="mx-auto block w-full max-h-[38vh] object-contain"
            />
          </div>
          {/* reglages de journee/championnat */}
          <form className="mx-auto w-5/6 max-w-sm space-y-3 text-left mb-8 md:w-full" onSubmit={handleSubmit}>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 transition-shadow focus-within:border-sky-500/70 focus-within:shadow-md focus-within:shadow-sky-500/30">
              <label className="self-center leading-none" htmlFor="sportSelect">Sport</label>
              <select
                id="sportSelect"
                className="ml-auto h-auto w-full min-w-0 self-center border-0 bg-transparent p-0 text-left leading-none shadow-none focus:ring-0 focus:border-0 sm:w-auto sm:min-w-[8rem]"
                value={sport}
                onChange={(e) =>
                  setSport(e.target.value as "Rugby" | "Football")
                }
              >
                {sportOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 transition-shadow focus-within:border-sky-500/70 focus-within:shadow-md focus-within:shadow-sky-500/30">
              <label className="self-center leading-none" data-slot="label" htmlFor="matchDayInput">Journée</label>
              <input
                id="matchDayInput"
                type="text"
                className="ml-auto h-auto w-full min-w-0 self-center border-0 bg-transparent p-0 text-center text-sm md:text-base font-light leading-none shadow-none focus:ring-0 focus:border-0 sm:w-auto sm:min-w-[13rem]"
                value={matchDay}
                onChange={(e) => setMatchDay(e.target.value)}
                placeholder="ex. J1"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 transition-shadow focus-within:border-sky-500/70 focus-within:shadow-md focus-within:shadow-sky-500/30">
              <label className="self-center leading-none" htmlFor="championshipSelect">Championnat</label>
              <select
                id="championshipSelect"
                className="ml-auto h-auto w-full min-w-0 self-center border-0 bg-transparent p-0 text-left leading-none shadow-none focus:ring-0 focus:border-0 sm:w-auto sm:min-w-[8rem]"
                value={championship}
                onChange={(e) =>
                  setChampionship(e.target.value as "Top 14" | "Pro D2")
                }
              >
                {championshipOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Valider
            </button>
            {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
            {accountMessage && <p className="text-sm text-neutral-300">{accountMessage}</p>}
          </form>
        </header>
      </div>
    </main>
  );
};
