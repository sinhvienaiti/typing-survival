/**
 * Gate G3m (docs/BUILD_S1.md §5.2): the counter table measured. One small
 * scene per row: the row's foes walk in as they would in a fight, each gun
 * alone on a bay, fed the same letters (a heavy gun's words a letter longer:
 * tests/survival/arena.ts), four magazines in five clean (the standard
 * typist). A cell's cost is the seconds to clear the row (§5.2) plus the
 * armour the scene takes on the way, a point a second (the near zone's
 * drain, breaches, scout shots: what a slow or blind gun lets through);
 * foes still standing at the end count as breaking through, and so do
 * those crossing a far row's line (Bầy giữa sân: thinned before 8 m).
 * ● within 1.25× the row's best, ✕ from 2×, ○ between.
 */
import { FOES, KIND } from "../../src/content/foes";
import { COUNTER_ROWS, GUN_IDS, type CounterRow, type GunId } from "../../src/content/guns";
import { FIELD, SCOUT, SPAWN } from "../../src/content/rules";
import type { World } from "../../src/sim/world";
import { arena, cleared, feeder, lost, place, runUntil } from "./arena";

const mz = FIELD.muzzleZ;

/** A scene: its length cap, its foes; `line` (m from the muzzle): foes that cross it alive count as through (the row is about holding them beyond it). */
type Scene = { readonly seconds: number; readonly line?: number; readonly setup: (w: World, seed: number) => void };

/** A small deterministic jitter per foe from the seed (the scenes vary a little between seeds). */
const jitter = (seed: number, i: number): number => (((seed * 7919 + i * 104729) % 1000) / 1000 - 0.5) * 0.4;

/** A pack of n mines in a block 5 wide at the spawn's spacing, its front row at z. */
function pack(w: World, seed: number, p: number, x: number, z: number, n: number): void {
  for (let i = 0; i < n; i += 1) place(w, KIND.mine, x + ((i % 5) - 2) * SPAWN.spacing + jitter(seed, p * 20 + i) * 0.5, z + Math.floor(i / 5) * SPAWN.spacing + jitter(seed, p * 20 + i + 9) * 0.5);
}

export const SCENES: Readonly<Record<CounterRow, Scene>> = {
  /** Three packs of 10 mines (blocks at the spawn's spacing) walking in from 13–22 m: thinned before they come within 8 m. */
  swarmFar: {
    seconds: 40,
    line: 8,
    setup: (w, seed) => {
      for (let p = 0; p < 3; p += 1) pack(w, seed, p, -6 + p * 6, mz + 13 + p * 4.5, 10);
    },
  },
  /**
   * A stream of 40 mines at the line as in a fight (R1 review: a wall standing
   * at 5–8 m flattered a gun that only burns what stands still): five packs
   * of 8 spread across the corridor, fronts at 9–21 m, pressing in one after
   * another.
   */
  swarmNear: {
    seconds: 40,
    setup: (w, seed) => {
      for (let p = 0; p < 5; p += 1) pack(w, seed, p, [-6, 5, -2, 7, 1][p]! + jitter(seed, p + 40) * 3, mz + 9 + p * 3, 8);
    },
  },
  /** 6 scouts walking in from 12–16 m to their firing line (6–9 m), shooting there as in a fight. */
  scout: {
    seconds: 40,
    setup: (w, seed) => {
      for (let i = 0; i < 6; i += 1) {
        const s = place(w, KIND.scout, -7.5 + i * 3 + jitter(seed, i), mz + 12 + (i % 3) * 2 + jitter(seed, i + 9));
        w.foes.holdZ[s] = SCOUT.holdMin + ((i * 37) % 30) / 10;
        w.foes.timer[s] = SCOUT.fireEvery * (0.3 + 0.1 * (i % 4));
        w.foes.wait[s] = SCOUT.holdS;
      }
    },
  },
  /** 4 Trâu walking in from 14–18 m. */
  armoured: {
    seconds: 60,
    setup: (w, seed) => {
      for (let i = 0; i < 4; i += 1) place(w, KIND.brute, -4.5 + i * 3 + jitter(seed, i), mz + 14 + (i % 2) * 4 + jitter(seed, i + 7));
    },
  },
  /** Two Khiên packs (a bearer and its wedge of 6 mines each) walking in from 14 and 18 m. */
  shield: {
    seconds: 40,
    setup: (w, seed) => {
      for (let p = 0; p < 2; p += 1) {
        const x = (p === 0 ? -4 : 4) + jitter(seed, p + 3) * 2;
        const z = mz + 14 + p * 4;
        place(w, KIND.shield, x, z);
        for (let i = 0; i < 6; i += 1) place(w, KIND.mine, x - 1.6 + (i % 3) * 1.6, z + 1.4 + Math.floor(i / 3) * 1.3);
      }
    },
  },
  /** Two Tách packs (5 each, as they spawn) walking in from 6 and 10 m, and the shards they break into. */
  splitter: {
    seconds: 40,
    setup: (w, seed) => {
      for (let p = 0; p < 2; p += 1) {
        for (let i = 0; i < 5; i += 1) place(w, KIND.splitter, (p === 0 ? -4 : 4) + ((i % 3) - 1) * 1.5 + jitter(seed, p * 9 + i) * 0.5, mz + 6 + p * 4 + Math.floor(i / 3) * 1.5);
      }
    },
  },
};

/** What the foes still standing would take: each breaks through. */
function standing(w: World): number {
  let total = 0;
  for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1) total += FOES[w.foes.kind[s]!]!.breach;
  return total;
}

/** One cell's cost (seconds to clear + armour taken), averaged over `seeds`. */
export function measureCell(row: CounterRow, gun: GunId, seeds: readonly number[] = [1, 2, 3], clean: (n: number) => boolean = (n) => n % 5 !== 4): number {
  const scene = SCENES[row];
  let total = 0;
  for (const seed of seeds) {
    const w = arena([gun], { seed });
    scene.setup(w, seed);
    let through = 0;
    const line = scene.line === undefined ? -Infinity : FIELD.muzzleZ + scene.line;
    const done = (world: World): boolean => {
      for (let s = 0; s < world.foes.top; s += 1) {
        if (world.foes.alive[s] === 1 && world.foes.z[s]! < line) {
          through += FOES[world.foes.kind[s]!]!.breach;
          world.foes.remove(s);
        }
      }
      return cleared(world);
    };
    const time = runUntil(w, feeder(clean), done, scene.seconds);
    total += (time === Infinity ? scene.seconds : time) + lost(w) + standing(w) + through;
  }
  return total / seeds.length;
}

/** The gate's seeds (G3m in tests/guns.test.ts and the balance report): 16, as 8 left cells near a threshold flipping with the seed set (R1 review). */
export const COUNTER_SEEDS: readonly number[] = Array.from({ length: 16 }, (_, i) => i + 1);
/** A cost within this share of a threshold may carry either mark (a near tie is not a measurement). */
export const COUNTER_MARGIN = 0.08;

/** No floor: every cost has its seconds. */
export const COST_FLOOR = 0;

/** The marks a cost ratio (cost / the row's best) allows: one, or two within COUNTER_MARGIN of the 1.25× or 2× threshold. */
export function marksFor(ratio: number): number[] {
  const near = (threshold: number) => Math.abs(ratio - threshold) <= threshold * COUNTER_MARGIN;
  if (near(1.25)) return [2, 1];
  if (near(2)) return [1, 0];
  return [ratio >= 2 ? 0 : ratio <= 1.25 ? 2 : 1];
}

/** The measured table: per row, per gun, its cost, its mark (2 ●, 1 ○, 0 ✕) and the marks it allows. */
export function measureCounters(seeds: readonly number[] = COUNTER_SEEDS): Record<CounterRow, { cost: number[]; mark: number[]; allowed: number[][] }> {
  const out = {} as Record<CounterRow, { cost: number[]; mark: number[]; allowed: number[][] }>;
  for (const row of COUNTER_ROWS) {
    const cost = GUN_IDS.map((gun) => measureCell(row, gun, seeds));
    const best = Math.min(...cost) + COST_FLOOR;
    const mark = cost.map((value) => (value + COST_FLOOR >= 2 * best ? 0 : value + COST_FLOOR <= 1.25 * best ? 2 : 1));
    out[row] = { cost, mark, allowed: cost.map((value) => marksFor((value + COST_FLOOR) / best)) };
  }
  return out;
}

/** COUNTERS against a measurement: every cell's mark among those its cost allows. */
export const countersMatch = (measured: ReturnType<typeof measureCounters>, table: Readonly<Record<CounterRow, readonly number[]>>): boolean =>
  COUNTER_ROWS.every((row) => measured[row].allowed.every((marks, gun) => marks.includes(table[row][gun]!)));
