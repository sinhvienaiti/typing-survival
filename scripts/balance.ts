/**
 * Tuyến Cuối's balance report (docs/games/BALANCE.md §3, §7; pnpm
 * survival:balance; docs/BUILD_S1.md §11.3): per stage (the trial "s0", or
 * chapter 1's stages with --stages), the standard bots × Thư giãn / Cân bằng
 * / Thử thách × seeds, typed like people through the page's input path, each
 * with the header its profile sets (pace k, E, ρ) and the guns its tactics
 * pick, the pace director on; "standard" also with the director off (B7).
 * Prints the §3 metrics per bot and mode, the guns picked, the gates B1–B9
 * (formatGates) per stage, then S1's gates: G3m (the counter table
 * measured), G5 (learning, every run), G6 (Săn's length), G8 (replays),
 * the attention budget, and with --g3c every pair of guns per stage (G3c;
 * G2 printed provisionally). 100 seeds by default: a win rate's standard
 * error is then about 4 points (24 seeds are not enough for §3's bands).
 *   node --import tsx scripts/balance.ts [--stages=s0,c1-s1,c1-s2,c1-s3,c1-s4] [--seeds=100] [--bots=standard,fast]
 *     [--modes=balanced] [--off=standard] [--g3c] [--json=out.json]
 */
import { writeFileSync } from "node:fs";
import { BANDS, METRIC_LABELS, formatGates, pct, rangeText, scoreBand, type BandMetric } from "../src/kit/balance";
import { MODE_SPECS, MODES, type Mode } from "../src/content/balance";
import { isStageId, stageById } from "../src/content/chapter-1";
import { COUNTERS, COUNTER_ROWS, GUN_SPECS } from "../src/content/guns";
import { gunSets } from "../src/content/threat";
import { measureCounters } from "../tests/survival/counters";
import { sharedDeck } from "../tests/survival/typist-bot";
import { botRows, gates, replays, runMatrix, type Cell } from "./balance-lib";

const arg = (name: string): string | undefined => process.argv.find((value) => value.startsWith("--" + name + "="))?.slice(name.length + 3);
const list = (name: string): string[] | undefined => arg(name)?.split(",").filter(Boolean);
const seeds = Number(arg("seeds") ?? 100);
const modes = (list("modes") ?? [...MODES]).filter((mode): mode is Mode => (MODES as readonly string[]).includes(mode));
const stages = (list("stages") ?? ["s0"]).filter(isStageId);
const started = performance.now();
const cells = runMatrix({ seeds, bots: list("bots"), modes, directorOff: list("off") ?? ["standard"], time: true, stages }, (done, total) => {
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
  const picks = new Map<string, number>();
  for (const run of runs) {
    const key = run.guns.map((gun) => GUN_SPECS[gun]!.name).join("+");
    picks.set(key, (picks.get(key) ?? 0) + 1);
  }
  const top = [...picks].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key, n]) => key + " " + Math.round((n * 100) / runs.length) + "%").join(", ");
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
    fixed(median(runs.map((run) => run.seconds)), 0),
    top,
  ].join(" | ");
}

const header = ["Bot", "Chế độ", "k", "E từ", ...METRICS.map((metric) => METRIC_LABELS[metric]), "Hạ quái (s)", "Bậc/đợt (khoảng sinh)", "Mất giáp: rỉ/chạm/đạn", "Quái tối đa", "E · a đo · từ/phút", "Học", "Dài (s)", "Súng chọn"];
const lines: string[] = [];
lines.push("# Tuyến Cuối: báo cáo cân bằng (" + seeds + " seed mỗi ô)", "");
lines.push("Dải đích (BALANCE.md §3):", "");
lines.push("| Chế độ | " + METRICS.map((metric) => METRIC_LABELS[metric]).join(" | ") + " |", "|" + "---|".repeat(METRICS.length + 1));
for (const mode of modes) lines.push("| " + MODE_SPECS[mode].label + " | " + METRICS.map((metric) => rangeText(metric, BANDS[mode][metric])).join(" | ") + " |");
for (const stage of stages) {
  const own = cells.filter((cell) => cell.stage === stage);
  lines.push("", "## " + (stage === "s0" ? "Trận thử (s0)" : stage + " · " + stageById(stage).name), "");
  lines.push("| " + header.join(" | ") + " |", "|" + "---|".repeat(header.length));
  for (const mode of modes) for (const cell of own.filter((c) => c.mode === mode)) lines.push("| " + cellLine(cell) + " |");
  lines.push("", formatGates(gates(own)));
}
lines.push("", "↓ / ↑: dưới / trên dải đích của chế độ (thắng, S, P, I, O). Mất giáp: trung bình mỗi trận, rỉ ở vòng gần / quái chạm vạch / đạn lính.", "");

// S1's gates (docs/BUILD_S1.md §11.4).
const s1: string[] = [];
const pass = (ok: boolean): string => (ok ? "đạt" : "TRƯỢT");
const measured = measureCounters([1, 2, 3, 4, 5, 6, 7, 8]);
const g3m = COUNTER_ROWS.every((row) => measured[row].mark.every((mark, gun) => mark === COUNTERS[row][gun]));
s1.push("| G3m | Bảng khắc chế khớp số đo (8 seed mỗi ô) | " + pass(g3m) + " |");
const learning = cells.flatMap((cell) => cell.runs.map((run) => run.learnOk)).filter((ok): ok is boolean => ok !== undefined);
s1.push("| G5 | Học: không lặp từ, chữ đầu khác nhau, không ẩn chữ đầu, ≥ 8 từ (" + learning.length + " trận có gõ) | " + pass(learning.every(Boolean)) + " |");
const hunts = cells.filter((cell) => cell.bot.id === "standard" && cell.mode === "balanced" && cell.director && stageById(cell.stage).objective.kind === "hunt");
for (const cell of hunts) {
  const length = median(cell.runs.map((run) => run.seconds)) ?? 0;
  s1.push("| G6 | " + cell.stage + " Săn, Chuẩn, Cân bằng: thời lượng trung vị " + fixed(length, 0) + " s (110–190) | " + pass(length >= 110 && length <= 190) + " |");
}
const clash = cells.reduce((sum, cell) => sum + cell.runs.reduce((a, run) => a + run.clash, 0), 0);
s1.push("| §7.6 | Hai báo trước cách nhau < 4 s: " + clash + " lần | " + pass(clash === 0) + " |");
const deck = sharedDeck();
const standard = botRows().find((bot) => bot.id === "standard")!;
const replayed = stages.flatMap((stage) => [1, 2].map((seed) => replays(deck, standard, "balanced", seed, stage)));
s1.push("| G8 | Chạy lại từ nhật ký phím ra cùng mã băm (" + replayed.length + " trận, Node) | " + pass(replayed.every(Boolean)) + " |");
if (process.argv.includes("--g3c")) {
  const chapter = stages.filter((stage) => stage !== "s0");
  const pairCells = runMatrix({ seeds, bots: ["standard"], modes: ["balanced"], stages: chapter, kits: gunSets(2), directorOff: [] });
  const best: string[] = [];
  for (const stage of chapter) {
    const own = pairCells.filter((cell) => cell.stage === stage).sort((a, b) => b.summary.win - a.summary.win);
    const top = own[0]!.summary.win;
    const low = own.at(-1)!.summary.win;
    const name = (cell: Cell) => (cell.guns ?? []).map((gun) => GUN_SPECS[gun]!.name).join("+");
    best.push(name(own[0]!));
    s1.push("| G3c | " + stage + ": " + own.map((cell) => name(cell) + " " + pct(cell.summary.win)).join(", ") + " · kém nhất ≥ 60 %, cách tốt nhất ≤ 30 điểm, tốt nhất ≤ 97 % | " + pass(low >= 600 && top - low <= 300 && top <= 970) + " |");
  }
  const counts = new Map<string, number>();
  for (const name of best) counts.set(name, (counts.get(name) ?? 0) + 1);
  s1.push("| G2 (tạm) | Bộ đứng nhất theo ải: " + best.join(", ") + " (chỉ in số ở R1) | — |");
}
lines.push("## Cổng S1", "", "| # | Kiểm | Kết quả |", "|---|---|---|", ...s1, "");
const steps = cells.flatMap((cell) => cell.runs.flatMap((run) => run.stepMs)).sort((a, b) => a - b);
const peak = Math.max(...cells.flatMap((cell) => cell.runs.map((run) => run.peakFoes)));
lines.push(
  "Bước sim (Node, mọi trận): trung vị " + fixed(steps[steps.length >> 1] ?? 0, 3) + " ms, p95 " + fixed(steps[Math.floor(steps.length * 0.95)] ?? 0, 3) + " ms, tối đa " + fixed(steps.at(-1) ?? 0, 2) + " ms; quái trên sân tối đa " + peak + ". " +
    cells.reduce((sum, cell) => sum + cell.runs.length, 0) + " trận trong " + ((performance.now() - started) / 1000).toFixed(0) + " s.",
);
console.log(lines.join("\n"));
const json = arg("json");
if (json !== undefined) writeFileSync(json, JSON.stringify(cells.map((cell) => ({ bot: cell.bot.id, mode: cell.mode, director: cell.director, summary: cell.summary, header: cell.runs[0]!.header })), null, 1));
