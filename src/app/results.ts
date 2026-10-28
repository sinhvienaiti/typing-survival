/**
 * The results and profile screens' numbers (main.ts draws them): the run's
 * time, kills, accuracy and words, the words learned (each once, in order),
 * the line saying whether the run counted for the typing profile, and the
 * "Hồ sơ gõ" panel.
 */
import { type SkillProfile, type SkillUpdate } from "../kit/balance";
import { MODE_SPECS, lengthFor, type Mode } from "../content/balance";
import type { World } from "../sim/world";
import { headerFor, skillReport, type SkillReport } from "./skill";
import type { Word } from "./vocab";
import { ADVICE_EN } from "./english";

export function runStats(w: World): { value: string; label: string }[] {
  const s = w.stats;
  const keys = s.keysOk + s.keysBad;
  const time = Math.min(w.seconds, w.time);
  return [
    { value: Math.floor(time / 60) + ":" + String(Math.floor(time % 60)).padStart(2, "0"), label: "Time" },
    { value: String(s.kills), label: "Kills" },
    { value: (keys === 0 ? 100 : Math.round((s.keysOk / keys) * 100)) + "%", label: "Accuracy" },
    { value: String(s.words), label: "Words" },
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
  if (settled.accepted) return "Typing profile (all runs): " + Math.round(report.view.e) + " WPM, " + Math.round(report.view.a * 100) + "% accuracy.";
  if (settled.reason === "short") return "Too few words to count toward your profile.";
  if (settled.reason === "afk") return "You were away too long, so this run does not count.";
  return "This run was far off your usual, so it does not count.";
}

/**
 * The advice line: none for a run the profile did not take (its note says
 * why), a first word until two runs are measured, and no praise under a lost
 * run (test pass 27/10: "tiến bộ đều" showed on a first run and under a loss
 * for leaving the keys). `won` null: the profile panel.
 */
export function adviceText(report: SkillReport, settled: SkillUpdate | null, won: boolean | null): string {
  if (settled !== null && !settled.accepted) return "";
  if (report.advice !== ADVICE_EN["keep-going"]) return report.advice;
  if (report.runs === 0) return "Play a few runs to get advice based on your typing.";
  if (won === false) return "Line lost: reload before surges. Finish each word before switching when Swarm crowds in.";
  if (report.runs < 2) return "Your first run is in your profile. Play more for personal advice.";
  return report.advice;
}

/** The "Hồ sơ gõ" panel: the measured numbers, the advice, and what the next run will be. */
export function profileView(profile: SkillProfile, mode: Mode, adapt: boolean) {
  const report = skillReport(profile, mode);
  const v = report.view;
  const next = headerFor(profile, mode, adapt);
  const [lo, hi] = lengthFor(next.expected);
  const fixed = (value: number, digits: number): string => value.toFixed(digits);
  const sure = (confidence: number): string => (confidence >= 1 ? "measured" : confidence > 0 ? "measuring " + Math.round(confidence * 100) + "%" : "default");
  return {
    stats: [
      { value: String(Math.round(v.e)), label: "Speed (WPM)", note: sure(v.confidence.e) },
      { value: Math.round(v.a * 100) + "%", label: "Accuracy", note: sure(v.confidence.a) },
      { value: fixed(v.recognize.new, 1) + " s", label: "New-word read", note: sure(v.confidence.recognize.new) },
      { value: Math.round(Math.max(0, 1 - v.cv) * 100) + "%", label: "Steadiness", note: "±" + Math.round(v.cv * 100) + "% per word" },
    ],
    advice: adviceText(report, null, null),
    lines: [
      report.runs > 0 ? "Played " + report.runs + (report.runs === 1 ? " run" : " runs") + (report.measured ? "" : "; still measuring, so mode defaults apply") + "." : "No runs yet: using defaults for " + MODE_SPECS[mode].label + ".",
      adapt
        ? "Next run: " + MODE_SPECS[mode].label + ", pace ×" + fixed(next.pace, 2) + ", words " + lo + "–" + hi + " letters, adapting during play."
        : "Next run: " + MODE_SPECS[mode].label + ", fixed pace (adaptation off).",
      ...(report.suggestionText ? [report.suggestionText] : []),
    ],
  };
}
