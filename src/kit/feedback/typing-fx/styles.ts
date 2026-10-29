// Source: new for the kit: the six letter-effect styles of the focus strip (docs/games/TYPING_BREAK_STUDY.md §4 T1–T3, T7, T12)
/**
 * A style is what one typed letter does: a pose for its glyph over time (the
 * DOM spans' transform and opacity) and particles for the canvas behind it.
 * Poses step per 60 Hz frame where Typing Break steps (T1, T2): the eye
 * reads a stamp, not a tween. `motion` (the intensity's) scales every pose
 * away from rest; 0 (reduced motion) leaves only light and colour.
 *
 * Every function writes into objects it is given: nothing is allocated per key.
 */
import { ParticlePool, PK, type ParticleKind } from "./pool";
import type { TypingFxStyle } from "./settings";

/** Palette slots a particle's `tone` names; the renderer maps them to colours. */
export const TONE = { hot: 0, accent: 1, light: 2, ink: 3, warn: 4, gold: 5, warnInk: 6 } as const;

export const FRAME_MS = 1000 / 60;

/** One glyph's pose: the letter itself, its hot glow layer, two ghost copies (stamp, shatter halves). */
export type GlyphPose = {
  scale: number;
  rot: number;
  /** Offsets in em. */
  dx: number;
  dy: number;
  alpha: number;
  hot: number;
  /** Squash (+: flattened, −: stretched): the letter's scale is (1 + 0.6 q, 1 − q) times `scale`. */
  squash: number;
  aOn: boolean;
  aAlpha: number;
  aScale: number;
  aRot: number;
  aDx: number;
  aDy: number;
  bOn: boolean;
  bScale: number;
  bAlpha: number;
  bRot: number;
  bDx: number;
  bDy: number;
};

export const restPose = (out: GlyphPose): GlyphPose => {
  out.scale = 1;
  out.rot = 0;
  out.dx = 0;
  out.dy = 0;
  out.alpha = 1;
  out.hot = 0;
  out.squash = 0;
  out.aOn = false;
  out.aAlpha = 1;
  out.aScale = 1;
  out.aRot = 0;
  out.aDx = 0;
  out.aDy = 0;
  out.bOn = false;
  out.bScale = 1;
  out.bAlpha = 1;
  out.bRot = 0;
  out.bDx = 0;
  out.bDy = 0;
  return out;
};

export const newPose = (): GlyphPose => restPose({} as GlyphPose);

/** Where and how much to spawn: one object per strip, refilled per call. */
export type SpawnCtx = {
  pool: ParticlePool;
  owner: number;
  prio: number;
  /** Glyph centre (canvas px) and glyph size (the font size, px). */
  x: number;
  y: number;
  h: number;
  /** Glyph code for the rune trace: word layer × 64 + letter index. */
  glyph: number;
  now: number;
  /** Count multiplier (intensity × combo) and size multiplier (combo). */
  mult: number;
  size: number;
  /** Reduced motion: particles do not travel, rings do not grow. */
  still: boolean;
  random: () => number;
  /** Lights the letter `offset` places from this one by `amount` (0 … 1) for a moment: a style's light spilling onto its neighbours. */
  light: (offset: number, amount: number) => void;
};

export type StyleRecipe = {
  readonly id: TypingFxStyle;
  /** How long a key's pose runs (ms). */
  readonly keyMs: number;
  /** Ghost copies clip (shatter's halves); null: whole glyph. */
  readonly clip: readonly [string, string] | null;
  /** Ghost colour: the hot white or the accent's light tint. */
  readonly ghost: "hot" | "light";
  /** Particle phases after the key (ms): stamp's land at 50 ms, the rest at once. */
  readonly phases: readonly number[];
  /** The finished word's own release on top of the rim pop: Stamp seals the word. */
  readonly release?: "seal";
  keyPose(age: number, motion: number, out: GlyphPose): GlyphPose;
  spawnKey(phase: number, c: SpawnCtx): void;
  spawnWrong(c: SpawnCtx): void;
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const frameOf = (age: number): number => Math.floor(age / FRAME_MS);
const rand = (c: SpawnCtx, a: number, b: number): number => a + (b - a) * c.random();
/** `base` particles scaled by intensity and combo, at least `min`, at most 14 of one kind a key. */
const count = (c: SpawnCtx, base: number, min = 0): number => Math.min(14, Math.max(min, Math.round(base * c.mult)));

/** Every spawn goes through here: a multiplier of 0 (Low, Off) spawns nothing. */
function spawn(c: SpawnCtx, kind: ParticleKind, tone: number, life: number, x = c.x, y = c.y): number {
  if (c.mult <= 0) return -1;
  const i = c.pool.spawn(kind, c.owner, c.prio, x, y, c.now, life);
  if (i >= 0) c.pool.tone[i] = tone;
  return i;
}

/** A particle flying out at `deg` (0 = right, −90 = up) with `speed` px/s. */
function fling(c: SpawnCtx, i: number, deg: number, speed: number, drag: number, grav: number): void {
  if (i < 0 || c.still) return;
  const a = (deg * Math.PI) / 180;
  c.pool.vx[i] = Math.cos(a) * speed;
  c.pool.vy[i] = Math.sin(a) * speed;
  c.pool.drag[i] = drag;
  c.pool.grav[i] = grav;
}

/** A ring from radius r0 to r1 (equal when still), line `width`; `gap` rad open from `from`. */
function ring(c: SpawnCtx, tone: number, life: number, r0: number, r1: number, width: number, gap = 0, from = 0): void {
  const i = spawn(c, PK.ring, tone, life);
  if (i < 0) return;
  c.pool.size[i] = r0;
  c.pool.size2[i] = c.still ? r0 : r1;
  c.pool.aux[i] = width;
  c.pool.rot[i] = from;
  c.pool.spin[i] = gap;
}

function disc(c: SpawnCtx, tone: number, life: number, r: number): void {
  const i = spawn(c, PK.disc, tone, life);
  if (i >= 0) c.pool.size[i] = r;
}

function sparks(c: SpawnCtx, n: number, toneA: number, toneB: number, deg: number, spread: number, speed0: number, speed1: number, length: number, width: number, life0: number, life1: number): void {
  for (let k = 0; k < n; k += 1) {
    const i = spawn(c, PK.spark, k % 2 === 0 ? toneA : toneB, rand(c, life0, life1));
    if (i < 0) return;
    c.pool.aux[i] = length * c.size;
    c.pool.size[i] = width;
    fling(c, i, deg + rand(c, -spread, spread), rand(c, speed0, speed1) * c.size, 9, 0);
    if (c.still) c.pool.rot[i] = ((deg + rand(c, -spread, spread)) * Math.PI) / 180;
  }
}

// ── Stamp (T1): a big copy slams down onto the letter in three frames over its own falling shadow,
// lands with a squash, an overshoot and a settle, splashes paint with a dark under-edge, throws
// droplets that splat on the line, and its light spills onto the next letters for a moment.
const STAMP_S = [3.0, 2.35, 1.6];
const STAMP_R = [-9, -6, -3];
const STAMP_X = [-0.28, -0.18, -0.08];
const STAMP_Y = [-0.95, -0.6, -0.25];
/** The shadow under the falling copy: on the slot, smaller and darker as the copy comes down. */
const SHADOW_S = [1.75, 1.45, 1.2];
const SHADOW_A = [0.3, 0.45, 0.62];
/** After the landing frame: squash, then a stretch past rest, then settled (60 Hz frames). */
const LAND_Q = [0.17, 0.09, -0.06, -0.03, 0.015, 0];
const LAND_Y = [0.05, 0.03, -0.025, -0.01, 0, 0];
const STAMP_LAND = 50;

const stamp: StyleRecipe = {
  id: "stamp",
  keyMs: 150,
  clip: null,
  ghost: "light",
  phases: [STAMP_LAND],
  release: "seal",
  keyPose(age, m, out) {
    restPose(out);
    if (age < 0 || age >= this.keyMs) return out;
    if (m <= 0) {
      out.hot = age < STAMP_LAND + 40 ? 1 - clamp01((age - STAMP_LAND) / 40) : 0;
      return out;
    }
    if (age < STAMP_LAND) {
      const f = Math.min(2, frameOf(age));
      out.alpha = 0;
      out.aOn = true;
      out.aScale = 1 + (STAMP_S[f]! - 1) * m;
      out.aRot = STAMP_R[f]! * m;
      out.aDx = STAMP_X[f]! * m;
      out.aDy = STAMP_Y[f]! * m;
      out.bOn = true;
      out.bScale = 1 + (SHADOW_S[f]! - 1) * m;
      out.bAlpha = SHADOW_A[f]!;
      out.bRot = STAMP_R[f]! * 0.4 * m;
      out.bDx = 0.07 * m;
      out.bDy = 0.1 * m;
      return out;
    }
    const f = frameOf(age - STAMP_LAND);
    out.squash = (LAND_Q[f] ?? 0) * m;
    out.dy = (LAND_Y[f] ?? 0) * m;
    out.scale = f === 0 ? 1 + 0.06 * m : 1;
    out.hot = age < STAMP_LAND + 45 ? 1 - (age - STAMP_LAND) / 45 : 0;
    return out;
  },
  spawnKey(_phase, c) {
    // The splat under the letter (paint with a dark under-edge, or an ink texture), the flash, the contact ring.
    const sp = spawn(c, PK.splat, TONE.accent, 300);
    if (sp >= 0) {
      c.pool.size[sp] = 0.6 * c.h * c.size;
      c.pool.rot[sp] = c.random() * Math.PI * 2;
      c.pool.variant[sp] = Math.floor(c.random() * 4);
      c.pool.aux[sp] = c.random() * 1000;
    }
    disc(c, TONE.hot, 70, 0.62 * c.h * c.size);
    const ct = spawn(c, PK.contact, TONE.hot, 170, c.x, c.y + 0.36 * c.h);
    if (ct >= 0) {
      c.pool.size[ct] = 0.45 * c.h;
      c.pool.size2[ct] = c.still ? 0.45 * c.h : 1.3 * c.h * c.size;
      c.pool.aux[ct] = 0.07 * c.h;
    }
    // A glint where the stamp bites (a glyph-spark texture cell when the game gives one).
    const g = spawn(c, PK.star, TONE.hot, 130, c.x - 0.34 * c.h, c.y - 0.3 * c.h);
    if (g >= 0) {
      c.pool.size[g] = 0.42 * c.h * c.size;
      c.pool.variant[g] = Math.floor(c.random() * 4);
    }
    // Droplets: thrown up and out, they fall and splat on the line under the word.
    const n = count(c, 7, 4);
    for (let k = 0; k < n; k += 1) {
      const i = spawn(c, PK.ink, k % 3 === 2 ? TONE.hot : k % 3 === 1 ? TONE.light : TONE.accent, rand(c, 300, 420));
      if (i < 0) break;
      c.pool.size[i] = rand(c, 0.04, 0.09) * c.h;
      c.pool.aux[i] = c.y + rand(c, 0.55, 0.75) * c.h;
      fling(c, i, -90 + (k % 2 === 0 ? -1 : 1) * rand(c, 25, 115), rand(c, 9, 17) * c.h, 5, 34 * c.h);
    }
    // Its light spills onto the neighbours, brighter on the next letter.
    c.light(1, 0.5);
    c.light(2, 0.2);
    c.light(-1, 0.3);
  },
  spawnWrong(c) {
    const sp = spawn(c, PK.splat, TONE.warn, 220);
    if (sp >= 0) {
      c.pool.size[sp] = 0.36 * c.h;
      c.pool.rot[sp] = c.random() * Math.PI * 2;
      c.pool.variant[sp] = Math.floor(c.random() * 4);
      c.pool.aux[sp] = c.random() * 1000;
    }
    for (let k = 0; k < 3; k += 1) {
      const i = spawn(c, PK.ink, TONE.warn, rand(c, 200, 260));
      if (i < 0) return;
      c.pool.size[i] = rand(c, 0.035, 0.06) * c.h;
      c.pool.aux[i] = c.y + 0.6 * c.h;
      fling(c, i, 90 + rand(c, -35, 35), rand(c, 2, 5) * c.h, 4, 22 * c.h);
    }
  },
};

// ── Flare: the letter goes white-hot and swells, its glow fades into the accent, 2–4 sparks rise.
const flare: StyleRecipe = {
  id: "flare",
  keyMs: 280,
  clip: null,
  ghost: "hot",
  phases: [0],
  keyPose(age, m, out) {
    restPose(out);
    if (age < 0 || age >= this.keyMs) return out;
    const t = clamp01(age / 150);
    const e = (1 - t) * (1 - t) * (1 - t);
    out.scale = 1 + 0.24 * m * e;
    out.dy = -0.07 * m * e;
    out.hot = Math.exp(-age / 80);
    return out;
  },
  spawnKey(_phase, c) {
    disc(c, TONE.accent, 170, 1.35 * c.h * c.size);
    disc(c, TONE.hot, 90, 0.8 * c.h);
    ring(c, TONE.light, 150, 0.42 * c.h, 1.1 * c.h * c.size, 0.055 * c.h);
    sparks(c, count(c, 4, 3), TONE.hot, TONE.light, -90, 60, 24 * c.h, 38 * c.h, 0.55 * c.h, 0.085 * c.h, 200, 280);
    // A glint at the letter's top corner: the "loé" of a struck gem.
    const g = spawn(c, PK.star, TONE.hot, 150, c.x + 0.3 * c.h, c.y - 0.34 * c.h);
    if (g >= 0) c.pool.size[g] = 0.5 * c.h * c.size;
    if (c.mult >= 1.9) {
      const i = spawn(c, PK.star, TONE.light, 130, c.x - 0.34 * c.h, c.y + 0.1 * c.h);
      if (i >= 0) c.pool.size[i] = 0.32 * c.h;
    }
  },
  spawnWrong(c) {
    ring(c, TONE.warn, 120, 0.34 * c.h, 0.56 * c.h, 0.045 * c.h);
  },
};

// ── Smash (T2): the letter punches in at 2× under a white disc, then a two-tone ring and a turning arc.
const SMASH_SCALE = [2.1, 1, 1];
const SMASH_HOT = [1, 1, 0.45];

const smash: StyleRecipe = {
  id: "smash",
  keyMs: 150,
  clip: null,
  ghost: "hot",
  phases: [0],
  keyPose(age, m, out) {
    restPose(out);
    if (age < 0 || age >= this.keyMs) return out;
    const f = frameOf(age);
    if (f < 3) {
      out.scale = 1 + (SMASH_SCALE[f]! - 1) * m;
      out.hot = SMASH_HOT[f]!;
    }
    return out;
  },
  spawnKey(_phase, c) {
    const i = spawn(c, PK.smash, TONE.accent, 150);
    if (i >= 0) {
      c.pool.size[i] = c.h * c.size;
      c.pool.rot[i] = c.random() * Math.PI * 2;
    }
    sparks(c, count(c, 6, 4), TONE.hot, TONE.hot, -90, 180, 20 * c.h, 30 * c.h, 0.3 * c.h, 0.07 * c.h, 90, 120);
    sparks(c, count(c, 2), TONE.accent, TONE.accent, -90, 180, 16 * c.h, 24 * c.h, 0.26 * c.h, 0.08 * c.h, 100, 130);
  },
  spawnWrong(c) {
    ring(c, TONE.warn, 120, 0.5 * c.h, 0.6 * c.h, 0.11 * c.h, 1.4, c.random() * Math.PI * 2);
  },
};

// ── Shatter: the letter splits on a slash, its halves jump apart, shards fly, and it snaps back whole.
const SPLIT_MS = 110;

const shatter: StyleRecipe = {
  id: "shatter",
  keyMs: 185,
  clip: ["polygon(-20% -20%, 120% -20%, 120% 40%, -20% 62%)", "polygon(-20% 62%, 120% 40%, 120% 120%, -20% 120%)"],
  ghost: "hot",
  phases: [0],
  keyPose(age, m, out) {
    restPose(out);
    if (age < 0 || age >= this.keyMs) return out;
    if (m > 0 && age < SPLIT_MS) {
      const t = age / SPLIT_MS;
      const e = (1 - t) * (1 - t);
      out.alpha = 0;
      out.aOn = out.bOn = true;
      out.aScale = 1 + 0.08 * m * e;
      out.aDx = -0.17 * m * e;
      out.aDy = -0.2 * m * e;
      out.aRot = -13 * m * e;
      out.bDx = 0.17 * m * e;
      out.bDy = 0.16 * m * e;
      out.bRot = 11 * m * e;
      return out;
    }
    const t = clamp01((age - (m > 0 ? SPLIT_MS : 0)) / 75);
    out.scale = 1 + 0.1 * m * (1 - t) * (1 - t);
    out.hot = 0.85 * (1 - t);
    return out;
  },
  spawnKey(_phase, c) {
    disc(c, TONE.hot, 70, 0.6 * c.h);
    const i = spawn(c, PK.crack, TONE.hot, 100);
    if (i >= 0) {
      c.pool.size[i] = 1.5 * c.h;
      c.pool.rot[i] = (-14 * Math.PI) / 180;
    }
    const n = count(c, 9, 5);
    for (let k = 0; k < n; k += 1) {
      const s = spawn(c, PK.shard, k % 3 === 0 ? TONE.hot : k % 3 === 1 ? TONE.accent : TONE.light, rand(c, 280, 400));
      if (s < 0) return;
      c.pool.size[s] = rand(c, 0.1, 0.2) * c.h * c.size;
      c.pool.rot[s] = c.random() * Math.PI * 2;
      c.pool.spin[s] = c.still ? 0 : rand(c, -18, 18);
      fling(c, s, (k % 2 === 0 ? -90 : 90) + rand(c, -75, 75), rand(c, 10, 22) * c.h, 5, 24 * c.h);
    }
  },
  spawnWrong(c) {
    const i = spawn(c, PK.crack, TONE.warn, 130);
    if (i >= 0) {
      c.pool.size[i] = 0.95 * c.h;
      c.pool.rot[i] = ((rand(c, -30, 30) + 90) * Math.PI) / 180;
    }
  },
};

// ── Rune: a glowing line traces the letter's outline inside a turning rune circle; the letter ignites when the trace closes.
const TRACE_MS = 120;

const rune: StyleRecipe = {
  id: "rune",
  keyMs: 380,
  clip: null,
  ghost: "hot",
  phases: [0],
  keyPose(age, m, out) {
    restPose(out);
    if (age < 0 || age >= this.keyMs) return out;
    if (age < TRACE_MS) {
      const t = age / TRACE_MS;
      out.alpha = 0.28 + 0.72 * t * t;
      return out;
    }
    const t = clamp01((age - TRACE_MS) / 90);
    out.hot = 0.95 * Math.exp(-(age - TRACE_MS) / 85);
    out.scale = 1 + 0.06 * m * (1 - t);
    return out;
  },
  spawnKey(_phase, c) {
    // The key's own frame: a spark where the trace starts, so the rune reads at once.
    disc(c, TONE.hot, 70, 0.42 * c.h);
    const t = spawn(c, PK.trace, TONE.light, 240);
    if (t >= 0) {
      c.pool.size[t] = c.h;
      c.pool.aux[t] = c.glyph;
    }
    const r = spawn(c, PK.rune, TONE.accent, 360);
    if (r >= 0) {
      c.pool.size[r] = 0.98 * c.h * c.size;
      c.pool.rot[r] = c.random() * Math.PI * 2;
      c.pool.spin[r] = c.still ? 0 : 1.7;
    }
    const n = count(c, 3, 2);
    for (let k = 0; k < n; k += 1) {
      const a = (k / n) * Math.PI * 2 + c.random();
      const i = spawn(c, PK.star, TONE.hot, rand(c, 200, 280), c.x + Math.cos(a) * 0.98 * c.h, c.y + Math.sin(a) * 0.98 * c.h);
      if (i < 0) return;
      c.pool.size[i] = 0.2 * c.h;
      fling(c, i, (a * 180) / Math.PI + 90, 3 * c.h, 6, 0);
    }
  },
  spawnWrong(c) {
    const i = spawn(c, PK.rune, TONE.warn, 170);
    if (i >= 0) {
      c.pool.size[i] = 0.64 * c.h;
      c.pool.rot[i] = c.random() * Math.PI * 2;
      c.pool.aux[i] = 1; // broken
    }
  },
};

// ── Minimal: colour and a small scale punch; no particles. For readers.
const minimal: StyleRecipe = {
  id: "minimal",
  keyMs: 95,
  clip: null,
  ghost: "hot",
  phases: [],
  keyPose(age, m, out) {
    restPose(out);
    if (age < 0 || age >= this.keyMs) return out;
    const t = clamp01(age / 95);
    out.scale = 1 + 0.12 * m * (1 - t) * (1 - t);
    out.hot = age < 60 ? 0.35 * (1 - age / 60) : 0;
    return out;
  },
  spawnKey() {},
  spawnWrong() {},
};

export const STYLES: Readonly<Record<TypingFxStyle, StyleRecipe>> = { stamp, flare, smash, shatter, rune, minimal };

/** A wrong key's twitch (every style): a short sideways shake on the due letter, never a scale (it would cover the next letters). */
const TWITCH = [0.07, -0.05, 0.035, -0.015];
export const WRONG_MS = 90;

export function wrongPose(age: number, motion: number, out: GlyphPose): GlyphPose {
  restPose(out);
  if (age < 0 || age >= WRONG_MS) return out;
  const f = frameOf(age);
  out.dx = f < TWITCH.length ? TWITCH[f]! * Math.min(1, motion) : 0;
  return out;
}

/** The finished word's envelope (rim pop, flash): 1 for two frames, then an exponential fall with time constant `tau`. */
export function popEnvelope(age: number, tau: number): number {
  if (age < 0) return 0;
  if (age < 2 * FRAME_MS) return 1;
  return Math.exp(-(age - 2 * FRAME_MS) / tau);
}

/** The old word squeezed flat (T7): holds `hold` ms, then scaleX 1 → 0 in `ms`, ease-in. */
export function squeeze(age: number, hold = 60, ms = 100): number {
  if (age <= hold) return 1;
  const t = clamp01((age - hold) / ms);
  return 1 - t * t;
}

/** A flying letter's progress 0 … 1 at `t` of its dive: gathers speed, arrives fast (energy pulled in). */
export const flyEase = (t: number): number => {
  const x = clamp01(t);
  return x >= 1 ? 1 : x * (0.45 + 0.55 * x);
};
