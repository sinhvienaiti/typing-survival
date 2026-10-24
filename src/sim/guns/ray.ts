/**
 * Ray (docs/BUILD_S1.md §5.1): 3 shots a magazine in 2.4 s. Each shot
 * charges RAY.charge s on its target (an EV.charge the view and the bots can
 * read), then fires at once along a 30 m line: it pierces up to 6 foes and
 * shields in order of distance, each one passed taking ×0.85 off the next;
 * armour counts ×0.25 (×0.19 for a clean word); a shield on the line breaks
 * at once. Target: Đầu Đàn, then Trâu, Khiên, a scout, else the line through
 * the most foes. Nobody in reach: the magazine waits.
 */
import { FOES, KIND } from "../../content/foes";
import { CRIT_MULT, RAY, RAY_DUTY } from "../../content/guns";
import { FIELD } from "../../content/rules";
import { EV, FLAG } from "../events";
import { collectNear, nearList } from "../hits";
import { damageFoe, damageShield } from "../projectiles";
import { firing, nextMagazine } from "../weapons";
import type { World } from "../world";
import { nearEdge } from "./xung";

/** Target classes: who Ray picks first (0: none of these, the busiest line instead). */
const CLASS: Readonly<Record<number, number>> = { [KIND.leader]: 4, [KIND.brute]: 3, [KIND.shield]: 2, [KIND.scout]: 1 };
/** Lines through the crowd: slopes (x per metre of depth) in buckets of SLOPE wide, ±SLOPE_MAX. */
const SLOPE = 0.06;
const SLOPE_MAX = 3;
const BUCKETS = Math.ceil((SLOPE_MAX * 2) / SLOPE);
const lines = new Float64Array(BUCKETS);
const MAX_CANDIDATES = 160;
const keys = new Float64Array(MAX_CANDIDATES);
const ids = new Int32Array(MAX_CANDIDATES);
let candidates = 0;

export function fireRay(w: World, bay: number, dt: number): void {
  const G = w.guns;
  if (G.charge[bay]! > 0) {
    G.charge[bay] = G.charge[bay]! - dt;
    if (G.charge[bay]! > 0) return;
    G.charge[bay] = 0;
    shoot(w, bay);
    G.left[bay] = G.left[bay]! - 1;
    G.cooldown[bay] = Math.max(0, RAY.seconds / RAY.shots / G.rate[firing(bay)]! - RAY.charge);
    if (G.left[bay]! <= 0 && nextMagazine(G, bay)) G.left[bay] = RAY.shots;
    return;
  }
  G.cooldown[bay] = G.cooldown[bay]! - dt;
  if (G.cooldown[bay]! > 0 || G.left[bay]! <= 0) return;
  if (!aim(w, bay)) {
    G.cooldown[bay] = 0;
    return;
  }
  G.charge[bay] = RAY.charge;
  const ex = G.aimX[bay]! * RAY.range;
  const ez = FIELD.muzzleZ + G.aimZ[bay]! * RAY.range;
  w.events.push(w.tick, EV.charge, bay, G.target[bay]!, ex, ez, G.aimX[bay]!, G.aimZ[bay]!, RAY.charge, G.perfect[firing(bay)] === 1 ? FLAG.perfect : 0);
}

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

/** Aims bay `bay`: at a priority target, else along the busiest line; false when nobody is in reach. */
function aim(w: World, bay: number): boolean {
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

function insert(key: number, id: number): void {
  if (candidates >= MAX_CANDIDATES) return;
  let k = candidates++;
  while (k > 0 && keys[k - 1]! > key) {
    keys[k] = keys[k - 1]!;
    ids[k] = ids[k - 1]!;
    k -= 1;
  }
  keys[k] = key;
  ids[k] = id;
}

/** The shot: along the aim (re-aimed at a target still alive), up to RAY.pierce foes and shields. */
function shoot(w: World, bay: number): void {
  const F = w.foes;
  const G = w.guns;
  const H = w.shields;
  const mz = FIELD.muzzleZ;
  const i = firing(bay);
  const t = G.target[bay]!;
  if (t >= 0 && F.alive[t] === 1 && F.id[t] === G.targetId[bay]) {
    const dx = F.x[t]!;
    const dz = F.z[t]! - mz;
    const length = Math.sqrt(dx * dx + dz * dz) || 1;
    G.aimX[bay] = dx / length;
    G.aimZ[bay] = dz / length;
  }
  const ux = G.aimX[bay]!;
  const uz = G.aimZ[bay]!;
  const ex = ux * RAY.range;
  const ez = mz + uz * RAY.range;
  candidates = 0;
  const near = collectNear(w.grid, F, Math.min(0, ex) - 1.5, mz, Math.max(0, ex) + 1.5, ez + 1.5);
  for (let n = 0; n < near; n += 1) {
    const s = nearList[n]!;
    const r = FOES[F.kind[s]!]!.radius;
    const px = F.x[s]!;
    const pz = F.z[s]! - mz;
    const along = px * ux + pz * uz;
    const off = px * uz - pz * ux;
    if (along < -r || along > RAY.range + r || Math.abs(off) > r + RAY.width) continue;
    insert(along - r, s);
  }
  for (let k = 0; k < H.top; k += 1) {
    if (H.alive[k] === 0) continue;
    const px = H.x[k]!;
    const pz = H.z[k]! - mz;
    const along = px * ux + pz * uz;
    const off = px * uz - pz * ux;
    if (along < 0 || along > RAY.range || Math.abs(off) > 1.3) continue;
    insert(along - 0.05, -1 - k);
  }
  const crit = w.rng.crit.chance(G.crit[i]!);
  const flags = FLAG.ray | (crit ? FLAG.crit : 0) | (G.perfect[i] === 1 ? FLAG.perfect : 0);
  let factor = 1;
  let struck = 0;
  for (let c = 0; c < candidates && struck < RAY.pierce; c += 1) {
    const id = ids[c]!;
    if (id < 0) {
      const k = -1 - id;
      if (H.alive[k] === 0) continue;
      damageShield(w, k, H.hp[k]! + 1, ux, uz, H.x[k]!, H.z[k]!);
    } else {
      if (F.alive[id] === 0) continue;
      damageFoe(w, id, RAY.damage * G.damage[i]! * (crit ? CRIT_MULT : 1) * factor, flags, ux, uz, G.pierce[i]!);
    }
    struck += 1;
    factor *= RAY.falloff;
  }
  w.events.push(w.tick, EV.rail, bay, struck, ex, Math.min(ez, FIELD.gateZ + 2), ux, uz, struck, flags);
}
