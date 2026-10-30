import { afterEach, describe, expect, it, vi } from "vitest";
import { LEARNING_ATTEMPT_MESSAGE, SHARED_MUSIC_MESSAGE, type BridgeHost, type LearningBridge, type QueueStorage } from "../src/kit/learning";

const bridges: LearningBridge[] = [];
afterEach(() => {
  for (const bridge of bridges.splice(0)) bridge.dispose();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("portalHome", () => {
  it.each([undefined, "", "   "])("has no portal for %j", async (url) => {
    const { portalHome } = await import("../src/app/portal");
    expect(portalHome(url)).toBeNull();
  });

  it.each([
    [" https://portal.example ", "https://portal.example/"],
    ["https://portal.example/learn/?x=1#home", "https://portal.example/learn/?x=1#home"],
    ["http://localhost:8080/learn/", "http://localhost:8080/learn/"],
  ])("keeps the valid HTTP(S) URL %s", async (url, home) => {
    const { portalHome } = await import("../src/app/portal");
    expect(portalHome(url)).toBe(home);
  });

  it.each(["not a URL", "/learn/", "ftp://portal.example", "javascript:alert(1)",
    "https://user@portal.example", "https://:secret@portal.example", "https://user:secret@portal.example"])("rejects %s with the variable name", async (url) => {
    const { portalHome } = await import("../src/app/portal");
    expect(() => portalHome(url)).toThrow(/VITE_PORTAL_URL/);
  });
});

function fixture() {
  const parent = { postMessage: vi.fn() };
  let receive = (_event: MessageEvent) => {};
  const host: BridgeHost = {
    parent,
    addEventListener: (_type, listener) => { receive = listener; },
    removeEventListener: vi.fn(),
    setTimeout: vi.fn(), clearTimeout: vi.fn(), now: () => 1234,
  };
  const data = new Map<string, unknown>();
  const storage: QueueStorage = {
    readJson: (key) => data.get(key) ?? null,
    writeJson: (key, value) => { data.set(key, value); return true; },
  };
  return { host, parent, storage, receive: (origin: string) => receive({
    origin, source: parent, data: { type: SHARED_MUSIC_MESSAGE, playing: true },
  } as unknown as MessageEvent) };
}

describe("portal learning bridge", () => {
  it.each([undefined, "", "   "])("reportWord keeps every event queued in a frame without a portal (%j)", async (url) => {
    vi.stubEnv("VITE_PORTAL_URL", url);
    const { createPortalBridge } = await import("../src/app/portal");
    const { reportWord, resetLearningBridge } = await import("../src/app/learning");
    const f = fixture();
    const bridge = createPortalBridge({ host: f.host, storage: f.storage });
    bridges.push(bridge);
    resetLearningBridge({ host: f.host, storage: f.storage });
    reportWord({ en: "River", vi: "sông", ipa: "/ˈrɪvər/" }, true);
    reportWord({ en: "house", vi: "ngôi nhà", ipa: "" }, false);
    expect(bridge.parentOrigin).toBe("");
    expect(bridge.embedded).toBe(false);
    expect(bridge.queued().map((event) => [event.gameId, event.entityId, event.result])).toEqual([
      ["typing-survival", "river", "correct"], ["typing-survival", "house", "wrong"],
    ]);
    // Recreating a framed bridge must neither flush nor delete saved attempts.
    resetLearningBridge({ host: f.host, storage: f.storage });
    expect(bridge.flushQueue()).toBe(0);
    expect(bridge.queued()).toHaveLength(2);
    expect(bridge.requestFocus()).toBe(false);
    expect(f.parent.postMessage).not.toHaveBeenCalled();
    resetLearningBridge();
  });

  it("reportWord posts only to the configured URL origin", async () => {
    vi.stubEnv("VITE_PORTAL_URL", "https://portal.example/learn/?x=1#home");
    const { reportWord, resetLearningBridge } = await import("../src/app/learning");
    const f = fixture();
    resetLearningBridge({ host: f.host, storage: f.storage });
    reportWord({ en: "River", vi: "sông", ipa: "" }, true);
    expect(f.parent.postMessage).toHaveBeenCalledTimes(1);
    expect(f.parent.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: LEARNING_ATTEMPT_MESSAGE,
      event: expect.objectContaining({ gameId: "typing-survival", entityId: "river" }),
    }), "https://portal.example");
    resetLearningBridge();
  });

  it("retains kit queue flushing and origin checks when a portal is configured", async () => {
    const { createPortalBridge } = await import("../src/app/portal");
    const { reportWord, resetLearningBridge } = await import("../src/app/learning");
    const f = fixture();
    vi.stubEnv("VITE_PORTAL_URL", "");
    resetLearningBridge({ host: f.host, storage: f.storage });
    reportWord({ en: "river", vi: "sông", ipa: "" }, true);
    resetLearningBridge();
    vi.stubEnv("VITE_PORTAL_URL", "https://portal.example/learn/?x=1");
    const bridge = createPortalBridge({ host: f.host, storage: f.storage });
    bridges.push(bridge);
    expect(bridge.parentOrigin).toBe("https://portal.example");
    expect(bridge.embedded).toBe(true);
    expect(f.parent.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      event: expect.objectContaining({ gameId: "typing-survival", entityId: "river" }),
    }), "https://portal.example");
    expect(bridge.queued()).toEqual([]);
    const music = vi.fn();
    bridge.onSharedMusic(music);
    f.receive("https://wrong.example");
    expect(music).not.toHaveBeenCalled();
    f.receive("https://portal.example");
    expect(music).toHaveBeenCalledWith(true);
  });
});
