import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    watch: {
      // don’t reload when the backend data file changes
      ignored: ["**/data/**"],
    },
    // intercept devtool well-known requests to avoid router errors
    middlewareMode: false,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/.well-known")) {
          res.statusCode = 204;
          return res.end();
        }
        next();
      });
    },
  },
});
