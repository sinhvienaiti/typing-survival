/**
 * Tán (docs/BUILD_S1.md §5.1): 6 volleys a magazine in 2 s, each 7 pellets
 * fanned ±18° (TAN_FAN, written out) toward the foe nearest the muzzle whose
 * body is within 7 m of it (a scattergun's reach is a radius), the fan's
 * axis pulled to the middle of the foes it covers; each pellet
 * that hits pushes its foe back (never a heavy one: sim/projectiles.ts).
 * Pellets are short-lived rounds: a shield's face stops them. With nobody
 * in reach the magazine waits.
 */
import { CRIT_MULT, TAN, TAN_FAN } from "../../content/guns";
import { FOES } from "../../content/foes";
import { FIELD } from "../../content/rules";
import { EV, FLAG } from "../events";
import { ROUND } from "../stores";
import { firing, nextMagazine } from "../weapons";
import type { World } from "../world";

/** Pellets fly a little past the range so the fan's edges reach its depth too. */
const LIFE = (TAN.range + 1.5) / TAN.speed;
/** cos 18°: the fan's half-angle. */
const FAN_COS = TAN_FAN[0]![0];

export function fireTan(w: World, bay: number, dt: number): void {
  const G = w.guns;
  G.cooldown[bay] = G.cooldown[bay]! - dt;
  while (G.cooldown[bay]! <= 0 && G.left[bay]! > 0) {
    if (!volley(w, bay)) {
      G.cooldown[bay] = 0;
      return;
    }
    G.left[bay] = G.left[bay]! - 1;
    G.cooldown[bay] = G.cooldown[bay]! + TAN.seconds / TAN.volleys / G.rate[firing(bay)]!;
    if (G.left[bay] === 0 && nextMagazine(G, bay)) G.left[bay] = TAN.volleys;
  }
  if (G.mags[bay] === 0) G.cooldown[bay] = 0;
}

/** The foe nearest the muzzle with its body within reach (−1 none). */
export function tanTarget(w: World): number {
  const F = w.foes;
  const mz = FIELD.muzzleZ;
  let best = -1;
  let bestD = Infinity;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const dx = F.x[s]!;
    const dz = F.z[s]! - mz;
    if (dz < 0) continue;
    const reach = TAN.range + FOES[F.kind[s]!]!.radius;
    const d = dx * dx + dz * dz;
    if (d > reach * reach) continue;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function volley(w: World, bay: number): boolean {
  const F = w.foes;
  const G = w.guns;
  const target = tanTarget(w);
  if (target < 0) return false;
  const mz = FIELD.muzzleZ;
  const i = firing(bay);
  let ax = F.x[target]!;
  let az = F.z[target]! - mz;
  let length = Math.sqrt(ax * ax + az * az) || 1;
  ax /= length;
  az /= length;
  // The fan's axis: the mean direction of the foes in reach inside the fan round the nearest.
  let sx = 0;
  let sz = 0;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const dx = F.x[s]!;
    const dz = F.z[s]! - mz;
    if (dz < 0) continue;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d > TAN.range + FOES[F.kind[s]!]!.radius || (dx * ax + dz * az) / d < FAN_COS) continue;
    sx += dx / d;
    sz += dz / d;
  }
  length = Math.sqrt(sx * sx + sz * sz);
  if (length > 0) {
    ax = sx / length;
    az = sz / length;
  }
  G.aimX[bay] = ax;
  G.aimZ[bay] = az;
  const perfect = G.perfect[i] === 1 ? FLAG.perfect : 0;
  let fired = 0;
  for (const [c, s] of TAN_FAN) {
    if (w.bullets.count >= w.bulletCap) break;
    const dx = ax * c - az * s;
    const dz = ax * s + az * c;
    const crit = w.rng.crit.chance(G.crit[i]!);
    const damage = TAN.damage * G.damage[i]! * (crit ? CRIT_MULT : 1);
    if (w.bullets.add(dx * 0.9, mz + dz * 0.9, dx * TAN.speed, dz * TAN.speed, damage, LIFE, FLAG.tan | perfect | (crit ? FLAG.crit : 0), -1, 0, G.pierce[i]!, ROUND.pellet, bay) >= 0) fired += 1;
  }
  w.events.push(w.tick, EV.volley, bay, 0, 0, mz, ax, az, fired, perfect);
  return true;
}
