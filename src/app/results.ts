/**
 * The results and profile screens' numbers (main.ts draws them): the run's
 * time, kills, accuracy and words, the words learned (each once, in order),
 * the line saying whether the run counted for the typing profile, and the
 * "Hồ sơ gõ" panel.
 */
import { ADVICE_VI, type SkillProfile, type SkillUpdate } from "../kit/balance";
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
    { value: (keys === 0 ? 100 : Math.round((s.keysOk / keys) * 100)) + " %", label: "Chính xác" },
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
  if (settled.accepted) return "Hồ sơ gõ (trung bình các trận) nay là " + Math.round(report.view.e) + " WPM, chính xác " + Math.round(report.view.a * 100) + " %.";
  if (settled.reason === "short") return "Trận này ít từ quá, chưa tính vào hồ sơ gõ.";
  if (settled.reason === "afk") return "Bạn rời bàn phím lâu, trận này không tính vào hồ sơ gõ.";
  return "Trận này lệch xa thường lệ, chưa tính vào hồ sơ gõ.";
}

/**
 * The advice line: none for a run the profile did not take (its note says
 * why), a first word until two runs are measured, and no praise under a lost
 * run (test pass 27/10: "tiến bộ đều" showed on a first run and under a loss
 * for leaving the keys). `won` null: the profile panel.
 */
export function adviceText(report: SkillReport, settled: SkillUpdate | null, won: boolean | null): string {
  if (settled !== null && !settled.accepted) return "";
  if (report.advice !== ADVICE_VI["keep-going"]) return report.advice;
  if (report.runs === 0) return "Chưa có số đo: chơi vài trận để có lời khuyên theo cách bạn gõ.";
  if (won === false) return "Tuyến vỡ: nạp súng trước đỉnh tràn, và khi Swarm dày, gõ dứt điểm từng từ.";
  if (report.runs < 2) return "Trận đầu đã vào hồ sơ gõ: chơi thêm để có lời khuyên theo cách bạn gõ.";
  return report.advice;
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
      { value: Math.round(v.a * 100) + " %", label: "Chính xác", note: sure(v.confidence.a) },
      { value: fixed(v.recognize.new, 1) + " s", label: "Nhận từ mới", note: sure(v.confidence.recognize.new) },
      { value: Math.round(Math.max(0, 1 - v.cv) * 100) + " %", label: "Độ đều", note: "lệch ±" + Math.round(v.cv * 100) + " % mỗi từ" },
    ],
    advice: adviceText(report, null, null),
    lines: [
      report.runs > 0 ? "Đã chơi " + report.runs + " trận" + (report.measured ? "" : ", chưa đủ số đo: đang dùng mặc định của chế độ") + "." : "Chưa có trận nào: hồ sơ đang dùng mặc định của chế độ " + MODE_SPECS[mode].label + ".",
      adapt
        ? "Trận tới: " + MODE_SPECS[mode].label + ", nhịp ×" + fixed(next.pace, 2) + ", từ " + lo + "–" + hi + " chữ, tự điều trong trận."
        : "Trận tới: " + MODE_SPECS[mode].label + ", nhịp chuẩn cố định (đã tắt tự điều).",
      ...(report.suggestionText ? [report.suggestionText] : []),
    ],
  };
}
