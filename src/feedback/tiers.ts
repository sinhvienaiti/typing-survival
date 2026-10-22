/**
 * Impact tiers T0–T5 (docs/survival/SURVIVAL_MODE_PLAN.md 5.2): what one blow
 * is worth in shake, hit stop, number, particles and sound. A mode maps its
 * events to a tier; every feedback module reads the same row, so a blow's
 * layers always agree. Shared by the 3D modes (none but Sinh Tồn yet).
 */
export type TierId = 0 | 1 | 2 | 3 | 4 | 5;

export type TierProfile = {
  /** Trauma added (0 … 1; the shake is trauma²). */
  trauma: number;
  /** Hit stop asked for, ms (0: none). */
  stopMs: number;
  /** A per-tier spacing between this tier's stops (ms), on top of the global 150 ms. */
  stopGapMs: number;
  /** Damage number: size (× the base), seconds shown, pop (scale on arrival); null: none. */
  number: { size: number; life: number; pop: number } | null;
  /** Hot frames of the white hit flash, recoil (m) of the fake knock-back. */
  flashFrames: number;
  recoil: number;
  /** Spark count, a star of 8 (or 12) rays, a ring, debris shards. */
  sparks: number;
  rays: 0 | 4 | 8 | 12;
  ring: boolean;
  debris: number;
  /** Sound layers: a low layer from T2, a tail from T4. */
  bass: boolean;
  tail: boolean;
};

export const TIERS: readonly TierProfile[] = [
  { trauma: 0, stopMs: 0, stopGapMs: 0, number: null, flashFrames: 0, recoil: 0, sparks: 3, rays: 0, ring: false, debris: 0, bass: false, tail: false },
  { trauma: 0.03, stopMs: 0, stopGapMs: 0, number: { size: 1, life: 0.45, pop: 1.12 }, flashFrames: 1, recoil: 0.12, sparks: 4, rays: 4, ring: false, debris: 0, bass: false, tail: false },
  { trauma: 0.08, stopMs: 12, stopGapMs: 300, number: { size: 1.3, life: 0.6, pop: 1.25 }, flashFrames: 2, recoil: 0.22, sparks: 8, rays: 8, ring: false, debris: 2, bass: true, tail: false },
  { trauma: 0.16, stopMs: 35, stopGapMs: 400, number: { size: 1.6, life: 0.8, pop: 1.35 }, flashFrames: 3, recoil: 0.32, sparks: 12, rays: 12, ring: true, debris: 4, bass: true, tail: false },
  { trauma: 0.3, stopMs: 45, stopGapMs: 400, number: { size: 1.8, life: 0.9, pop: 1.4 }, flashFrames: 4, recoil: 0.45, sparks: 18, rays: 12, ring: true, debris: 8, bass: true, tail: true },
  { trauma: 0.55, stopMs: 70, stopGapMs: 600, number: { size: 2.3, life: 1.1, pop: 1.5 }, flashFrames: 4, recoil: 0.6, sparks: 30, rays: 12, ring: true, debris: 14, bass: true, tail: true },
];

/** A sweep: this many kills inside the window earns one short stop, then a cool-down. */
export const SWEEP = { kills: 30, windowMs: 500, stopMs: 25, cooldownMs: 1500 } as const;

/** The global spacing between two hit stops. */
export const STOP_GAP_MS = 150;

export const tier = (id: number): TierProfile => TIERS[Math.max(0, Math.min(5, id | 0))]!;
