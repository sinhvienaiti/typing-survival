/**
 * The player's skill profile in Tuyến Cuối (docs/games/BALANCE.md §2, §4.1,
 * §4.3): kept under the kit's key (`skillStorageKey("survival")`, with the
 * game's other survival.* keys), read blended into the next run's header
 * (pace k, E, director: content/balance.ts), and updated after every run
 * from what the world measured (the kit rejects quits, AFK runs, short runs
 * and outliers). Words are new, learning or known by how often this player
 * finished them here (`survival.seen`). No DOM: storage comes in.
 */
import {
  ADVICE_VI, blendSkill, newSkillProfile, parseSkill, serializeSkill, skillAdvice, skillStorageKey, suggestDifficulty, updateSkill,
  type DifficultySuggestion, type Familiarity, type FlowSummary, type SkillProfile, type SkillSample, type SkillUpdate, type SkillView,
} from "../kit/balance";
import { MODE_SPECS, MODES, runHeader, type Mode, type RunPace } from "../content/balance";
import type { World } from "../sim/world";

export const SKILL_KEY = skillStorageKey("survival");
export const SEEN_KEY = "survival.seen";
/** No key for this long (s) with the fight on: the player was away (the run teaches nothing about their typing). */
export const AFK_SECONDS = 20;

export type TextStore = { getItem(key: string): string | null; setItem(key: string, value: string): boolean | void };

export function loadProfile(store: TextStore, mode: Mode): SkillProfile {
  return parseSkill(store.getItem(SKILL_KEY), "adult", mode);
}

export function saveProfile(store: TextStore, profile: SkillProfile): void {
  store.setItem(SKILL_KEY, serializeSkill(profile));
}

/** The next run's header from the stored profile (blended toward `mode`'s defaults while it has few samples). */
export function headerFor(profile: SkillProfile, mode: Mode, adapt: boolean): RunPace {
  return runHeader(blendSkill({ ...profile, mode }), mode, adapt);
}

/** How often each word was finished here: 0 → new, 1–2 → learning, 3+ → known. */
export class WordHistory {
  private readonly counts: Map<string, number>;

  constructor(text: string | null = null) {
    this.counts = new Map();
    try {
      const raw = text === null ? null : (JSON.parse(text) as unknown);
      if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        for (const [word, count] of Object.entries(raw as Record<string, unknown>)) if (typeof count === "number" && Number.isInteger(count) && count > 0 && /^[a-z]+$/.test(word)) this.counts.set(word, Math.min(99, count));
      }
    } catch {
      // A broken record starts over.
    }
  }

  familiarity(word: string): Familiarity {
    const count = this.counts.get(word) ?? 0;
    return count === 0 ? "new" : count < 3 ? "learning" : "known";
  }

  /** The word finished once more; returns how familiar it was before. */
  finished(word: string): Familiarity {
    const before = this.familiarity(word);
    this.counts.set(word, Math.min(99, (this.counts.get(word) ?? 0) + 1));
    return before;
  }

  toJSON(): Record<string, number> {
    return Object.fromEntries(this.counts);
  }
}

/** Finished words of one run by familiarity: count, letters and seconds of the clean ones, seconds to the first key. */
export type ByFamiliarityTally = { [F in Familiarity]: { words: number; cleanLetters: number; cleanSeconds: number; recognize: number } };

export const emptyTally = (): ByFamiliarityTally => ({
  new: { words: 0, cleanLetters: 0, cleanSeconds: 0, recognize: 0 },
  learning: { words: 0, cleanLetters: 0, cleanSeconds: 0, recognize: 0 },
  known: { words: 0, cleanLetters: 0, cleanSeconds: 0, recognize: 0 },
});

/** One finished word into the tally (the EV.word event's numbers). */
export function tallyWord(tally: ByFamiliarityTally, familiarity: Familiarity, letters: number, seconds: number, recognize: number, clean: boolean): void {
  const row = tally[familiarity];
  row.words += 1;
  row.recognize += recognize;
  if (clean && seconds > 0) {
    row.cleanLetters += letters;
    row.cleanSeconds += seconds;
  }
}

/**
 * The run as a skill sample: speed and CV from the clean words, accuracy from
 * the keys, Backspaces, dropped locks, by familiarity (when the page tallied
 * it), HP left, idle share and near misses from the FlowMeter.
 */
export function runSample(w: World, flow: FlowSummary, outcome: SkillSample["outcome"], first: boolean, tally?: ByFamiliarityTally): SkillSample {
  const M = w.measure;
  const S = w.stats;
  const gap = Math.max(M.longestGap, w.tick - M.lastKey) / 60;
  const mean = M.words > 0 ? M.perLetter / M.words : 0;
  const variance = M.words > 1 ? Math.max(0, M.perLetterSq / M.words - mean * mean) : 0;
  const byFamiliarity: NonNullable<SkillSample["byFamiliarity"]> = {};
  if (tally !== undefined) {
    for (const familiarity of ["new", "learning", "known"] as const) {
      const row = tally[familiarity];
      if (row.words === 0) continue;
      (byFamiliarity as Record<Familiarity, { words: number; wpm?: number; recognize?: number }>)[familiarity] = {
        words: row.words,
        wpm: row.cleanSeconds > 0 ? (12 * row.cleanLetters) / row.cleanSeconds : undefined,
        recognize: row.recognize / row.words,
      };
    }
  }
  return {
    outcome,
    afk: outcome !== "quit" && S.words > 0 && gap > AFK_SECONDS,
    words: S.words,
    wpm: M.seconds > 0 ? (12 * M.letters) / M.seconds : undefined,
    keys: S.keysOk + S.keysBad,
    correctKeys: S.keysOk,
    backspaces: S.backspaces,
    cleanWords: S.clean,
    abandons: S.drops,
    cv: mean > 0 && M.words > 1 ? Math.sqrt(variance) / mean : undefined,
    byFamiliarity: tally !== undefined ? byFamiliarity : undefined,
    safety: outcome === "quit" ? undefined : flow.s / 1000,
    idle: flow.i / 1000,
    nearMisses: flow.n,
    session: { first },
  };
}

export function recordRun(profile: SkillProfile, sample: SkillSample): SkillUpdate {
  return updateSkill(profile, sample);
}

/** What the "Hồ sơ gõ" panel and the results line show. */
export type SkillReport = {
  readonly view: SkillView;
  readonly measured: boolean;
  readonly runs: number;
  readonly advice: string;
  readonly suggestion: DifficultySuggestion;
  readonly suggestionText: string;
};

export function skillReport(profile: SkillProfile, mode: Mode): SkillReport {
  const view = blendSkill({ ...profile, mode });
  const suggestion = suggestDifficulty(profile.trend);
  const index = MODES.indexOf(mode);
  const up = MODES[index + 1];
  const down = MODES[index - 1];
  const suggestionText =
    suggestion === "up" && up !== undefined
      ? "Hai trận thắng dễ liền: thử chế độ " + MODE_SPECS[up].label + "?"
      : suggestion === "down" && down !== undefined
        ? "Hai trận thua liền: chế độ " + MODE_SPECS[down].label + " sẽ dễ thở hơn."
        : "";
  return { view, measured: view.confidence.e > 0, runs: profile.trend.stages, advice: ADVICE_VI[skillAdvice(view)], suggestion, suggestionText };
}

export const freshProfile = (mode: Mode): SkillProfile => newSkillProfile("adult", mode);
