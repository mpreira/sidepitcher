import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/tracker", "routes/tracker.tsx"),
] satisfies RouteConfig;
