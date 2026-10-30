import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = resolve(__dirname, "..");
afterEach(() => vi.unstubAllEnvs());

async function compileProbe() {
  mkdirSync(join(root, "tmp"), { recursive: true });
  const fixture = mkdtempSync(join(root, "tmp/portal-build-"));
  try {
    const entry = join(fixture, "probe.ts");
    // Probe the kit fallback as well as the game adapter: both enter the real bundle.
    writeFileSync(entry, 'export { createLearningBridge } from "../../src/kit/learning";\nexport { createPortalBridge } from "../../src/app/portal";');
    return await build({
      configFile: join(root, "vite.config.ts"),
      logLevel: "silent",
      build: {
        write: false, minify: false,
        rollupOptions: { input: entry, preserveEntrySignatures: "strict" },
      },
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

describe("portal build configuration", () => {
  it.each([
    [undefined, ""], ["", ""], ["   ", ""],
    ["https://portal.example/learn/?x=1", "https://portal.example"],
    ["https://typing-game.local/", "https://typing-game.local"],
  ])("executes the emitted bridge for VITE_PORTAL_URL=%j without changing kit bytes", async (url, origin) => {
    vi.stubEnv("VITE_PORTAL_URL", url);
    const contract = join(root, "src/kit/learning/contract.ts");
    const original = readFileSync(contract);
    try {
      const result = await compileProbe();
      if (!("output" in result)) throw new Error("Expected a single Rollup build");
      const chunks = result.output.filter((item) => item.type === "chunk");
      expect(chunks).toHaveLength(1);
      const code = chunks[0]!.code;
      if (!url?.trim()) expect(code).not.toContain("typing-game.local");
      const executed = spawnSync(process.execPath, ["--input-type=module", "--eval", `
        import { readFileSync } from "node:fs";
        const code = readFileSync(0);
        const bundled = await import("data:text/javascript;base64," + code.toString("base64"));
        const kit = bundled.createLearningBridge({ gameId: "typing-survival" });
        const game = bundled.createPortalBridge();
        console.log(JSON.stringify([kit.parentOrigin, game.parentOrigin, game.gameId]));
        kit.dispose(); game.dispose();
      `], { input: code, encoding: "utf8", timeout: 5000 });
      expect(executed.error).toBeUndefined();
      expect(executed.stderr).toBe("");
      expect(executed.status).toBe(0);
      expect(JSON.parse(executed.stdout)).toEqual([origin, origin, "typing-survival"]);
    } finally {
      expect(readFileSync(contract)).toEqual(original);
    }
  });

  it.each(["not a URL", "ftp://portal.example", "https://user:secret@portal.example"])("stops the real Vite build for %s", async (url) => {
    vi.stubEnv("VITE_PORTAL_URL", url);
    await expect(compileProbe()).rejects.toThrow(/VITE_PORTAL_URL/);
  });

  it.each([0, 2])("rejects %i kit fallback declarations", async (count) => {
    const { replacePortalOrigin } = await import("../vite.config");
    const code = 'export const PARENT_ORIGIN = "https://typing-game.local";\n'.repeat(count);
    expect(() => replacePortalOrigin(code, "")).toThrow(/Expected one kit PARENT_ORIGIN declaration/);
  });

  it("replaces exactly the single fallback declaration", async () => {
    const { replacePortalOrigin } = await import("../vite.config");
    const code = '// A pinned kit contract.\nexport const PARENT_ORIGIN = "https://typing-game.local";\nexport const OTHER = 200;\n';
    expect(replacePortalOrigin(code, "https://portal.example")).toBe(
      '// A pinned kit contract.\nexport const PARENT_ORIGIN = "https://portal.example";\nexport const OTHER = 200;\n',
    );
    expect(replacePortalOrigin(code, "")).toContain('export const PARENT_ORIGIN = "";');
    expect(replacePortalOrigin(code, "https://$&.portal.example")).toContain(
      'export const PARENT_ORIGIN = "https://$&.portal.example";',
    );
  });
});
