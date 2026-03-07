import { useTeams } from "~/context/TeamsContext";
import { useAccount } from "~/context/AccountContext";
import logoSP from "~/assets/images/logo_800.svg";
import { useState } from "react";
import { Link } from "react-router";

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
              Compte: {account.name}
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
              to="/settings#switch-account"
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            >
              Se connecter
            </Link>
            <Link
              to="/settings#create-account"
              className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
            >
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
          <form className="mx-auto w-5/6 max-w-sm space-y-3 text-left md:w-full" onSubmit={handleSubmit}>
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
        {/*<div className="max-w-[300px] w-full space-y-6 px-4">
          <nav className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4">
            <ul>
              {resources.map(({ href, text, icon }) => (
                <li key={href}>
                  <a
                    className="group flex items-center gap-3 self-stretch p-3 leading-normal text-blue-700 hover:underline dark:text-blue-500"
                    href={href}
                  >
                    {icon}
                    {text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>*/}
      </div>
    </main>
  );
}

{/*const resources = [
  {
    href: "/",
    text: "Accueil",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        className="stroke-gray-600 group-hover:stroke-current dark:stroke-gray-300"
      >
        <path
          d="M3 9.75L12 4l9 5.75M4.5 10.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.625h4.5v4.625h5.625A1.125 1.125 0 0021 20.875V10.75M4.5 10.75L12 15l7.5-4.25"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/tracker",
    text: "Feuille de match",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="stroke-gray-600 group-hover:stroke-current dark:stroke-gray-300"
      >
        <path
          d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 11h8M8 15h4M12 3v4"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/roster",
    text: "Effectifs",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        className="stroke-gray-600 group-hover:stroke-current dark:stroke-gray-300"
      >
        <circle cx="12" cy="7" r="4" strokeWidth="1.5" />
        <path d="M5.5 21a6.5 6.5 0 0113 0" strokeWidth="1.5" />
      </svg>
    ),
  }
]*/};
