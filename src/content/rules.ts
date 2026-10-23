/**
 * The field's rule numbers (docs/BUILD_S0.md §3–§5; guns in content/guns.ts,
 * foes in content/foes.ts since S1). Metres, seconds, hit points. The corridor runs along +z from the ship (z = 0) to
 * the gate (z = 40; BUILD_S0 had 60, shortened in the S0 review so the camera
 * comes closer and foes read bigger: docs/BUILD_NOTES.md §7); x is
 * across, −12 … 12.
 */
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;
/** Steps a frame may run at most (a slow frame does not try to catch up further). */
export const MAX_STEPS_PER_FRAME = 8;

/** The grid's 2 m cells cover z from `minZ` to the queue above the gate (gateZ + 12, where foes are held). */
export const FIELD = { halfW: 12, gateZ: 40, bottomZ: 2.4, muzzleZ: 1.7, wall: 0.7, cell: 2, cols: 12, rows: 30, minZ: -4 } as const;
export const SHIP = { hp: 100 } as const;

/**
 * The near zone (docs/games/BALANCE.md §3 "vòng gần", §5): foes at z ≤ `z`
 * are a real threat. It is where the press is slowest, a few seconds from
 * the bottom line; the floor glows there (view/scene.ts).
 */
export const NEAR = { z: 7 } as const;

/**
 * Continuous pressure (BALANCE.md §5): the Bầy Hố Đen leaches the line's
 * armour from `from` m in, harder the closer it comes: a foe at depth z
 * takes `perFoe` × (from − z) / (from − bottom line) HP a second, times its
 * drain weight (mine 1, scout 2); all of it counts as at most `maxLeech`
 * foes at the line (a pile does not melt the line in a moment). Whole points come off as they add up
 * (EV.drain). A foe the guns stop far out costs almost nothing; one that walks
 * deep costs more the longer it lives there, so a faster, cleaner typist
 * loses less armour, smoothly, and breaches are the overflow on top.
 */
export const DRAIN = { from: 16, perFoe: 0.08, maxLeech: 12 } as const;

/**
 * The elite affix "Bọc Thép" (S0 called it "Giáp"; renamed in S1 so it
 * does not clash with the line's GIÁP bar or the foes' Vỏ): every member of
 * a plain pack (mines, scouts, Tách) spawns with `hp` × its hit points and
 * is drawn larger with gold veins. From `from` s, every `every`-th pack
 * carries it; the pace director adds one to the next plain pack or takes it
 * off the next armoured one (never a live foe's hit points).
 */
export const ELITE = { hp: 2, every: 9, from: 20 } as const;

/** The director's support drop near defeat (BALANCE.md §4.2): a repair pod, `hp` armour, at most once a wave. */
export const SUPPORT = { hp: 20 } as const;

/** Path fraction at a kill (BALANCE.md §3 "Q"): from the gate (z = `from`) to the bottom line. */
export const PATH = { from: 40 } as const;

/**
 * The press: foes walk in at full stride and slow as they close on the ship
 * (`slow` × their speed from `near` m in, full from `far` m out, smooth in
 * between), so a horde piles up into a wall in front of the guns instead of
 * streaming through (S0 review: the fight belongs to the whole field).
 */
export const PRESS = { near: 6, far: 24, slow: 0.4 } as const;

/**
 * Scouts stop 6–9 m out (BUILD_S0 had 30–40 m of a 60 m corridor: out of
 * reach of the shorter guns they shot the ship freely), fire a slow shot
 * every 3 s, and walk on after `holdS`.
 */
export const SCOUT = { holdMin: 6, holdMax: 9, fireEvery: 3, holdS: 12, shotSpeed: 6, shotDamage: 3, shotRadius: 0.35, shotLife: 9 } as const;

/** Funnel: how strongly the flow field bends toward the ship as foes come close (0 from `from` m out). */
export const FLOW = { pull: 0.55, from: 30 } as const;
/** Spawned in groups of 4–12 in a block, wedge or line, `spacing` apart, above the gate. */
export const SPAWN = { groupMin: 4, groupMax: 12, spacing: 1.35, scoutShare: 0.15, scoutFromS: 12 } as const;

/** The typist's expected speed E (WPM) and word length band by E (as Typing Defense). */
export const EXPECTED_WPM = 35;
export const LENGTH_BY_E = [
  { minE: 0, len: [3, 5] },
  { minE: 20, len: [3, 6] },
  { minE: 45, len: [4, 7] },
  { minE: 60, len: [6, 10] },
] as const;

/** World speed during a hit stop. */
export const HITSTOP_SCALE = 0.05;

/** Store sizes (the Ultra crowd cap fits). Bullets hold Xung rounds and Tán pellets; shells are Pháo Sao's. */
export const STORE = { foes: 1024, bullets: 2048, shots: 256, shells: 64 } as const;
/** Foes on the field at most per quality tier: the rest wait at the gate (never lost). */
export const FOE_CAP = { low: 200, medium: 400, high: 700, ultra: 1000 } as const;
export type Tier = keyof typeof FOE_CAP;
export const BULLET_CAP = { low: 500, medium: 1000, high: 2000, ultra: 2000 } as const;
