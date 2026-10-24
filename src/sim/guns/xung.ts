/**
 * Xung (S0): 24 rounds a magazine in 2.4 s at the foe nearest the bottom in
 * a 50° cone round its aim, a scout shot close to the ship first; a big foe
 * is in range once its body reaches the range. Rounds fly (sim/projectiles.ts):
 * a shield's face stops them, so Xung passes over a foe whose line is
 * shielded (S1: no magazine wasted on a wall).
 */
import { CRIT_MULT, XUNG } from "../../content/guns";
import { FOES } from "../../content/foes";
import { FIELD } from "../../content/rules";
import { EV, FLAG } from "../events";
import { firstShieldHit } from "../projectiles";
import { ROUND } from "../stores";
import { firing, nextMagazine, xungRounds } from "../weapons";
import type { World } from "../world";

export function fireXung(w: World, bay: number, dt: number): void {
  const G = w.guns;
  const rounds = xungRounds(w.stage);
  G.cooldown[bay] = G.cooldown[bay]! - dt;
  while (G.cooldown[bay]! <= 0 && G.left[bay]! > 0) {
    if (!shoot(w, bay)) {
      G.cooldown[bay] = 0;
      return;
    }
    G.left[bay] = G.left[bay]! - 1;
    G.cooldown[bay] = G.cooldown[bay]! + XUNG.seconds / rounds / G.rate[firing(bay)]!;
    if (G.left[bay] === 0 && nextMagazine(G, bay)) G.left[bay] = rounds;
  }
  if (G.mags[bay] === 0) G.cooldown[bay] = 0;
}

/** A foe's depth for range checks: its centre, or its near edge when big. */
export function nearEdge(w: World, s: number): number {
  const spec = FOES[w.foes.kind[s]!]!;
  return spec.radius > 0.8 ? w.foes.z[s]! - spec.radius : w.foes.z[s]!;
}

/** True when a round from the muzzle to foe `s` would meet a shield's face first. */
function shielded(w: World, s: number): boolean {
  const mz = FIELD.muzzleZ;
  const t = firstShieldHit(w, 0, mz, w.foes.x[s]!, w.foes.z[s]!);
  return t < 1;
}

/** One round at the best target; false when there is none (the gun holds its fire). */
function shoot(w: World, bay: number): boolean {
  const F = w.foes;
  const S = w.shots;
  const G = w.guns;
  const mz = FIELD.muzzleZ;
  const i = firing(bay);
  const aimX = G.aimX[bay]!;
  const aimZ = G.aimZ[bay]!;
  const walls = w.shields.count > 0;
  let target = -1;
  let tx = 0;
  let tz = 0;
  let vx = 0;
  let vz = 0;
  // A scout shot close to the ship comes first.
  let lowest = mz + XUNG.shotGuard;
  for (let s = 0; s < S.top; s += 1) {
    if (S.alive[s] === 0 || S.marked[s] === 1 || S.z[s]! >= lowest) continue;
    lowest = S.z[s]!;
    target = -2 - s;
  }
  if (target <= -2) {
    const s = -2 - target;
    tx = S.x[s]!;
    tz = S.z[s]!;
    vx = S.vx[s]!;
    vz = S.vz[s]!;
  } else {
    let inCone = false;
    lowest = Infinity;
    for (let s = 0; s < F.top; s += 1) {
      if (F.alive[s] === 0 || nearEdge(w, s) > mz + XUNG.range || F.hp[s]! - F.incoming[s]! <= 0) continue;
      const dx = F.x[s]!;
      const dz = F.z[s]! - mz;
      const cone = dx * aimX + dz * aimZ >= XUNG.coneCos * Math.sqrt(dx * dx + dz * dz);
      if ((cone && !inCone) || (cone === inCone && F.z[s]! < lowest)) {
        if (walls && shielded(w, s)) continue;
        inCone = cone;
        lowest = F.z[s]!;
        target = s;
      }
    }
    if (target < 0) return false;
    tx = F.x[target]!;
    tz = F.z[target]!;
    vx = F.vx[target]!;
    vz = F.vz[target]!;
  }
  // Lead the target by the round's flight time.
  let dx = tx;
  let dz = tz - mz;
  const t = Math.sqrt(dx * dx + dz * dz) / XUNG.speed;
  dx += vx * t;
  dz += vz * t;
  let length = Math.sqrt(dx * dx + dz * dz) || 1;
  dx /= length;
  dz /= length;
  G.aimX[bay] = dx;
  G.aimZ[bay] = dz;
  // Spread: a little off the line, across it.
  const off = (w.rng.combat.float() * 2 - 1) * XUNG.spread;
  dx -= dz * off;
  dz += G.aimX[bay]! * off;
  length = Math.sqrt(dx * dx + dz * dz);
  dx /= length;
  dz /= length;
  const crit = w.rng.crit.chance(G.crit[i]!);
  const damage = XUNG.damage * G.damage[i]! * (crit ? CRIT_MULT : 1);
  const flags = (crit ? FLAG.crit : 0) | (G.perfect[i] === 1 ? FLAG.perfect : 0);
  const id = target >= 0 ? F.id[target]! : S.id[-2 - target]!;
  const b = w.bullets.count < w.bulletCap ? w.bullets.add(dx * 0.9, mz + dz * 0.9, dx * XUNG.speed, dz * XUNG.speed, damage, XUNG.life, flags, target, id, G.pierce[i]!, ROUND.xung, bay) : -1;
  if (b < 0) return true;
  if (target >= 0) F.incoming[target] = F.incoming[target]! + damage;
  else S.marked[-2 - target] = 1;
  w.events.push(w.tick, EV.shot, bay, b, 0, mz, dx, dz, damage, flags);
  return true;
}
