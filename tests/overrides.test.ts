import { describe, expect, it } from "vitest";
import { applySet } from "../scripts/overrides";
import { stageById } from "../src/content/chapter-1";
import { FOES, KIND } from "../src/content/foes";
import { RAY, TAN } from "../src/content/guns";

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
});
