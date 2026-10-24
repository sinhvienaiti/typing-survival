/**
 * Small sim scenes for the gun rules and gates G3 / G3m (docs/BUILD_S1.md
 * §5.2, §11.4): a world with chosen guns on its bays, no horde of its own
 * (no vanguard, no spawns), endless armour, foes placed by hand (standing
 * still or walking), and magazines fed at a typist's letter rate (a heavy
 * gun's words are a letter longer, so the same letters load it less often).
 */
import { lengthFor } from "../../src/content/balance";
import { GUN_SPECS, type GunId } from "../../src/content/guns";
import { placeFoe } from "../../src/sim/spawn";
import { loadMagazine } from "../../src/sim/weapons";
import { createWorld, step, type World } from "../../src/sim/world";
import { sharedDeck } from "./typist-bot";

const deck = sharedDeck();
export const ENDLESS = 1e9;

export function arena(guns: readonly GunId[], options: { levels?: readonly number[]; seed?: number; tier?: "low" | "medium" | "high" | "ultra"; stage?: string } = {}): World {
  const w = createWorld({
    seed: options.seed ?? 1,
    deck,
    tier: options.tier,
    stage: options.stage,
    director: false,
    kit: { guns, levels: options.levels ?? guns.map(() => 1), bays: guns.length, armour: 100 },
  });
  w.spawn.packs = 1;
  w.spawn.owed = -1e12;
  w.hp = ENDLESS;
  w.seconds = 1e9;
  return w;
}

/** Foes stand still (they still sway a little). */
export function freeze(w: World): void {
  w.scales = { ...w.scales, speed: 0 };
}

export function place(w: World, kind: number, x: number, z: number): number {
  return placeFoe(w, kind, x, z);
}

/** Armour lost since the scene began. */
export const lost = (w: World): number => ENDLESS - w.hp;

export type Feed = { clock: number[]; clean: (n: number) => boolean; fed: number[]; share: number };

/**
 * A typist feeding the bays: one word for a bay every share × (recognition
 * + its letters at E) seconds (ℓ̄ of E's band, +1 for a heavy gun; `share`
 * 2: the typist also feeds another bay, as in a fight). A full gun waits
 * (a word typed into it would load nothing), banking at most one word.
 * `clean(n)` says whether the n-th magazine is clean.
 */
export function feeder(clean: (n: number) => boolean = () => false, share = 2): Feed {
  return { clock: [], clean, fed: [], share };
}

/** Seconds a word of `letters` takes at `wpm` with 0.5 s to recognise it. */
export const wordSeconds = (letters: number, wpm: number): number => 0.5 + (letters * 12) / wpm;

export function feed(w: World, f: Feed, wpm = 35): void {
  const G = w.guns;
  for (let b = 0; b < G.gun.length; b += 1) {
    if (f.fed[b] === undefined) {
      f.fed[b] = 0;
      f.clock[b] = Infinity;
    }
    const [lo, hi] = lengthFor(w.expected, GUN_SPECS[G.gun[b]!]!.heavy);
    const every = f.share * wordSeconds((lo + hi) / 2, wpm);
    f.clock[b] = Math.min(every, f.clock[b]! + 1 / 60);
    if (G.mags[b]! >= G.cap[b]! || f.clock[b]! < every) continue;
    f.clock[b] = f.clock[b]! - every;
    loadMagazine(w, b, f.clean(f.fed[b]!), false);
    f.fed[b] = f.fed[b]! + 1;
  }
}

/** Steps (feeding) until `done` or `seconds`; returns the seconds it took (Infinity: not done). */
export function runUntil(w: World, f: Feed | null, done: (w: World) => boolean, seconds = 90, wpm = 35): number {
  const start = w.time;
  while (w.time - start < seconds) {
    if (f !== null) feed(w, f, wpm);
    step(w);
    if (done(w)) return w.time - start;
  }
  return Infinity;
}

export const cleared = (w: World): boolean => w.foes.count === 0;
