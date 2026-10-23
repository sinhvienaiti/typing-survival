import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hostProblems, importTargets, purityProblems, read, ROOT, type Source } from "./survival/scan";

/**
 * Sinh Tồn's boundary (docs/BUILD_S0.md §1–§2): index.html boots
 * src/app/main.ts; the rules (sim/, content/) are deterministic TypeScript
 * that loads only itself, the kit's platform/rng and the kit's balance
 * module (the in-run flow meter and pace director), with no DOM, clock,
 * Math.random, locale or trigonometry, so a replay steps to the same hash in
 * Node and in Chrome. Combat feedback is the kit's (src/kit/feedback, "ship"
 * profile), with no local copy; it loads no game code, only itself and three.
 * tests/boundary.test.ts holds the repo's edges.
 */
function sources(dir: string): Source[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = dir + "/" + name;
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return /\.(ts|mjs|js)$/.test(name) ? [read(path)] : [];
  });
}

const RNG = "src/kit/platform/rng";
/** The kit's balance module (pure, deterministic TS: flow meter, pace director, profile, k) runs inside the sim. */
const BALANCE = "src/kit/balance/";
const rules = [...sources("src/sim"), ...sources("src/content")];
const balance = sources("src/kit/balance");
const feedback = sources("src/kit/feedback");
const view = [...sources("src/view"), ...sources("src/app")];

describe("Sinh Tồn boundary", () => {
  it("index.html boots src/app/main.ts", () => {
    expect(readFileSync(join(ROOT, "index.html"), "utf8")).toMatch(/<script type="module" src="\/src\/app\/main\.ts"><\/script>/);
  });

  it("the rules (sim/, content/) load only the rules, the kit's platform/rng and the kit's balance module", () => {
    expect(rules.length).toBeGreaterThanOrEqual(10);
    const crossing = rules.flatMap((source) =>
      importTargets(source)
        .filter((target) => !/^src\/(sim|content)\//.test(target) && target !== RNG && target !== BALANCE.slice(0, -1) && !target.startsWith(BALANCE))
        .map((target) => source.path + " → " + target),
    );
    expect(crossing).toEqual([]);
    // The balance module loads only itself and platform/rng.
    const kitCrossing = balance.flatMap((source) => importTargets(source).filter((target) => !target.startsWith(BALANCE) && target !== RNG).map((target) => source.path + " → " + target));
    expect(kitCrossing).toEqual([]);
  });

  it("the rules use no DOM, clock, storage, locale, Math.random, trigonometry or powers", () => {
    const found = rules.flatMap((source) => purityProblems(source.text).map((problem) => source.path + ": " + problem));
    expect(found).toEqual([]);
    // The balance module names a FlowMeter's `window()` (never the DOM's: the host-free compile below proves it).
    const kit = balance.flatMap((source) => purityProblems(source.text).filter((problem) => problem !== "window").map((problem) => source.path + ": " + problem));
    expect(kit).toEqual([]);
    expect(hostProblems([...rules, ...balance, read(RNG + ".ts")])).toEqual([]);
  });

  it("combat feedback comes from the kit: no local src/feedback, the kit's loads only itself and three", () => {
    expect(existsSync(join(ROOT, "src/feedback"))).toBe(false);
    expect(feedback.length).toBeGreaterThanOrEqual(10);
    const crossing = feedback.flatMap((source) =>
      importTargets(source)
        .filter((target) => !(target.startsWith("src/kit/feedback/") || target === "three"))
        .map((target) => source.path + " → " + target),
    );
    expect(crossing).toEqual([]);
    const local = view.flatMap((source) => importTargets(source).filter((target) => target.startsWith("src/feedback")).map((target) => source.path + " → " + target));
    expect(local).toEqual([]);
  });

  it("the checks find what they must", () => {
    expect(purityProblems("const a = Math.random() + Math.sin(b) + c ** 2; const t = Date.now();")).toEqual(["Date", "Math.random", "Math.sin", "**"]);
    expect(purityProblems("// Math.random()\nconst s = \"window\"; const r = Math.sqrt(x);")).toEqual([]);
    expect(hostProblems([{ path: "src/sim/probe.ts", text: "export const t = performance.now() + window.innerWidth;" }])).toEqual([
      "src/sim/probe.ts: performance",
      "src/sim/probe.ts: window",
    ]);
  });
});
