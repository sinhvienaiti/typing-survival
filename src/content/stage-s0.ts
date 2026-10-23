/**
 * The S0 stage, kept as the trial ("Trận thử", docs/BUILD_S1.md §8):
 * 180 s, the rainbow family, steady grouped spawns. `calm` gives foes per
 * second over [from, to); each surge replaces it for `seconds` from `at`,
 * then its lull (a quieter `lullRate`) for `lull` seconds. Three waves
 * (docs/games/BALANCE.md §4.2): the start to the end of the first lull, to
 * the end of the second, the rest. The pace director moves a surge (±3 s)
 * and a lull (±3 s) that has not begun yet; nothing else of the timeline
 * moves (src/sim/plan.ts).
 *
 * The calm rates and surges are BUILD_S0 §4's table as the S0 review raised
 * it (BUILD_NOTES.md §7: real floods of 15 and 11 a second); the balance
 * pass (docs/changelog/2026-10-23-balance.md) added the vanguard, the lulls
 * after the surges, and tuned the rates with the human-like bots at pace k = 1 (the
 * standard bot, 35 WPM): every rate is then scaled by the mode and by k.
 * The trial keeps every number: its event trace is golden (tests/s0-trace.test.ts).
 */
import { PACE_HOLD, type CalmSpan, type Stage, type Surge, type Vanguard } from "./stage-rules";

export type { CalmSpan, Surge, Vanguard };

export const STAGE_S0 = {
  seconds: 180,
  family: "rainbow",
  /** Packs already in the corridor when the fight starts (front row at z m; size × the mode and k): the guns have work at once. */
  vanguard: [
    { z: 18, n: 6 },
    { z: 26, n: 7 },
    { z: 34, n: 8 },
    { z: 42, n: 8 },
    { z: 50, n: 8 },
  ] as readonly Vanguard[],
  calm: [
    { from: 0, to: 20, rate: 3.25 },
    { from: 20, to: 60, rate: 2.85 },
    { from: 60, to: 90, rate: 2.95 },
    { from: 90, to: 165, rate: 3.1 },
    { from: 165, to: 180, rate: 2.95 },
  ] as readonly CalmSpan[],
  /** A run's tide: every calm and lull rate × a seeded draw in [lo, hi]. */
  tide: [0.9, 1.1] as readonly [number, number],
  /** A surge's strength in a run: its rate × a seeded draw in [lo, hi]; with `storm.chance` a "dữ dội" one from `storm.spread`. */
  surgeSpread: [0.6, 1.1] as readonly [number, number],
  storm: { chance: 0.27, spread: [1.9, 2.6] as readonly [number, number] },
  surges: [
    { at: 55, seconds: 8, rate: 8.5, lull: 4, lullRate: 1.5 },
    { at: 145, seconds: 9, rate: 8.5, lull: 4, lullRate: 1.5 },
  ] as readonly Surge[],
} as const;

/** The trial as a stage: Xung and Tia on two bays, S0's scouts (15 % of a pack's members from 12 s). */
export const TRIAL: Stage = {
  id: "s0",
  chapter: 0,
  index: 0,
  name: "Trận thử",
  objective: { kind: "hold", seconds: STAGE_S0.seconds },
  hazard: null,
  learn: "standard",
  vanguard: STAGE_S0.vanguard,
  calm: STAGE_S0.calm,
  tide: STAGE_S0.tide,
  surgeSpread: STAGE_S0.surgeSpread,
  storm: STAGE_S0.storm,
  surges: STAGE_S0.surges,
  scouts: { share: 0.15, from: 12 },
  packs: {},
  teach: [],
  kit: { bays: 2, levels: [1, 1], armour: 100 },
  pace: PACE_HOLD,
};

/** The calm rate of `calm` at `seconds` (the last span holds past the end). */
export function calmIn(calm: readonly CalmSpan[], seconds: number): number {
  for (const span of calm) if (seconds < span.to) return span.rate;
  return calm[calm.length - 1]!.rate;
}

/** The trial's calm rate at `seconds`. */
export const calmAt = (seconds: number): number => calmIn(STAGE_S0.calm, seconds);

/** Foes a stage spawns at pace 1 with its surges and lulls where its table puts them, over `seconds`. */
export function stageFoes(stage: Pick<Stage, "calm" | "surges"> = TRIAL, seconds = Infinity): number {
  let total = 0;
  for (const span of stage.calm) total += (Math.min(span.to, seconds) - Math.min(span.from, seconds)) * span.rate;
  for (const surge of stage.surges) {
    if (surge.at >= seconds) continue;
    total += surge.seconds * (surge.rate - calmIn(stage.calm, surge.at));
    total += surge.lull * (surge.lullRate - calmIn(stage.calm, surge.at + surge.seconds));
  }
  return total;
}
