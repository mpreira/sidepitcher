import { useTeams } from "~/context/TeamsContext";
import logoSP from "~/assets/images/logo_800.svg";

export function Welcome() {
  const { matchDay, championship, setMatchDay, setChampionship } = useTeams();

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
            <div className="w-[500px] max-w-[100vw] p-4">
            <img
              src={logoSP}
              alt="Sidepitcher Logo"
              className="block w-[300px]"
            />
          </div>
          {/* reglages de journee/championnat */}
          <div className="space-y-2 text-center">
            <div className="input max-w-sm">
              <label data-slot="label" className="text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 flex items-center gap-2" htmlFor="matchDayInput">Journée</label>
              <input
                id="matchDayInput"
                type="text"
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                value={matchDay}
                onChange={(e) => setMatchDay(e.target.value)}
                placeholder="ex. J1"
              />
            </div>
            <div>
              <label className="mr-2 font-semibold">Championnat :</label>
              <select
                id="championshipSelect"
                className="border px-2 py-1"
                value={championship}
                onChange={(e) =>
                  setChampionship(e.target.value as "Top 14" | "Pro D2")
                }
              >
                <option>Top 14</option>
                <option>Pro D2</option>
              </select>
            </div>
          </div>
        </header>
        <div className="max-w-[300px] w-full space-y-6 px-4">
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
        </div>
      </div>
    </main>
  );
}

const resources = [
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
];
