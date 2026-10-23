/**
 * Tuyến Cuối's balance report (docs/games/BALANCE.md §3, §7; pnpm
 * survival:balance): the standard bots × Thư giãn / Cân bằng / Thử thách ×
 * seeds, typed like people through the page's input path, each with the
 * header its profile sets (pace k, E) and the pace director on; "standard"
 * also with the director off (B7). Prints the §3 metrics per bot and mode,
 * the gates B1–B9 (formatGates), and the step cost.
 * 100 seeds by default: a win rate's standard error is then about 4 points,
 * small enough to judge the 15-point bands of §3 (24 seeds are not).
 *   node --import tsx scripts/balance.ts [--seeds=100] [--bots=standard,fast] [--modes=balanced] [--off=standard] [--json=out.json]
 */
import { writeFileSync } from "node:fs";
import { BANDS, METRIC_LABELS, formatGates, pct, rangeText, scoreBand, type BandMetric } from "../src/kit/balance";
import { MODE_SPECS, MODES, type Mode } from "../src/content/balance";
import { gates, runMatrix, type Cell } from "./balance-lib";

const arg = (name: string): string | undefined => process.argv.find((value) => value.startsWith("--" + name + "="))?.slice(name.length + 3);
const list = (name: string): string[] | undefined => arg(name)?.split(",").filter(Boolean);
const seeds = Number(arg("seeds") ?? 100);
const modes = (list("modes") ?? [...MODES]).filter((mode): mode is Mode => (MODES as readonly string[]).includes(mode));
const started = performance.now();
const cells = runMatrix({ seeds, bots: list("bots"), modes, directorOff: list("off") ?? ["standard"], time: true }, (done, total) => {
  if (process.stderr.isTTY) process.stderr.write("\r" + done + "/" + total);
});
if (process.stderr.isTTY) process.stderr.write("\r");

const fixed = (value: number | null | undefined, digits = 2): string => (value === null || value === undefined ? "—" : value.toFixed(digits).replace(".", ","));
const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1]!;
};
const meanOf = (values: number[]): number | null => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);
const METRICS: readonly BandMetric[] = ["win", "s", "p", "i", "o", "n", "q"];

function cellLine(cell: Cell): string {
  const row = cell.summary;
  const band = BANDS[cell.mode];
  const score = scoreBand(row, band, ["win", "s", "p", "i", "o"]);
  const mark = (metric: BandMetric, text: string): string => {
    const entry = score.rows.find((r) => r.metric === metric);
    return entry === undefined || entry.verdict === "in" ? text : text + (entry.verdict === "below" ? " ↓" : " ↑");
  };
  const runs = cell.runs;
  const k = runs[0]!.header.pace;
  const measuredE = meanOf(runs.flatMap((run) => (run.measured.e === null ? [] : [run.measured.e])));
  const measuredA = meanOf(runs.flatMap((run) => (run.measured.a === null ? [] : [run.measured.a])));
  const drain = meanOf(runs.map((run) => run.damage.drain));
  const breach = meanOf(runs.map((run) => run.damage.breach));
  const shot = meanOf(runs.map((run) => run.damage.shot));
  return [
    cell.bot.id + (cell.director ? "" : " (tắt nhịp)"),
    MODE_SPECS[cell.mode].label,
    fixed(k, 3),
    String(runs[0]!.header.expected),
    mark("win", pct(row.win)),
    mark("s", pct(row.s)),
    mark("p", pct(row.p)),
    mark("i", pct(row.i)),
    mark("o", pct(row.o)),
    fixed(row.n, 2),
    pct(row.q),
    fixed(row.killSeconds, 1),
    row.stepsPerWave === null ? "—" : fixed(row.stepsPerWave, 2) + " (" + pct(row.spawnMin) + "–" + pct(row.spawnMax) + ")",
    fixed(drain, 0) + "/" + fixed(breach, 0) + "/" + fixed(shot, 0),
    String(median(runs.map((run) => run.peakFoes))),
    fixed(measuredE, 1) + " · " + (measuredA === null ? "—" : pct(Math.round(measuredA * 1000))) + " · " + fixed(meanOf(runs.map((run) => (run.words * 60) / Math.max(1, run.flow.ticks / 60))), 1),
    row.learnOk === null ? "—" : row.learnOk ? "đạt" : "trượt",
  ].join(" | ");
}

const header = ["Bot", "Chế độ", "k", "E từ", ...METRICS.map((metric) => METRIC_LABELS[metric]), "Hạ quái (s)", "Bậc/đợt (khoảng sinh)", "Mất giáp: rỉ/chạm/đạn", "Quái tối đa", "E · a đo · từ/phút", "Học"];
const lines: string[] = [];
lines.push("# Tuyến Cuối: báo cáo cân bằng (" + seeds + " seed mỗi ô)", "");
lines.push("Dải đích (BALANCE.md §3):", "");
lines.push("| Chế độ | " + METRICS.map((metric) => METRIC_LABELS[metric]).join(" | ") + " |", "|" + "---|".repeat(METRICS.length + 1));
for (const mode of modes) lines.push("| " + MODE_SPECS[mode].label + " | " + METRICS.map((metric) => rangeText(metric, BANDS[mode][metric])).join(" | ") + " |");
lines.push("", "| " + header.join(" | ") + " |", "|" + "---|".repeat(header.length));
for (const mode of modes) for (const cell of cells.filter((c) => c.mode === mode)) lines.push("| " + cellLine(cell) + " |");
lines.push("", "↓ / ↑: dưới / trên dải đích của chế độ (thắng, S, P, I, O). Mất giáp: trung bình mỗi trận, rỉ ở vòng gần / quái chạm vạch / đạn lính.", "");
lines.push(formatGates(gates(cells)), "");
const steps = cells.flatMap((cell) => cell.runs.flatMap((run) => run.stepMs)).sort((a, b) => a - b);
const peak = Math.max(...cells.flatMap((cell) => cell.runs.map((run) => run.peakFoes)));
lines.push(
  "Bước sim (Node, mọi trận): trung vị " + fixed(steps[steps.length >> 1] ?? 0, 3) + " ms, p95 " + fixed(steps[Math.floor(steps.length * 0.95)] ?? 0, 3) + " ms, tối đa " + fixed(steps.at(-1) ?? 0, 2) + " ms; quái trên sân tối đa " + peak + ". " +
    cells.reduce((sum, cell) => sum + cell.runs.length, 0) + " trận trong " + ((performance.now() - started) / 1000).toFixed(0) + " s.",
);
console.log(lines.join("\n"));
const json = arg("json");
if (json !== undefined) writeFileSync(json, JSON.stringify(cells.map((cell) => ({ bot: cell.bot.id, mode: cell.mode, director: cell.director, summary: cell.summary, header: cell.runs[0]!.header })), null, 1));
