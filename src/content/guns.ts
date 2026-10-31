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
/** Ticket 220: chapter-only extra capacity, spill to another bay, and one boost per tail magazine; off by default. */
export const FULL_BAY = { extra: 0, spill: 0, boost: 0 };
export const CRIT_MULT = 2;

/**
 * Typing quality of the loading word (S0's numbers): Chuẩn (0 errors) ×1.06
 * damage, +4 % crit; Nhanh (≤ 0.7 of the expected time) ×1.15 fire rate. New
 * in S1, "Băng Chuẩn xuyên Vỏ": a clean magazine meets armour × 0.75. On a
 * chapter's stages it hits `chapterCleanDamage` × (R1 close: 1, no extra
 * damage; its reward is the Vỏ it pierces and the crit). The trial keeps ×1.06.
 */
export const QUALITY = { cleanDamage: 1.06, cleanCrit: 0.04, fastShare: 0.7, fastRate: 1.15, cleanArmour: 0.75, chapterCleanDamage: 1 } as const;

/** Rèn: damage per blow by level (1–3), magazines held by level. */
export const FORGE = { damage: [1, 1.2, 1.4], mags: [MAG_MAX, MAG_MAX, MAG_CAP], max: 3 } as const;

/**
 * Xung: 24 rounds in 2.4 s at the foe nearest the bottom in a 50° cone
 * (cos 25°), a scout shot near the ship first; range a depth (foes up to
 * `range` m beyond the muzzle). S0 numbers.
 */
export const XUNG = { rounds: 24, seconds: 2.4, damage: 7, coneCos: 0.9063, speed: 46, radius: 0.15, life: 1.3, crit: 0.05, shotGuard: 16, range: 10, spread: 0.08 } as const;
/**
 * Xung on a chapter's stages (R1 guns): `rounds` a magazine in the same 2.4 s
 * (with S0's 24 it was the weakest gun of every pair, G3m); the trial keeps
 * S0's magazine (its trace is golden).
 */
export const XUNG_CHAPTER = { rounds: 27 } as const;
/** Tia: a 1.4 m wide ray `length` m long for 2.5 s, 6 a pulse every 0.1 s to every foe it crosses, sweeping 3 m/s. S0 numbers. */
export const TIA = { seconds: 2.5, width: 1.4, sweep: 3, pulse: 0.1, damage: 6, crit: 0.05, strip: 1.2, away: 2.4, length: 12 } as const;
/** Tia on a chapter's stages (R1 close): 7 a pulse, a mine (14) in two pulses for every typist, not only clean ones; tiaDamage: the stage's. */
export const TIA_CHAPTER = { damage: 7 } as const;
export const tiaDamage = (stage: { readonly chapter: number }): number => (stage.chapter > 0 ? TIA_CHAPTER.damage : TIA.damage);
/**
 * Tia's fire control (R1 review, G3c): in a kit without Xung, Tia takes
 * Xung's work too. Its aim weighs foes inside `zone` m (up to +`near` at the
 * line) and holding scouts (+`scout`) besides S0's density, turns to ≈ 84°,
 * sweeps `sweep` × faster and turns to the heaviest strip every `retarget`
 * ticks. With Xung in the kit (the trial's pair) it aims exactly as in S0.
 */
export const TIA_DUTY = { zone: 10, near: 4, scout: 3, sweep: 1.5, retarget: 15 } as const;
/**
 * Tán: 6 volleys in 2.3 s, 7 pellets fanned ±18° each, a 9 m radius, 7 a
 * pellet; a pellet that hits pushes its foe back `knock` m (never the heavy
 * kinds) or knocks a scout shot down. A shield stops pellets (nothing behind
 * it is hurt) but each wears it by `shield` × its damage (R1 close 0.8).
 * Why each number moved (§5.1 had 5 a pellet, 0.35 m, 2 s): the R1 changelogs.
 */
export const TAN = { volleys: 6, seconds: 2.3, damage: 7, range: 9, speed: 40, radius: 0.12, knock: 0.6, crit: 0.05, shield: 0.8 } as const;
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
 * to 6 foes on one line (×0.85 for each one passed), 30 m, 112 a foe, armour
 * counts ×0.25; a shield on the line breaks at once (and counts as one).
 * R1 guns 75 → 95, R1 close 112: two shots a Trâu (220 at k = 1; 2 × 111 =
 * 222), clean or not, twice as fast as a clean Xung (G3).
 */
export const RAY = { shots: 3, seconds: 2.4, charge: 0.15, damage: 112, falloff: 0.85, pierce: 6, range: 30, width: 0.2, armour: 0.25, crit: 0.05 } as const;
/**
 * Ray's fire control in a kit with no near gun (Ray + Pháo Sao; R1 guns, as
 * Tia's TIA_DUTY): the busiest line through foes within `zone` m comes
 * first, a Đầu Đàn alone before it. Without it Ray kept to scouts and Trâu
 * far out while the swarm walked into the line (G3c: 55–70 % on stages 1, 3); R1 close 6 → 8 m.
 */
export const RAY_DUTY = { zone: 8 } as const;
/**
 * Pháo Sao: 4 shells in 3 s, each flying 0.7 s to the heaviest cluster (by
 * hit points still standing) 6–24 m out, bursting 2.5 m round: 23 at the
 * centre falling to 9 at the edge. Shells fall from above: shields do not
 * stop them, and Vỏ meets them × 0.5 (the thin top). §5.1 started at 6
 * shells, 3 m, 26 → 13: a pack died to a shell and every kit with Pháo Sao
 * swept the stages (R1 balance, changelog). R1 review: the near edge 8 → 6 m
 * (G3c tuning: a kit with Pháo Sao and no near gun lost at the line); R1 close 22 → 23.
 */
export const PHAO = { shells: 4, seconds: 3, flight: 0.7, radius: 2.5, damage: 23, edge: 9, near: 6, far: 24, cell: 3, armour: 0.5, crit: 0.05 } as const;

/**
 * Heavy guns (Ray, Pháo Sao) take words `short` / `long` letters longer at the
 * band's ends, at most `cap`; R1 close: the long end only (a letter more on
 * every word cost a sloppy typist far more than one key); what the cap
 * refuses goes to the short end × `spill` (lengthFor).
 */
export const HEAVY = { short: 0, long: 1, cap: 10, spill: 1 } as const;

export type GunSpec = {
  readonly key: GunKey;
  /** Name on the bay and the cards (Chakra Petch caps). */
  readonly name: string;
  /** The English name on a reward card (R2). */
  readonly en: string;
  readonly title: string;
  /** The magazine in a line on a chapter's stage (the loadout's cards); `trial`: how the trial differs ('' when it does not). */
  readonly magazine: string;
  readonly trial: string;
  readonly range: string;
  readonly heavy: boolean;
  /** Armour a blow meets: 1 full, Ray 0.25. */
  readonly armour: number;
  readonly crit: number;
  /** One magazine's damage near the line (the FlowMeter's "words owed") in the trial; Xung's on a chapter's stage: pace.ts kitMagazine. Tia keeps S0's unit (24 × 7) on every stage: a beam's damage depends on what it crosses, and the chapter's 7 a pulse (TIA_CHAPTER) is not folded in, so the director reads a chapter Tia magazine as worth the trial's. */
  readonly nominal: number;
};

export const GUN_SPECS: readonly GunSpec[] = [
  { key: "xung", name: "Pulse Gun", en: "pulse", title: "rapid-fire cannon", magazine: XUNG_CHAPTER.rounds + " rounds in 2.4 s at the foe nearest the line", trial: "Trial: " + XUNG.rounds + " rounds", range: "10\u00a0m", heavy: false, armour: 1, crit: XUNG.crit, nominal: XUNG.rounds * XUNG.damage },
  { key: "tia", name: "Heat Beam", en: "beam", title: "sweeping beam", magazine: "12 m beam burns 2.5 s, sweeps dense groups", trial: "", range: "12\u00a0m", heavy: false, armour: 1, crit: TIA.crit, nominal: XUNG.rounds * XUNG.damage },
  { key: "tan", name: "Scatter Gun", en: "scatter", title: "knockback spread", magazine: "6 bursts × 7 pellets, push back close Swarm", trial: "", range: TAN.range + "\u00a0m", heavy: false, armour: 1, crit: TAN.crit, nominal: TAN.volleys * 7 * TAN.damage },
  { key: "ray", name: "Rail Gun", en: "rail", title: "line-piercing rail", magazine: "3 shots, each pierces 6 and breaks shields", trial: "", range: "30\u00a0m", heavy: true, armour: RAY.armour, crit: RAY.crit, nominal: RAY.shots * RAY.damage },
  { key: "phao", name: "Star Mortar", en: "flak", title: "area-blast mortar", magazine: "4 shells, 2.5 m blasts on heavy groups", trial: "", range: PHAO.near + "\u2060–\u2060" + PHAO.far + "\u00a0m", heavy: true, armour: PHAO.armour, crit: PHAO.crit, nominal: PHAO.shells * PHAO.damage * 1.5 },
];

/**
 * The counter table (docs/BUILD_S1.md §5.2): per row of foes, per gun, 2 ●
 * (counters), 1 ○ (does), 0 ✕ (poor), as measured on a chapter's stage on
 * seeds 1–16 and 17–32: tests/guns.test.ts (G3m; `node --import tsx
 * scripts/counters.ts`) fails when this table differs (a cost within
 * COUNTER_MARGIN of a threshold allows either mark). Last changed: the R1
 * close (changelog 2026-10-25-s1-r1-mac.md).
 */
export const COUNTER_ROWS = ["swarmFar", "swarmNear", "scout", "armoured", "shield", "splitter"] as const;
export type CounterRow = (typeof COUNTER_ROWS)[number];
export const COUNTER_LABELS: Readonly<Record<CounterRow, string>> = {
  swarmFar: "Swarm mid-lane",
  swarmNear: "Swarm at the line",
  scout: "Scouts and shots",
  armoured: "Brute, Pack Leader (armor)",
  shield: "Shield Guard and squad",
  splitter: "Splitter and Shard",
};
export const COUNTERS: Readonly<Record<CounterRow, readonly [number, number, number, number, number]>> = {
  swarmFar: [1, 1, 1, 0, 2],
  swarmNear: [2, 0, 2, 0, 0],
  scout: [2, 1, 0, 2, 0],
  armoured: [0, 0, 0, 2, 0],
  shield: [0, 2, 0, 1, 2],
  splitter: [1, 2, 2, 0, 0],
};
