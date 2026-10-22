import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { serveSharedFolders } from "./src/kit/tools/vite-shared-plugin";

const root = fileURLToPath(new URL(".", import.meta.url));
const env = (name: string): string | undefined => process.env[name]?.trim() || undefined;

/** The parent repo's shared/ (vocabulary, typing texts), served read-only in dev. */
const sharedRoot = env("SHARED_DIR") ?? join(root, "..", "..", "shared");
/**
 * Space Typing's model library, read through the URL contract
 * /assets/space-typing/models/ (docs/games/SPLIT_PLAN.md §5): this plugin in
 * dev, an nginx alias in play. Never copied here and never part of dist.
 */
const spaceModels = env("SPACE_MODELS_DIR") ?? join(root, "..", "space-typing", "public", "assets", "space-typing", "models");

// The parent repo's dev script sets these for the nginx host. A plain
// `pnpm dev` on 127.0.0.1:3007 keeps Vite's own HMR socket.
const hmrHost = env("DEV_HMR_HOST");

export default defineConfig({
  base: "/",
  plugins: [serveSharedFolders({ sharedRoot, modelsDir: spaceModels, modelsUrl: "/assets/space-typing/models/" })],
  server: {
    host: env("DEV_HOST") ?? "127.0.0.1",
    port: 3007,
    strictPort: true,
    allowedHosts: (env("DEV_ALLOWED_HOSTS") ?? "survival.typing-game.local")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    hmr: hmrHost
      ? {
          host: hmrHost,
          protocol: (env("DEV_HMR_PROTOCOL") as "ws" | "wss" | undefined) ?? "wss",
          clientPort: Number(env("DEV_HMR_CLIENT_PORT") ?? 443),
        }
      : undefined,
  },
  build: {
    target: "es2022",
  },
});
