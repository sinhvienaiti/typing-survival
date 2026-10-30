import { createLearningBridge, type BridgeHost, type LearningBridge, type LearningBridgeOptions } from "../kit/learning";

/** This game's id in portal/public/games.json. */
export const GAME_ID = "typing-survival";

/** An optional build-time destination; paths, queries and fragments stay intact. */
export function portalHome(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid portal URL");
    return url.href;
  } catch {
    throw new TypeError("VITE_PORTAL_URL must be an absolute HTTP(S) URL without credentials");
  }
}

// Without a configured portal, framing must not flush the local learning queue.
const standaloneHost: BridgeHost = {
  parent: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

export type PortalBridgeOptions = Omit<LearningBridgeOptions, "gameId" | "parentOrigin">;

export function createPortalBridge(options: PortalBridgeOptions = {}): LearningBridge {
  const home = portalHome(import.meta.env.VITE_PORTAL_URL);
  return createLearningBridge({
    ...options,
    gameId: GAME_ID,
    parentOrigin: home ? new URL(home).origin : "",
    host: home ? options.host : standaloneHost,
  });
}
