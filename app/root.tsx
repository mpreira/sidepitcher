import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import {
  faHouse,
  faStopwatch,
  faUsers,
  faFileLines,
  faGear,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "icon",
    type: "image/png",
    href: "/fav_36.png",
  }
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

import { TeamsProvider } from "~/context/TeamsContext";
import { AccountProvider } from "~/context/AccountContext";
import { useAccount } from "~/context/AccountContext";

export default function App() {
  return (
    <AccountProvider>
      <TeamsProvider>
        <AppContent />
      </TeamsProvider>
    </AccountProvider>
  );
}

function AppContent() {
  const { connected, account } = useAccount();
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  const navigationItems = [
    { href: "/", label: "Accueil", icon: faHouse, active: true },
    { href: "/roster", label: "Effectifs", icon: faUsers, active: true },
    { href: "/tracker", label: "Match", icon: faStopwatch, active: true },
    { href: "/syntheses", label: "Synthèses", icon: faFileLines, active: true },
    { href: "/settings", label: "Réglages", icon: faGear, active: true },
    ...(connected && account?.isAdmin
      ? [{ href: "/admin/accounts", label: "Admin", icon: faUserShield, active: true }]
      : []),
  ] as const;

  return (
    <>
      <div className={isHome ? "h-dvh w-full max-w-full overflow-x-hidden" : "min-h-screen w-full max-w-full pb-32 overflow-x-hidden"}>
        <Outlet />
      </div>

      <nav className="fixed inset-x-0 bottom-3 z-50 px-3">
        <div className="mx-auto max-w-screen-md">
          <div className="flex items-start justify-between gap-1 rounded-3xl border border-gray-700 bg-neutral-950/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/80">
            {navigationItems.map((item) => {
              const isSelected =
                item.active &&
                (item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`));

              return (
                <a
                  key={item.label}
                  href={item.href}
                  aria-disabled={!item.active}
                  onClick={(event) => {
                    if (!item.active) {
                      event.preventDefault();
                    }
                  }}
                  className={`flex flex-1 min-w-0 flex-col items-center justify-start gap-1 py-1 text-[11px] leading-none transition-colors md:text-[13px] ${
                    item.active
                      ? isSelected
                        ? "text-sky-400"
                        : "text-gray-300"
                      : "text-gray-500"
                  }`}
                  title={item.active ? item.label : `${item.label} (bientôt)`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors md:h-12 md:w-12 ${
                      item.active
                        ? isSelected
                          ? "border-sky-500/70 bg-sky-500/15"
                          : "border-gray-700 bg-neutral-900"
                        : "border-gray-800 bg-neutral-900/60"
                    }`}
                  >
                    <FontAwesomeIcon className="text-base md:text-lg" icon={item.icon} />
                  </span>
                  <span className="hidden text-center md:block">{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto w-5/6">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
