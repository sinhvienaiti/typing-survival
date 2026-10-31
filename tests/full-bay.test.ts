import { describe, expect, it } from "vitest";
import { applySet } from "../scripts/overrides";
import { FORGE, FULL_BAY, GUN, MAG_CAP, QUALITY } from "../src/content/guns";
import { EV, FLAG } from "../src/sim/events";
import { flowSnapshot } from "../src/sim/pace";
import { canBoost, fullBayWord, loadMagazine, nextMagazine, spillTarget } from "../src/sim/weapons";
import { step, type World } from "../src/sim/world";
import { arena } from "./survival/arena";
import { bayValue } from "./survival/typist-bot";

const fields = ["mags", "damage", "rate", "crit", "pierce", "perfect"] as const;
const state = (w: World) => fields.map((k) => Array.from(w.guns[k]));
const world = (stage = "c1-s1", levels = [1, 1], three = false) => arena(three ? [GUN.xung, GUN.ray, GUN.tan] : [GUN.xung, GUN.ray], { stage, levels });
function knob(spec: string, run: () => void): void {
  const { undo } = applySet(spec);
  try { run(); } finally { undo(); }
}
function fill(w: World, bay: number, count = w.guns.cap[bay]!): void {
  for (let i = 0; i < count; i += 1) expect(loadMagazine(w, bay, false, false)).toBe(true);
}
function typeWord(w: World, bay = 0, dirty = false): number {
  const start = w.events.written;
  const text = w.deck[w.typing.word[bay]!]!;
  const keys = [...text].map((c) => ({ t: "key" as const, letter: c.charCodeAt(0) - 97 }));
  if (dirty) keys.splice(1, 0, { t: "key", letter: (keys[1]!.letter + 1) % 26 });
  w.guns.cooldown.fill(1e6);
  step(w, keys);
  return start;
}
const events = (w: World, from: number, kind: number) => Array.from({ length: w.events.written - from }, (_, i) => (from + i) % w.events.size).filter((i) => w.events.kind[i] === kind);
const need = [4, 5, 6, 7, 8];

describe("full-bay candidates (220; defaults stay off)", () => {
  it("exports three zero defaults and keeps a full word inert", () => {
    expect(FULL_BAY).toEqual({ extra: 0, spill: 0, boost: 0 });
    const w = world();
    expect(Array.from(w.guns.cap)).toEqual([2, 2]);
    fill(w, 0); fill(w, 1);
    const before = state(w), from = typeWord(w);
    expect(state(w)).toEqual(before);
    expect(events(w, from, EV.load)).toHaveLength(0);
    expect(loadMagazine(w, 0, true, true)).toBe(false);
    expect(flowSnapshot(w).live).toBe(0);
    expect(bayValue(w, 0, need)).toBe(-1);
  });

  it.each([1, 2, 1.9, -1, -0.1])("R1 floors and clamps extra=%s at creation", (extra) => knob(`FULL_BAY.extra=${extra}`, () => {
    expect(Array.from(world().guns.cap)).toEqual(extra >= 1 ? [3, 3] : [2, 2]);
    expect(Array.from(world("c1-s1", [1, 3]).guns.cap)).toEqual(extra >= 1 ? [3, 3] : [2, 3]);
    expect(Array.from(world("s0").guns.cap)).toEqual([2, 2]);
  }));

  it.each([false, true])("R2 transfers the word's clean/fast quality to the receiving gun (dirty=%s)", (dirty) => knob("FULL_BAY.spill=1", () => {
    const w = world(); fill(w, 0);
    const before = fields.slice(1).map((k) => Array.from(w.guns[k]).slice(0, MAG_CAP));
    const index = w.typing.word[0]!, from = typeWord(w, 0, dirty);
    expect(Array.from(w.guns.mags)).toEqual([2, 1]);
    expect(fields.slice(1).map((k) => Array.from(w.guns[k]).slice(0, MAG_CAP))).toEqual(before);
    const i = MAG_CAP;
    expect(w.guns.damage[i]).toBe(1);
    expect(w.guns.rate[i]).toBe(QUALITY.fastRate);
    expect(w.guns.crit[i]).toBeCloseTo(0.05 + (dirty ? 0 : QUALITY.cleanCrit));
    expect(w.guns.pierce[i]).toBeCloseTo(0.25 * (dirty ? 1 : QUALITY.cleanArmour));
    expect(w.guns.perfect[i]).toBe(dirty ? 0 : 1);
    const loads = events(w, from, EV.load), words = events(w, from, EV.word);
    expect(loads).toHaveLength(1);
    const load = loads[0]!;
    expect(load).toBe(words[0]! + 1);
    expect([w.events.slot[load], w.events.ref[load], w.events.value[load]]).toEqual([1, index, 1]);
    expect(w.events.flags[load]).toBe(FLAG.fast | (dirty ? 0 : FLAG.clean | FLAG.perfect));
  }));

  it("R2 has no effect when every gun is full", () => knob("FULL_BAY.spill=1", () => {
    const w = world(); fill(w, 0); fill(w, 1);
    const before = state(w), from = typeWord(w);
    expect(spillTarget(w, 0)).toBe(-1);
    expect(state(w)).toEqual(before);
    expect(events(w, from, EV.load)).toHaveLength(0);
  }));

  it("R2 chooses least magazines, then lowest bay, and never an empty socket", () => knob("FULL_BAY.spill=1", () => {
    const w = world("c1-s1", [1, 1, 1], true); fill(w, 0); fill(w, 1, 1);
    expect(spillTarget(w, 0)).toBe(2);
    fill(w, 2, 1);
    expect(spillTarget(w, 0)).toBe(1);
    expect(fullBayWord(w, 0, false, false)).toBe(1);
    w.guns.gun[2] = -1; w.guns.cap[2] = 0; w.guns.mags[2] = 0;
    expect(spillTarget(w, 0)).toBe(-1);
    expect(spillTarget(w, 2)).toBe(-1);
  }));

  it.each(["FULL_BAY.spill=1", "FULL_BAY.boost=0.3", "FULL_BAY.spill=1,FULL_BAY.boost=0.3"])("S0 keeps its full-bay rule with %s", (spec) => knob(spec, () => {
    const w = world("s0"); fill(w, 0);
    const before = state(w), from = typeWord(w);
    expect(state(w)).toEqual(before);
    expect(events(w, from, EV.load)).toHaveLength(0);
    expect(spillTarget(w, 0)).toBe(-1);
    expect(canBoost(w, 0)).toBe(false);
    expect(bayValue(w, 0, need)).toBe(-1);
    expect(flowSnapshot(w).live).toBe(1);
  }));

  it("R3 boosts the tail once, shifts its mark, and resets a newly loaded tail", () => knob("FULL_BAY.boost=0.3", () => {
    const w = world(); fill(w, 0); fill(w, 1);
    const before = w.guns.damage[1]!, from = typeWord(w);
    expect(w.guns.damage[1]).toBeCloseTo(before * 1.3);
    expect(w.guns.damage[0]).toBe(1);
    expect(events(w, from, EV.load)).toHaveLength(0);
    expect(canBoost(w, 0)).toBe(false);
    typeWord(w);
    expect(w.guns.damage[1]).toBeCloseTo(before * 1.3);
    expect(nextMagazine(w.guns, 0)).toBe(true);
    expect(w.guns.damage[0]).toBeCloseTo(before * 1.3);
    expect(w.guns.fullBay.boosted[0]).toBe(1);
    expect(loadMagazine(w, 0, true, true)).toBe(true);
    expect(w.guns.fullBay.boosted[1]).toBe(0);
    expect(canBoost(w, 0)).toBe(true);
    typeWord(w);
    expect(w.guns.damage[1]).toBeCloseTo(1.3);
    typeWord(w);
    expect(w.guns.damage[1]).toBeCloseTo(1.3);
  }));

  // 230-F7: with two magazines the shift always clears the last slot; with three, slot 2 keeps a
  // stale copy of the shifted mark, so only loadMagazine's own reset makes the new tail boostable.
  it.each([
    ["Forge level 3", "FULL_BAY.boost=0.3", [3, 1], FORGE.damage[2]!],
    ["R1 extra=1", "FULL_BAY.extra=1,FULL_BAY.boost=0.3", [1, 1], FORGE.damage[0]!],
  ] as const)("R3 on a 3-magazine bay (%s): a reload into the stale slot is unboosted", (_label, spec, levels, base) => knob(spec, () => {
    const w = world("c1-s1", [...levels]); fill(w, 0); fill(w, 1);
    expect(w.guns.cap[0]).toBe(MAG_CAP);
    const marks = () => Array.from(w.guns.fullBay.boosted.slice(0, MAG_CAP));
    typeWord(w);
    expect(marks()).toEqual([0, 0, 1]);
    expect(w.guns.damage[2]).toBeCloseTo(base * 1.3);
    expect(canBoost(w, 0)).toBe(false);
    expect(nextMagazine(w.guns, 0)).toBe(true);
    expect(marks()).toEqual([0, 1, 1]);
    expect(loadMagazine(w, 0, false, false)).toBe(true);
    expect(marks()).toEqual([0, 1, 0]);
    expect(w.guns.damage[2]).toBeCloseTo(base);
    expect(canBoost(w, 0)).toBe(true);
    typeWord(w);
    expect(w.guns.damage[2]).toBeCloseTo(base * 1.3);
    expect(w.guns.damage[1]).toBeCloseTo(base * 1.3);
    expect(marks()).toEqual([0, 1, 1]);
  }));

  it("R2 precedes R3; R3 applies only after all other bays fill", () => knob("FULL_BAY.spill=1,FULL_BAY.boost=0.3", () => {
    const w = world(); fill(w, 0); fill(w, 1, 1);
    expect(bayValue(w, 0, need)).toBe(7);
    typeWord(w);
    expect(w.guns.mags[1]).toBe(2);
    expect(w.guns.damage[1]).toBe(1);
    expect(w.guns.fullBay.boosted[1]).toBe(0);
    typeWord(w);
    expect(w.guns.damage[1]).toBeCloseTo(1.3);
  }));

  it.each([['extra', 1], ['spill', 1], ['boost', 0.3]] as const)("--set %s is read at call time and undo restores new worlds", (key, value) => {
    const check = (on: boolean) => {
      const w = world(); fill(w, 0, 2);
      if (key === 'extra') expect(w.guns.cap[0]).toBe(on ? 3 : 2);
      if (key === 'spill') { typeWord(w); expect(w.guns.mags[1]).toBe(on ? 1 : 0); }
      if (key === 'boost') { typeWord(w); expect(w.guns.damage[1]).toBeCloseTo(on ? 1.3 : 1); }
    };
    const existing = world(); fill(existing, 0);
    const set = applySet(`FULL_BAY.${key}=${value}`);
    try {
      expect(set.lines).toEqual([`FULL_BAY.${key} 0→${value}`]); check(true);
      if (key === 'spill') expect(spillTarget(existing, 0)).toBe(1);
      if (key === 'boost') expect(canBoost(existing, 0)).toBe(true);
    } finally { set.undo(); }
    check(false);
    expect(FULL_BAY).toEqual({ extra: 0, spill: 0, boost: 0 });
  });

  it("R1 counts 2/3 as live and gives the bot a positive value", () => knob("FULL_BAY.extra=1", () => {
    const w = world(); fill(w, 0, 2); fill(w, 1);
    expect(flowSnapshot(w).live).toBe(1);
    expect(bayValue(w, 0, need)).toBe(4);
  }));

  it("R2 live/value follows the receiving gun, and stops with no receiver", () => knob("FULL_BAY.spill=1", () => {
    const w = world(); fill(w, 0);
    expect(flowSnapshot(w).live).toBe(2);
    expect(bayValue(w, 0, need)).toBe(14);
    fill(w, 1, 1);
    expect(bayValue(w, 0, need)).toBe(7);
    fill(w, 1, 1);
    expect(flowSnapshot(w).live).toBe(0);
    expect(bayValue(w, 0, need)).toBe(-1);
  }));

  it("R3 live/value exists only for an unboosted tail; empty sockets never count", () => knob("FULL_BAY.boost=0.3", () => {
    const w = world(); fill(w, 0); fill(w, 1);
    expect(flowSnapshot(w).live).toBe(2);
    expect(bayValue(w, 0, need)).toBeCloseTo(4 * 0.3);
    typeWord(w);
    expect(flowSnapshot(w).live).toBe(1);
    expect(bayValue(w, 0, need)).toBe(-1);
    w.guns.gun[1] = -1; w.guns.cap[1] = 0; w.guns.mags[1] = 0;
    expect(canBoost(w, 1)).toBe(false);
    expect(bayValue(w, 1, need)).toBe(-1);
    expect(flowSnapshot(w).live).toBe(0);
  }));
});
