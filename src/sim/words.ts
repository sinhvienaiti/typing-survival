/**
 * The bays' words (docs/BUILD_S0.md §5, docs/BUILD_S1.md §5.1, §7.3). Each
 * bay shows one word; the first key whose letter starts a bay's word locks
 * it (the first letters of all shown words always differ), further keys type
 * it, a wrong key is an error (the word stays), Backspace takes a letter
 * back and frees the lock at zero. A finished word loads its bay's gun with
 * the word's quality and the bay takes a new word at once: from the band of
 * E (a heavy gun's band is a letter longer), never one on another bay, none
 * again until its band is used up. Every deal marks the word used for both
 * bands; a band used up starts again on its own marks only, so a heavy band
 * starting over never frees words the plain band has not finished (R1 review).
 * Thiếu chữ hides one letter of a word (two from 7 letters): never the
 * first, never two side by side, drawn from the hide stream (the kit's `ai`
 * stream, which nothing else draws) so the words are dealt exactly as
 * without the rule; a wrong key on a hidden letter shows it (still an error).
 */
import { lengthFor } from "../content/balance";
import { GUN_SPECS } from "../content/guns";
import { QUALITY } from "../content/guns";
import { MISSING } from "../content/stage-rules";
import { EV, FLAG } from "./events";
import { fullBayWord, loadMagazine } from "./weapons";
import type { World } from "./world";

const DONE_RING = 1024;

function bandOf(deck: readonly string[], len: readonly [number, number]): Int32Array {
  let band = deck.flatMap((text, index) => (text.length >= len[0] && text.length <= len[1] ? [index] : []));
  if (band.length < 6) band = deck.map((_, index) => index);
  return Int32Array.from(band);
}

/** `heavy[b]`: bay b's gun takes the heavy band. */
export function createTyping(deck: readonly string[], expected: number, heavy: readonly boolean[] = [false, false]) {
  const bays = heavy.length;
  return {
    band: bandOf(deck, lengthFor(expected)),
    heavyBand: bandOf(deck, lengthFor(expected, true)),
    heavy: Uint8Array.from(heavy, (on) => (on ? 1 : 0)),
    /** Words dealt since the plain band (used) and the heavy band (usedHeavy) last started over. */
    used: new Uint8Array(deck.length),
    usedHeavy: new Uint8Array(deck.length),
    /** The locked bay (−1: none). */
    lock: -1,
    word: new Int32Array(bays).fill(-1),
    typed: new Int32Array(bays),
    errors: new Int32Array(bays),
    /** Ticks of the word's first and last right key. */
    first: new Int32Array(bays),
    last: new Int32Array(bays),
    /** The tick each bay's word was dealt, and the tick the typist was last free (a word done or a lock let go). */
    dealt: new Int32Array(bays),
    free: 0,
    /** Seconds from the word being there (and the typist free) to its first key. */
    recognize: new Float64Array(bays),
    /** Thiếu chữ: bit i set when letter i is hidden, and when a wrong key showed it. */
    hidden: new Int32Array(bays),
    shown: new Int32Array(bays),
    /** Deck indices of the finished words, in order (a ring). */
    done: new Int32Array(DONE_RING),
    doneCount: 0,
  };
}

export type Typing = ReturnType<typeof createTyping>;

/** The heavy flags of a kit's bays (for createTyping). */
export const heavyBays = (guns: readonly number[], bays: number): boolean[] => Array.from({ length: bays }, (_, b) => (guns[b] !== undefined ? GUN_SPECS[guns[b]!]!.heavy : false));

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

/** Bay `slot`'s word clashes with another bay's: the same word or the same first letter. */
function clashes(w: World, slot: number, index: number): boolean {
  const T = w.typing;
  const first = w.deck[index]!.charCodeAt(0);
  for (let other = 0; other < T.word.length; other += 1) {
    if (other === slot) continue;
    const word = T.word[other]!;
    if (word < 0) continue;
    if (word === index || w.deck[word]!.charCodeAt(0) === first) return true;
  }
  return false;
}

/** Deals bay `slot` a word: random start in its band, the first fresh one whose first letter differs from every other bay's. */
export function dealWord(w: World, slot: number): void {
  const T = w.typing;
  const heavy = T.heavy[slot] === 1;
  const band = heavy ? T.heavyBand : T.band;
  const used = heavy ? T.usedHeavy : T.used;
  const n = band.length;
  for (let pass = 0; pass < 2; pass += 1) {
    const start = w.rng.words.int(0, n - 1);
    for (let k = 0; k < n; k += 1) {
      const index = band[(start + k) % n]!;
      if (used[index] === 1 || clashes(w, slot, index)) continue;
      T.used[index] = 1;
      T.usedHeavy[index] = 1;
      T.word[slot] = index;
      T.typed[slot] = 0;
      T.errors[slot] = 0;
      T.dealt[slot] = w.tick;
      hide(w, slot, index);
      return;
    }
    // The band is used up: start it again.
    for (let k = 0; k < n; k += 1) used[band[k]!] = 0;
  }
  T.word[slot] = band[0]!;
  T.dealt[slot] = w.tick;
  hide(w, slot, band[0]!);
}

/** Thiếu chữ: picks the hidden letters of bay `slot`'s new word. */
function hide(w: World, slot: number, index: number): void {
  const T = w.typing;
  T.hidden[slot] = 0;
  T.shown[slot] = 0;
  if (w.stage.learn !== "missing") return;
  T.hidden[slot] = hiddenMask(w.deck[index]!.length, w.rng.ai);
}

/** Positions to hide in a word of `length` letters (bit mask): 1 or 2, never 0, never side by side. */
export function hiddenMask(length: number, rng: { int(min: number, max: number): number }): number {
  if (length < 2) return 0;
  const first = rng.int(1, length - 1);
  let mask = 1 << first;
  if (length <= MISSING.short) return mask;
  const free: number[] = [];
  for (let p = 1; p < length; p += 1) if (Math.abs(p - first) > 1) free.push(p);
  if (free.length > 0) mask |= 1 << free[rng.int(0, free.length - 1)]!;
  return mask;
}

function ensureWords(w: World): void {
  for (let slot = 0; slot < w.typing.word.length; slot += 1) if (w.typing.word[slot]! < 0) dealWord(w, slot);
}

/** The bay whose word starts with `code`, or −1. */
function bayStarting(w: World, code: number): number {
  const T = w.typing;
  for (let slot = 0; slot < T.word.length; slot += 1) if (w.deck[T.word[slot]!]!.charCodeAt(0) === code) return slot;
  return -1;
}

export function keyPress(w: World, letter: number): void {
  ensureWords(w);
  noteKey(w);
  const T = w.typing;
  const code = 97 + letter;
  let slot = T.lock;
  if (slot < 0) {
    slot = bayStarting(w, code);
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
    // A wrong key on a hidden letter shows it (the hint): the player never guesses more than once.
    if ((T.hidden[slot]! & (1 << T.typed[slot]!)) !== 0) T.shown[slot] = T.shown[slot]! | (1 << T.typed[slot]!);
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
  const receiver = loaded ? slot : fullBayWord(w, slot, clean, fast);
  if (receiver >= 0) w.events.push(w.tick, EV.load, receiver, index, 0, 0, 0, 0, w.guns.mags[receiver]!, flags);
  T.lock = -1;
  T.free = w.tick;
  dealWord(w, slot);
}

/** Deals every bay its first word (before the first step, so the HUD shows them). */
export function dealFirstWords(w: World): void {
  ensureWords(w);
}
