/**
 * The feel pass's numbers for the guns, hits and kills (docs/FEEL_PASS_S1.md
 * §4), kept apart from three so tests/gun-feel.test.ts can hold them: the
 * game's feedback profile (white flash and numbers by tier), the path that
 * leaves the real muzzle and joins the sim's within 3 m, the light pool's
 * priorities, the kill chunks per foe. View only: nothing here reaches the sim.
 */
import { SHIP, TIERS, type FeedbackProfile } from "../kit/feedback";

/** §4.4: the white flash 2–6 frames by tier, numbers pop 1.25–1.9 and live 0.55–1.2 s; stops, shake and sparks stay the kit's ship profile. */
const FLASH = [0, 2, 3, 4, 5, 6] as const;
const POP = [1, 1.25, 1.4, 1.6, 1.7, 1.9] as const;
const LIFE = [0, 0.55, 0.7, 0.9, 1, 1.2] as const;
export const FEEL: FeedbackProfile = {
  ...SHIP,
  tiers: TIERS.map((row, t) => ({ ...row, flashFrames: FLASH[t]!, number: row.number === null ? null : { ...row.number, pop: POP[t]!, life: LIFE[t]! } })),
};

/** A damage number's base size: a 30th of the view's height, 18–36 px (720p 24, 1080p 36). A killing blow's is 15 % larger. */
export const numberFont = (height: number): number => Math.max(18, Math.min(36, height / 30));
export const KILL_NUMBER = 1.15;

/** §4.1: the drawn path joins the sim's over its first JOIN m (the real muzzle's offset × this). */
export const JOIN = 3;
export const joinWeight = (travelled: number): number => Math.max(0, 1 - travelled / JOIN);

/** The guns' light pool sizes per tier (§1.5): Low none, Medium 2, High 4, Ultra 6; the deck shader always has room for 6. */
export const LIGHTS = { low: 0, medium: 2, high: 4, ultra: 6 } as const;
export const DECK_LIGHTS = 6;

/**
 * A flash of light per shot (§4.2): priority (a new light takes the slot with
 * the lowest priority × light left), intensity, seconds to fade, the pool's
 * radius on the deck (m). Burst Pháo Sao 5 > Ray 4 > Tán 3 = Xung's first 3 >
 * Tia 2 > a Xung round 1. Tia's and Ray's sit 1.5 m out along their line
 * (beams.ts), off the hull (§12).
 */
export const LIGHT = {
  xung: { prio: 1, power: 1, life: 0.05, pool: 1.8 },
  xungFirst: { prio: 3, power: 2, life: 0.08, pool: 2.4 },
  tia: { prio: 2, power: 0.9, life: 0, pool: 2.4 },
  tiaSlide: { prio: 2, power: 1, life: 0, pool: 2.4 },
  tan: { prio: 3, power: 2, life: 0.08, pool: 3 },
  ray: { prio: 4, power: 3, life: 0.1, pool: 2.6 },
  phao: { prio: 5, power: 3.5, life: 0.12, pool: 4 },
} as const;
export type LightSpec = (typeof LIGHT)[keyof typeof LIGHT];

/** The slot a new light takes: the first dark one, else the one with the least priority × light left. */
export function pickLight(prio: ArrayLike<number>, left: ArrayLike<number>, count: number): number {
  let best = -1;
  let score = Infinity;
  for (let i = 0; i < count; i += 1) {
    const s = left[i]! <= 0 ? -1 : prio[i]! * left[i]!;
    if (s < score) {
      score = s;
      best = i;
    }
  }
  return best;
}

/** A light's level `age` s into a flash of `life` s (1 → 0, eased out); a held light (life 0) stays at 1. */
export const lightLevel = (age: number, life: number): number => (life <= 0 ? 1 : age >= life ? 0 : (1 - age / life) * (1 - age / life));

/** Foe kinds (content/foes.ts KIND order) → their chunks (§4.5): count, size range (m), big ones and their size, the edge glow. */
export const EDGE = { hot: 0, volt: 1, beacon: 2, armour: 3 } as const;
export const CHUNK: readonly { n: number; min: number; max: number; big: number; edge: number }[] = [
  { n: 7, min: 0.18, max: 0.35, big: 0, edge: EDGE.hot },
  { n: 10, min: 0.2, max: 0.45, big: 0, edge: EDGE.volt },
  { n: 14, min: 0.25, max: 0.45, big: 3, edge: EDGE.hot },
  { n: 10, min: 0.2, max: 0.4, big: 0, edge: EDGE.hot },
  { n: 6, min: 0.15, max: 0.3, big: 0, edge: EDGE.hot },
  { n: 3, min: 0.15, max: 0.3, big: 0, edge: EDGE.hot },
  { n: 18, min: 0.25, max: 0.45, big: 5, edge: EDGE.beacon },
];
export const BIG_CHUNK = { min: 0.6, max: 0.8 } as const;
export const CHUNKS_MAX = 48;

/** Chunks of a heap of `n` kills of `kind` (√N, as the kit's merged bursts): small ones and big ones, together at most 48. */
export function chunkCount(kind: number, n: number): { small: number; big: number } {
  const spec = CHUNK[kind] ?? CHUNK[0]!;
  const k = Math.sqrt(Math.max(1, n));
  const big = Math.min(CHUNKS_MAX, Math.round(spec.big * k));
  return { small: Math.max(0, Math.min(CHUNKS_MAX - big, Math.round(spec.n * k))), big };
}

/** Chunk caps per tier (§4.5). */
export const CHUNK_CAP = { low: 150, medium: 400, high: 900, ultra: 1400 } as const;

/**
 * How a chunk flies (§4.5): up `up` m/s, out `out` m/s along the blow within
 * ±`spread` rad, by the gun of the killing blow: Pháo Sao throws from the
 * burst's centre and highest, Ray along its line and fastest, Tán along the
 * push, Tia across the sweep, Xung (and the rest) as the base.
 */
export const THROW = {
  base: { up: [3, 6], out: [2, 5], spread: Math.PI / 3 },
  tia: { up: [3, 5], out: [2.5, 4.5], spread: 0.5 },
  tan: { up: [3, 5.5], out: [4, 6], spread: 0.6 },
  ray: { up: [2.5, 5], out: [6, 9], spread: 0.35 },
  phao: { up: [5, 8], out: [2, 5], spread: Math.PI },
} as const;
export const CHUNK_PHYSICS = { gravity: 14, spin: [6, 14], bounce: 0.3, friction: 0.6, coolS: 1.2 } as const;

/**
 * One step of a chunk's flight (y up, the floor at `floor`): falls under
 * gravity, bounces once (× bounce, sliding × (1 − friction)), then lies.
 * State: [x, y, z, vx, vy, vz, bounced (0 / 1), resting (0 / 1)].
 */
export function chunkStep(s: Float32Array, o: number, dt: number, floor: number): void {
  if (s[o + 7] === 1) return;
  const g = CHUNK_PHYSICS.gravity;
  s[o + 4] = s[o + 4]! - g * dt;
  s[o] = s[o]! + s[o + 3]! * dt;
  s[o + 1] = s[o + 1]! + s[o + 4]! * dt;
  s[o + 2] = s[o + 2]! + s[o + 5]! * dt;
  if (s[o + 1]! > floor) return;
  s[o + 1] = floor;
  const keep = 1 - CHUNK_PHYSICS.friction;
  if (s[o + 6] === 0 && s[o + 4]! < -1) {
    s[o + 6] = 1;
    s[o + 4] = -s[o + 4]! * CHUNK_PHYSICS.bounce;
    s[o + 3] = s[o + 3]! * keep;
    s[o + 5] = s[o + 5]! * keep;
    return;
  }
  s[o + 3] = s[o + 4] = s[o + 5] = 0;
  s[o + 7] = 1;
}

/** World metres that look `share` of the view's height tall at a depth where one metre is `pxPerM` px in a `height` px view. */
export const screenMetres = (share: number, height: number, pxPerM: number): number => (share * height) / Math.max(1e-3, pxPerM);
