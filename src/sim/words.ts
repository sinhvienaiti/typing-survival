/**
 * The two gun slots' words (docs/BUILD_S0.md §5). Each slot shows
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
    /** The tick each slot's word was dealt, and the tick the typist was last free (a word done or a lock let go). */
    dealt: new Int32Array(2),
    free: 0,
    /** Seconds from the word being there (and the typist free) to its first key. */
    recognize: new Float64Array(2),
    /** Deck indices of the finished words, in order (a ring). */
    done: new Int32Array(DONE_RING),
    doneCount: 0,
  };
}

export type Typing = ReturnType<typeof createTyping>;

/**
 * What the run measures of the typist for the skill profile (BALANCE.md §2;
 * app/skill.ts makes the sample). Speed E and its spread (CV of the time per
 * letter) come from the words typed without a wrong key (first to last key,
 * scaled to all keys, as Nhanh): a wrong key's time is accuracy's cost, which
 * a measures. Also the time from a word being there (and the typist free) to
 * its first key, and the longest stretch without a key (AFK).
 */
export function createMeasure() {
  return { words: 0, letters: 0, seconds: 0, perLetter: 0, perLetterSq: 0, recognize: 0, recognized: 0, lastKey: 0, longestGap: 0 };
}

export type Measure = ReturnType<typeof createMeasure>;

function noteKey(w: World): void {
  const M = w.measure;
  if (w.tick - M.lastKey > M.longestGap) M.longestGap = w.tick - M.lastKey;
  M.lastKey = w.tick;
}

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
      T.dealt[slot] = w.tick;
      return;
    }
    // The band is used up: start it again.
    for (let k = 0; k < n; k += 1) T.used[T.band[k]!] = 0;
  }
  T.word[slot] = T.band[0]!;
  T.dealt[slot] = w.tick;
}

function ensureWords(w: World): void {
  if (w.typing.word[0]! < 0) dealWord(w, 0);
  if (w.typing.word[1]! < 0) dealWord(w, 1);
}

export function keyPress(w: World, letter: number): void {
  ensureWords(w);
  noteKey(w);
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
    T.recognize[slot] = (w.tick - Math.max(T.dealt[slot]!, T.free)) / 60;
    w.measure.recognize += T.recognize[slot]!;
    w.measure.recognized += 1;
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
  noteKey(w);
  w.stats.backspaces += 1;
  if (slot < 0) return;
  T.typed[slot] = Math.max(0, T.typed[slot]! - 1);
  if (T.typed[slot] === 0) {
    // The lock let go: a word dropped (BALANCE.md §3 "bỏ khóa").
    T.lock = -1;
    T.free = w.tick;
    w.stats.drops += 1;
    w.pace.drops += 1;
  }
}

/** A word's time (s) from first to last key, scaled to all its keys (one key: one key's worth at E). */
export function wordSeconds(length: number, ticks: number, expected: number): number {
  return length > 1 ? ((ticks / 60) * length) / (length - 1) : 12 / expected;
}

/**
 * The word's time from its first to its last key, scaled to all its keys,
 * against the expected time at E (12 / E seconds a letter): Nhanh at ≤ 0.7.
 */
export function isFast(length: number, ticks: number, expected: number): boolean {
  const seconds = length > 1 ? ((ticks / 60) * length) / (length - 1) : ticks / 60;
  return seconds <= QUALITY.fastShare * ((length * 12) / expected);
}

/** A clean word into the speed measure; returns its seconds. */
function measureWord(w: World, length: number, ticks: number, clean: boolean): number {
  const M = w.measure;
  const seconds = wordSeconds(length, ticks, w.expected);
  if (!clean) return seconds;
  const perLetter = seconds / length;
  M.words += 1;
  M.letters += length;
  M.seconds += seconds;
  M.perLetter += perLetter;
  M.perLetterSq += perLetter * perLetter;
  return seconds;
}

function finish(w: World, slot: number): void {
  const T = w.typing;
  const index = T.word[slot]!;
  const clean = T.errors[slot] === 0;
  const fast = isFast(w.deck[index]!.length, T.last[slot]! - T.first[slot]!, w.expected);
  const seconds = measureWord(w, w.deck[index]!.length, T.last[slot]! - T.first[slot]!, clean);
  const loaded = loadMagazine(w, slot, clean, fast);
  w.stats.words += 1;
  if (clean) w.stats.clean += 1;
  if (fast) w.stats.fast += 1;
  T.done[T.doneCount % DONE_RING] = index;
  T.doneCount += 1;
  const flags = (clean ? FLAG.clean : 0) | (fast ? FLAG.fast : 0) | (clean && fast ? FLAG.perfect : 0);
  // dx: the word's seconds, dz: seconds to its first key, x: wrong keys (for the page's skill sample by familiarity).
  w.events.push(w.tick, EV.word, slot, index, T.errors[slot]!, 0, seconds, T.recognize[slot]!, w.guns.mags[slot]!, flags);
  if (loaded) w.events.push(w.tick, EV.load, slot, index, 0, 0, 0, 0, w.guns.mags[slot]!, flags);
  T.lock = -1;
  T.free = w.tick;
  dealWord(w, slot);
}

/** Deals both slots their first words (before the first step, so the HUD shows them). */
export function dealFirstWords(w: World): void {
  ensureWords(w);
}
