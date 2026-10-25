/**
 * Prints the measured counter table (gate G3m, tests/survival/counters.ts)
 * next to content/guns.ts COUNTERS, on both of the gate's seed sets (1–16
 * and 17–32; a cell shows its cost on each), or on one with --first:
 *   node --import tsx scripts/counters.ts [--first=1 [--seeds=16]] [--set=…: scripts/overrides.ts]
 * A mark in brackets: the marks the costs allow on every set (more than one
 * when a cost sits within COUNTER_MARGIN of a threshold). "(bảng ●)": the
 * table's mark is not among them.
 */
import "./overrides";
import { COUNTERS, COUNTER_LABELS, COUNTER_ROWS, GUN_SPECS } from "../src/content/guns";
import { COUNTER_SEED_SETS, counterRules, measureCounters } from "../tests/survival/counters";

const arg = (name: string): string | undefined => process.argv.find((a) => a.startsWith("--" + name + "="))?.slice(name.length + 3);
const first = arg("first");
const seeds = Number(arg("seeds") ?? 16);
const sets = first === undefined ? COUNTER_SEED_SETS : [Array.from({ length: seeds }, (_, i) => i + Number(first))];
const tables = sets.map((set) => measureCounters(set));
const sign = ["✕", "○", "●"];
console.log("Seed " + sets.map((set) => set[0] + "–" + set.at(-1)).join(" / "));
console.log("| Hàng | " + GUN_SPECS.map((g) => g.name).join(" | ") + " |");
console.log("|---|" + GUN_SPECS.map(() => "---|").join(""));
for (const row of COUNTER_ROWS) {
  const cells = GUN_SPECS.map((_, gun) => {
    const allowed = [2, 1, 0].filter((m) => tables.every((t) => t[row].allowed[gun]!.includes(m)));
    const want = COUNTERS[row][gun]!;
    const shown = allowed.length === 0 ? "?" : allowed.length > 1 ? "[" + allowed.map((m) => sign[m]).join("/") + "]" : sign[allowed[0]!]!;
    const costs = tables.map((t) => (t[row].cost[gun] === Infinity ? "∞" : t[row].cost[gun]!.toFixed(1))).join(" / ");
    return shown + (allowed.includes(want) ? "" : " (bảng " + sign[want] + ")") + " " + costs;
  });
  console.log("| " + COUNTER_LABELS[row] + " | " + cells.join(" | ") + " |");
}
const rules = counterRules(COUNTERS);
console.log("\nRàng buộc §5.2 trên COUNTERS: " + (rules.length === 0 ? "đạt" : rules.join("; ")));
