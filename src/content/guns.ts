/**
 * The five guns (docs/BUILD_S1.md §5): each a kind of magazine, loaded by a
 * finished word. Xung and Tia are S0's (numbers unchanged); Tán, Ray and
 * Pháo Sao are new. Numbers are starting points tuned with the bots
 * (pnpm survival:balance); COUNTERS is checked against small sim runs
 * (tests/guns.test.ts, gate G3m).
 */
export const GUN = { xung: 0, tia: 1, tan: 2, ray: 3, phao: 4 } as const;
export type GunId = (typeof GUN)[keyof typeof GUN];
export const GUN_IDS: readonly GunId[] = [0, 1, 2, 3, 4];
/** Short keys: CSS classes, sound ids, URL and storage values. */
export const GUN_KEYS = ["xung", "tia", "tan", "ray", "phao"] as const;
export type GunKey = (typeof GUN_KEYS)[number];
export const gunByKey = (key: string): GunId | -1 => GUN_KEYS.indexOf(key as GunKey) as GunId | -1;

/** Magazines a gun holds (the firing one included) at levels 1–2, and at level 3 (Rèn). */
export const MAG_MAX = 2;
export const MAG_CAP = 3;
export const CRIT_MULT = 2;

/**
 * Typing quality of the loading word (S0's numbers): Chuẩn (0 errors) ×1.06
 * damage, +4 % crit; Nhanh (≤ 0.7 of the expected time) ×1.15 fire rate. New
 * in S1, "Băng Chuẩn xuyên Vỏ": a clean magazine meets armour × 0.75.
 */
export const QUALITY = { cleanDamage: 1.06, cleanCrit: 0.04, fastShare: 0.7, fastRate: 1.15, cleanArmour: 0.75 } as const;

/** Rèn: damage per blow by level (1–3), magazines held by level. */
export const FORGE = { damage: [1, 1.2, 1.4], mags: [MAG_MAX, MAG_MAX, MAG_CAP], max: 3 } as const;

/**
 * Xung: 24 rounds in 2.4 s at the foe nearest the bottom in a 50° cone
 * (cos 25°), a scout shot near the ship first; range a depth (foes up to
 * `range` m beyond the muzzle). S0 numbers.
 */
export const XUNG = { rounds: 24, seconds: 2.4, damage: 7, coneCos: 0.9063, speed: 46, radius: 0.15, life: 1.3, crit: 0.05, shotGuard: 16, range: 10, spread: 0.08 } as const;
/** Tia: a 1.4 m wide ray `length` m long for 2.5 s, 6 a pulse every 0.1 s to every foe it crosses, sweeping 3 m/s. S0 numbers. */
export const TIA = { seconds: 2.5, width: 1.4, sweep: 3, pulse: 0.1, damage: 6, crit: 0.05, strip: 1.2, away: 2.4, length: 12 } as const;
/**
 * Tán: 6 volleys in 2 s, 7 pellets fanned ±18° each, a 7 m radius, 7 a
 * pellet (§5.1 started at 5: three pellets a mine, it did not hold a wave:
 * gate G3), every pellet that hits pushes its foe back 0.35 m (never the
 * heavy kinds) or knocks a scout shot out of the air. Pellets are
 * short-lived rounds (shields stop them).
 */
export const TAN = { volleys: 6, seconds: 2, damage: 7, range: 9, speed: 40, radius: 0.12, knock: 0.6, crit: 0.05 } as const;
/** The fan's directions as (cos, sin) of −18°, −12°, −6°, 0°, 6°, 12°, 18° (written out: no trigonometry in the sim). */
export const TAN_FAN: readonly (readonly [number, number])[] = [
  [0.9510565162951535, -0.3090169943749474],
  [0.9781476007338057, -0.20791169081775934],
  [0.9945218953682733, -0.10452846326765347],
  [1, 0],
  [0.9945218953682733, 0.10452846326765347],
  [0.9781476007338057, 0.20791169081775934],
  [0.9510565162951535, 0.3090169943749474],
];
/**
 * Ray: 3 shots in 2.4 s, each charged 0.15 s and then instant; it pierces up
 * to 6 foes on one line (×0.85 for each one passed), 30 m, 70 a foe, armour
 * counts ×0.25; a shield on the line breaks at once (and counts as one).
 */
export const RAY = { shots: 3, seconds: 2.4, charge: 0.15, damage: 75, falloff: 0.85, pierce: 6, range: 30, width: 0.2, armour: 0.25, crit: 0.05 } as const;
/**
 * Pháo Sao: 4 shells in 3 s, each flying 0.7 s to the heaviest cluster (by
 * hit points still standing) 8–24 m out, bursting 2.5 m round: 22 at the
 * centre falling to 9 at the edge. Shells fall from above: shields do not
 * stop them, and Vỏ meets them × 0.5 (the thin top). §5.1 started at 6
 * shells, 3 m, 26 → 13: a pack died to a shell and every kit with Pháo Sao
 * swept the stages (R1 balance, changelog).
 */
export const PHAO = { shells: 4, seconds: 3, flight: 0.7, radius: 2.5, damage: 22, edge: 9, near: 8, far: 24, cell: 3, armour: 0.5, crit: 0.05 } as const;

/** Heavy guns (Ray, Pháo Sao) take words one letter longer at both ends of the band, at most `cap` letters. */
export const HEAVY = { extra: 1, cap: 10 } as const;

export type GunSpec = {
  readonly key: GunKey;
  /** Name on the bay and the cards (Chakra Petch caps). */
  readonly name: string;
  /** The English name on a reward card (R2). */
  readonly en: string;
  readonly title: string;
  /** The magazine in a line (cards and bays). */
  readonly magazine: string;
  readonly range: string;
  readonly heavy: boolean;
  /** Armour a blow meets: 1 full, Ray 0.25. */
  readonly armour: number;
  readonly crit: number;
  /** One magazine's damage near the line (the FlowMeter's "words owed"). */
  readonly nominal: number;
};

export const GUN_SPECS: readonly GunSpec[] = [
  { key: "xung", name: "XUNG", en: "pulse", title: "pháo xung liên thanh", magazine: "24 viên trong 2,4 s vào con gần vạch nhất", range: "10 m", heavy: false, armour: 1, crit: XUNG.crit, nominal: XUNG.rounds * XUNG.damage },
  { key: "tia", name: "TIA", en: "beam", title: "tia nhiệt quét", magazine: "tia 12 m cháy 2,5 s, quét về cụm dày", range: "12 m", heavy: false, armour: 1, crit: TIA.crit, nominal: XUNG.rounds * XUNG.damage },
  { key: "tan", name: "TÁN", en: "scatter", title: "súng chùm đẩy lùi", magazine: "6 loạt × 7 viên xòe, đẩy lùi, chặn đạn lính", range: TAN.range + " m", heavy: false, armour: 1, crit: TAN.crit, nominal: TAN.volleys * 7 * TAN.damage },
  { key: "ray", name: "RAY", en: "rail", title: "súng ray xuyên hàng", magazine: "3 phát xuyên 6 con, phá khiên", range: "30 m", heavy: true, armour: RAY.armour, crit: RAY.crit, nominal: RAY.shots * RAY.damage },
  { key: "phao", name: "PHÁO SAO", en: "flak", title: "pháo cối nổ vùng", magazine: "4 quả nổ 2,5 m vào cụm nặng", range: "8–24 m", heavy: true, armour: PHAO.armour, crit: PHAO.crit, nominal: PHAO.shells * PHAO.damage * 1.5 },
];

/**
 * The counter table (docs/BUILD_S1.md §5.2): per row of foes, per gun, 2 ●
 * (counters), 1 ○ (does), 0 ✕ (poor), as measured: tests/guns.test.ts
 * (G3m, scenes in tests/survival/counters.ts, `node --import tsx
 * scripts/counters.ts`) runs every cell and fails when this table differs.
 * Where it differs from §5.2's guess, the measurement won (R1 changelog).
 */
export const COUNTER_ROWS = ["swarmFar", "swarmNear", "scout", "armoured", "shield", "splitter"] as const;
export type CounterRow = (typeof COUNTER_ROWS)[number];
export const COUNTER_LABELS: Readonly<Record<CounterRow, string>> = {
  swarmFar: "Bầy giữa sân",
  swarmNear: "Bầy sát vạch",
  scout: "Lính và đạn lính",
  armoured: "Trâu, Đầu Đàn (Vỏ)",
  shield: "Khiên và toán sau khiên",
  splitter: "Tách và mảnh",
};
export const COUNTERS: Readonly<Record<CounterRow, readonly [number, number, number, number, number]>> = {
  swarmFar: [1, 0, 1, 0, 2],
  swarmNear: [2, 2, 2, 0, 0],
  scout: [2, 0, 0, 2, 0],
  armoured: [0, 0, 0, 2, 0],
  shield: [0, 2, 0, 2, 2],
  splitter: [1, 2, 2, 1, 2],
};
