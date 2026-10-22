import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hostProblems, importTargets, purityProblems, read, ROOT, type Source } from "./survival/scan";

/**
 * Sinh Tồn's boundary (docs/survival/BUILD_S0.md §1–§2): survival.html boots
 * src/survival; its rules (sim/, content/) are deterministic TypeScript that
 * loads only itself and src/platform/rng, with no DOM, clock, Math.random,
 * locale or trigonometry, so a replay steps to the same hash in Node and in
 * Chrome. src/feedback is shared: it loads no game mode.
 */
function sources(dir: string): Source[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = dir + "/" + name;
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return /\.(ts|mjs|js)$/.test(name) ? [read(path)] : [];
  });
}

const survival = sources("src/survival");
const rules = survival.filter((source) => /^src\/survival\/(sim|content)\//.test(source.path));
const feedback = sources("src/feedback");

describe("Sinh Tồn boundary", () => {
  it("survival.html boots src/survival/app/main.ts and is a build input", () => {
    expect(readFileSync(join(ROOT, "survival.html"), "utf8")).toMatch(/<script type="module" src="\/src\/survival\/app\/main\.ts"><\/script>/);
    expect(readFileSync(join(ROOT, "vite.config.ts"), "utf8")).toMatch(/\bsurvival: resolve\(projectRoot, "survival\.html"\)/);
  });

  it("the rules (sim/, content/) load only the rules and src/platform/rng", () => {
    expect(rules.length).toBeGreaterThanOrEqual(10);
    const crossing = rules.flatMap((source) =>
      importTargets(source)
        .filter((target) => !/^src\/survival\/(sim|content)\//.test(target) && target !== "src/platform/rng")
        .map((target) => source.path + " → " + target),
    );
    expect(crossing).toEqual([]);
  });

  it("the rules use no DOM, clock, storage, locale, Math.random, trigonometry or powers", () => {
    const found = rules.flatMap((source) => purityProblems(source.text).map((problem) => source.path + ": " + problem));
    expect(found).toEqual([]);
    expect(hostProblems([...rules, read("src/platform/rng.ts")])).toEqual([]);
  });

  it("src/feedback loads no game mode, only itself and three", () => {
    const crossing = feedback.flatMap((source) =>
      importTargets(source)
        .filter((target) => !(target.startsWith("src/feedback/") || target === "three" || target === "../types" || target === "src/types"))
        .map((target) => source.path + " → " + target),
    );
    expect(crossing).toEqual([]);
  });

  it("the checks find what they must", () => {
    expect(purityProblems("const a = Math.random() + Math.sin(b) + c ** 2; const t = Date.now();")).toEqual(["Date", "Math.random", "Math.sin", "**"]);
    expect(purityProblems("// Math.random()\nconst s = \"window\"; const r = Math.sqrt(x);")).toEqual([]);
    expect(hostProblems([{ path: "src/survival/sim/probe.ts", text: "export const t = performance.now() + window.innerWidth;" }])).toEqual([
      "src/survival/sim/probe.ts: performance",
      "src/survival/sim/probe.ts: window",
    ]);
  });
});
