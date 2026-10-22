/**
 * The crowd's movement: a flow field over the grid's cells (straight down
 * the corridor, bending toward the ship as foes come near, away from the
 * walls), the press (full stride far out, slowing as foes close on the
 * ship), a slight sideways wobble, scouts holding a firing line, and a
 * push apart through the grid so a horde packs into a wall without
 * overlapping. A foe that reaches the bottom line hurts the ship and goes.
 */
import { FIELD, FLOW, FOES, KIND, PRESS, SCOUT } from "../content/rules";
import { EV, FLAG } from "./events";
import { MAX_RADIUS, colOf, rowOf } from "./hits";
import type { World } from "./world";

const { cell, cols, rows, halfW, minZ, wall, gateZ, bottomZ } = FIELD;

/** The flow field: a unit direction per cell, built once. */
export const FIELD_X = new Float64Array(cols * rows);
export const FIELD_Z = new Float64Array(cols * rows);
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < cols; col += 1) {
    const x = -halfW + (col + 0.5) * cell;
    const z = minZ + (row + 0.5) * cell;
    const near = Math.max(0, Math.min(1, (FLOW.from - z) / FLOW.from));
    const fx = (-x / halfW) * FLOW.pull * near;
    const length = Math.sqrt(fx * fx + 1);
    FIELD_X[row * cols + col] = fx / length;
    FIELD_Z[row * cols + col] = -1 / length;
  }
}
export const RADIUS: readonly number[] = FOES.map((foe) => foe.radius);

/** The share of its speed a foe walks at depth z (PRESS): `slow` near the ship, 1 far out, smooth between. */
export function pressAt(z: number): number {
  const t = (z - PRESS.near) / (PRESS.far - PRESS.near);
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  return PRESS.slow + (1 - PRESS.slow) * k;
}

/** sin(2π p) without trigonometry (deterministic everywhere): Bhaskara's parabola pair. */
export function wave(p: number): number {
  const u = (p - Math.floor(p)) * 2 - 1;
  return -4 * u * (1 - Math.abs(u));
}

export function moveFoes(w: World, dt: number): void {
  const F = w.foes;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const kind = F.kind[s]!;
    const spec = FOES[kind]!;
    const x = F.x[s]!;
    const z = F.z[s]!;
    if (kind === KIND.scout && F.state[s] === 0 && z <= F.holdZ[s]!) F.state[s] = 1;
    if (F.state[s] === 1) {
      F.vx[s] = wave(F.phase[s]! + w.time * 0.25) * 0.25;
      F.vz[s] = 0;
      F.timer[s] = F.timer[s]! - dt;
      F.wait[s] = F.wait[s]! - dt;
      if (F.timer[s]! <= 0) {
        F.timer[s] = F.timer[s]! + SCOUT.fireEvery;
        fireAtShip(w, x, z);
      }
      if (F.wait[s]! <= 0) F.state[s] = 2;
    } else {
      const c = rowOf(z) * cols + colOf(x);
      const sway = wave(F.phase[s]! + w.time * spec.wobbleHz) * spec.wobble;
      const speed = spec.speed * pressAt(z);
      F.vx[s] = FIELD_X[c]! * speed + sway;
      F.vz[s] = FIELD_Z[c]! * speed;
    }
    let nx = x + F.vx[s]! * dt;
    const r = spec.radius;
    const edge = halfW - wall - r;
    if (nx > edge) nx = edge;
    else if (nx < -edge) nx = -edge;
    F.x[s] = nx;
    F.z[s] = z + F.vz[s]! * dt;
  }
}

function fireAtShip(w: World, x: number, z: number): void {
  const dx = -x;
  const dz = FIELD.muzzleZ - 0.6 - z;
  const length = Math.sqrt(dx * dx + dz * dz) || 1;
  const s = w.shots.add(x, z - 0.6, (dx / length) * SCOUT.shotSpeed, (dz / length) * SCOUT.shotSpeed, SCOUT.shotLife);
  if (s >= 0) w.events.push(w.tick, EV.foeShot, s, w.shots.id[s]!, x, z, dx / length, dz / length, 0, 0);
}

/**
 * Pairs closer than their radii are pushed apart half the overlap each, in
 * slot order (a fixed order: deterministic); then the bottom line.
 */
export function separate(w: World): void {
  const F = w.foes;
  const G = w.grid;
  const reach = MAX_RADIUS * 2;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const rs = RADIUS[F.kind[s]!]!;
    const c0 = colOf(F.x[s]! - reach);
    const c1 = colOf(F.x[s]! + reach);
    const r0 = rowOf(F.z[s]! - reach);
    const r1 = rowOf(F.z[s]! + reach);
    for (let row = r0; row <= r1; row += 1) {
      for (let col = c0; col <= c1; col += 1) {
        for (let n = G.head[row * cols + col]!; n >= 0; n = G.next[n]!) {
          if (n <= s || F.alive[n] === 0) continue;
          const dx = F.x[n]! - F.x[s]!;
          const dz = F.z[n]! - F.z[s]!;
          const min = (rs + RADIUS[F.kind[n]!]!) * 0.92;
          const d2 = dx * dx + dz * dz;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2);
          // Exactly on top of each other: apart across the corridor by slot order.
          const ux = d > 1e-6 ? dx / d : 1;
          const uz = d > 1e-6 ? dz / d : 0;
          const push = (min - d) * 0.5;
          F.x[s] = F.x[s]! - ux * push;
          F.z[s] = F.z[s]! - uz * push;
          F.x[n] = F.x[n]! + ux * push;
          F.z[n] = F.z[n]! + uz * push;
        }
      }
    }
  }
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const edge = halfW - wall - RADIUS[F.kind[s]!]!;
    if (F.x[s]! > edge) F.x[s] = edge;
    else if (F.x[s]! < -edge) F.x[s] = -edge;
    // Holding scouts are not pushed back toward the gate by those behind them.
    if (F.z[s]! > gateZ + 12) F.z[s] = gateZ + 12;
    if (F.z[s]! <= bottomZ) breach(w, s);
  }
}

function breach(w: World, s: number): void {
  const F = w.foes;
  const kind = F.kind[s]!;
  const damage = FOES[kind]!.breach;
  w.hp = Math.max(0, w.hp - damage);
  w.stats.breaches += 1;
  w.stats.damageTaken += damage;
  w.events.push(w.tick, EV.breach, s, F.id[s]!, F.x[s]!, F.z[s]!, 0, -1, damage, kind === KIND.scout ? FLAG.scout : 0);
  F.remove(s);
}

