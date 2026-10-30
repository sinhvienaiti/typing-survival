import { rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
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

/**
 * The UI art build record (scripts/ui-art/prepare.mjs writes it beside the
 * WebP files): art-src file names, source md5 and PSNR for `--check` and
 * reruns. The game reads src/view/ui-art.json instead, so Vite's copy of
 * public/ must not ship it (recheck 230-F3). The dev server still serves it.
 * The path is prepare.mjs's RECORD inside its OUT folder, relative to public/;
 * tests/ui-art-wiring.test.ts fails if either side moves.
 */
export const UI_ART_RECORD = "assets/typing-survival/ui/manifest.json";
export function uiArtRecordStaysHome(): Plugin {
  let outDir = "";
  return {
    name: "typing-survival-ui-art-record",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      rmSync(join(outDir, UI_ART_RECORD), { force: true });
    },
  };
}

// The parent repo's dev script sets these for the nginx host. A plain
// `pnpm dev` on 127.0.0.1:3007 keeps Vite's own HMR socket.
const hmrHost = env("DEV_HMR_HOST");

export default defineConfig({
  base: "/",
  plugins: [serveSharedFolders({ routes: {}, modelsDir: spaceModels, modelsUrl: "/assets/space-typing/models/" }), uiArtRecordStaysHome()],
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
});
