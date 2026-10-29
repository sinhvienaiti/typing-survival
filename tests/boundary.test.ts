import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { importTargets, read, ROOT, type Source } from "./survival/scan";

/**
 * The repo's edges (docs/games/SPLIT_PLAN.md §3 in the parent repo): code in
 * src/ loads only src/**, three, three/examples/jsm/*, @fontsource/* and
 * a11y-dialog (MIT, the kit's ui/quick-settings panels); nothing names Space Typing's source; src/kit is the kit's copy, byte for
 * byte as its manifest says. The Node-only tools (src/kit/tools,
 * src/kit/verify-kit.mjs) may also load node:* and vite.
 */
function sources(dir: string): Source[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = dir + "/" + name;
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return /\.(ts|mts|mjs|js)$/.test(name) ? [read(path)] : [];
  });
}

const code = sources("src");
const PACKAGES = [/^three$/, /^three\/examples\/jsm\/[\w./-]+$/, /^@fontsource\/[\w-]+(\/[\w.-]+)?$/, /^a11y-dialog$/];
const NODE_TOOLS = [/^node:[\w/]+$/, /^vite$/];

function allowed(file: string, target: string): boolean {
  if (target.startsWith("src/")) return !target.startsWith("src/..");
  if (PACKAGES.some((pattern) => pattern.test(target))) return true;
  const nodeOnly = file.startsWith("src/kit/tools/") || file === "src/kit/verify-kit.mjs";
  return nodeOnly && NODE_TOOLS.some((pattern) => pattern.test(target));
}

describe("typing-survival boundary", () => {
  it("src/ loads only src/**, three, three/examples/jsm/*, @fontsource/* and a11y-dialog", () => {
    expect(code.length).toBeGreaterThan(30);
    const crossing = code.flatMap((source) =>
      importTargets(source)
        .filter((target) => !allowed(source.path, target))
        .map((target) => source.path + " → " + target),
    );
    expect(crossing).toEqual([]);
  });

  it("no import names Space Typing's source", () => {
    const files = [...code, ...sources("tests").filter((source) => source.path !== "tests/boundary.test.ts"), ...sources("scripts"), read("vite.config.ts"), read("index.html")];
    const named = files.flatMap((source) =>
      (source.path.endsWith(".html") ? [...source.text.matchAll(/\bsrc="([^"]+)"/g)].map((match) => match[1]!) : importTargets(source))
        .filter((target) => /space-typing|\/src\/(survival|scene3d|render3d|platform|feedback\/kill)/.test(target))
        .map((target) => source.path + " → " + target),
    );
    expect(named).toEqual([]);
  });

  it("src/kit matches kit-manifest.json byte for byte", async () => {
    expect(existsSync(join(ROOT, "src/kit/kit-manifest.json"))).toBe(true);
    const verifier = pathToFileURL(join(ROOT, "src/kit/verify-kit.mjs")).href;
    const { verifyKit } = (await import(verifier)) as { verifyKit(dir?: string): string[] };
    expect(verifyKit(join(ROOT, "src/kit"))).toEqual([]);
    const manifest = JSON.parse(readFileSync(join(ROOT, "src/kit/kit-manifest.json"), "utf8")) as { modules: string[] };
    const config = JSON.parse(readFileSync(join(ROOT, "kit.config.json"), "utf8")) as { modules: string[] };
    expect(manifest.modules).toEqual(config.modules);
  });

  it("the checks find what they must", () => {
    const probe = (path: string, text: string) => importTargets({ path, text }).filter((target) => !allowed(path, target));
    expect(probe("src/app/x.ts", 'import { a } from "../../../space-typing/src/logic";\nimport "react";')).toEqual(["../space-typing/src/logic", "react"]);
    expect(probe("src/app/x.ts", 'import { join } from "node:path";')).toEqual(["node:path"]);
    expect(probe("src/kit/tools/x.ts", 'import { join } from "node:path";\nimport type { Plugin } from "vite";')).toEqual([]);
    expect(probe("src/view/x.ts", '// import "react"\nimport * as THREE from "three";\nimport { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";\nimport "@fontsource/exo-2/800.css";')).toEqual([]);
  });
});
