/**
 * Tia (S0): a 1.4 m wide ray from the muzzle, `length` m long, aimed at
 * (beamX, muzzleZ + length); beamX, the aim on that far line, sweeps at
 * `sweep` m/s from the densest cluster toward the next (fire control,
 * S0's and on duty: ./aim.ts). Every pulse burns every foe the ray crosses;
 * with nothing in its reach it goes out and keeps the rest of its time. S1: a
 * shield across the ray takes the pulse (Tia burns it) and hides what stands
 * behind it until it breaks.
 */
import { CRIT_MULT, TIA } from "../../content/guns";
import { FIELD, SCOUT } from "../../content/rules";
import { EV, FLAG } from "../events";
import { MAX_RADIUS, colOf, rowOf } from "../hits";
import { RADIUS } from "../move";
import { damageFoe, damageShield, shootDown } from "../projectiles";
import { firing, nextMagazine } from "../weapons";
import type { World } from "../world";
import { beamEnd, densest, sweepOf } from "./aim";

const END = new Float64Array(2);

function goOut(w: World, bay: number): void {
  const G = w.guns;
  G.beamOn[bay] = 0;
  beamEnd(G.beamX[bay]!, END);
  w.events.push(w.tick, EV.beamEnd, bay, 0, END[0]!, END[1]!, 0, 0, G.beamX[bay]!, 0);
}

export function fireTia(w: World, bay: number, dt: number): void {
  const G = w.guns;
  const i = firing(bay);
  if (G.beamOn[bay] === 0) {
    const start = densest(w, 0, -1);
    if (start !== start) return; // nobody in reach: the magazine waits
    G.beamOn[bay] = 1;
    G.beamX[bay] = start;
    const next = densest(w, start, TIA.away);
    G.beamTo[bay] = next === next ? next : start;
    G.beamPulse[bay] = 0;
    beamEnd(start, END);
    w.events.push(w.tick, EV.beamStart, bay, 0, END[0]!, END[1]!, 0, 0, start, G.perfect[i] === 1 ? FLAG.perfect : 0);
  }
  const gap = G.beamTo[bay]! - G.beamX[bay]!;
  const move = sweepOf(w, bay, dt);
  if (Math.abs(gap) <= move) {
    G.beamX[bay] = G.beamTo[bay]!;
    const next = densest(w, G.beamX[bay]!, TIA.away);
    if (next === next) G.beamTo[bay] = next;
  } else G.beamX[bay] = G.beamX[bay]! + (gap > 0 ? move : -move);
  G.beamPulse[bay] = G.beamPulse[bay]! - dt;
  while (G.beamPulse[bay]! <= 0) {
    G.beamPulse[bay] = G.beamPulse[bay]! + TIA.pulse / G.rate[i]!;
    // Nothing left in reach: the ray goes out and keeps its time for the next foes.
    const any = densest(w, 0, -1);
    if (any !== any) {
      goOut(w, bay);
      return;
    }
    pulse(w, bay, gap >= 0 ? 1 : -1);
  }
  G.left[bay] = G.left[bay]! - dt;
  if (G.left[bay]! <= 0) {
    if (nextMagazine(G, bay)) G.left[bay] = G.left[bay]! + TIA.seconds;
    else {
      G.left[bay] = 0;
      goOut(w, bay);
    }
  }
}

/** Along the ray (0 … length) and off it (signed, m) of point (x, z), into `out`. */
function rayCoords(ux: number, uz: number, x: number, z: number, out: Float64Array): void {
  const dz = z - FIELD.muzzleZ;
  out[0] = x * ux + dz * uz;
  out[1] = x * uz - dz * ux;
}
const RAY = new Float64Array(2);

/** The nearest shield across the ray (its slot into `wall`), as a distance along it; Infinity when none. */
let wall = -1;
function shieldAlong(w: World, ux: number, uz: number, half: number): number {
  const H = w.shields;
  wall = -1;
  let best = Infinity;
  for (let k = 0; k < H.top; k += 1) {
    if (H.alive[k] === 0) continue;
    rayCoords(ux, uz, H.x[k]!, H.z[k]!, RAY);
    // The wall's half-width across the ray (it faces the ship, so it spans the ray).
    if (RAY[0]! < 0 || RAY[0]! > TIA.length || Math.abs(RAY[1]!) > half + 1.2) continue;
    if (RAY[0]! < best) {
      best = RAY[0]!;
      wall = k;
    }
  }
  return best;
}

/** One Tia pulse: every foe and scout shot the ray crosses (up to a shield, which takes it). */
function pulse(w: World, bay: number, side: number): void {
  const F = w.foes;
  const S = w.shots;
  const G = w.guns;
  const grid = w.grid;
  const i = firing(bay);
  const half = TIA.width / 2;
  const L = TIA.length;
  const norm = Math.sqrt(G.beamX[bay]! * G.beamX[bay]! + L * L);
  const ux = G.beamX[bay]! / norm;
  const uz = L / norm;
  const ex = ux * L;
  const ez = FIELD.muzzleZ + uz * L;
  const perfect = G.perfect[i] === 1 ? FLAG.perfect : 0;
  w.events.push(w.tick, EV.beamPulse, bay, 0, ex, ez, side, 0, G.beamX[bay]!, perfect);
  // The blow: along the ray and toward the sweep.
  const bx = ux * 0.6 + uz * side * 0.8;
  const bz = uz * 0.6 - ux * side * 0.8;
  wall = -1;
  const stop = w.shields.count > 0 ? shieldAlong(w, ux, uz, half) : Infinity;
  const pad = half + MAX_RADIUS;
  const c0 = colOf((ex < 0 ? ex : 0) - pad);
  const c1 = colOf((ex > 0 ? ex : 0) + pad);
  const r0 = rowOf(FIELD.muzzleZ - pad);
  const r1 = rowOf(ez + pad);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const cell = row * FIELD.cols + col;
      for (let s = grid.head[cell]!; s >= 0; s = grid.next[s]!) {
        if (F.alive[s] === 0) continue;
        burn(w, s, ux, uz, half, L, stop, i, perfect, bx, bz);
      }
      for (let s = grid.shotHead[cell]!; s >= 0; s = grid.shotNext[s]!) {
        if (S.alive[s] === 0) continue;
        rayCoords(ux, uz, S.x[s]!, S.z[s]!, RAY);
        if (RAY[0]! >= 0 && RAY[0]! <= L + SCOUT.shotRadius && RAY[0]! <= stop && Math.abs(RAY[1]!) <= half + SCOUT.shotRadius) shootDown(w, s, FLAG.tia);
      }
    }
  }
  for (let k = 0; k < grid.bigCount; k += 1) {
    const s = grid.big[k]!;
    if (F.alive[s] === 1) burn(w, s, ux, uz, half, L, stop, i, perfect, bx, bz);
  }
  if (wall >= 0 && stop !== Infinity && w.shields.alive[wall] === 1) {
    const crit = w.rng.crit.chance(G.crit[i]!);
    damageShield(w, wall, TIA.damage * G.damage[i]! * (crit ? CRIT_MULT : 1), bx, bz, ux * stop, FIELD.muzzleZ + uz * stop);
  }
}

function burn(w: World, s: number, ux: number, uz: number, half: number, L: number, stop: number, i: number, perfect: number, bx: number, bz: number): void {
  const F = w.foes;
  const G = w.guns;
  const r = RADIUS[F.kind[s]!]!;
  rayCoords(ux, uz, F.x[s]!, F.z[s]!, RAY);
  if (RAY[0]! < 0 || RAY[0]! > L + r || Math.abs(RAY[1]!) > half + r) return;
  // Behind a shield across the ray: hidden from it.
  if (RAY[0]! - r > stop) return;
  const crit = w.rng.crit.chance(G.crit[i]!);
  const damage = TIA.damage * G.damage[i]! * (crit ? CRIT_MULT : 1);
  damageFoe(w, s, damage, FLAG.tia | perfect | (crit ? FLAG.crit : 0), bx, bz, G.pierce[i]!);
}
