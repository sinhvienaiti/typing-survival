/**
 * The results and profile screens' numbers (main.ts draws them): the run's
 * time, kills, accuracy and words, the words learned (each once, in order),
 * the line saying whether the run counted for the typing profile, and the
 * "Hồ sơ gõ" panel.
 */
import type { SkillProfile, SkillUpdate } from "../kit/balance";
import { MODE_SPECS, lengthFor, type Mode } from "../content/balance";
import type { World } from "../sim/world";
import { headerFor, skillReport, type SkillReport } from "./skill";
import type { Word } from "./vocab";

export function runStats(w: World): { value: string; label: string }[] {
  const s = w.stats;
  const keys = s.keysOk + s.keysBad;
  const time = Math.min(w.seconds, w.time);
  return [
    { value: Math.floor(time / 60) + ":" + String(Math.floor(time % 60)).padStart(2, "0"), label: "Thời gian" },
    { value: String(s.kills), label: "Hạ" },
    { value: (keys === 0 ? 100 : Math.round((s.keysOk / keys) * 100)) + "%", label: "Độ chuẩn" },
    { value: String(s.words), label: "Từ đã gõ" },
  ];
}

export function runWords(w: World, wordOf: (index: number) => Word): { en: string; vi: string }[] {
  const T = w.typing;
  const seen = new Set<number>();
  const words: { en: string; vi: string }[] = [];
  for (let k = Math.max(0, T.doneCount - T.done.length); k < T.doneCount; k += 1) {
    const index = T.done[k % T.done.length]!;
    if (seen.has(index)) continue;
    seen.add(index);
    const word = wordOf(index);
    words.push({ en: word.en, vi: word.vi });
  }
  return words;
}

export function countedText(settled: SkillUpdate | null, report: SkillReport): string {
  if (settled === null) return "";
  if (settled.accepted) return "Hồ sơ gõ đã cập nhật: " + Math.round(report.view.e) + " WPM, chính xác " + Math.round(report.view.a * 100) + " %.";
  if (settled.reason === "short") return "Trận này ít từ quá, chưa tính vào hồ sơ gõ.";
  if (settled.reason === "afk") return "Bạn rời bàn phím lâu, trận này không tính vào hồ sơ gõ.";
  return "Trận này lệch xa thường lệ, chưa tính vào hồ sơ gõ.";
}

/** The "Hồ sơ gõ" panel: the measured numbers, the advice, and what the next run will be. */
export function profileView(profile: SkillProfile, mode: Mode, adapt: boolean) {
  const report = skillReport(profile, mode);
  const v = report.view;
  const next = headerFor(profile, mode, adapt);
  const [lo, hi] = lengthFor(next.expected);
  const fixed = (value: number, digits: number): string => value.toFixed(digits).replace(".", ",");
  const sure = (confidence: number): string => (confidence >= 1 ? "đo đủ" : confidence > 0 ? "đang đo " + Math.round(confidence * 100) + " %" : "mặc định");
  return {
    stats: [
      { value: String(Math.round(v.e)), label: "Tốc độ (WPM)", note: sure(v.confidence.e) },
      { value: Math.round(v.a * 100) + "%", label: "Độ chính xác", note: sure(v.confidence.a) },
      { value: fixed(v.recognize.new, 1) + " s", label: "Nhận từ mới", note: sure(v.confidence.recognize.new) },
      { value: Math.round(Math.max(0, 1 - v.cv) * 100) + "%", label: "Độ đều", note: "lệch ±" + Math.round(v.cv * 100) + " % mỗi từ" },
    ],
    advice: report.advice,
    lines: [
      report.runs > 0 ? "Đã chơi " + report.runs + " trận" + (report.measured ? "" : ", chưa đủ số đo: đang dùng mặc định của chế độ") + "." : "Chưa có trận nào: hồ sơ đang dùng mặc định của chế độ " + MODE_SPECS[mode].label + ".",
      adapt
        ? "Trận tới: " + MODE_SPECS[mode].label + ", nhịp ×" + fixed(next.pace, 2) + ", từ " + lo + "–" + hi + " chữ, tự điều trong trận."
        : "Trận tới: " + MODE_SPECS[mode].label + ", nhịp chuẩn cố định (đã tắt tự điều).",
      ...(report.suggestionText ? [report.suggestionText] : []),
    ],
  };
}
