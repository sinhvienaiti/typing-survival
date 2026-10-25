/**
 * BUILD_S1 §11.4 read across the chapter stages of one report
 * (scripts/balance.ts): what no single stage's gate table shows.
 */
import { BANDS, MODE_LABELS } from "../src/kit/balance";
import type { Cell } from "./balance-lib";

const FLOW_BOTS = ["novice", "steady", "standard", "skilled", "sloppy", "fast"];
const B1_METRICS = ["win", "s", "p", "i", "o"] as const;
const signed = (milli: number): string => (milli >= 0 ? "+" : "−") + (Math.abs(milli) / 10).toFixed(1).replace(".", ",");

/**
 * BUILD_S1 §11.4 over the chapter stages of a report: B6 pooled over the
 * stages (mean of Tốt − Kém per stage, Cân bằng and Thử thách, ≥ +10), and
 * the B1/B7 cells off their band by 3 points at most, which the gate reruns
 * on the next 100 seeds before calling them a miss.
 */
export function rollUp(cells: readonly Cell[], nextSeeds: string): string[] {
  const chapter = cells.filter((cell) => cell.stage !== "s0");
  const stages = [...new Set(chapter.map((cell) => cell.stage))];
  const lines: string[] = [];
  for (const mode of ["balanced", "challenge"] as const) {
    const gaps = stages.flatMap((stage) => {
      const pick = (id: string) => chapter.find((c) => c.stage === stage && c.mode === mode && c.director && c.bot.id === id)?.summary.win;
      const [good, poor] = [pick("standard@good"), pick("standard@poor")];
      return good === undefined || poor === undefined ? [] : [good - poor];
    });
    if (gaps.length === 0) continue;
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    lines.push("| B6 gộp | " + MODE_LABELS[mode] + ", Tốt − Kém gộp " + gaps.length + " ải: " + signed(mean) + " điểm (từng ải " + gaps.map(signed).join(" / ") + "; ≥ +10) | " + (mean >= 100 ? "đạt" : "TRƯỢT") + " |");
  }
  const near: string[] = [];
  for (const cell of chapter) {
    if (cell.mode !== "balanced" || !FLOW_BOTS.includes(cell.bot.id) || (!cell.director && cell.bot.id !== "standard")) continue;
    const misses = B1_METRICS.flatMap((metric) => {
      const value = cell.summary[metric] as number;
      const { min, max } = BANDS.balanced[metric];
      const miss = min !== undefined && value < min ? value - min : max !== undefined && value > max ? value - max : 0;
      return miss !== 0 ? [{ metric, miss }] : [];
    });
    if (misses.length > 0 && misses.every((m) => Math.abs(m.miss) <= 30)) near.push(cell.stage + " " + cell.bot.id + (cell.director ? "" : " (tắt nhịp)") + " (" + misses.map((m) => m.metric + " " + signed(m.miss)).join(", ") + ")");
  }
  if (stages.length > 0) lines.push("| B1/B7 chạy lại | Ô lệch ≤ 3 điểm, chạy lại seed " + nextSeeds + " trước khi tính là trượt: " + (near.length === 0 ? "không có" : near.join("; ")) + " | — |");
  return lines;
}
