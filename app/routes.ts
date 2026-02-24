import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("/.well-known/appspecific/com.chrome.devtools.json", "routes/well-known-devtools.tsx"),
    route("/tracker", "routes/tracker.tsx"),
    route("/roster", "routes/roster.tsx"),
    route("/roster/:championshipSlug/:rosterSlugId", "routes/roster-detail.tsx"),
    route("/roster/:rosterSlugId", "routes/roster-redirect.tsx"),
    route("/syntheses", "routes/syntheses.tsx"),
    route("/syntheses/:summaryId", "routes/synthese-detail.tsx"),
    route("/api/rosters", "routes/api/rosters.ts"),
    route("/api/summaries", "routes/api/summaries.ts"),
] satisfies RouteConfig;
