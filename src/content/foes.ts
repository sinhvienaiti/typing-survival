/**
 * The horde's kinds (docs/BUILD_S1.md §6): Bầy and Lính from S0 (numbers
 * unchanged), Trâu (Vỏ), Khiên (an energy shield in front), Tách (breaks
 * into three shards), its Mảnh, and Đầu Đàn (the hunt's leader, of the
 * Trâu family). Metres, seconds, hit points. Armour (Vỏ) comes off every
 * blow, which keeps at least 1. Big foes (radius above BIG_RADIUS) live in
 * their own list beside the grid (sim/hits.ts).
 */
export const KIND = { mine: 0, scout: 1, brute: 2, shield: 3, splitter: 4, shard: 5, leader: 6 } as const;
export type FoeKind = (typeof KIND)[keyof typeof KIND];
export const KINDS = 7;

export type FoeSpec = {
  readonly hp: number;
  /** Vỏ: taken off every blow (at least 1 is left). */
  readonly armour: number;
  /** m/s at full stride (the press slows it near the ship). */
  readonly speed: number;
  readonly radius: number;
  /** Armour lost when it reaches the bottom line. */
  readonly breach: number;
  /** Its weight in the near zone's drain. */
  readonly drain: number;
  readonly wobble: number;
  readonly wobbleHz: number;
  /** Mass in the crowd's push apart (a Trâu shoulders the swarm aside). */
  readonly mass: number;
  /** Tán's pellets push it back. */
  readonly knock: boolean;
  /** Shield hit points (Khiên), 0 for none. */
  readonly shield: number;
  /** May carry the Bọc Thép affix (plain packs only). */
  readonly elite: boolean;
  readonly name: string;
};

export const FOES: readonly FoeSpec[] = [
  { hp: 14, armour: 0, speed: 2.6, radius: 0.5, breach: 3, drain: 1, wobble: 0.55, wobbleHz: 0.32, mass: 1, knock: true, shield: 0, elite: true, name: "Bầy" },
  { hp: 56, armour: 0, speed: 1.8, radius: 0.8, breach: 6, drain: 2, wobble: 0.15, wobbleHz: 0.2, mass: 1, knock: true, shield: 0, elite: true, name: "Lính" },
  { hp: 240, armour: 5, speed: 1.25, radius: 1.1, breach: 12, drain: 4, wobble: 0.06, wobbleHz: 0.12, mass: 4, knock: false, shield: 0, elite: false, name: "Trâu" },
  { hp: 80, armour: 0, speed: 1.9, radius: 0.8, breach: 6, drain: 2, wobble: 0.08, wobbleHz: 0.15, mass: 1, knock: true, shield: 100, elite: false, name: "Khiên" },
  { hp: 42, armour: 0, speed: 2.2, radius: 0.7, breach: 4, drain: 1.5, wobble: 0.5, wobbleHz: 0.45, mass: 1, knock: true, shield: 0, elite: true, name: "Tách" },
  { hp: 9, armour: 0, speed: 3, radius: 0.4, breach: 2, drain: 0.5, wobble: 0.6, wobbleHz: 0.55, mass: 1, knock: true, shield: 0, elite: false, name: "Mảnh" },
  { hp: 360, armour: 3, speed: 1.1, radius: 1.3, breach: 15, drain: 6, wobble: 0.04, wobbleHz: 0.1, mass: 4, knock: false, shield: 0, elite: false, name: "Đầu Đàn" },
];

/** Above this body radius a foe is big: in its own list, not the grid (whose MAX_RADIUS it is). */
export const BIG_RADIUS = 0.8;
export const BIG_MAX = 32;
export const isBig = (kind: number): boolean => FOES[kind]!.radius > BIG_RADIUS;

/** A Trâu or Đầu Đàn closer than `z` charges: head down, `speed` × its stride. */
export const CHARGE = { z: 10, speed: 1.1 } as const;

/**
 * Khiên's energy shield: a 2.6 m wall `ahead` m in front of the body,
 * turning toward the ship at most `turn` rad/s. Xung rounds and Tán pellets
 * that meet it from the front stop (no damage); Ray breaks it at once; Tia
 * burns it; Pháo Sao falls past it. Broken, it never comes back and its
 * bearer walks on `broken` × faster.
 */
export const SHIELD = { width: 2.6, ahead: 0.8, turn: 1.6, broken: 1.1, max: 32 } as const;

/** Tách breaks into `shards` Mảnh spread across `spread` m. */
export const SPLIT = { shards: 3, spread: 1.2 } as const;

/** Packs led by a big or special foe: the leader in front, `follow` mines behind (a block or a wedge). */
export const PACK = {
  brute: { lead: KIND.brute, follow: 5, shape: 0 },
  shield: { lead: KIND.shield, follow: 6, shape: 1 },
  splitter: { size: 5 },
  /** Đầu Đàn's escort: 8 mines walking ahead of it. */
  leader: { lead: KIND.leader, escort: 8 },
} as const;
