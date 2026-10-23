/**
 * The stage's timeline in a run (content/stage-rules.ts): when each surge and
 * its lull start and end (world seconds). It starts as the stage table says;
 * the pace director may move a surge or a lull that has not begun yet by a
 * few seconds (BALANCE.md §4.2), never one under way, and never onto a
 * hazard's warning (the attention budget, docs/BUILD_S1.md §7.6). The spawn
 * rate at a moment reads it: a surge, its lull, or the calm table, times
 * the run's scales (mode, pace k, the stage's ρ).
 */
import type { RngStream } from "../kit/platform/rng";
import { HAZARD_HEAVY, type Stage } from "../content/stage-rules";
import { calmIn } from "../content/stage-s0";
import { EV, TELEGRAPH } from "./events";
import { clashesWithHazard } from "./hazards";
import type { World } from "./world";

/** A moved surge still starts at least this long after now (s). */
const NOTICE = 1;

/**
 * A run's draws (seeded, so a replay has them): the tide, × every calm and
 * lull rate (the stage's `tide`), and each surge's strength, × its rate
 * (`surgeSpread`), a "dữ dội" one at the storm chance (halved by a heavy
 * hazard). No two runs press the same: some are rough.
 */
export function createPlan(rng: RngStream, stage: Stage) {
  const surges = stage.surges;
  const n = surges.length;
  const [t0, t1] = stage.tide;
  const tide = Math.round((t0 + (t1 - t0) * rng.float()) * 1000) / 1000;
  const chance = stage.storm.chance * (stage.hazard !== null && HAZARD_HEAVY[stage.hazard.kind] ? 0.5 : 1);
  const plan = { tide, surgeAt: new Float64Array(n), surgeEnd: new Float64Array(n), lullEnd: new Float64Array(n), strength: new Float64Array(n), storm: new Uint8Array(n), peak: 0 };
  surges.forEach((surge, i) => {
    plan.surgeAt[i] = surge.at;
    plan.surgeEnd[i] = surge.at + surge.seconds;
    plan.lullEnd[i] = surge.at + surge.seconds + surge.lull;
    const storm = rng.float() < chance;
    const [lo, hi] = storm ? stage.storm.spread : stage.surgeSpread;
    plan.strength[i] = Math.round((lo + (hi - lo) * rng.float()) * 1000) / 1000;
    plan.storm[i] = storm ? 1 : 0;
  });
  return plan;
}

export type Plan = ReturnType<typeof createPlan>;

/** Foes a second now, before the director's spawn scale. */
export function rateAt(w: World): number {
  const t = w.time;
  const P = w.plan;
  const surges = w.stage.surges;
  for (let i = 0; i < surges.length; i += 1) {
    if (t >= P.surgeAt[i]! && t < P.surgeEnd[i]!) return surges[i]!.rate * P.strength[i]! * w.scales.surge;
    if (t >= P.surgeEnd[i]! && t < P.lullEnd[i]!) return surges[i]!.lullRate * P.tide * w.scales.rate;
  }
  return calmIn(w.stage.calm, t) * P.tide * w.scales.rate;
}

/** The surge under way (1, 2 …), or 0. */
export function peakAt(w: World): number {
  const t = w.time;
  for (let i = 0; i < w.plan.surgeAt.length; i += 1) if (t >= w.plan.surgeAt[i]! && t < w.plan.surgeEnd[i]!) return i + 1;
  return 0;
}

/** A surge starting is a telegraph (the "ĐỈNH TRÀN" banner): an event once, as it begins. */
export function planStep(w: World): void {
  const peak = peakAt(w);
  if (peak === w.plan.peak) return;
  w.plan.peak = peak;
  if (peak > 0) w.events.push(w.tick, EV.telegraph, TELEGRAPH.surge, peak, 0, 0, 0, 0, 0, w.plan.storm[peak - 1]!);
}

/** The wave now: 1 until the first lull ends, 2 until the second does, then 3. */
export function waveAt(w: World): number {
  let wave = 1;
  for (let i = 0; i < w.plan.lullEnd.length; i += 1) if (w.time >= w.plan.lullEnd[i]!) wave += 1;
  return wave;
}

/** Moves the next surge that has not begun by `ticks` (− earlier); returns the seconds it moved (0: none could). */
export function movePeak(w: World, ticks: number): number {
  const P = w.plan;
  const t = w.time;
  const n = P.surgeAt.length;
  for (let i = 0; i < n; i += 1) {
    if (P.surgeAt[i]! <= t) continue;
    const earliest = Math.max(t + NOTICE, i > 0 ? P.lullEnd[i - 1]! : 0);
    const latest = Math.min(w.seconds - (P.surgeEnd[i]! - P.surgeAt[i]!), i + 1 < n ? P.surgeAt[i + 1]! - (P.lullEnd[i]! - P.surgeAt[i]!) : w.seconds);
    const at = Math.max(earliest, Math.min(latest, P.surgeAt[i]! + ticks / 60));
    // Never onto a hazard's warning or burst (the attention budget): then it stays.
    if (at !== P.surgeAt[i] && clashesWithHazard(w, at, at + (P.surgeEnd[i]! - P.surgeAt[i]!), P.storm[i] === 1)) return 0;
    const shift = at - P.surgeAt[i]!;
    P.surgeAt[i] = at;
    P.surgeEnd[i] = P.surgeEnd[i]! + shift;
    P.lullEnd[i] = P.lullEnd[i]! + shift;
    return shift;
  }
  return 0;
}

/** Lengthens (+) or shortens (−) the lull under way or the next one by `ticks`; returns the seconds it changed. */
export function moveLull(w: World, ticks: number): number {
  const P = w.plan;
  const t = w.time;
  const n = P.surgeAt.length;
  for (let i = 0; i < n; i += 1) {
    if (P.lullEnd[i]! <= t) continue;
    const earliest = Math.max(P.surgeEnd[i]!, t);
    const latest = i + 1 < n ? P.surgeAt[i + 1]! : w.seconds;
    const end = Math.max(earliest, Math.min(latest, P.lullEnd[i]! + ticks / 60));
    const shift = end - P.lullEnd[i]!;
    P.lullEnd[i] = end;
    return shift;
  }
  return 0;
}
