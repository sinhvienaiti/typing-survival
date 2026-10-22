/**
 * The two gun slots' words (docs/survival/BUILD_S0.md §5). Each slot shows
 * one word; the first key whose letter starts a slot's word locks it (the
 * two first letters always differ), further keys type it, a wrong key is an
 * error (the word stays), Backspace takes a letter back and frees the lock
 * at zero. A finished word loads its gun with the word's quality and the
 * slot takes a new word at once: from the band of E, never the one on the
 * other slot, none again until the band is used up.
 */
import { LENGTH_BY_E, QUALITY } from "../content/rules";
import { EV, FLAG } from "./events";
import { loadMagazine } from "./weapons";
import type { World } from "./world";

const DONE_RING = 1024;

export function createTyping(deck: readonly string[], expected: number) {
  let len: readonly [number, number] = LENGTH_BY_E[0].len;
  for (const entry of LENGTH_BY_E) if (expected >= entry.minE) len = entry.len;
  let band = deck.flatMap((text, index) => (text.length >= len[0] && text.length <= len[1] ? [index] : []));
  if (band.length < 6) band = deck.map((_, index) => index);
  return {
    band: Int32Array.from(band),
    used: new Uint8Array(deck.length),
    /** The locked slot (−1: none). */
    lock: -1,
    word: new Int32Array([-1, -1]),
    typed: new Int32Array(2),
    errors: new Int32Array(2),
    /** Ticks of the word's first and last right key. */
    first: new Int32Array(2),
    last: new Int32Array(2),
    /** Deck indices of the finished words, in order (a ring). */
    done: new Int32Array(DONE_RING),
    doneCount: 0,
  };
}

export type Typing = ReturnType<typeof createTyping>;

/** Deals slot `slot` a word: random start in the band, the first fresh one whose first letter differs from the other slot's. */
export function dealWord(w: World, slot: number): void {
  const T = w.typing;
  const other = T.word[1 - slot]!;
  const otherFirst = other >= 0 ? w.deck[other]!.charCodeAt(0) : -1;
  const n = T.band.length;
  for (let pass = 0; pass < 2; pass += 1) {
    const start = w.rng.words.int(0, n - 1);
    for (let k = 0; k < n; k += 1) {
      const index = T.band[(start + k) % n]!;
      if (T.used[index] === 1 || index === other || w.deck[index]!.charCodeAt(0) === otherFirst) continue;
      T.used[index] = 1;
      T.word[slot] = index;
      T.typed[slot] = 0;
      T.errors[slot] = 0;
      return;
    }
    // The band is used up: start it again.
    for (let k = 0; k < n; k += 1) T.used[T.band[k]!] = 0;
  }
  T.word[slot] = T.band[0]!;
}

function ensureWords(w: World): void {
  if (w.typing.word[0]! < 0) dealWord(w, 0);
  if (w.typing.word[1]! < 0) dealWord(w, 1);
}

export function keyPress(w: World, letter: number): void {
  ensureWords(w);
  const T = w.typing;
  const code = 97 + letter;
  let slot = T.lock;
  if (slot < 0) {
    slot = w.deck[T.word[0]!]!.charCodeAt(0) === code ? 0 : w.deck[T.word[1]!]!.charCodeAt(0) === code ? 1 : -1;
    if (slot < 0) {
      w.stats.keysBad += 1;
      w.events.push(w.tick, EV.keyBad, -1, letter, 0, 0, 0, 0, 0, 0);
      return;
    }
    T.lock = slot;
    T.errors[slot] = 0;
    T.first[slot] = w.tick;
  } else if (w.deck[T.word[slot]!]!.charCodeAt(T.typed[slot]!) !== code) {
    T.errors[slot] = T.errors[slot]! + 1;
    w.stats.keysBad += 1;
    w.events.push(w.tick, EV.keyBad, slot, letter, 0, 0, 0, 0, T.typed[slot]!, 0);
    return;
  }
  T.typed[slot] = T.typed[slot]! + 1;
  T.last[slot] = w.tick;
  w.stats.keysOk += 1;
  w.events.push(w.tick, EV.keyOk, slot, letter, 0, 0, 0, 0, T.typed[slot]!, 0);
  if (T.typed[slot]! >= w.deck[T.word[slot]!]!.length) finish(w, slot);
}

export function backspace(w: World): void {
  const T = w.typing;
  const slot = T.lock;
  if (slot < 0) return;
  T.typed[slot] = Math.max(0, T.typed[slot]! - 1);
  if (T.typed[slot] === 0) T.lock = -1;
}

/**
 * The word's time from its first to its last key, scaled to all its keys,
 * against the expected time at E (12 / E seconds a letter): Nhanh at ≤ 0.7.
 */
export function isFast(length: number, ticks: number, expected: number): boolean {
  const seconds = length > 1 ? ((ticks / 60) * length) / (length - 1) : ticks / 60;
  return seconds <= QUALITY.fastShare * ((length * 12) / expected);
}

function finish(w: World, slot: number): void {
  const T = w.typing;
  const index = T.word[slot]!;
  const clean = T.errors[slot] === 0;
  const fast = isFast(w.deck[index]!.length, T.last[slot]! - T.first[slot]!, w.expected);
  const loaded = loadMagazine(w, slot, clean, fast);
  w.stats.words += 1;
  if (clean) w.stats.clean += 1;
  if (fast) w.stats.fast += 1;
  T.done[T.doneCount % DONE_RING] = index;
  T.doneCount += 1;
  const flags = (clean ? FLAG.clean : 0) | (fast ? FLAG.fast : 0) | (clean && fast ? FLAG.perfect : 0);
  w.events.push(w.tick, EV.word, slot, index, 0, 0, 0, 0, w.guns.mags[slot]!, flags);
  if (loaded) w.events.push(w.tick, EV.load, slot, index, 0, 0, 0, 0, w.guns.mags[slot]!, flags);
  T.lock = -1;
  dealWord(w, slot);
}

/** Deals both slots their first words (before the first step, so the HUD shows them). */
export function dealFirstWords(w: World): void {
  ensureWords(w);
}
