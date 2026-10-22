/**
 * A typing bot for Sinh Tồn tests and the balance print: it types the slot
 * whose gun holds fewer magazines (Tia on a tie) at `wpm` (5 letters a
 * word), pauses `pause` s after each word to read the next, and presses a
 * wrong letter at `errors` per key. Deterministic (its own LCG).
 */
import { readFileSync } from "node:fs";
import { buildDeck } from "../../src/survival/content/deck";
import type { CommandBody, World } from "../../src/survival/sim/world";

export type Bot = { wpm: number; errors: number; pause: number; carry: number; wait: number; seed: number; sent: CommandBody[] };

export const bot = (wpm: number, errors = 0, pause = 0.25): Bot => ({ wpm, errors, pause, carry: 0, wait: 0, seed: 12345, sent: [] });

function random(b: Bot): number {
  b.seed = (Math.imul(b.seed, 1103515245) + 12345) >>> 0;
  return b.seed / 4294967296;
}

/** This tick's keys. */
export function botKeys(w: World, b: Bot): CommandBody[] {
  const out: CommandBody[] = [];
  if (b.wait > 0) {
    b.wait -= 1 / 60;
    return out;
  }
  b.carry += (b.wpm * 5) / 60 / 60;
  while (b.carry >= 1) {
    b.carry -= 1;
    const T = w.typing;
    let slot = T.lock;
    if (slot < 0) slot = w.guns.mags[0]! < w.guns.mags[1]! ? 0 : 1;
    const text = w.deck[T.word[slot]!]!;
    const typed = T.lock < 0 ? 0 : T.typed[slot]!;
    let letter = text.charCodeAt(typed) - 97;
    if (b.errors > 0 && typed > 0 && random(b) < b.errors) letter = (letter + 1 + Math.floor(random(b) * 24)) % 26;
    out.push({ t: "key", letter });
    if (letter === text.charCodeAt(typed) - 97 && typed + 1 === text.length) {
      b.wait = b.pause;
      break;
    }
  }
  b.sent.push(...out);
  return out;
}

/** Levels 1–3 of the shared vocabulary, as the page builds its deck. */
export function sharedDeck(): string[] {
  const level = (n: number) => JSON.parse(readFileSync(new URL("../../../../shared/vocabulary/levels/" + String(n).padStart(3, "0") + ".json", import.meta.url), "utf8")).entries as { en: string }[];
  return buildDeck([level(1), level(2), level(3)]);
}
