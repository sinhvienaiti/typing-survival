/**
 * The crowd's movement: a flow field over the grid's cells (straight down
 * the corridor, bending toward the ship as foes come near, away from the
 * walls), the press (full stride far out, slowing as foes close on the
 * ship), a slight sideways wobble, scouts holding a firing line, Trâu and
 * Đầu Đàn charging the last metres, Khiên turning its shield toward the
 * ship, and a push apart (by mass: a Trâu shoulders the swarm aside)
 * through the grid and the big list, so a horde packs into a wall without
 * overlapping. A foe that reaches the bottom line hurts the ship and goes.
 */
import { CHARGE, FOES, KIND, SHIELD } from "../content/foes";
import { FIELD, FLOW, PRESS, SCOUT } from "../content/rules";
import { EV, FLAG } from "./events";
import { MAX_RADIUS, colOf, rowOf } from "./hits";
import { noteLeak } from "./stage";
import { MARK } from "./stores";
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
const MASS: readonly number[] = FOES.map((foe) => foe.mass);

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
  const calm = w.objective.retreat >= 0;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const kind = F.kind[s]!;
    const spec = FOES[kind]!;
    const x = F.x[s]!;
    const z = F.z[s]!;
    if (calm) {
      // The horde pulls back: it stops pressing and drifts toward the gate while it fades.
      F.vx[s] = 0;
      F.vz[s] = 1.2;
      F.z[s] = z + F.vz[s]! * dt;
      continue;
    }
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
      let speed = spec.speed * w.scales.speed * pressAt(z);
      if (kind >= KIND.brute) speed = gait(F, s, kind, z, speed);
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

/** S1 kinds' stride: Trâu and Đầu Đàn charge inside CHARGE.z, a Khiên whose shield broke hurries. */
function gait(F: World["foes"], s: number, kind: number, z: number, speed: number): number {
  if (kind === KIND.brute || kind === KIND.leader) {
    if (z < CHARGE.z) {
      F.mark[s] = F.mark[s]! | MARK.charging;
      return speed * CHARGE.speed;
    }
    return speed;
  }
  if (kind === KIND.shield && (F.mark[s]! & MARK.shieldGone) !== 0) return speed * SHIELD.broken;
  return speed;
}

function fireAtShip(w: World, x: number, z: number): void {
  const dx = -x;
  const dz = FIELD.muzzleZ - 0.6 - z;
  const length = Math.sqrt(dx * dx + dz * dz) || 1;
  const s = w.shots.add(x, z - 0.6, (dx / length) * SCOUT.shotSpeed, (dz / length) * SCOUT.shotSpeed, SCOUT.shotLife);
  if (s >= 0) w.events.push(w.tick, EV.foeShot, s, w.shots.id[s]!, x, z, dx / length, dz / length, 0, 0);
}

/**
 * Shields follow their bearers: the centre SHIELD.ahead in front, the face
 * turning toward the ship at most SHIELD.turn rad/s (a small-angle step,
 * renormalised: no trigonometry). A bearer gone takes its shield with it.
 */
export function moveShields(w: World, dt: number): void {
  const H = w.shields;
  const F = w.foes;
  const most = SHIELD.turn * dt;
  for (let k = 0; k < H.top; k += 1) {
    if (H.alive[k] === 0) continue;
    const s = H.owner[k]!;
    if (F.alive[s] === 0 || F.id[s] !== H.ownerId[k]) {
      H.remove(k);
      continue;
    }
    let tx = -F.x[s]!;
    let tz = FIELD.muzzleZ - F.z[s]!;
    const length = Math.sqrt(tx * tx + tz * tz) || 1;
    tx /= length;
    tz /= length;
    let nx = H.nx[k]!;
    let nz = H.nz[k]!;
    const dot = nx * tx + nz * tz;
    if (dot >= 1 - (most * most) / 2) {
      nx = tx;
      nz = tz;
    } else {
      const side = nx * tz - nz * tx >= 0 ? 1 : -1;
      nx -= nz * side * most;
      nz += H.nx[k]! * side * most;
      const n = Math.sqrt(nx * nx + nz * nz) || 1;
      nx /= n;
      nz /= n;
    }
    H.nx[k] = nx;
    H.nz[k] = nz;
    H.x[k] = F.x[s]! + nx * SHIELD.ahead;
    H.z[k] = F.z[s]! + nz * SHIELD.ahead;
  }
}

/**
 * Pairs closer than their radii are pushed apart by the overlap, shared by
 * mass (half each when equal), in slot order (a fixed order: deterministic);
 * the grid gives small neighbours, the big list the big ones; then the
 * bottom line.
 */
export function separate(w: World): void {
  const F = w.foes;
  const G = w.grid;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const rs = RADIUS[F.kind[s]!]!;
    // R1 review: at least 2 × MAX_RADIUS, so a neighbour pushed earlier in this pass (the grid holds where it was) is still seen.
    const reach = Math.max(MAX_RADIUS * 2, rs + MAX_RADIUS);
    const c0 = colOf(F.x[s]! - reach);
    const c1 = colOf(F.x[s]! + reach);
    const r0 = rowOf(F.z[s]! - reach);
    const r1 = rowOf(F.z[s]! + reach);
    for (let row = r0; row <= r1; row += 1) {
      for (let col = c0; col <= c1; col += 1) {
        for (let n = G.head[row * cols + col]!; n >= 0; n = G.next[n]!) if (n > s && F.alive[n] === 1) push(F, s, n, rs);
      }
    }
    for (let k = 0; k < G.bigCount; k += 1) {
      const n = G.big[k]!;
      if (n > s && F.alive[n] === 1) push(F, s, n, rs);
    }
  }
  const calm = w.objective.retreat >= 0;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const edge = halfW - wall - RADIUS[F.kind[s]!]!;
    if (F.x[s]! > edge) F.x[s] = edge;
    else if (F.x[s]! < -edge) F.x[s] = -edge;
    // Holding scouts are not pushed back toward the gate by those behind them.
    if (F.z[s]! > gateZ + 12) F.z[s] = gateZ + 12;
    if (F.z[s]! <= bottomZ && !calm) breach(w, s);
  }
}

function push(F: World["foes"], s: number, n: number, rs: number): void {
  const dx = F.x[n]! - F.x[s]!;
  const dz = F.z[n]! - F.z[s]!;
  const min = (rs + RADIUS[F.kind[n]!]!) * 0.92;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return;
  const d = Math.sqrt(d2);
  // Exactly on top of each other: apart across the corridor by slot order.
  const ux = d > 1e-6 ? dx / d : 1;
  const uz = d > 1e-6 ? dz / d : 0;
  const ms = MASS[F.kind[s]!]!;
  const mn = MASS[F.kind[n]!]!;
  if (ms === mn) {
    const push = (min - d) * 0.5;
    F.x[s] = F.x[s]! - ux * push;
    F.z[s] = F.z[s]! - uz * push;
    F.x[n] = F.x[n]! + ux * push;
    F.z[n] = F.z[n]! + uz * push;
    return;
  }
  const overlap = min - d;
  const share = mn / (ms + mn);
  F.x[s] = F.x[s]! - ux * overlap * share;
  F.z[s] = F.z[s]! - uz * overlap * share;
  F.x[n] = F.x[n]! + ux * overlap * (1 - share);
  F.z[n] = F.z[n]! + uz * overlap * (1 - share);
}

function breach(w: World, s: number): void {
  const F = w.foes;
  const kind = F.kind[s]!;
  const damage = FOES[kind]!.breach;
  w.hp = Math.max(0, w.hp - damage);
  w.stats.breaches += 1;
  w.stats.damageTaken += damage;
  w.stats.breachDamage += damage;
  w.events.push(w.tick, EV.breach, s, F.id[s]!, F.x[s]!, F.z[s]!, 0, -1, damage, kind === KIND.scout ? FLAG.scout : kind === KIND.leader || kind === KIND.brute ? FLAG.big : 0);
  if (kind === KIND.leader) noteLeak(w);
  F.remove(s);
}
