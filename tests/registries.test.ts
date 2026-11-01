import { describe, expect, it } from "vitest";
import { extendDevHandle } from "../src/app/dev";
import { probeNames, readProbe, registerProbe } from "../src/view/probes";
import { registerWarm, warmIds } from "../src/view/warm";

/** The registries later packages add to from their own modules (ALIVE_PLAN AL-00 §3.0). */
describe("registries", () => {
  it("takes a package's warmer once per id", () => {
    registerWarm("test.warm", () => []);
    expect(warmIds()).toContain("test.warm");
    expect(() => registerWarm("test.warm", () => [])).toThrow(/twice/);
  });

  it("reads a registered probe by name, with its arguments", () => {
    registerProbe("test.probe", (n: number) => n * 2);
    expect(probeNames()).toContain("test.probe");
    expect(readProbe("test.probe", 21)).toBe(42);
    expect(readProbe("test.none")).toBeUndefined();
    expect(() => registerProbe("test.probe", () => 0)).toThrow(/twice/);
  });

  it("refuses a dev handle name taken twice", () => {
    extendDevHandle("testThing", () => 1);
    expect(() => extendDevHandle("testThing", () => 2)).toThrow(/taken/);
  });

  it("loads the alive scenes, one file a package, ids unique", async () => {
    const registry = new URL("../scripts/visual/scenarios/alive/registry.mjs", import.meta.url).href;
    const { loadScenes, MODES } = (await import(registry)) as { loadScenes: () => Promise<{ id: string; mode: string; from: string }[]>; MODES: string[] };
    const scenes = await loadScenes();
    expect(new Set(scenes.map((scene) => scene.id)).size).toBe(scenes.length);
    for (const scene of scenes) expect(MODES).toContain(scene.mode);
    const own = scenes.filter((scene) => scene.from === "al00.mjs");
    for (const mode of MODES) expect(own.some((scene) => scene.mode === mode)).toBe(true);
  });
});
