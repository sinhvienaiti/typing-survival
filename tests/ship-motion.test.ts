import { describe, expect, it } from "vitest";
import { KIND } from "../src/content/foes";
import { AIM, AIM_PRIO, DRIFT, ENGINE, HOLD, HOVER, KICK, NOSE_MAX_Z, REDUCED, driftBank, driftTarget, holdStep, hover, kickLevel, pickAim, springStep, threatSums, threatWeight, thrust, yawTo } from "../src/view/ship-rules";

/**
 * The ship's motion (docs/FEEL_PASS_S1.md §5): the drift toward the horde,
 * the springs, the hover, the kicks by gun, the turn to the heaviest blow.
 * View only: the sim keeps the ship at (0; 1.7) (the chapter hashes and the
 * trial golden prove it).
 */
const DEG = Math.PI / 180;

/** A spring's step response: position every 1/60 s for `seconds`. */
function respond(target: number, omega: number, zeta: number, vmax: number, seconds: number, dt = 1 / 60): { x: number[]; v: number[] } {
  const s = new Float64Array(2);
  const x: number[] = [];
  const v: number[] = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    springStep(s, 0, target, omega, zeta, vmax, dt);
    x.push(s[0]!);
    v.push(s[1]!);
  }
  return { x, v };
}

describe("ship motion", () => {
  it("weighs near foes (1 − z/16)², big ones × 3, a Đầu Đàn × 6 in all, none past 16 m (§5.3)", () => {
    expect(threatWeight(0, KIND.mine)).toBe(1);
    expect(threatWeight(8, KIND.mine)).toBeCloseTo(0.25, 9);
    expect(threatWeight(16, KIND.mine)).toBe(0);
    expect(threatWeight(20, KIND.mine)).toBe(0);
    expect(threatWeight(-2, KIND.mine)).toBe(1);
    expect(threatWeight(8, KIND.brute)).toBeCloseTo(0.75, 9);
    expect(threatWeight(8, KIND.leader)).toBeCloseTo(1.5, 9);
    expect(threatWeight(8, KIND.scout)).toBeCloseTo(0.25, 9);
    const foes = { top: 4, alive: [1, 1, 0, 1], x: [8, 8, -50, -4], z: [12, 12, 1, 30], kind: [0, 0, 0, 0] };
    const sums = threatSums(foes, { wx: 0, wz: 0, w: 0 });
    expect(sums.w).toBeCloseTo(0.125, 9);
    expect(sums.wx / sums.w).toBeCloseTo(8, 9);
    expect(sums.wz / sums.w).toBeCloseTo(12, 9);
  });

  it("drifts to a quarter of the threat point, at most ±1.6 m; wanders ±0.25 m when nothing weighs (§5.3)", () => {
    expect(driftTarget(8 * 1, 1, 0)).toBeCloseTo(1.6, 9);
    expect(driftTarget(4 * 2, 2, 0)).toBeCloseTo(1, 9);
    expect(driftTarget(-20, 1, 0)).toBeCloseTo(-1.6, 9);
    // Nothing near: a slow wander of ±0.25 m (0.15 Hz: a quarter period is 1.667 s).
    expect(driftTarget(0, 0, 1 / (4 * DRIFT.idleHz))).toBeCloseTo(0.25, 9);
    for (let t = 0; t < 10; t += 0.1) expect(Math.abs(driftTarget(5, 0.1, t))).toBeLessThanOrEqual(0.25 + 1e-12);
    // The hand-over ramps over Σw 0.3 → 0.7: half way at 0.5 (at t 0 the wander is 0).
    expect(driftTarget(0.5 * 4, 0.5, 0)).toBeCloseTo(0.5, 9);
    expect(driftTarget(0.7 * 4, 0.7, 0)).toBeCloseTo(1, 9);
    // It banks into the move, −vx × 7°, ±14° at most.
    expect(driftBank(1)).toBeCloseTo(-7 * DEG, 9);
    expect(driftBank(-1)).toBeCloseTo(7 * DEG, 9);
    expect(driftBank(5)).toBeCloseTo(-14 * DEG, 9);
  });

  it("moves on a spring that is ~90 % there in a second, barely overshoots and never passes 2.4 m/s (§5.3)", () => {
    expect([DRIFT.omega, DRIFT.zeta, DRIFT.vmax]).toEqual([2.6, 0.85, 2.4]);
    const { x, v } = respond(1.6, DRIFT.omega, DRIFT.zeta, DRIFT.vmax, 4);
    expect(x[59]! / 1.6).toBeGreaterThan(0.78);
    expect(x[59]! / 1.6).toBeLessThan(0.86);
    expect(x[77]! / 1.6).toBeGreaterThan(0.9);
    expect(Math.max(...x) / 1.6).toBeLessThan(1.01);
    expect(Math.max(...v.map(Math.abs))).toBeLessThanOrEqual(DRIFT.vmax);
    // A far target hits the speed cap; a long frame (50 ms) stays stable.
    expect(Math.max(...respond(20, DRIFT.omega, DRIFT.zeta, DRIFT.vmax, 3).v)).toBe(DRIFT.vmax);
    const long = respond(1.6, DRIFT.omega, DRIFT.zeta, DRIFT.vmax, 4, 0.05).x;
    expect(Math.abs(long.at(-1)! - 1.6)).toBeLessThan(0.01);
  });

  it("turns its body ±50° at most on a spring with ζ 0.7 that overshoots a little, at most 7 rad/s (§5.1)", () => {
    expect([AIM.max, AIM.zeta, AIM.speed]).toEqual([0.87, 0.7, 7]);
    // Nose (−z in three) to +x is a negative yaw; clamped at ±0.87.
    expect(yawTo(0, 1.7, 3, 11.7)).toBeCloseTo(-Math.atan2(3, 10), 9);
    expect(yawTo(0, 1.7, -3, 11.7)).toBeCloseTo(Math.atan2(3, 10), 9);
    expect(yawTo(0, 1.7, 20, 2)).toBe(-AIM.max);
    expect(yawTo(1.6, 1.7, 1.6, 20) + 0).toBe(0);
    const small = respond(0.3, AIM.omega, AIM.zeta, AIM.speed, 1);
    const over = Math.max(...small.x) / 0.3 - 1;
    expect(over).toBeGreaterThan(0.02);
    expect(over).toBeLessThan(0.07);
    const swing = respond(2 * AIM.max, AIM.omega, AIM.zeta, AIM.speed, 1);
    expect(Math.max(...swing.v)).toBe(AIM.speed);
    // The heaviest blow of the last 0.3 s: Ray 5 > Pháo Sao 4 > Tán 3 > Xung 2 > Tia 1.
    expect([AIM_PRIO.ray, AIM_PRIO.phao, AIM_PRIO.tan, AIM_PRIO.xung, AIM_PRIO.tia]).toEqual([5, 4, 3, 2, 1]);
    const at = new Float64Array(6).fill(-1e9);
    expect(pickAim(at, 10)).toBe(0);
    at[AIM_PRIO.xung] = 9.9;
    at[AIM_PRIO.tia] = 10;
    expect(pickAim(at, 10)).toBe(AIM_PRIO.xung);
    at[AIM_PRIO.ray] = 9.75;
    expect(pickAim(at, 10)).toBe(AIM_PRIO.ray);
    expect(pickAim(at, 10.06)).toBe(AIM_PRIO.xung);
    expect(pickAim(at, 10.25)).toBe(AIM_PRIO.tia);
    expect(pickAim(at, 10.31)).toBe(0);
    expect(AIM.wobble).toBeCloseTo(0.6 * DEG, 12);
  });

  it("kicks back and pitches up by gun, lunges 0.35 m forward on a load, each back in its time (§5.2)", () => {
    expect(KICK.xung).toMatchObject({ back: 0.05, ret: 0.08 });
    expect(KICK.tan).toMatchObject({ back: 0.28, ret: 0.18 });
    expect(KICK.ray).toMatchObject({ back: 0.4, ret: 0.26 });
    expect(KICK.phao).toMatchObject({ back: 0, down: 0.08, ret: 0.22 });
    expect(KICK.load).toMatchObject({ back: -0.35, rise: 0.12, ret: 0.6 });
    expect([KICK.xung.pitch, KICK.tan.pitch, KICK.ray.pitch, KICK.phao.pitch, KICK.load.pitch].map((p) => Math.round(p / DEG * 10) / 10)).toEqual([1.2, 4, 5, -3, -3]);
    // A shot's kick is full on the frame after it (16.7 ms); the lunge takes 120 ms.
    expect(kickLevel(0, 0.016, 0.08)).toBe(0);
    expect(kickLevel(1 / 60, 0.016, 0.08)).toBeGreaterThan(0.99);
    expect(kickLevel(0.06, 0.12, 0.6)).toBeCloseTo(0.75, 9);
    expect(kickLevel(0.12, 0.12, 0.6)).toBe(1);
    expect(kickLevel(0.12 + 0.3, 0.12, 0.6)).toBeCloseTo(0.5, 9);
    expect(kickLevel(0.12 + 0.6, 0.12, 0.6)).toBe(0);
    expect(kickLevel(-1, 0.12, 0.6)).toBe(0);
    // Held: Ray's charge shakes 0.015 m at 30 Hz and sinks 0.04; Tia burning holds 0.06 back, lets go over 150 ms.
    expect(HOLD.charge).toMatchObject({ shake: 0.015, hz: 30, down: 0.04 });
    expect(HOLD.tia).toMatchObject({ shake: 0.02, hz: 12, back: 0.06, fall: 0.15 });
    expect(holdStep(0, true, 0.05, 0.15, 0.025)).toBeCloseTo(0.5, 9);
    expect(holdStep(1, false, 0.05, 0.15, 0.075)).toBeCloseTo(0.5, 9);
    expect(holdStep(0.1, false, 0.05, 0.15, 1)).toBe(0);
    // The nose stays behind sim z 2.1; reduced motion keeps 30 % of the recoil.
    expect(NOSE_MAX_Z).toBe(2.1);
    expect(REDUCED.recoil).toBe(0.3);
  });

  it("hovers 0.07 m at 0.55 Hz, rolls ±1.5° and pitches ±1° on frequencies apart; engines flare with thrust (§5.4)", () => {
    expect([HOVER.bobHz, HOVER.rollHz, HOVER.pitchHz]).toEqual([0.55, 0.37, 0.43]);
    const out = { y: 0, roll: 0, pitch: 0 };
    let y = 0;
    let roll = 0;
    let pitch = 0;
    for (let t = 0; t < 30; t += 1 / 60) {
      hover(t, out);
      y = Math.max(y, Math.abs(out.y));
      roll = Math.max(roll, Math.abs(out.roll));
      pitch = Math.max(pitch, Math.abs(out.pitch));
    }
    expect(y).toBeCloseTo(0.07, 3);
    expect(roll).toBeCloseTo(1.5 * DEG, 4);
    expect(pitch).toBeCloseTo(1 * DEG, 4);
    // Thrust: from 0.5 m/s sideways (full at 1 m/s), or the kicks' push; the halo × 1.6, the flame 0.6 → 1.4 m.
    expect(thrust(0.4, 0)).toBe(0);
    expect(thrust(-0.75, 0)).toBeCloseTo(0.5, 9);
    expect(thrust(2, 0)).toBe(1);
    expect(thrust(0, 0.3)).toBeCloseTo(0.3, 9);
    expect(ENGINE).toMatchObject({ halo: 0.35, alpha: 0.7, flicker: 0.1, flickerHz: 18, boost: 1.6, flame: [0.6, 1.4] });
  });
});
