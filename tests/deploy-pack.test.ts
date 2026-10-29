import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const { scripts } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
const commands = ["deploy:pack", "deploy:pack:local"] as const;

// Exercise the package commands and real checker with a small build fixture.
function pack(command: string, html: string, buildExit = 0) {
  expect(scripts[command], "package command exists").toBeTypeOf("string");
  mkdirSync(join(ROOT, "tmp"), { recursive: true });
  const fixture = mkdtempSync(join(ROOT, "tmp/168-pack-"));
  try {
    mkdirSync(join(fixture, "bin"));
    mkdirSync(join(fixture, "src/kit/tools/deploy"), { recursive: true });
    cpSync(join(ROOT, "src/kit/tools/deploy/check-pack.mjs"), join(fixture, "src/kit/tools/deploy/check-pack.mjs"));
    writeFileSync(join(fixture, "bin/pnpm"), `#!${process.execPath}
import { mkdirSync, writeFileSync } from "node:fs";
if (process.argv.slice(2).join(" ") !== "build") process.exit(2);
process.stdout.write("fixture build\\n");
if (process.env.PACK_TEST_BUILD_EXIT !== "0") process.exit(Number(process.env.PACK_TEST_BUILD_EXIT));
mkdirSync("dist");
writeFileSync("dist/index.html", process.env.PACK_TEST_HTML);
`, { mode: 0o755 });
    return spawnSync("/bin/sh", ["-c", scripts[command]!], {
      cwd: fixture,
      encoding: "utf8",
      env: { ...process.env, PATH: join(fixture, "bin") + ":" + process.env.PATH, PACK_TEST_HTML: html, PACK_TEST_BUILD_EXIT: String(buildExit) },
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

describe("deployment package commands", () => {
  it.each(commands)("%s builds before checking dist", (command) => {
    const result = pack(command, "<title>Last Line</title>");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("fixture build");
  });

  it.each(commands)("%s applies the intended local host policy", (command) => {
    const result = pack(command, '<a href="https://typing-game.local">Portal</a>');
    expect(result.status).toBe(command === "deploy:pack:local" ? 0 : 1);
    expect(result.stdout.includes("local-host:")).toBe(command === "deploy:pack");
  });

  it.each(commands)("%s blocks assets from another game", (command) => {
    const result = pack(command, '<script>const url = "/assets/space-typing/models/manifest.json";</script>');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("foreign-asset: index.html");
    expect(result.stdout).toContain("from typing-survival");
  });

  it.each(commands)("%s stops when the build fails", (command) => {
    const result = pack(command, "", 23);
    expect(result.status).toBe(23);
    expect(result.stdout).toBe("fixture build\n");
    expect(result.stderr).toBe("");
  });
});
