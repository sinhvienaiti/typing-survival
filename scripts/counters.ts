/**
 * Prints the measured counter table (gate G3m, tests/survival/counters.ts)
 * next to content/guns.ts COUNTERS:
 *   node --import tsx scripts/counters.ts [--seeds=5]
 */
import { COUNTERS, COUNTER_LABELS, COUNTER_ROWS, GUN_SPECS } from "../src/content/guns";
import { measureCounters } from "../tests/survival/counters";

const seeds = Number(process.argv.find((a) => a.startsWith("--seeds="))?.slice(8) ?? 3);
const table = measureCounters(Array.from({ length: seeds }, (_, i) => i + 1));
const sign = ["✕", "○", "●"];
console.log("| Hàng | " + GUN_SPECS.map((g) => g.name).join(" | ") + " |");
console.log("|---|" + GUN_SPECS.map(() => "---|").join(""));
for (const row of COUNTER_ROWS) {
  const cells = table[row].cost.map((cost, gun) => {
    const mark = sign[table[row].mark[gun]!];
    const want = sign[COUNTERS[row][gun]!];
    return mark + (mark === want ? "" : " (bảng " + want + ")") + " " + (cost === Infinity ? "∞" : cost.toFixed(1));
  });
  console.log("| " + COUNTER_LABELS[row] + " | " + cells.join(" | ") + " |");
}
