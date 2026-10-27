import { describe, expect, it } from "vitest";
import { CleanStreak, KEY_MARK, NOTE_HZ, POP, WORD_HZ, bounce, fullBlink, keyMarkLive, noteHz, sparkLevel, popColour, popDrop, popGlow, popScale, streakTier, sweepAlpha, sweepLength, swell } from "../src/view/type-rules";

/**
 * The typing feel's rules (docs/FEEL_PASS_S1.md §3): the notes a word climbs,
 * the clean streak (display only) and its tiers, the curves of a typed
 * letter's pop, a finished word's swell, a stray key's bounce and a full
 * bay's blink. View only: the sim never reads them.
 */
describe("typing feel", () => {
  it("a key's mark is whole on its own frame, its ring out past the painted one, and 10 keys a second hold ≤ 12 billboards and strips (§12, §6)", () => {
    expect(keyMarkLive(0)).toBe(9);
    // The word line's spark on the letter: whole at f0, still lit at f3, gone by f5 (§13).
    expect(sparkLevel(0)).toBe(1);
    expect(sparkLevel(3 * (1000 / 60))).toBeGreaterThan(0.3);
    expect(sparkLevel(5 * (1000 / 60))).toBe(0);
    expect(keyMarkLive(-0.01)).toBe(0);
    expect(keyMarkLive(KEY_MARK.ringLife)).toBe(0);
    // The ring's radius is 0.4 of its width: from beside the hull to past the deck's painted ring (2.6 m).
    expect(KEY_MARK.ring[0] * 0.4).toBeGreaterThanOrEqual(1.2);
    expect(KEY_MARK.ring[1] * 0.4).toBeGreaterThan(2.6);
    let peak = 0;
    for (let t = 0; t < 1; t += 1 / 240) {
      let live = 0;
      for (let key = 0; key * 0.1 <= t; key += 1) live += keyMarkLive(t - key * 0.1);
      peak = Math.max(peak, live);
    }
    expect(peak).toBeLessThanOrEqual(12);
  });

  it("letters climb the A-minor pentatonic from A3 and a word lands on A5 (§3.5)", () => {
    expect(NOTE_HZ.length).toBe(10);
    expect(NOTE_HZ[0]).toBe(220);
    expect(NOTE_HZ[5]).toBe(440);
    expect(WORD_HZ).toBe(880);
    // A, C, D, E, G: semitones 0, 3, 5, 7, 10 above A, twice.
    const semis = NOTE_HZ.map((hz) => Math.round(12 * Math.log2(hz / 220)));
    expect(semis).toEqual([0, 3, 5, 7, 10, 12, 15, 17, 19, 22]);
    for (let i = 1; i < NOTE_HZ.length; i += 1) expect(NOTE_HZ[i]!).toBeGreaterThan(NOTE_HZ[i - 1]!);
    expect(noteHz(1)).toBe(220);
    expect(noteHz(10)).toBeCloseTo(783.99, 2);
    // Past the table (a long word) the top note holds; before the first letter, the first.
    expect(noteHz(13)).toBe(noteHz(10));
    expect(noteHz(0)).toBe(220);
  });

  it("a clean streak counts clean words, breaks on a wrong key inside a word, never on a stray key (§3.6)", () => {
    const streak = new CleanStreak();
    const ups: boolean[] = [];
    for (let k = 0; k < 6; k += 1) ups.push(streak.word(true));
    expect(streak.n).toBe(6);
    // streak.up plays at 3 and 6.
    expect(ups).toEqual([false, false, true, false, false, true]);
    expect(streak.bad(false)).toBe(0);
    expect(streak.n).toBe(6);
    expect(streak.bad(true)).toBe(6);
    expect(streak.n).toBe(0);
    // A word with an error (its wrong key already broke it) stays at 0.
    expect(streak.word(false)).toBe(false);
    expect(streak.n).toBe(0);
    for (let k = 0; k < 20; k += 1) streak.word(true);
    expect(streak.tier).toBe(4);
  });

  it("tiers start at 3, 6, 10 and 20 clean words", () => {
    expect([0, 2, 3, 5, 6, 9, 10, 19, 20, 50].map(streakTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("a typed letter pops 1.25× and 6 px low, 1.12× at f1, ~1.03× at f3, and stands still from 100 ms (§3.1)", () => {
    const f = 1000 / 60;
    expect(popScale(0)).toBeCloseTo(1.25, 6);
    expect(popDrop(0)).toBeCloseTo(6, 6);
    expect(popScale(f)).toBeGreaterThan(1.1);
    expect(popScale(f)).toBeLessThan(1.14);
    expect(popDrop(f)).toBeCloseTo(3, 0);
    expect(popScale(3 * f)).toBeGreaterThan(1.02);
    expect(popScale(3 * f)).toBeLessThan(1.04);
    expect(popScale(POP.settle)).toBe(1);
    expect(popDrop(POP.settle)).toBe(0);
    expect(popScale(-5)).toBe(1);
    // The gun's ink from the first frame (65 %, the rest white-hot), all gun by 120 ms; its glow gone at 160 ms.
    expect(popColour(0)).toBeCloseTo(0.65, 6);
    expect(popColour(60)).toBeGreaterThan(0.8);
    expect(popColour(120)).toBe(1);
    // The sweep line shows on f0 (40 %), is whole by 50 ms and stays as the typed part's underline (55 %).
    expect(sweepLength(0)).toBeCloseTo(0.4, 6);
    expect(sweepLength(50)).toBe(1);
    expect(sweepAlpha(0)).toBe(1);
    expect(sweepAlpha(400)).toBeCloseTo(POP.line, 6);
    for (let t = 50; t < 400; t += 10) expect(sweepAlpha(t + 10)).toBeLessThanOrEqual(sweepAlpha(t));
    expect(popGlow(0)).toBe(1);
    expect(popGlow(160)).toBe(0);
    for (let t = 0; t < 100; t += 5) expect(popScale(t + 5)).toBeLessThanOrEqual(popScale(t));
  });

  it("a finished word swells to 1.06 and back in 160 ms; a stray key's bounce is 1.15× for 200 ms; a full bay blinks twice", () => {
    expect(swell(0)).toBe(1);
    expect(swell(80)).toBeCloseTo(1.06, 6);
    expect(swell(160)).toBe(1);
    expect(bounce(0)).toBeCloseTo(1.15, 6);
    expect(bounce(200)).toBe(1);
    const lit = [0, 60, 119, 120, 200, 239, 240, 300, 359, 360, 500].map(fullBlink);
    expect(lit).toEqual([true, true, true, false, false, false, true, true, true, false, false]);
  });
});
