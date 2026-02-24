import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("/tracker", "routes/tracker.tsx"),
    route("/roster", "routes/roster.tsx"),
    route("/roster/:championshipSlug/:rosterSlugId", "routes/roster-detail.tsx"),
    route("/roster/:rosterSlugId", "routes/roster-redirect.tsx"),
    route("/api/rosters", "routes/api/rosters.ts"),
] satisfies RouteConfig;
