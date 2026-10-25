import { describe, expect, it } from "vitest";
import { applySet } from "../scripts/overrides";
import { stageById } from "../src/content/chapter-1";
import { FOES, KIND } from "../src/content/foes";
import { RAY, TAN } from "../src/content/guns";
import { DRAIN } from "../src/content/rules";
import { PACE_HOLD } from "../src/content/stage-rules";

/** The balance scripts' --set (scripts/overrides.ts, docs/BUILD_S1.md §11.3): tuning rounds change numbers at run time, never the files. */
describe("--set overrides for tuning rounds", () => {
  it("sets and multiplies numeric fields of content constants and stages, and undoes them", () => {
    const stage = stageById("c1-s4");
    const share = stage.packs.shield!.share;
    const [ray, shield, hp] = [RAY.damage, TAN.shield, FOES[KIND.brute]!.hp];
    expect("drainRate" in stageById("c1-s3")).toBe(false);
    const { lines, undo } = applySet("RAY.damage=120,TAN.shield*=2,c1-s4.packs.shield.share*=0.5,c1-s3.drainRate=2,FOES.2.hp=250");
    expect(RAY.damage).toBe(120);
    expect(TAN.shield).toBeCloseTo(shield * 2, 9);
    expect(stage.packs.shield!.share).toBeCloseTo(share * 0.5, 9);
    expect(stageById("c1-s3").drainRate).toBe(2);
    expect(FOES[KIND.brute]!.hp).toBe(250);
    expect(lines).toHaveLength(5);
    expect(lines[3]).toBe("c1-s3.drainRate —→2");
    undo();
    expect([RAY.damage, TAN.shield, FOES[KIND.brute]!.hp]).toEqual([ray, shield, hp]);
    expect(stage.packs.shield!.share).toBe(share);
    expect("drainRate" in stageById("c1-s3")).toBe(false);
  });

  it("refuses unknown names, non-numeric fields and new fields (a typo never passes silently)", () => {
    const ray = RAY.damage;
    for (const bad of ["RAYS.damage=1", "RAY.dmg=1", "c1-s1.name=1", "c1-s1.calm=2", "c1-s1.speed=2", "RAY.damage=x", "RAY=1"]) expect(() => applySet(bad), bad).toThrow();
    expect(RAY.damage).toBe(ray);
  });

  it("changes a stage's own copy of an object stages share, never the others' (review: c1-s1.pace leaked into s0, c1-s3, c1-s4)", () => {
    const [s1, s3, trial] = [stageById("c1-s1"), stageById("c1-s3"), stageById("s0")];
    const [pace, cost, tide] = [s1.pace, s1.pace.eliteCost, s1.tide];
    expect(s3.pace).toBe(pace);
    const { lines, undo } = applySet("c1-s1.pace.eliteCost*=2,c1-s1.tide.0*=1");
    expect(lines).toHaveLength(2);
    expect(stageById("c1-s1").pace.eliteCost).toBe(cost * 2);
    expect([s3.pace.eliteCost, trial.pace.eliteCost, PACE_HOLD.eliteCost]).toEqual([cost, cost, cost]);
    expect(s3.pace).toBe(pace);
    expect(trial.tide).toBe(tide);
    undo();
    expect(stageById("c1-s1").pace).toBe(pace);
    expect(stageById("c1-s1").tide).toBe(tide);
    // A constant's own path still changes it for every stage that uses it.
    const all = applySet("PACE_HOLD.eliteCost=30");
    expect([stageById("c1-s1").pace.eliteCost, s3.pace.eliteCost]).toEqual([30, 30]);
    all.undo();
    expect(PACE_HOLD.eliteCost).toBe(cost);
  });

  it("multiplies an absent drainFrom from DRAIN.from and an absent drainRate from 1", () => {
    expect("drainFrom" in stageById("s0")).toBe(false);
    const { lines, undo } = applySet("s0.drainFrom*=0.9,c1-s3.drainRate*=1.5");
    expect(stageById("s0").drainFrom).toBeCloseTo(DRAIN.from * 0.9, 9);
    expect(stageById("c1-s3").drainRate).toBeCloseTo(1.5, 9);
    expect(lines[0]).toBe("s0.drainFrom —→" + String(DRAIN.from * 0.9));
    undo();
    expect("drainFrom" in stageById("s0")).toBe(false);
    expect("drainRate" in stageById("c1-s3")).toBe(false);
  });

  it("undoes the items before a bad one when it throws", () => {
    const [ray, rate] = [RAY.damage, stageById("c1-s1").drainRate];
    const pace = stageById("c1-s4").pace;
    expect(() => applySet("RAY.damage=200,c1-s1.drainRate=5,c1-s4.pace.eliteCost=3,RAY.dmg=1")).toThrow();
    expect([RAY.damage, stageById("c1-s1").drainRate]).toEqual([ray, rate]);
    expect(stageById("c1-s4").pace).toBe(pace);
  });
});
