import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { portalHome } from "./src/app/portal";

/** Replace only the compiled fallback; the pinned kit stays byte-for-byte intact. */
export function replacePortalOrigin(code: string, parentOrigin: string): string {
  const declaration = /^export const PARENT_ORIGIN = [^\n]+;$/gm;
  if (code.match(declaration)?.length !== 1) throw new Error("Expected one kit PARENT_ORIGIN declaration");
  return code.replace(declaration, () => `export const PARENT_ORIGIN = ${JSON.stringify(parentOrigin)};`);
}

const env = (name: string): string | undefined => process.env[name]?.trim() || undefined;

// Vite serves public/vocabulary/ directly; vocab.config.json pins its source.
// The parent repo's dev script sets these for the nginx host. A plain
// `pnpm dev` on 127.0.0.1:3007 keeps Vite's own HMR socket.
const hmrHost = env("DEV_HMR_HOST");

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL(".", import.meta.url));
  const contract = fileURLToPath(new URL("./src/kit/learning/contract.ts", import.meta.url));
  const home = portalHome(loadEnv(mode, root, "VITE_PORTAL_URL").VITE_PORTAL_URL);
  const parentOrigin = home ? new URL(home).origin : "";
  return {
    plugins: [{
      name: "last-line-portal-origin",
      enforce: "pre",
      transform(code, id) {
        if (id !== contract) return null;
        try {
          return { code: replacePortalOrigin(code, parentOrigin), map: null };
        } catch (error) {
          this.error(error instanceof Error ? error : String(error));
        }
      },
    }],
    base: "/",
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
  };
});
