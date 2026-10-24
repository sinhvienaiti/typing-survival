/**
 * Fire control of Tia and Ray (moved out of tia.ts and ray.ts for the line
 * budget, docs/BUILD_S1.md §13): where each aims, in S0's way and on duty.
 * Tia buckets foes by the aim that would cross them and burns the densest
 * strip; on duty (a kit without Xung, TIA_DUTY) its strips are even in angle
 * out to ≈ 84°, foes at the line and holding scouts weigh more, it sweeps
 * faster and turns to the heaviest strip every few ticks. Ray picks a
 * priority foe, else the busiest line; on duty (a kit with no near gun,
 * RAY_DUTY) the busiest line at the bottom comes first.
 */
import { KIND } from "../../content/foes";
import { RAY, RAY_DUTY, TIA, TIA_DUTY } from "../../content/guns";
import { FIELD } from "../../content/rules";
import { RADIUS } from "../move";
import type { World } from "../world";
import { nearEdge } from "./xung";

/**
 * Foes are bucketed by the aim that would cross them (their x seen from the
 * muzzle, on the far line), up to ±AIM_MAX (≈ 72° off the corridor's axis).
 */
const AIM_MAX = 3 * TIA.length;
const STRIPS = Math.ceil((AIM_MAX * 2) / TIA.strip);
const narrowWeight = new Float64Array(STRIPS);
/**
 * On duty Tia turns to ≈ 84° (tan 9.5): the line's flanks, where S0's ±72°
 * never reached. Its strips are then even in angle, by tan(θ/2) = aim / (L +
 * √(aim² + L²)) (no trigonometry), so the flanks are not spread thin.
 */
const WIDE_MAX = 9.5 * TIA.length;
const HALF_MAX = 0.9;
const HALF_STEP = 0.05;
const WIDE_STRIPS = Math.ceil((HALF_MAX * 2) / HALF_STEP);
const wideWeight = new Float64Array(WIDE_STRIPS);
const halfOf = (aim: number): number => aim / (TIA.length + Math.sqrt(aim * aim + TIA.length * TIA.length));
/** The aim of a half-angle tangent t: L · 2t / (1 − t²). */
const aimOfHalf = (t: number): number => (TIA.length * 2 * t) / (1 - t * t);

/** The aim (far-line x) whose ray crosses (x, z), or NaN when the point is out of the ray's reach (`r`: its radius; `wide`: on duty). */
export function aimOf(x: number, z: number, r: number, wide = false): number {
  const dz = z - FIELD.muzzleZ;
  const reach = TIA.length + r;
  if (dz < 0.3 || x * x + dz * dz > reach * reach) return NaN;
  const aim = (x * TIA.length) / dz;
  const max = wide ? WIDE_MAX : AIM_MAX;
  return aim < -max ? -max : aim > max ? max : aim;
}

/** The far end of the ray aimed at `aim` (sim x, z), into `out`. */
export function beamEnd(aim: number, out: Float64Array): Float64Array {
  const length = Math.sqrt(aim * aim + TIA.length * TIA.length);
  out[0] = (aim / length) * TIA.length;
  out[1] = FIELD.muzzleZ + (TIA.length / length) * TIA.length;
  return out;
}

/**
 * The centre of the densest strip of aims (foes near the ship weigh more;
 * on duty, foes at the line and holding scouts much more), at least `away`
 * from `from`; NaN when no foe is in reach.
 */
export function densest(w: World, from: number, away: number): number {
  const F = w.foes;
  const duty = w.guns.tiaDuty === 1;
  if (duty) return densestWide(w, from, away);
  const weight = narrowWeight;
  weight.fill(0);
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const aim = aimOf(F.x[s]!, F.z[s]!, RADIUS[F.kind[s]!]!);
    if (aim !== aim) continue;
    const strip = Math.min(STRIPS - 1, Math.max(0, Math.floor((aim + AIM_MAX) / TIA.strip)));
    weight[strip] = weight[strip]! + 1 + (FIELD.gateZ - F.z[s]!) / 30;
  }
  let best = -1;
  for (let strip = 0; strip < STRIPS; strip += 1) {
    const x = -AIM_MAX + (strip + 0.5) * TIA.strip;
    if (weight[strip] === 0 || Math.abs(x - from) < away) continue;
    if (best < 0 || weight[strip]! > weight[best]!) best = strip;
  }
  return best < 0 ? NaN : -AIM_MAX + (best + 0.5) * TIA.strip;
}

/** densest on duty: strips even in angle, foes at the line and holding scouts weigh more (TIA_DUTY). */
function densestWide(w: World, from: number, away: number): number {
  const F = w.foes;
  wideWeight.fill(0);
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const aim = aimOf(F.x[s]!, F.z[s]!, RADIUS[F.kind[s]!]!, true);
    if (aim !== aim) continue;
    const strip = Math.min(WIDE_STRIPS - 1, Math.max(0, Math.floor((halfOf(aim) + HALF_MAX) / HALF_STEP)));
    const close = (TIA_DUTY.zone - F.z[s]!) / (TIA_DUTY.zone - FIELD.bottomZ);
    let value = 1 + (FIELD.gateZ - F.z[s]!) / 30;
    if (close > 0) value += TIA_DUTY.near * (close < 1 ? close : 1);
    if (F.kind[s] === KIND.scout && F.state[s] === 1) value += TIA_DUTY.scout;
    wideWeight[strip] = wideWeight[strip]! + value;
  }
  const at = halfOf(from);
  const apart = away / (2 * TIA.length);
  let best = -1;
  for (let strip = 0; strip < WIDE_STRIPS; strip += 1) {
    const t = -HALF_MAX + (strip + 0.5) * HALF_STEP;
    if (wideWeight[strip] === 0 || Math.abs(t - at) < apart) continue;
    if (best < 0 || wideWeight[strip]! > wideWeight[best]!) best = strip;
  }
  return best < 0 ? NaN : aimOfHalf(-HALF_MAX + (best + 0.5) * HALF_STEP);
}

/**
 * How far bay `bay`'s ray sweeps this tick. On duty the sweep is faster and
 * keeps its angular pace at wide aims (the far line stretches there), and
 * every few ticks it turns to the heaviest strip (a foe at the line cannot
 * wait for the sweep).
 */
export function sweepOf(w: World, bay: number, dt: number): number {
  const G = w.guns;
  if (G.tiaDuty !== 1) return TIA.sweep * dt;
  const aim = G.beamX[bay]! / TIA.length;
  const move = TIA_DUTY.sweep * TIA.sweep * dt * (1 + aim * aim);
  if (w.tick % TIA_DUTY.retarget === 0) {
    const best = densest(w, NaN, -1);
    if (best === best) G.beamTo[bay] = best;
  }
  return move;
}

/** Target classes: who Ray picks first (0: none of these, the busiest line instead). */
const CLASS: Readonly<Record<number, number>> = { [KIND.leader]: 4, [KIND.brute]: 3, [KIND.shield]: 2, [KIND.scout]: 1 };
/** Lines through the crowd: slopes (x per metre of depth) in buckets of SLOPE wide, ±SLOPE_MAX. */
const SLOPE = 0.06;
const SLOPE_MAX = 3;
const BUCKETS = Math.ceil((SLOPE_MAX * 2) / SLOPE);
const lines = new Float64Array(BUCKETS);

/** The foe Ray would pick now (−1: none of the priority kinds in reach). */
export function rayTarget(w: World): number {
  const F = w.foes;
  const mz = FIELD.muzzleZ;
  let best = -1;
  let bestClass = 0;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0 || nearEdge(w, s) > mz + RAY.range || F.z[s]! < mz + 0.5) continue;
    const c = CLASS[F.kind[s]!] ?? 0;
    if (c === 0) continue;
    if (c > bestClass || (c === bestClass && F.z[s]! < F.z[best]!)) {
      best = s;
      bestClass = c;
    }
  }
  return best;
}

/** The slope (x per metre of depth) of the busiest line through foes between `from` and `to` m from the muzzle; NaN when none. */
function busiestLine(w: World, from: number, to: number): number {
  const F = w.foes;
  const mz = FIELD.muzzleZ;
  lines.fill(0);
  let any = false;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0 || F.z[s]! > mz + to || F.z[s]! < mz + from) continue;
    const slope = F.x[s]! / (F.z[s]! - mz);
    if (slope <= -SLOPE_MAX || slope >= SLOPE_MAX) continue;
    const k = Math.floor((slope + SLOPE_MAX) / SLOPE);
    lines[k] = lines[k]! + 1;
    if (k > 0) lines[k - 1] = lines[k - 1]! + 0.5;
    if (k + 1 < BUCKETS) lines[k + 1] = lines[k + 1]! + 0.5;
    any = true;
  }
  if (!any) return NaN;
  let best = 0;
  for (let k = 1; k < BUCKETS; k += 1) if (lines[k]! > lines[best]!) best = k;
  return -SLOPE_MAX + (best + 0.5) * SLOPE;
}

/** Aims Ray's bay `bay`: at a priority target, else along the busiest line; false when nobody is in reach. */
export function aimRay(w: World, bay: number): boolean {
  const F = w.foes;
  const G = w.guns;
  const mz = FIELD.muzzleZ;
  const target = rayTarget(w);
  let dx = 0;
  let dz = 1;
  // On duty (a kit with no near gun): the line at the bottom first, a leader alone before it.
  const duty = G.rayDuty === 1 && (target < 0 || F.kind[target] !== KIND.leader) ? busiestLine(w, 1, RAY_DUTY.zone) : NaN;
  if (duty === duty) {
    dx = duty;
    G.target[bay] = -1;
  } else if (target >= 0) {
    dx = F.x[target]!;
    dz = F.z[target]! - mz;
    G.target[bay] = target;
    G.targetId[bay] = F.id[target]!;
  } else {
    const slope = busiestLine(w, 1, RAY.range);
    if (slope !== slope) return false;
    dx = slope;
    G.target[bay] = -1;
  }
  const length = Math.sqrt(dx * dx + dz * dz) || 1;
  G.aimX[bay] = dx / length;
  G.aimZ[bay] = dz / length;
  return true;
}
