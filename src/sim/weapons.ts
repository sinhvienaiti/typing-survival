/**
 * The bays (docs/BUILD_S0.md §5, docs/BUILD_S1.md §5): each holds one gun of
 * the run's kit at its Rèn level. A finished word loads one magazine (two at
 * most, three at level 3, the firing one included) with the word's quality:
 * damage (Chuẩn, Rèn), fire rate (Nhanh), crit chance, and the share of Vỏ
 * its blows meet (the gun's, × 0.75 for a clean word). Each gun empties its
 * magazines by itself (src/sim/guns/*), in bay order.
 */
import { FORGE, GUN, GUN_SPECS, MAG_CAP, PHAO, QUALITY, RAY, TAN, TIA, XUNG, XUNG_CHAPTER, type GunId } from "../content/guns";
import type { RunKit } from "../content/balance";
import { firePhao } from "./guns/phao";
import { fireRay } from "./guns/ray";
import { fireTan } from "./guns/tan";
import { fireTia } from "./guns/tia";
import { fireXung } from "./guns/xung";
import type { World } from "./world";

export function createGuns(kit: RunKit) {
  const n = kit.bays;
  const slots = n * MAG_CAP;
  const gun = new Int8Array(n).fill(-1);
  const level = new Uint8Array(n).fill(1);
  const cap = new Int32Array(n);
  for (let b = 0; b < n; b += 1) {
    if (kit.guns[b] !== undefined) gun[b] = kit.guns[b]!;
    level[b] = Math.max(1, Math.min(FORGE.max, kit.levels[b] ?? 1));
    cap[b] = gun[b]! >= 0 ? FORGE.mags[level[b]! - 1]! : 0;
  }
  return {
    /** 1 when the kit has no Xung: Tia then holds the line and hunts scouts too (TIA_DUTY). */
    tiaDuty: kit.guns.includes(GUN.xung) ? 0 : 1,
    /** 1 when the kit has no near gun (Xung, Tia, Tán): Ray takes the line first (RAY_DUTY). */
    rayDuty: kit.guns.some((g) => g === GUN.xung || g === GUN.tia || g === GUN.tan) ? 0 : 1,
    /** Per bay: its gun (−1 none), Rèn level, magazines it can hold, magazines held (the firing one included). */
    gun,
    level,
    cap,
    mags: new Int32Array(n),
    /** Per bay × MAG_CAP magazines (the firing one first): damage and fire-rate multipliers, crit chance, Vỏ met, perfect (1). */
    damage: new Float64Array(slots),
    rate: new Float64Array(slots),
    crit: new Float64Array(slots),
    pierce: new Float64Array(slots),
    perfect: new Uint8Array(slots),
    /** Per bay: what is left of the firing magazine (rounds, beam seconds, volleys, shots, shells) and the time to the next. */
    left: new Float64Array(n),
    cooldown: new Float64Array(n),
    /** Per bay: the aim (a unit direction from the muzzle). */
    aimX: new Float64Array(n),
    aimZ: new Float64Array(n).fill(1),
    /** Tia: the ray burning, its far-line aim, where it sweeps to, time to its next pulse. */
    beamOn: new Uint8Array(n),
    beamX: new Float64Array(n),
    beamTo: new Float64Array(n),
    beamPulse: new Float64Array(n),
    /** Ray: seconds of charge left (0: none), the foe it aims at. */
    charge: new Float64Array(n),
    target: new Int32Array(n).fill(-1),
    targetId: new Int32Array(n),
  };
}

export type Guns = ReturnType<typeof createGuns>;

/** One magazine's units by gun: rounds, beam seconds, volleys, shots, shells (Xung: the trial's; xungRounds for a world). */
export const MAGAZINE_UNITS: Readonly<Record<GunId, number>> = { [GUN.xung]: XUNG.rounds, [GUN.tia]: TIA.seconds, [GUN.tan]: TAN.volleys, [GUN.ray]: RAY.shots, [GUN.phao]: PHAO.shells };

/** Xung's rounds a magazine in a world: S0's in the trial, XUNG_CHAPTER's on a chapter's stages. */
export const xungRounds = (stage: { readonly chapter: number }): number => (stage.chapter > 0 ? XUNG_CHAPTER.rounds : XUNG.rounds);

/** One magazine's units of `gun` on `stage`. */
export const magazineUnits = (stage: { readonly chapter: number }, gun: GunId): number => (gun === GUN.xung ? xungRounds(stage) : MAGAZINE_UNITS[gun]);

/** The bay holding `gun`, or −1. */
export function bayOf(w: World, gun: GunId): number {
  for (let b = 0; b < w.guns.gun.length; b += 1) if (w.guns.gun[b] === gun) return b;
  return -1;
}

/** A finished word loads bay `bay`'s gun; false when it is full (or the bay has none). */
export function loadMagazine(w: World, bay: number, clean: boolean, fast: boolean): boolean {
  const G = w.guns;
  const gun = G.gun[bay]!;
  const k = G.mags[bay]!;
  if (gun < 0 || k >= G.cap[bay]!) return false;
  const spec = GUN_SPECS[gun]!;
  const i = bay * MAG_CAP + k;
  G.damage[i] = (clean ? QUALITY.cleanDamage * (w.stage.chapter > 0 ? QUALITY.chapterClean : 1) : 1) * FORGE.damage[G.level[bay]! - 1]!;
  G.crit[i] = spec.crit + (clean ? QUALITY.cleanCrit : 0);
  G.rate[i] = fast ? QUALITY.fastRate : 1;
  G.pierce[i] = spec.armour * (clean ? QUALITY.cleanArmour : 1);
  G.perfect[i] = clean && fast ? 1 : 0;
  G.mags[bay] = k + 1;
  if (k === 0) G.left[bay] = magazineUnits(w.stage, gun as GunId);
  return true;
}

/** Bay `bay`'s firing magazine is spent: the queued ones move up; true while one is left. */
export function nextMagazine(G: Guns, bay: number): boolean {
  const i = bay * MAG_CAP;
  for (let k = 0; k + 1 < MAG_CAP; k += 1) {
    G.damage[i + k] = G.damage[i + k + 1]!;
    G.rate[i + k] = G.rate[i + k + 1]!;
    G.crit[i + k] = G.crit[i + k + 1]!;
    G.pierce[i + k] = G.pierce[i + k + 1]!;
    G.perfect[i + k] = G.perfect[i + k + 1]!;
  }
  G.mags[bay] = G.mags[bay]! - 1;
  return G.mags[bay]! > 0;
}

/** The firing magazine's index of bay `bay`. */
export const firing = (bay: number): number => bay * MAG_CAP;

export function fireGuns(w: World, dt: number): void {
  const G = w.guns;
  for (let b = 0; b < G.gun.length; b += 1) {
    if (G.mags[b]! <= 0) continue;
    switch (G.gun[b]) {
      case GUN.xung:
        fireXung(w, b, dt);
        break;
      case GUN.tia:
        fireTia(w, b, dt);
        break;
      case GUN.tan:
        fireTan(w, b, dt);
        break;
      case GUN.ray:
        fireRay(w, b, dt);
        break;
      case GUN.phao:
        firePhao(w, b, dt);
        break;
    }
  }
}
