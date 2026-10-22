import { describe, expect, it } from "vitest";
import { HitStop } from "../src/feedback/hitstop";
import { Reactions, squashAt } from "../src/feedback/reaction";
import { STOP_GAP_MS, SWEEP, TIERS } from "../src/feedback/tiers";
import { Trauma } from "../src/feedback/trauma";

/**
 * The shared feedback (docs/survival/BUILD_S0.md §6): the tier table, the
 * shake (trauma², ×the player's setting, off at 0 and under reduced motion),
 * hit stops (tiers, 150 ms apart, one per sweep) and a foe's reaction.
 */
describe("tiers", () => {
  it("grow from T0 to T5 and stop the world only from T2", () => {
    expect(TIERS).toHaveLength(6);
    for (let t = 1; t < 6; t += 1) expect(TIERS[t]!.trauma).toBeGreaterThan(TIERS[t - 1]!.trauma);
    expect(TIERS.map((tier) => tier.stopMs)).toEqual([0, 0, 12, 35, 45, 70]);
    expect(TIERS[2]!.bass && !TIERS[1]!.bass).toBe(true);
  });
});

describe("trauma", () => {
  const peak = (trauma: Trauma, seconds: number): number => {
    let max = 0;
    for (let t = 0; t < seconds * 60; t += 1) {
      trauma.update(1 / 60, 1080);
      max = Math.max(max, Math.hypot(trauma.offsetX, trauma.offsetY));
    }
    return max;
  };

  /** Fixed noise phases: a test run is the same every time (Math.random phases made this flaky). */
  const fixed = () => {
    let k = 0;
    return () => [0.17, 0.53, 0.89][k++ % 3]!;
  };

  it("shakes trauma² (at most 14 px at 1080p) and calms down at 1.8 a second", () => {
    const full = new Trauma(fixed());
    full.add(1);
    expect(peak(full, 0.1)).toBeLessThanOrEqual(14 + 1e-9);
    expect(full.trauma).toBeCloseTo(1 - 1.8 * 0.1, 1);
    const half = new Trauma(fixed());
    half.add(0.5);
    const a = peak(half, 0.05);
    const strong = new Trauma(fixed());
    strong.add(1);
    expect(a).toBeLessThan(peak(strong, 0.05));
    peak(full, 1);
    expect(full.trauma).toBe(0);
  });

  it("never passes 14 px at 1080p, even held at full trauma with any phases (both axes at their peak at once)", () => {
    const real = Math.random;
    for (const phase of [0, 0.123, 0.5, 0.999]) {
      // Phases through Math.random too, as the constructor uses by default.
      Math.random = () => phase;
      const t = new Trauma();
      Math.random = real;
      let max = 0;
      for (let k = 0; k < 60 * 20; k += 1) {
        t.add(1);
        t.update(1 / 60, 1080);
        max = Math.max(max, Math.hypot(t.offsetX, t.offsetY));
      }
      expect(max, "phase " + phase).toBeLessThanOrEqual(14 + 1e-9);
      expect(max).toBeGreaterThan(12);
    }
  });

  it("scales with the player's screen-shake setting: none at 0, none with reduced motion", () => {
    const off = new Trauma();
    off.scale = 0;
    off.add(1);
    off.kick(1, 0, 6);
    expect(peak(off, 0.3)).toBe(0);
    const reduced = new Trauma();
    reduced.reduced = true;
    reduced.add(1);
    reduced.kick(0, 1, 6);
    expect(peak(reduced, 0.3)).toBe(0);
    const halfScale = new Trauma();
    halfScale.scale = 0.5;
    const fullScale = new Trauma();
    for (const t of [halfScale, fullScale]) t.kick(1, 0, 6);
    halfScale.update(0.001, 1080);
    fullScale.update(0.001, 1080);
    expect(halfScale.offsetX).toBeCloseTo(fullScale.offsetX * 0.5, 1);
  });

  it("kicks against the shot by 2–6 px and springs back within ~120 ms", () => {
    const t = new Trauma();
    t.kick(-1, 0, 20);
    t.update(0.001, 1080);
    expect(t.offsetX).toBeLessThanOrEqual(-5.5);
    expect(t.offsetX).toBeGreaterThanOrEqual(-6.01);
    for (let k = 0; k < 8; k += 1) t.update(1 / 60, 1080);
    expect(Math.abs(t.offsetX)).toBeLessThan(0.3);
  });
});

describe("hit stop", () => {
  it("grants a tier's stop, 150 ms apart and a tier's own spacing", () => {
    const stop = new HitStop();
    expect(stop.request(1, 0)).toBe(0);
    expect(stop.request(3, 1000)).toBe(35);
    expect(stop.request(4, 1000 + STOP_GAP_MS - 1)).toBe(0);
    expect(stop.request(4, 1000 + STOP_GAP_MS)).toBe(45);
    // T3 again only after its own 400 ms.
    expect(stop.request(3, 1000 + 300)).toBe(0);
    expect(stop.request(3, 1000 + 400)).toBe(35);
    expect(stop.request(2, 2000)).toBe(12);
  });

  it("gives one 25 ms stop for 30 kills inside 0.5 s, then rests", () => {
    const stop = new HitStop();
    expect(stop.kill(20, 0)).toBe(0);
    expect(stop.kill(9, 200)).toBe(0);
    expect(stop.kill(1, 400)).toBe(SWEEP.stopMs);
    expect(stop.kill(40, 700)).toBe(0);
    expect(stop.kill(40, 400 + SWEEP.cooldownMs)).toBe(SWEEP.stopMs);
    // Slow kills never make a sweep.
    const slow = new HitStop();
    for (let k = 0; k < 100; k += 1) expect(slow.kill(1, k * 40)).toBe(0);
  });
});

describe("reaction", () => {
  it("flashes white for the tier's frames, knocks back along the blow and returns, squashes 0.91 / 1.07 in 120 ms", () => {
    const r = new Reactions(8);
    const out = new Float32Array(5);
    r.hit(2, 77, 3, 0, 1, 10);
    expect(r.sample(2, 77, 10, out)[0]).toBe(1);
    expect(r.sample(2, 77, 10 + 3 / 60, out)[0]).toBe(1);
    expect(r.sample(2, 77, 10 + 0.12, out)[0]).toBe(0);
    const push = r.sample(2, 77, 10.03, out)[2]!;
    expect(push).toBeGreaterThan(0.25);
    expect(r.sample(2, 77, 10.2, out)[2]!).toBeLessThan(push * 0.15);
    expect(squashAt(0)).toBeCloseTo(0.91);
    expect(squashAt(0.04)).toBeCloseTo(1.07);
    expect(squashAt(0.12)).toBe(1);
    // A reused slot (a new owner) starts clean.
    expect(r.sample(2, 78, 10, out)[0]).toBe(0);
  });
});
