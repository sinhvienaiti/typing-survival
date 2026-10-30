import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { serveSharedFolders } from "./src/kit/tools/vite-shared-plugin";

const root = fileURLToPath(new URL(".", import.meta.url));
const env = (name: string): string | undefined => process.env[name]?.trim() || undefined;

// Vite serves public/vocabulary/ directly; vocab.config.json pins its source.
/**
 * Space Typing's model library, read through the URL contract
 * /assets/space-typing/models/ (docs/games/SPLIT_PLAN.md §5): this plugin in
 * dev, an nginx alias in play. Never copied here and never part of dist.
 */
const spaceModels = env("SPACE_MODELS_DIR") ?? join(root, "..", "space-typing", "public", "assets", "space-typing", "models");

// The parent repo's dev script sets these for the nginx host. A plain
// `pnpm dev` on 127.0.0.1:3007 keeps Vite's own HMR socket.
const hmrHost = env("DEV_HMR_HOST");

/**
 * The Typing Feel origin of VITE_TYPING_FEEL_ORIGIN (parent
 * docs/games/TYPING_FEEL_SERVICE.md §5.1), as the preconnect's href: an
 * http(s) URL without credentials, reduced to its origin. Anything else is
 * no origin, as for the game itself (typingFeelKeysBase).
 */
function feelOrigin(value: string | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text || /[\s?#]/.test(text)) return null;
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && url.host !== "" && !url.username && !url.password ? url.origin : null;
  } catch {
    return null;
  }
}

/** `<link rel="preconnect" … crossorigin>` to the Typing Feel host, only when this build has one: no tag at all otherwise. */
function feelPreconnect(origin: string | null): Plugin {
  return {
    name: "typing-feel-preconnect",
    transformIndexHtml: () => (origin === null ? [] : [{ tag: "link", attrs: { rel: "preconnect", href: origin, crossorigin: true }, injectTo: "head" }]),
  };
}

export default defineConfig(({ mode }) => ({
  base: "/",
  plugins: [
    serveSharedFolders({ routes: {}, modelsDir: spaceModels, modelsUrl: "/assets/space-typing/models/" }),
    // The build script sets the origin (the parent's build:survival and dev:survival:app); .env files count too.
    feelPreconnect(feelOrigin(loadEnv(mode, root, "VITE_TYPING_FEEL_").VITE_TYPING_FEEL_ORIGIN)),
  ],
  server: {
    host: env("DEV_HOST") ?? "127.0.0.1",
    port: 3007,
    strictPort: true,
    // tmp/ holds evidence and other agents' scratch trees: a tsconfig or
    // index.html written there must not force a full reload mid-scenario.
    watch: { ignored: ["**/tmp/**"] },
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
}));
