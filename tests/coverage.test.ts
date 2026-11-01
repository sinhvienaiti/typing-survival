import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EV } from "../src/sim/events";
import { COVERAGE, COVERAGE_BY_PACKAGE, NO_SOUND, PACKAGES, coverageDebt, coverageGaps, debtLine, type CoverageSources } from "../src/view/coverage";
import { ROOT } from "./survival/scan";

/**
 * The coverage table in code (docs/ALIVE_PLAN.md AL-00, M143): every sim
 * event the screen shows, every strip step, every screen and every UI event
 * has a row with its VFX ids, SFX ids, owner and §2 rows; a new event, Screen
 * or TypingFxKind without a row fails here. The debt the rows carry may only
 * shrink for the rows AL-00 listed (tests/golden/coverage-debt.txt; rewrite
 * it on purpose with COVERAGE_DEBT_WRITE=1 and say why in the changelog).
 */
const text = (path: string): string => readFileSync(join(ROOT, path), "utf8");
/** The string literals of `export type <name> = "a" | "b" …;` in `path`. */
function union(path: string, name: string): string[] {
  const match = new RegExp("export type " + name + " = ([^;]+);").exec(text(path));
  if (match === null) throw new Error("no type " + name + " in " + path);
  return [...match[1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
}
const sources = (): CoverageSources => ({
  ev: EV,
  screens: union("src/app/screen-items.ts", "Screen"),
  journey: union("src/app/journey.ts", "JourneyScreen"),
  typing: union("src/kit/feedback/typing-fx/driver.ts", "TypingFxKind"),
});
const plan = text("docs/ALIVE_PLAN.md");
/** M ids in `chunk`, ranges ("M008–M014") expanded. */
function mIds(chunk: string): string[] {
  const out: string[] = [];
  for (const m of chunk.matchAll(/M(\d{3})(?:[–-]M(\d{3}))?/g)) {
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    for (let k = from; k <= to; k += 1) out.push("M" + String(k).padStart(3, "0"));
  }
  return out;
}

describe("the coverage table (ALIVE_PLAN AL-00)", () => {
  it("has a row for every event the screen shows, every strip step, every screen and every UI event, none with an empty cell", () => {
    expect(coverageGaps(sources())).toEqual([]);
    // main.ts's Screen and screen-items.ts's SCREENS list the same screens.
    expect(text("src/app/screen-items.ts")).toContain('export const SCREENS = [' + union("src/app/screen-items.ts", "Screen").map((s) => '"' + s + '"').join(", ") + "]");
  });

  it("fails when the sim, the screens or the kit gain a kind with no row", () => {
    const now = sources();
    expect(coverageGaps({ ...now, ev: { ...EV, fakeEvent: 99 } })).toEqual(["ev.fakeEvent"]);
    expect(coverageGaps({ ...now, screens: [...now.screens, "vault"] })).toEqual(["screen.vault"]);
    expect(coverageGaps({ ...now, journey: [...now.journey, "map"] })).toEqual(["screen.journey-map"]);
    expect(coverageGaps({ ...now, typing: [...now.typing, "spin"] })).toEqual(["typing.spin"]);
    expect(coverageGaps(now, [...COVERAGE.slice(1), { ...COVERAGE[0]!, sfx: [] }])).toEqual([COVERAGE[0]!.key + " (empty cell)"]);
  });

  it("keeps each row in its owner's file, one row a key, with ids in the table's form and §2 rows that exist", () => {
    const planRows = new Set([...plan.matchAll(/^\| (M\d{3}) \|/gm)].map((m) => m[1]!));
    const keys = COVERAGE.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const pkg of PACKAGES) for (const entry of COVERAGE_BY_PACKAGE[pkg] ?? []) expect(entry.owner, entry.key).toBe(pkg);
    for (const entry of COVERAGE) {
      for (const id of entry.vfx) expect(id, entry.key).toMatch(/^fx\.[a-z]+\.[A-Za-z0-9]+$/);
      for (const id of entry.sfx) if (id !== NO_SOUND) expect(id, entry.key).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
      for (const m of entry.rows) expect(planRows.has(m), entry.key + " " + m).toBe(true);
    }
  });

  it("answers every row §2.16 maps to an event or a screen", () => {
    const section = plan.slice(plan.indexOf("### 2.16"), plan.indexOf("## 3. "));
    const answered = new Set(COVERAGE.flatMap((entry) => entry.rows));
    const listed = mIds(section);
    expect(listed.length).toBeGreaterThan(80);
    expect(listed.filter((m) => !answered.has(m))).toEqual([]);
    // Each EV's own rows sit on its row.
    for (const line of section.matchAll(/^\| `(\w+)` \d+(?:, `(\w+)` \d+)*(?:, `(\w+)` \d+)? \| ([^|]+) \|$/gm)) {
      const names = [...line[0].matchAll(/`(\w+)` \d+/g)].map((m) => m[1]!);
      for (const name of names) {
        const entry = COVERAGE.find((e) => e.key === "ev." + name);
        if (name === "plan") continue;
        expect(entry, name).toBeDefined();
        for (const m of mIds(line[4]!)) expect(entry!.rows, name).toContain(m);
      }
    }
  });

  it("lets the AL-00 debt only shrink (sounds in code or silent, no look, art in code or missing)", () => {
    const lines = coverageDebt().map(debtLine);
    const file = join(ROOT, "tests/golden/coverage-debt.txt");
    if (process.env.COVERAGE_DEBT_WRITE === "1") writeFileSync(file, lines.join("\n") + "\n");
    const golden = readFileSync(file, "utf8").trimEnd().split("\n");
    const goldenKeys = new Set(golden.map((line) => line.split(" ")[1]));
    const known = new Set(golden);
    expect(lines.filter((line) => goldenKeys.has(line.split(" ")[1]) && !known.has(line))).toEqual([]);
  });
});
