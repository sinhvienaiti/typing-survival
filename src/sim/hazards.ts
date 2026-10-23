/**
 * Hazards (docs/BUILD_S1.md §7.2). R1 has Vết nứt: every period from its
 * first time, a crack glows on the left or right wall (RIFT.warn s ahead,
 * a telegraph), then pours RIFT.foes mines (× the mode, k and ρ, 4–12) over
 * RIFT.spill s, inside the guns' reach. The times are planned when the world
 * is made and moved later (never earlier) so the attention budget holds
 * (§7.6): one telegraph at a time, starts ATTENTION.gap s apart, no burst in
 * a surge's first seconds or inside a storm surge. Every move is an EV.plan.
 * Side and depth come from the props stream: the rest of the run's draws
 * never shift.
 */
import { FOES, KIND } from "../content/foes";
import { FIELD } from "../content/rules";
import { ATTENTION, RIFT, stageSeconds } from "../content/stage-rules";
import { EV, TELEGRAPH } from "./events";
import type { World } from "./world";

const MAX_RIFTS = 16;

export function createHazards() {
  return {
    /** Burst times (world seconds), the wall (−1 left, 1 right), the crack's depth. */
    at: new Float64Array(MAX_RIFTS),
    side: new Int8Array(MAX_RIFTS),
    z: new Float64Array(MAX_RIFTS),
    count: 0,
    next: 0,
    /** 0 waiting, 1 warning, 2 pouring. */
    state: 0,
    left: 0,
    owed: 0,
    total: 0,
  };
}

export type Hazards = ReturnType<typeof createHazards>;

/** Seconds the rift bursting at `at` (index `own`) must move later to keep the budget; 0 when it fits. */
function riftShift(w: World, own: number, at: number): number {
  const P = w.plan;
  const warn = at - RIFT.warn;
  let shift = 0;
  const need = (value: number) => {
    if (value > shift) shift = value;
  };
  for (let i = 0; i < P.surgeAt.length; i += 1) {
    const start = P.surgeAt[i]!;
    if (Math.abs(warn - start) < ATTENTION.gap) need(start + ATTENTION.gap - warn);
    if (at >= start && at < start + ATTENTION.surgeQuiet) need(start + ATTENTION.surgeQuiet - at);
    if (P.storm[i] === 1 && at >= start && at <= P.surgeEnd[i]!) need(P.surgeEnd[i]! + 0.5 - at);
  }
  const hunt = w.stage.objective.kind === "hunt" ? w.stage.objective.leaders : [];
  for (const time of hunt) if (Math.abs(warn - time) < ATTENTION.gap) need(time + ATTENTION.gap - warn);
  const H = w.hazards;
  for (let j = 0; j < H.count; j += 1) {
    if (j === own) continue;
    const other = H.at[j]! - RIFT.warn;
    if (Math.abs(warn - other) < ATTENTION.gap) need(other + ATTENTION.gap - warn);
  }
  return shift;
}

/** Plans the stage's rifts (at world creation, after the plan's draws). */
export function planHazards(w: World): void {
  const hazard = w.stage.hazard;
  if (hazard === null) return;
  const H = w.hazards;
  const end = stageSeconds(w.stage) - RIFT.spill - 2;
  for (let at = hazard.first; at < end && H.count < MAX_RIFTS; at += hazard.period) {
    const k = H.count++;
    H.at[k] = at;
    H.side[k] = w.rng.props.float() < 0.5 ? -1 : 1;
    H.z[k] = RIFT.zMin + w.rng.props.float() * (RIFT.zMax - RIFT.zMin);
  }
  for (let k = 0; k < H.count; k += 1) {
    let moved = 0;
    for (let pass = 0; pass < 8; pass += 1) {
      const shift = riftShift(w, k, H.at[k]!);
      if (shift <= 0) break;
      H.at[k] = H.at[k]! + shift;
      moved += shift;
    }
    if (moved > 0) w.events.push(w.tick, EV.plan, TELEGRAPH.rift, k, 0, H.at[k]!, 0, 0, moved, 0);
  }
  // A rift moved past the end does not come.
  while (H.count > 0 && H.at[H.count - 1]! >= end) H.count -= 1;
}

/** True when a surge from `start` to `end` would meet a rift's warning or burst still to come (the director then leaves it). */
export function clashesWithHazard(w: World, start: number, end: number, storm: boolean): boolean {
  const H = w.hazards;
  for (let k = H.next; k < H.count; k += 1) {
    const at = H.at[k]!;
    if (Math.abs(start - (at - RIFT.warn)) < ATTENTION.gap) return true;
    if (at >= start && at < start + ATTENTION.surgeQuiet) return true;
    if (storm && at >= start && at <= end) return true;
  }
  return false;
}

/** Warns, opens and pours the next rift. */
export function hazardStep(w: World, dt: number): void {
  const H = w.hazards;
  if (H.next >= H.count || w.objective.retreat >= 0) return;
  const k = H.next;
  if (H.state === 0) {
    if (w.time < H.at[k]! - RIFT.warn) return;
    // The director may have moved a surge since the plan: check once more.
    const shift = riftShift(w, k, H.at[k]!);
    if (shift > 0) {
      H.at[k] = H.at[k]! + shift;
      w.events.push(w.tick, EV.plan, TELEGRAPH.rift, k, 0, H.at[k]!, 0, 0, shift, 0);
      return;
    }
    H.state = 1;
    w.events.push(w.tick, EV.telegraph, TELEGRAPH.rift, k, wallX(H.side[k]!), H.z[k]!, H.side[k]!, 0, RIFT.warn, 0);
    return;
  }
  if (H.state === 1) {
    if (w.time < H.at[k]!) return;
    H.state = 2;
    H.total = Math.max(RIFT.min, Math.min(RIFT.max, Math.round(RIFT.foes * w.scales.rate)));
    H.left = H.total;
    H.owed = 1;
    w.events.push(w.tick, EV.rift, H.side[k]! > 0 ? 1 : 0, k, wallX(H.side[k]!), H.z[k]!, 0, 0, H.total, 0);
  }
  H.owed += (H.total / RIFT.spill) * dt;
  const spec = FOES[KIND.mine]!;
  while (H.owed >= 1 && H.left > 0) {
    H.owed -= 1;
    H.left -= 1;
    if (w.foes.count >= w.foeCap) continue;
    const x = wallX(H.side[k]!) - H.side[k]! * w.rng.props.float() * 0.8;
    const z = H.z[k]! + (w.rng.props.float() - 0.5) * 2.4;
    if (w.foes.add(KIND.mine, x, z, spec.hp, w.rng.props.float(), 0, w.time) >= 0) w.spawn.spawned += 1;
  }
  if (H.left <= 0) {
    H.state = 0;
    H.next += 1;
  }
}

/** Where a crack's foes come out on a wall (just inside it). */
const wallX = (side: number): number => side * (FIELD.halfW - FIELD.wall - 0.7);
