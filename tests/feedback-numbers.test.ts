import { describe, expect, it } from "vitest";
import { NumberField, STYLE, popScale } from "../src/feedback/numbers";

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
    // After the window a new number starts; another target elsewhere is another number.
    expect(f.spawn(7, 400, 300, 7, STYLE.normal, 1, 1, 0.45, 0, -1, 1.2)).not.toBe(a);
    expect(f.spawn(8, 700, 300, 7, STYLE.normal, 1, 1, 0.45, 0, -1, 1.2)).not.toBe(a);
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

describe("a crowd's numbers (S0 review: no towers)", () => {
  const extent = (f: NumberField) => {
    const boxes = live(f).map((i) => f.box(i, { x: 0, y: 0, w: 0, h: 0 }));
    return { top: Math.min(...boxes.map((b) => b.y)), bottom: Math.max(...boxes.map((b) => b.y + b.h)) };
  };

  it("takes beam ticks from many stretches landing on one spot into one number, not a column", () => {
    const f = field();
    for (let k = 0; k < 10; k += 1) f.spawn(-1 - k, 640 + (k % 3) * 4, 300 - (k % 2) * 6, 6, STYLE.tick, 1, 1, 0.45, 1, 0, k * 0.02);
    expect(f.live).toBeLessThanOrEqual(2);
    expect(live(f).reduce((sum, i) => sum + f.value[i]!, 0)).toBe(60);
    const { top, bottom } = extent(f);
    expect(bottom - top).toBeLessThanOrEqual(f.fontPx * 2.6);
  });

  it("rounds on different foes at one spot roll up while young; a number of another style goes beside, not on top", () => {
    const f = field();
    const a = f.spawn(1, 640, 300, 7, STYLE.normal, 1, 1, 0.45, 0, -1, 0);
    expect(f.spawn(2, 642, 302, 7, STYLE.normal, 1, 1, 0.45, 0, -1, 0.05)).toBe(a);
    expect(f.value[a]).toBe(14);
    const c = f.spawn(3, 640, 300, 16, STYLE.crit, 2, 1.3, 0.6, 1, 0, 0.06);
    expect(c).not.toBe(a);
    const boxA = f.box(a, { x: 0, y: 0, w: 0, h: 0 });
    const boxC = f.box(c, { x: 0, y: 0, w: 0, h: 0 });
    const overlap = boxA.x < boxC.x + boxC.w && boxA.x + boxA.w > boxC.x && boxA.y < boxC.y + boxC.h && boxA.y + boxA.h > boxC.y;
    expect(overlap).toBe(false);
    // Beside: about level with it, not stacked above.
    expect(Math.abs(f.y[c]! - f.y[a]!)).toBeLessThan(f.fontPx);
    // A T3 number never swallows (nor is swallowed by) the others.
    const p = f.spawn(4, 640, 300, 30, STYLE.perfect, 3, 1.6, 0.8, 0, -1, 0.07);
    expect([a, c]).not.toContain(p);
  });

  it("a number that grows onto its neighbour takes it in: live numbers never overlap after a frame", () => {
    const f = field();
    const a = f.spawn(-1, 600, 300, 6, STYLE.tick, 1, 1, 0.9, 0, -1, 0);
    const width = f.box(a, { x: 0, y: 0, w: 0, h: 0 }).w;
    const b = f.spawn(-2, 600 + width + 6, 300, 6, STYLE.tick, 1, 1, 0.9, 0, -1, 0.4);
    expect(b).not.toBe(a);
    // a's label grows ("6" → "48×8"): its box now reaches b.
    for (let k = 1; k < 8; k += 1) f.spawn(-1, 600, 300, 6, STYLE.tick, 1, 1, 0.9, 0, -1, k * 0.03);
    f.update(1 / 60);
    const boxes = live(f).map((i) => f.box(i, { x: 0, y: 0, w: 0, h: 0 }));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const p = boxes[i]!;
        const q = boxes[j]!;
        expect(p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y).toBe(false);
      }
    }
    expect(live(f).reduce((sum, i) => sum + f.value[i]!, 0)).toBe(54);
  });

  it("counts a number's pop in its box, so a popping number near the learning frame never spills onto it", () => {
    const f = field();
    expect(popScale(3, 1)).toBeCloseTo(1.35);
    expect(popScale(3, 0)).toBe(1);
    f.protected = [{ x: 400, y: 580, w: 480, h: 140 }];
    // Just above the frame at rest size, over it while popping (1.35×).
    const i = f.spawn(1, 640, 578, 30, STYLE.perfect, 3, 1.6, 0.8, 0, -1, 0);
    expect(i).toBeGreaterThanOrEqual(0);
    // Drawn size at its pop: the glyph height is the font size × pop.
    const px = f.fontPx * f.size[i]! * popScale(f.tier[i]!, f.pop[i]!);
    expect(f.y[i]! + px / 2).toBeLessThanOrEqual(580);
    expect(f.overlaps()).toBe(0);
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
