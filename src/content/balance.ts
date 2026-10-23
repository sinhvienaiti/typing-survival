/**
 * Tuyến Cuối's balance data (docs/games/BALANCE.md §4, §9.3; changelog
 * 2026-10-23-balance.md): the three modes, the run header a player's skill
 * profile sets before a stage (pace k, the word length E, the director), what
 * k scales, and the pace director's step table. Numbers only, no clock: the
 * header is written into every replay, so the same header, seed and keys give
 * the same run.
 */
import {
  BANDS, FAMILIARITY_SPEED, botSpec, capacity, effectiveE, paceK,
  type Band, type BandMode, type PaceTable, type SkillValues,
} from "../kit/balance";
import { EXPECTED_WPM, LENGTH_BY_E } from "./rules";

export const MODES = ["relax", "balanced", "challenge"] as const satisfies readonly BandMode[];
export type Mode = (typeof MODES)[number];

/**
 * Per mode, what the stage's numbers are multiplied by: calm and lull spawn
 * rates, surge rates, walking speed, the near zone's drain. Balanced is the
 * stage as tuned (×1). Tuned with the bots (pnpm survival:balance) until each
 * mode's band of BALANCE.md §3 holds.
 */
export type ModeSpec = { readonly label: string; readonly note: string; readonly rate: number; readonly surge: number; readonly speed: number; readonly drain: number };
export const MODE_SPECS: { readonly [M in Mode]: ModeSpec } = {
  relax: { label: "Thư giãn", note: "Bầy thưa, đi chậm: gõ thong thả, học từ là chính", rate: 0.66, surge: 0.5, speed: 0.9, drain: 0.5 },
  balanced: { label: "Cân bằng", note: "Căng vừa sức: lúc dồn, lúc thở", rate: 1, surge: 1, speed: 1, drain: 1 },
  challenge: { label: "Thử thách", note: "Bầy dày, đỉnh tràn gắt: giữ tuyến là kỳ công", rate: 1.12, surge: 1.1, speed: 1.06, drain: 1.15 },
};

export const DEFAULT_MODE: Mode = "balanced";

export const isMode = (value: unknown): value is Mode => typeof value === "string" && (MODES as readonly string[]).includes(value);

export const bandOf = (mode: Mode): Band => BANDS[mode];

/** The word length band for a typist at E (LENGTH_BY_E) and its mean ℓ̄. */
export function lengthFor(e: number): readonly [number, number] {
  let len: readonly [number, number] = LENGTH_BY_E[0].len;
  for (const entry of LENGTH_BY_E) if (e >= entry.minE) len = entry.len;
  return len;
}
export const meanLength = (e: number): number => {
  const [lo, hi] = lengthFor(e);
  return (lo + hi) / 2;
};

/**
 * k's capacity C(E) (kit balance/pace) with this game's words: ℓ̄ of E's
 * length band, d of "known" words (the stage deals the vocabulary's first
 * three levels: good, water, house…), and the reference: C of the standard
 * bot's effective speed (35 WPM, 95 %, CV 0.25), so the standard bot plays
 * at k = 1 exactly (BALANCE.md §4.1, C_ref).
 */
export const PACE_D = FAMILIARITY_SPEED.known;
const STANDARD = botSpec("standard");
export const PACE_REF = capacity(effectiveE({ e: STANDARD.wpm, a: STANDARD.accuracy, cv: STANDARD.cv }), meanLength(STANDARD.wpm), PACE_D);

/** k for a profile (two ways, 0.75–1.30, rounded to 1/1000). */
export function paceFor(view: Pick<SkillValues, "e" | "a" | "cv" | "fatigue">): number {
  const e = Math.round(view.e);
  return paceK(effectiveE({ e: view.e, a: view.a, cv: view.cv, fatigue: view.fatigue }), { len: meanLength(e), d: PACE_D, ref: PACE_REF });
}

/**
 * The run header (written into the replay with the seed): the mode, pace k,
 * E for the word lengths and Nhanh, and whether the in-run director runs.
 * "Nhịp tự điều theo cách bạn gõ: Tắt" plays the standard pace: k = 1, E 35,
 * no director (the same fixed parameters a fair-score run would use).
 */
export type RunHeader = { readonly mode: Mode; readonly pace: number; readonly expected: number; readonly director: boolean };

export const STANDARD_HEADER: RunHeader = { mode: DEFAULT_MODE, pace: 1, expected: EXPECTED_WPM, director: true };

export function runHeader(view: Pick<SkillValues, "e" | "a" | "cv" | "fatigue">, mode: Mode, adapt: boolean): RunHeader {
  if (!adapt) return { mode, pace: 1, expected: EXPECTED_WPM, director: false };
  const expected = Math.max(10, Math.min(150, Math.round(view.e)));
  return { mode, pace: paceFor(view), expected, director: true };
}

/**
 * What pace k scales (BALANCE.md §9.3): spawn rates (the spawn interval is
 * 1/k), the surges' size, and the horde's walking speed, which is a timing
 * knob here (how long a foe takes to reach the line), at half strength.
 */
export const PACE_GAIN = { surge: 1, speed: 0.2 } as const;

export type Scales = { readonly rate: number; readonly surge: number; readonly speed: number; readonly drain: number };

export function scalesFor(mode: Mode, k: number): Scales {
  const spec = MODE_SPECS[mode];
  return {
    rate: spec.rate * k,
    surge: spec.surge * (1 + PACE_GAIN.surge * (k - 1)),
    speed: spec.speed * (1 + PACE_GAIN.speed * (k - 1)),
    drain: spec.drain,
  };
}

/**
 * The director's steps in this game (BALANCE.md §4.2, §9.3): harder, the
 * next pack's spawn interval −7 %, one Giáp affix on the next plain pack,
 * the coming surge 3 s earlier, the coming lull 3 s shorter; easier, a
 * repair pod when near defeat (once a wave) first, then the reverse of each.
 * The kit keeps the caps (±15 % spawn interval, ±10 % W, 2 steps a wave).
 * eliteCost: one armoured pack ≈ 8 mines × 14 HP extra over the stage's W
 * (≈ 16,000 HP): ≈ 7 ‰, rounded up; the sim reports the real one.
 */
export const SURVIVAL_PACE_TABLE: PaceTable = {
  up: ["spawn", "elite", "peak", "lull"],
  down: ["support", "spawn", "elite", "lull", "peak"],
  spawnStep: 70,
  eliteCost: 10,
  peakTicks: 180,
  lullTicks: 180,
};

/** FlowMeter snapshots every this many ticks (0.1 s): kills, damage and drops add up in between. */
export const FLOW_EVERY = 6;

/**
 * The warm-up: the director's window starts over at this tick (15 s), when
 * the horde's stream has reached the guns; the first seconds (the vanguard
 * walking in, the first words) are calm for everyone by design and judged
 * with them every run would step harder at 20 s. The stage totals keep them.
 */
export const WARMUP_TICKS = 15 * 60;
