import { describe, expect, it } from "vitest";
import { SHIP, TIERS } from "../src/kit/feedback";
import { BIG_CHUNK, CHUNK, CHUNK_CAP, CHUNKS_MAX, CHUNK_PHYSICS, FEEL, JOIN, KILL_NUMBER, LIGHT, LIGHTS, chunkCount, chunkStep, joinWeight, lightLevel, numberFont, pickLight, screenMetres } from "../src/view/gun-rules";

/**
 * The guns' feel rules (docs/FEEL_PASS_S1.md §4): the game's feedback
 * profile (white flash, numbers), the drawn path joining the sim's, the light
 * pool's priorities, the kill chunks' counts and flight. View only: the sim
 * never reads them (the chapter hashes and the trial golden prove it).
 */
describe("gun feel", () => {
  it("the white flash lasts 2–6 frames by tier and numbers pop 1.25–1.9, living 0.55–1.2 s; stops and shake stay the ship profile's (§4.4)", () => {
    expect(FEEL.tiers.map((t) => t.flashFrames)).toEqual([0, 2, 3, 4, 5, 6]);
    expect(FEEL.tiers.map((t) => t.number?.pop ?? null)).toEqual([null, 1.25, 1.4, 1.6, 1.7, 1.9]);
    expect(FEEL.tiers.map((t) => t.number?.life ?? null)).toEqual([null, 0.55, 0.7, 0.9, 1, 1.2]);
    // Everything else as the kit's ship profile: the hit stop's lengths and gaps, shake, sparks, sizes.
    FEEL.tiers.forEach((row, t) => {
      const kit = TIERS[t]!;
      expect([row.stopMs, row.stopGapMs, row.trauma, row.sparks, row.rays, row.debris, row.number?.size]).toEqual([kit.stopMs, kit.stopGapMs, kit.trauma, kit.sparks, kit.rays, kit.debris, kit.number?.size]);
    });
    expect([FEEL.stopGapMs, FEEL.stopScale, FEEL.trauma, FEEL.debris]).toEqual([SHIP.stopGapMs, SHIP.stopScale, SHIP.trauma, SHIP.debris]);
    // Numbers: a 30th of the view, 18–36 px; a killing blow 15 % larger.
    expect(numberFont(720)).toBe(24);
    expect(numberFont(1080)).toBe(36);
    expect(numberFont(400)).toBe(18);
    expect(numberFont(2160)).toBe(36);
    expect(KILL_NUMBER).toBe(1.15);
  });

  it("a shot leaves the real muzzle and is on the sim's path from 3 m on (§4.1)", () => {
    expect(JOIN).toBe(3);
    expect(joinWeight(0)).toBe(1);
    expect(joinWeight(1.5)).toBe(0.5);
    expect(joinWeight(3)).toBe(0);
    expect(joinWeight(12)).toBe(0);
    expect(joinWeight(-1)).toBeGreaterThan(1);
  });

  it("a new light takes a dark slot first, else the one with the least priority × light left (§4.1)", () => {
    expect(LIGHTS).toEqual({ low: 0, medium: 2, high: 4, ultra: 6 });
    const order = [LIGHT.phao, LIGHT.ray, LIGHT.tan, LIGHT.tia, LIGHT.xung].map((l) => l.prio);
    expect(order).toEqual([5, 4, 3, 2, 1]);
    expect(LIGHT.xungFirst.prio).toBe(LIGHT.tan.prio);
    // §12: a big kill ranks with a Pháo Sao burst and lights the lane widest.
    expect(LIGHT.big.prio).toBe(LIGHT.phao.prio);
    expect(LIGHT.big.pool).toBeGreaterThan(LIGHT.phao.pool);
    expect(pickLight([5, 1, 0, 4], [2, 0.5, 0, 1], 4)).toBe(2);
    // All lit: Pháo Sao's 5 × 0.1 = 0.5 goes before a Xung round's 1 × 0.9 and Ray's 4 × 1.
    expect(pickLight([5, 1, 4], [0.1, 0.9, 1], 3)).toBe(0);
    expect(pickLight([5, 1, 4], [3.5, 0.9, 3], 3)).toBe(1);
    expect(pickLight([], [], 0)).toBe(-1);
    // A flash fades to 0 over its life; a held light stays.
    expect(lightLevel(0, 0.05)).toBe(1);
    expect(lightLevel(0.025, 0.05)).toBeCloseTo(0.25, 6);
    expect(lightLevel(0.05, 0.05)).toBe(0);
    expect(lightLevel(9, 0)).toBe(1);
  });

  it("kills break into the kind's chunks, √N for a heap, at most 48 (§4.5; a Trâu's and Đầu Đàn's from §13)", () => {
    expect(CHUNK.map((c) => c.n)).toEqual([7, 10, 20, 10, 6, 3, 22]);
    expect(CHUNK.map((c) => c.big)).toEqual([0, 0, 8, 0, 0, 0, 10]);
    expect(BIG_CHUNK.min).toBeGreaterThanOrEqual(0.9);
    expect(CHUNK[2]!.min).toBeGreaterThanOrEqual(0.4);
    expect(chunkCount(0, 1)).toEqual({ small: 7, big: 0 });
    expect(chunkCount(2, 1)).toEqual({ small: 20, big: 8 });
    expect(chunkCount(6, 1)).toEqual({ small: 22, big: 10 });
    expect(chunkCount(0, 4)).toEqual({ small: 14, big: 0 });
    for (const kind of [0, 1, 2, 6]) for (const n of [1, 9, 40, 200]) {
      const c = chunkCount(kind, n);
      expect(c.small + c.big).toBeLessThanOrEqual(CHUNKS_MAX);
    }
    expect(CHUNK_CAP).toEqual({ low: 150, medium: 400, high: 900, ultra: 1400 });
  });

  it("a chunk rises and falls in an arc, bounces once and lies (§4.5)", () => {
    const s = new Float32Array(8);
    s.set([0, 1, 0, 3, 5, 0, 0, 0]);
    const ys: number[] = [];
    let bounces = 0;
    let t = 0;
    for (; t < 3 && s[7] === 0; t += 1 / 60) {
      const before = s[6];
      chunkStep(s, 0, 1 / 60, 0.05);
      if (s[6] !== before) bounces += 1;
      ys.push(s[1]!);
    }
    expect(s[7]).toBe(1);
    expect(bounces).toBe(1);
    const top = ys.indexOf(Math.max(...ys));
    // ≥ 3 frames up and ≥ 3 down at 33 ms (§4.5: a 0.45–0.9 s arc).
    expect(top).toBeGreaterThanOrEqual(6);
    expect(ys.length - top).toBeGreaterThanOrEqual(6);
    expect(t).toBeGreaterThan(0.45);
    expect(t).toBeLessThan(1.6);
    expect(s[1]).toBeCloseTo(0.05, 6);
    expect([s[3], s[4], s[5]]).toEqual([0, 0, 0]);
    // Lying, it stays.
    chunkStep(s, 0, 1, 0.05);
    expect(s[1]).toBeCloseTo(0.05, 6);
    expect(CHUNK_PHYSICS.gravity).toBe(14);
  });

  it("a share of the view's height in metres at a depth", () => {
    expect(screenMetres(0.04, 720, 28.8)).toBeCloseTo(1, 6);
    expect(screenMetres(0.08, 1080, 43.2)).toBeCloseTo(2, 6);
  });
});
