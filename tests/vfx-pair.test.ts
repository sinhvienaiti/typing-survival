import { describe, expect, it } from "vitest";
import { VIEW_TIERS } from "../src/view/scene";
import { TAN, PHAO } from "../src/content/guns";
import { AFTER, LIGHT, SMOKE_POOL } from "../src/view/gun-rules";
import { CHARGE, chargePower, chargeSize } from "../src/view/type-rules";

/**
 * The first gun pair in five phases (parent docs/games/VFX_STANDARD.md §3.3,
 * §3.5, §3.7; MAP1_PRODUCTION TS-M1-05): Pulse Gun's and Heat Beam's charge
 * (A), Heat Beam's primer and core (R, T), Pulse Gun's scorch and the hurt
 * ship's smoke (F). View only: the chapter hashes and the trial golden prove
 * the sim never reads them.
 */
/** The guns' smoke alive at once at their fastest (Scatter Gun's volleys, Star Mortar's launches and bursts, a bay of each; their longest life). */
function gunSmoke(): number {
  const S = AFTER.smoke;
  const live = (rate: number, spec: { puffs: number; life: number }) => Math.ceil(rate * spec.puffs * spec.life * 1.2);
  return live(TAN.volleys / TAN.seconds, S.tan) + live(PHAO.shells / PHAO.seconds, S.launch) + live(PHAO.shells / PHAO.seconds, S.burst);
}

describe("vfx pair", () => {
  it("A: the muzzle's charge grows with every letter and pops on each key, its core at most 30 % of it", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((p) => [chargeSize(p, 1e9), chargePower(p, 1e9)]);
    for (let k = 1; k < steps.length; k += 1) {
      expect(steps[k]![0]!).toBeGreaterThan(steps[k - 1]![0]!);
      expect(steps[k]![1]!).toBeGreaterThan(steps[k - 1]![1]!);
    }
    expect(chargeSize(0.5, 0)).toBeCloseTo(chargeSize(0.5, 1e9) * (1 + CHARGE.pop), 6);
    expect(chargeSize(0.5, CHARGE.popMs)).toBeCloseTo(chargeSize(0.5, 1e9), 6);
    expect(CHARGE.core).toBeLessThanOrEqual(0.3);
    // Embers drawn in land before the next key at 10 keys a second.
    expect(CHARGE.emberLife).toBeLessThan(0.1 * 1.5);
  });

  it("R, T: Heat Beam's primer is as bright as Xung's first round; its core keeps the gun's orange with ≤ 30 % white", () => {
    expect(LIGHT.tiaPrime.prio).toBe(LIGHT.xungFirst.prio);
    expect(LIGHT.tiaPrime.life).toBeLessThanOrEqual(0.1);
    expect(AFTER.tiaCore.white).toBeLessThanOrEqual(0.3);
    expect(AFTER.tiaCore.floorWhite).toBeLessThanOrEqual(0.3);
  });

  it("F: Pulse Gun's scorches and the hurt ship's smoke stay inside the decal and smoke budgets beside four big kills", () => {
    const scorches = Math.ceil(AFTER.scorch.life / AFTER.scorch.every);
    // §3.7 High: ≤ 48 decals alive, ≤ 4 new a frame (one scorch each 100 ms: 6 frames).
    expect(scorches).toBeLessThanOrEqual(24);
    expect(AFTER.scorch.every).toBeGreaterThanOrEqual(1 / 60);
    // The smoke pool also holds four big kills (25 each), the hurt ship's trail (one puff each 80 ms, 1.3 s at most, + the hit's) and the guns' smoke (L3).
    const puffs = Math.ceil(1.3 / AFTER.hurt.puff) + 1;
    expect(scorches + puffs + 4 * 25 + gunSmoke()).toBeLessThanOrEqual(SMOKE_POOL);
    // Embers: 2 a round at Xung's 10 rounds a second, ~1.2 s each, inside every tier's particles.
    expect(AFTER.scorch.embers * 10 * 1.2 + AFTER.hurt.rate * 4).toBeLessThan(VIEW_TIERS.low.particles / 4);
  });

  it("F (L3): Scatter Gun's and Star Mortar's smoke is dark puffs in the smoke pool, its alpha never over 1", () => {
    for (const spec of Object.values(AFTER.smoke)) {
      expect(spec.alpha).toBeGreaterThan(0);
      expect(spec.alpha).toBeLessThanOrEqual(1);
      expect(spec.to).toBeGreaterThan(spec.from);
      expect(spec.life).toBeLessThanOrEqual(2);
    }
  });

  it("L2: the composer of High and Ultra draws multisampled; Low and Medium draw straight to the canvas", () => {
    expect(VIEW_TIERS.high.samples).toBe(4);
    expect(VIEW_TIERS.ultra.samples).toBe(4);
    expect(VIEW_TIERS.low.bloom || VIEW_TIERS.medium.bloom).toBe(false);
  });
});
