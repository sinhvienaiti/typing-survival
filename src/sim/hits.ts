/**
 * The spatial grid (2 m cells over the corridor) for foes and scout shots,
 * rebuilt every step after movement; rounds, the Tia column and the crowd's
 * spacing ask it instead of testing every pair.
 */
import { FIELD } from "../content/rules";
import type { Foes, Shots } from "./stores";

const { cell, cols, rows, halfW, minZ } = FIELD;
export const MAX_RADIUS = 0.8;
/** Where along its segment the last first-hit query touched (0 … 1). */
export let hitT = 0;

export class Grid {
  readonly head = new Int32Array(cols * rows);
  readonly shotHead = new Int32Array(cols * rows);
  readonly next: Int32Array;
  readonly shotNext: Int32Array;

  constructor(foes: number, shots: number) {
    this.next = new Int32Array(foes);
    this.shotNext = new Int32Array(shots);
  }

  build(foes: Foes, shots: Shots): void {
    this.head.fill(-1);
    this.shotHead.fill(-1);
    for (let s = 0; s < foes.top; s += 1) {
      if (foes.alive[s] === 0) continue;
      const c = cellOf(foes.x[s]!, foes.z[s]!);
      this.next[s] = this.head[c]!;
      this.head[c] = s;
    }
    for (let s = 0; s < shots.top; s += 1) {
      if (shots.alive[s] === 0) continue;
      const c = cellOf(shots.x[s]!, shots.z[s]!);
      this.shotNext[s] = this.shotHead[c]!;
      this.shotHead[c] = s;
    }
  }
}

export const colOf = (x: number): number => clampInt(Math.floor((x + halfW) / cell), cols - 1);
export const rowOf = (z: number): number => clampInt(Math.floor((z - minZ) / cell), rows - 1);
export const cellOf = (x: number, z: number): number => rowOf(z) * cols + colOf(x);

function clampInt(value: number, max: number): number {
  return value < 0 ? 0 : value > max ? max : value;
}

/**
 * Where along p0 → p1 (0 … 1) a point of radius r first comes within reach,
 * or −1: the closest approach of the segment to the centre.
 */
export function segmentHit(x0: number, z0: number, x1: number, z1: number, cx: number, cz: number, r: number): number {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((cx - x0) * dx + (cz - z0) * dz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = x0 + dx * t - cx;
  const ez = z0 + dz * t - cz;
  return ex * ex + ez * ez <= r * r ? t : -1;
}

/**
 * The first live foe a segment touches (its radius plus `pad`), or −1; on a
 * tie the lower slot. `radius` is the per-kind body radius.
 */
export function firstFoeHit(grid: Grid, foes: Foes, radius: readonly number[], x0: number, z0: number, x1: number, z1: number, pad: number): number {
  const reach = MAX_RADIUS + pad;
  const c0 = colOf((x0 < x1 ? x0 : x1) - reach);
  const c1 = colOf((x0 > x1 ? x0 : x1) + reach);
  const r0 = rowOf((z0 < z1 ? z0 : z1) - reach);
  const r1 = rowOf((z0 > z1 ? z0 : z1) + reach);
  let best = -1;
  let bestT = 2;
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      for (let s = grid.head[row * cols + col]!; s >= 0; s = grid.next[s]!) {
        if (foes.alive[s] === 0) continue;
        const t = segmentHit(x0, z0, x1, z1, foes.x[s]!, foes.z[s]!, radius[foes.kind[s]!]! + pad);
        if (t >= 0 && (t < bestT || (t === bestT && s < best))) {
          bestT = t;
          best = s;
        }
      }
    }
  }
  hitT = bestT;
  return best;
}

/** The first live shot a segment touches, or −1. */
export function firstShotHit(grid: Grid, shots: Shots, x0: number, z0: number, x1: number, z1: number, reach: number): number {
  const c0 = colOf((x0 < x1 ? x0 : x1) - reach);
  const c1 = colOf((x0 > x1 ? x0 : x1) + reach);
  const r0 = rowOf((z0 < z1 ? z0 : z1) - reach);
  const r1 = rowOf((z0 > z1 ? z0 : z1) + reach);
  let best = -1;
  let bestT = 2;
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      for (let s = grid.shotHead[row * cols + col]!; s >= 0; s = grid.shotNext[s]!) {
        if (shots.alive[s] === 0) continue;
        const t = segmentHit(x0, z0, x1, z1, shots.x[s]!, shots.z[s]!, reach);
        if (t >= 0 && (t < bestT || (t === bestT && s < best))) {
          bestT = t;
          best = s;
        }
      }
    }
  }
  hitT = bestT;
  return best;
}
