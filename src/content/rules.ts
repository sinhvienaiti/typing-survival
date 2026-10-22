/**
 * Every rule number of Sinh Tồn S0 (docs/survival/BUILD_S0.md §3–§5). Metres,
 * seconds, hit points. The corridor runs along +z from the ship (z = 0) to
 * the gate (z = 60); x is across, −12 … 12.
 */
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;
/** Steps a frame may run at most (a slow frame does not try to catch up further). */
export const MAX_STEPS_PER_FRAME = 8;

export const FIELD = { halfW: 12, gateZ: 60, bottomZ: 2.4, muzzleZ: 1.7, wall: 0.7, cell: 2, cols: 12, rows: 40, minZ: -4 } as const;
export const SHIP = { hp: 100 } as const;

export const KIND = { mine: 0, scout: 1 } as const;
export type FoeKind = (typeof KIND)[keyof typeof KIND];

/** Per kind: hit points, speed (m/s), body radius, ship damage on reaching the bottom line. */
export const FOES = [
  { hp: 14, speed: 3.2, radius: 0.5, breach: 3, wobble: 0.55, wobbleHz: 0.32 },
  { hp: 56, speed: 1.8, radius: 0.8, breach: 6, wobble: 0.15, wobbleHz: 0.2 },
] as const;

/** Scouts stop 30–40 m out, fire a slow shot every 3 s, and walk on after `holdS`. */
export const SCOUT = { holdMin: 30, holdMax: 40, fireEvery: 3, holdS: 12, shotSpeed: 6, shotDamage: 4, shotRadius: 0.35, shotLife: 9 } as const;

/** Funnel: how strongly the flow field bends toward the ship as foes come close (0 at the gate). */
export const FLOW = { pull: 0.55, from: 44 } as const;
/** Spawned in groups of 4–12 in a block, wedge or line, `spacing` apart, above the gate. */
export const SPAWN = { groupMin: 4, groupMax: 12, spacing: 1.35, scoutShare: 0.15, scoutFromS: 12 } as const;

export const WEAPON = { xung: 0, tia: 1 } as const;
/** Magazines a gun holds at most (the one firing included). */
export const MAG_MAX = 2;
/**
 * Xung: 24 rounds in 2.4 s at the foe nearest the bottom in a 50° cone (cos 25°).
 * Range and spread are not in §5: tuned with the bots (scripts/survival/balance.ts)
 * so a 35 WPM typist sees 40–80 foes (BUILD_NOTES.md).
 */
export const XUNG = { rounds: 24, seconds: 2.4, damage: 7, coneCos: 0.9063, speed: 46, radius: 0.15, life: 1.3, crit: 0.05, shotGuard: 16, range: 42, spread: 0.08 } as const;
/** Tia: a 1.4 m column for 2.5 s, `length` m long from the ship; 6 a pulse every 0.1 s to every foe inside; sweeps 3 m/s. */
export const TIA = { seconds: 2.5, width: 1.4, sweep: 3, pulse: 0.1, damage: 6, crit: 0.05, strip: 1.2, away: 2.4, length: 24 } as const;
export const CRIT_MULT = 2;
/** Typing quality of the loading word: Chuẩn (0 errors), Nhanh (≤ 0.7 of the expected time). */
export const QUALITY = { cleanDamage: 1.15, cleanCrit: 0.1, fastShare: 0.7, fastRate: 1.15 } as const;

/** The typist's expected speed E (WPM) and word length band by E (as Typing Defense). */
export const EXPECTED_WPM = 35;
export const LENGTH_BY_E = [
  { minE: 0, len: [3, 5] },
  { minE: 25, len: [3, 6] },
  { minE: 45, len: [4, 7] },
  { minE: 65, len: [4, 8] },
] as const;

/** World speed during a hit stop. */
export const HITSTOP_SCALE = 0.05;

/** Store sizes (the Ultra crowd cap fits). */
export const STORE = { foes: 1024, bullets: 2048, shots: 256 } as const;
/** Foes on the field at most per quality tier: the rest wait at the gate (never lost). */
export const FOE_CAP = { low: 200, medium: 400, high: 700, ultra: 1000 } as const;
export type Tier = keyof typeof FOE_CAP;
export const BULLET_CAP = { low: 500, medium: 1000, high: 2000, ultra: 2000 } as const;
