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
});
