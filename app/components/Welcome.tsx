import { useTeams } from "~/context/TeamsContext";
import logoSP from "~/assets/images/logo_800.svg";
import { useState } from "react";

export function Welcome() {
  const { matchDay, sport, championship, setMatchDay, setSport, setChampionship } = useTeams();
  const [successMessage, setSuccessMessage] = useState("");

  const sportOptions = ["Rugby", "Football"] as const;
  const championshipOptions = ["Top 14", "Pro D2"] as const;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMessage("Formulaire validé avec succès.");
  }

  return (
    <main className="flex h-full min-h-0 w-full items-center justify-center py-4">
      <div className="flex w-full flex-1 flex-col items-center gap-16 min-h-0">
        <header className="flex w-full flex-col items-center gap-9">
            <div className="mx-auto w-[96vw] p-2 lg:max-w-[1100px]">
            <img
              src={logoSP}
              alt="Sidepitcher Logo"
              className="mx-auto block w-full max-h-[38vh] object-contain"
            />
          </div>
          {/* reglages de journee/championnat */}
          <form className="mx-auto w-5/6 max-w-sm space-y-3 text-left md:w-full" onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 transition-shadow focus-within:border-sky-500/70 focus-within:shadow-md focus-within:shadow-sky-500/30">
              <label className="self-center leading-none" htmlFor="sportSelect">Sport</label>
              <select
                id="sportSelect"
                className="ml-auto h-auto w-auto min-w-[8rem] self-center border-0 bg-transparent p-0 text-left leading-none shadow-none focus:ring-0 focus:border-0"
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
            <div className="flex items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 transition-shadow focus-within:border-sky-500/70 focus-within:shadow-md focus-within:shadow-sky-500/30">
              <label className="self-center leading-none" data-slot="label" htmlFor="matchDayInput">Journée</label>
              <input
                id="matchDayInput"
                type="text"
                className="ml-auto h-auto w-auto min-w-[13rem] self-center border-0 bg-transparent p-0 text-center text-sm md:text-base font-light leading-none shadow-none focus:ring-0 focus:border-0"
                value={matchDay}
                onChange={(e) => setMatchDay(e.target.value)}
                placeholder="ex. J1"
              />
            </div>
            <div className="flex items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 transition-shadow focus-within:border-sky-500/70 focus-within:shadow-md focus-within:shadow-sky-500/30">
              <label className="self-center leading-none" htmlFor="championshipSelect">Championnat</label>
              <select
                id="championshipSelect"
                className="ml-auto h-auto w-auto min-w-[8rem] self-center border-0 bg-transparent p-0 text-left leading-none shadow-none focus:ring-0 focus:border-0"
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
