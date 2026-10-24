/**
 * Prints the measured counter table (gate G3m, tests/survival/counters.ts)
 * next to content/guns.ts COUNTERS:
 *   node --import tsx scripts/counters.ts [--seeds=16] [--first=1]
 * A mark in brackets: the cost sits within COUNTER_MARGIN of a threshold, so either mark matches.
 */
import { COUNTERS, COUNTER_LABELS, COUNTER_ROWS, GUN_SPECS } from "../src/content/guns";
import { COUNTER_SEEDS, measureCounters } from "../tests/survival/counters";

const seeds = Number(process.argv.find((a) => a.startsWith("--seeds="))?.slice(8) ?? COUNTER_SEEDS.length);
const first = Number(process.argv.find((a) => a.startsWith("--first="))?.slice(8) ?? 1);
const table = measureCounters(Array.from({ length: seeds }, (_, i) => i + first));
const sign = ["✕", "○", "●"];
console.log("| Hàng | " + GUN_SPECS.map((g) => g.name).join(" | ") + " |");
console.log("|---|" + GUN_SPECS.map(() => "---|").join(""));
for (const row of COUNTER_ROWS) {
  const cells = table[row].cost.map((cost, gun) => {
    const mark = sign[table[row].mark[gun]!];
    const allowed = table[row].allowed[gun]!;
    const want = sign[COUNTERS[row][gun]!];
    const ok = allowed.includes(COUNTERS[row][gun]!);
    return mark + (allowed.length > 1 ? " [" + allowed.map((m) => sign[m]).join("/") + "]" : "") + (ok ? "" : " (bảng " + want + ")") + " " + (cost === Infinity ? "∞" : cost.toFixed(1));
  });
  console.log("| " + COUNTER_LABELS[row] + " | " + cells.join(" | ") + " |");
}
