import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { VIEW_TIERS } from "../src/view/scene";
import { bloomWeight } from "../src/view/feel-bloom";
import { TAN, PHAO } from "../src/content/guns";
import { AFTER, BLOOM, LIGHT, SMOKE_POOL } from "../src/view/gun-rules";
import { CHARGE, chargePower, chargeSize } from "../src/view/type-rules";
import { FACTION } from "../src/view/crowd";
import { BLOW } from "../src/view/theme";

/**
 * The first gun pair in five phases (parent docs/games/VFX_STANDARD.md §3.3,
 * §3.5, §3.7; MAP1_PRODUCTION TS-M1-05): Pulse Gun's and Heat Beam's charge
 * (A), Heat Beam's primer and core (R, T), Pulse Gun's scorch and the hurt
 * ship's smoke (F). View only: the chapter hashes and the trial golden prove
 * the sim never reads them.
 */
/** The guns' smoke alive at once at their fastest (Scatter Gun's volleys, Star Mortar's launches and bursts, Heat Beam's burn, a bay of each; their longest life). */
function gunSmoke(): number {
  const S = AFTER.smoke;
  const live = (rate: number, spec: { puffs: number; life: number }) => Math.ceil(rate * spec.puffs * spec.life * 1.2);
  // Heat Beam burning: one puff each `every` s (wave 1 fix).
  const tia = Math.ceil((S.tia.life * 1.2) / S.tia.every);
  return live(TAN.volleys / TAN.seconds, S.tan) + live(PHAO.shells / PHAO.seconds, S.launch) + live(PHAO.shells / PHAO.seconds, S.burst) + tia;
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

  it("L1: on the bloom tiers only thin HDR cores bloom; halos stay under the threshold; a tight bloom", () => {
    expect(BLOOM.halo).toBeLessThanOrEqual(0.9);
    expect(BLOOM.halo).toBeLessThan(BLOOM.threshold);
    expect(BLOOM.strength).toBeGreaterThanOrEqual(0.4);
    expect(BLOOM.strength).toBeLessThanOrEqual(0.5);
    expect(BLOOM.radius).toBeGreaterThanOrEqual(0.1);
    expect(BLOOM.radius).toBeLessThanOrEqual(0.15);
    expect(BLOOM.tia.power).toBeGreaterThanOrEqual(3);
    expect(BLOOM.tia.power).toBeLessThanOrEqual(6);
    expect(BLOOM.tia.core).toBeLessThanOrEqual(0.14);
    expect(BLOOM.tia.glowPower).toBeLessThanOrEqual(BLOOM.halo);
    expect(BLOOM.tia.groove).toBeLessThanOrEqual(0.15);
    expect(["neutral", "agx"]).toContain(BLOOM.tone);
    for (const k of Object.values(BLOOM.flash)) expect(k).toBeGreaterThanOrEqual(1);
  });

  it("Rail Gun (wave 1 fix): a saturated cobalt, not the Horde's violet, the foes' red, the Pack Leaders' gold or the Line's cyan-white; a thin HDR core, its afterglow held", () => {
    const hsl = (c: THREE.Color) => c.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
    for (const c of [BLOW.ray, BLOW.rayIon]) {
      expect(hsl(c).h * 360).toBeGreaterThanOrEqual(215);
      expect(hsl(c).h * 360).toBeLessThanOrEqual(240);
      expect(hsl(c).s).toBeGreaterThanOrEqual(0.9);
    }
    const R = BLOOM.ray;
    expect(R.power).toBeGreaterThanOrEqual(3);
    expect(R.power).toBeLessThanOrEqual(6);
    expect(R.core).toBeLessThanOrEqual(0.1);
    expect(R.ion[1]).toBeGreaterThan(R.ion[0]);
    expect(R.ionEnd).toBeLessThanOrEqual(0.8);
  });

  it("the typing feel (shared, bar 9) blooms as before L1: feel-bloom's weights are what UnrealBloomPass adds of each mip", () => {
    // UnrealBloomPass: composite strength × mix(f, 1.2 − f, radius) per mip, written with alpha strength × Σ mix (= 3), blended by that alpha.
    const mix = (b: { strength: number; radius: number }, f: number) => (1 - b.radius) * f + b.radius * (1.2 - f);
    const factors = [1, 0.8, 0.6, 0.4, 0.2];
    for (const b of [BLOOM, BLOOM.old]) {
      const alpha = b.strength * factors.reduce((sum, f) => sum + mix(b, f), 0);
      expect(alpha).toBeCloseTo(3 * b.strength, 6);
      factors.forEach((f, i) => expect(bloomWeight(b, i)).toBeCloseTo(alpha * b.strength * mix(b, f), 6));
    }
    // The old bloom added 1.6–3.0× L1's light of each mip: the marks get the difference.
    factors.forEach((_, i) => expect(bloomWeight(BLOOM.old, i) - bloomWeight(BLOOM, i)).toBeGreaterThan(0.7));
  });

  it("O5: the foes' veins and eyes are the foe faction's purple (the Pack Leaders' gold), their bodies near-black; Pháo Sao's landing ring is our pale orange", () => {
    // Faction colours are written as linear numbers (HDR); the ring's is a hex, so read it as sRGB.
    const hue = (c: THREE.Color, space: THREE.ColorSpace = THREE.LinearSRGBColorSpace) => c.getHSL({ h: 0, s: 0, l: 0 }, space).h * 360;
    FACTION.forEach((f, kind) => {
      for (const c of [f.vein, f.eye]) {
        if (kind === 6) {
          // Đầu Đàn: gold, the Pack Leaders' alone.
          expect(hue(c)).toBeGreaterThanOrEqual(35);
          expect(hue(c)).toBeLessThanOrEqual(55);
          continue;
        }
        // Violet to magenta-purple: far from Heat Beam's orange (≈ 25°), Pulse's blue (≈ 200°), Rail's cobalt (≈ 226°) and Pháo Sao's crimson (≈ 345°).
        expect(hue(c)).toBeGreaterThanOrEqual(250);
        expect(hue(c)).toBeLessThanOrEqual(305);
      }
      // Near-black glass and chitin (the art director's rule: purple only in thin veins and eyes).
      expect(Math.max(f.body.r, f.body.g, f.body.b)).toBeLessThanOrEqual(0.06);
    });
    expect(hue(BLOW.mark, THREE.SRGBColorSpace)).toBeGreaterThanOrEqual(20);
    expect(hue(BLOW.mark, THREE.SRGBColorSpace)).toBeLessThanOrEqual(40);
  });

  it("L2: the composer of High and Ultra draws multisampled; Low and Medium draw straight to the canvas", () => {
    expect(VIEW_TIERS.high.samples).toBe(4);
    expect(VIEW_TIERS.ultra.samples).toBe(4);
    expect(VIEW_TIERS.low.bloom || VIEW_TIERS.medium.bloom).toBe(false);
  });
});
