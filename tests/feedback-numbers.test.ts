import { describe, expect, it } from "vitest";
import { NumberField, STYLE } from "../src/feedback/numbers";

/**
 * Damage numbers (docs/survival/BUILD_S0.md §6): blows on one target within
 * 150 ms roll up, beam ticks over 0.3 s with "×N", the cap drops the
 * smallest first (never T3 and up), and no number covers a protected
 * rectangle (the learning frame, the gun slots, the health bar).
 */
const field = () => {
  const f = new NumberField();
  f.fontPx = 20;
  f.limit = 160;
  return f;
};
const live = (f: NumberField) => [...f.alive].map((alive, i) => (alive === 1 ? i : -1)).filter((i) => i >= 0);

describe("rolling up", () => {
  it("adds blows on one target within 150 ms into one number that pops again", () => {
    const f = field();
    const a = f.spawn(7, 400, 300, 7, STYLE.normal, 1, 1, 0.45, 0, -1, 1.0);
    f.update(0.05);
    const b = f.spawn(7, 410, 300, 7, STYLE.crit, 2, 1.3, 0.6, 0, -1, 1.1);
    expect(b).toBe(a);
    expect(f.value[a]).toBe(14);
    expect(f.style[a]).toBe(STYLE.crit);
    expect(f.pop[a]).toBe(1);
    expect(f.live).toBe(1);
    // After the window a new number starts; another target is another number.
    expect(f.spawn(7, 400, 300, 7, STYLE.normal, 1, 1, 0.45, 0, -1, 1.2)).not.toBe(a);
    expect(f.spawn(8, 400, 300, 7, STYLE.normal, 1, 1, 0.45, 0, -1, 1.2)).not.toBe(a);
    expect(f.live).toBe(3);
  });

  it("rolls beam ticks up over 0.3 s and shows ×N", () => {
    const f = field();
    const i = f.spawn(3, 500, 200, 6, STYLE.tick, 1, 1, 0.45, 1, 0, 0);
    for (let k = 1; k <= 5; k += 1) f.spawn(3, 500, 200, 6, STYLE.tick, 1, 1, 0.45, 1, 0, k * 0.05);
    expect(f.text(i)).toBe("36×6");
    expect(f.spawn(3, 500, 200, 6, STYLE.tick, 1, 1, 0.45, 1, 0, 0.35)).not.toBe(i);
    // A tick and a round on the same target stay apart.
    expect(f.spawn(3, 500, 200, 7, STYLE.normal, 1, 1, 0.45, 1, 0, 0.36)).not.toBe(i);
  });

  it("flies along its blow, then fades out", () => {
    const f = field();
    const i = f.spawn(1, 300, 300, 9, STYLE.normal, 1, 1, 0.45, 1, 0, 0);
    const x = f.x[i]!;
    f.update(0.1);
    expect(f.x[i]).toBeGreaterThan(x);
    f.update(0.5);
    expect(f.alive[i]).toBe(0);
  });
});

describe("the cap", () => {
  it("drops the smallest number below T3 first, and never a T3 one", () => {
    const f = field();
    f.limit = 4;
    f.spawn(1, 100, 100, 5, STYLE.normal, 1, 1, 1, 0, -1, 0);
    f.spawn(2, 200, 100, 9, STYLE.normal, 1, 1, 1, 0, -1, 0);
    f.spawn(3, 300, 100, 30, STYLE.perfect, 3, 1.6, 1, 0, -1, 0);
    f.spawn(4, 400, 100, 2, STYLE.normal, 1, 1, 1, 0, -1, 0);
    expect(f.live).toBe(4);
    // A bigger one replaces the smallest (2); a smaller one is dropped.
    f.spawn(5, 500, 100, 12, STYLE.crit, 2, 1.3, 1, 0, -1, 0);
    expect(live(f).map((i) => f.value[i]).sort((a, b) => a! - b!)).toEqual([5, 9, 12, 30]);
    expect(f.spawn(6, 600, 100, 1, STYLE.normal, 1, 1, 1, 0, -1, 0)).toBe(-1);
    // T3 blows push out small ones but the T3 numbers themselves stay.
    for (let k = 0; k < 6; k += 1) f.spawn(10 + k, 100 + k * 50, 200, 3, STYLE.perfect, 3, 1.6, 1, 0, -1, 0);
    expect(live(f).every((i) => f.tier[i] === 3)).toBe(true);
    expect(f.live).toBeLessThanOrEqual(4);
  });
});

describe("protected rectangles", () => {
  it("moves a number above a protected rectangle, or drops it; none ever covers one", () => {
    const f = field();
    f.protected = [{ x: 400, y: 580, w: 480, h: 140 }, { x: 0, y: 0, w: 330, h: 60 }];
    // Spawned inside the learning frame: lifted above it.
    const i = f.spawn(1, 640, 600, 20, STYLE.crit, 2, 1.3, 0.6, 0, 1, 0);
    expect(i).toBeGreaterThanOrEqual(0);
    const box = f.box(i, { x: 0, y: 0, w: 0, h: 0 });
    expect(box.y + box.h).toBeLessThanOrEqual(580);
    // Under the health bar with no room above: dropped.
    expect(f.spawn(2, 100, 20, 20, STYLE.normal, 1, 1, 0.6, 0, -1, 0)).toBe(-1);
    // Drifting into one: gone.
    const j = f.spawn(3, 200, 100, 20, STYLE.normal, 1, 1, 2, 0, -1, 0);
    expect(j).toBeGreaterThanOrEqual(0);
    for (let t = 0; t < 40 && f.alive[j] === 1; t += 1) {
      f.update(1 / 60);
      expect(f.overlaps()).toBe(0);
    }
    expect(f.alive[j]).toBe(0);
    // A storm of numbers over the whole screen never covers a rectangle.
    let seed = 3;
    const random = () => ((seed = (Math.imul(seed, 48271) + 7) >>> 0) / 4294967296);
    for (let k = 0; k < 600; k += 1) {
      f.spawn(100 + (k % 80), random() * 1280, random() * 720, 1 + random() * 40, k % 7 === 0 ? STYLE.perfect : STYLE.normal, k % 7 === 0 ? 3 : 1, k % 7 === 0 ? 1.6 : 1, 0.6, random() - 0.5, random() - 0.5, k / 60);
      f.update(1 / 60);
      expect(f.overlaps()).toBe(0);
    }
    expect(f.live).toBeLessThanOrEqual(f.limit);
  });
});
