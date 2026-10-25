import { describe, expect, it } from "vitest";
import { lengthFor } from "../src/content/balance";
import { FOES, KIND, SHIELD } from "../src/content/foes";
import {
  COUNTERS, COUNTER_ROWS, FORGE, GUN, GUN_SPECS, HEAVY, MAG_CAP, MAG_MAX, PHAO, QUALITY, RAY, TAN, TAN_FAN, XUNG, type CounterRow, type GunId,
} from "../src/content/guns";
import { FIELD } from "../src/content/rules";
import { EV, FLAG } from "../src/sim/events";
import { hashHex } from "../src/sim/hash";
import { burstDamage } from "../src/sim/guns/phao";
import { damageFoe } from "../src/sim/projectiles";
import { loadMagazine } from "../src/sim/weapons";
import { createWorld, step, type World } from "../src/sim/world";
import { ENDLESS, arena, cleared, feeder, freeze, lost, place, runUntil } from "./survival/arena";
import { COUNTER_SEED_SETS, COUNTER_STAGE, SCENES, counterMisfits, counterRules, countersMatch, measureCounters } from "./survival/counters";
import { sharedDeck } from "./survival/typist-bot";

/**
 * The guns of S1 (docs/BUILD_S1.md §5, §15): magazines and their time, Vỏ and
 * the clean magazine, reach to big foes, Ray's pierce, Pháo Sao's burst,
 * Tán's fan and knock-back, the shield, Rèn, word lengths, and the gates G3
 * (counters measured in small scenes) and G3m (the table matches them).
 */
const mz = FIELD.muzzleZ;

/** Events of `kind` written since `from`. */
function eventsSince(w: World, from: number, kind: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(from, w.events.written - w.events.size); i < w.events.written; i += 1) if (w.events.kind[i % w.events.size] === kind) out.push(i % w.events.size);
  return out;
}

/** Steps `seconds`, returning the ticks at which `kind` events came. */
function watch(w: World, seconds: number, kind: number): number[] {
  const ticks: number[] = [];
  for (let t = 0; t < seconds * 60; t += 1) {
    const before = w.events.written;
    step(w);
    for (const i of eventsSince(w, before, kind)) ticks.push(w.events.tick[i]!);
  }
  return ticks;
}

describe("magazines (§5.1)", () => {
  it("each gun empties one magazine in its time: Tán 6 volleys in 2 s, Ray 3 shots in 2.4 s, Pháo Sao 6 shells in 3 s", () => {
    const cases: [GunId, number, number, number][] = [
      [GUN.tan, EV.volley, TAN.volleys, TAN.seconds],
      [GUN.ray, EV.rail, RAY.shots, RAY.seconds],
      [GUN.phao, EV.launch, PHAO.shells, PHAO.seconds],
    ];
    for (const [gun, kind, units, seconds] of cases) {
      const w = arena([gun]);
      freeze(w);
      // Plenty to shoot at, within every gun's reach.
      for (let i = 0; i < 30; i += 1) place(w, KIND.mine, -4 + (i % 6) * 1.6, mz + 5.5 + Math.floor(i / 6) * 1.2 + (gun === GUN.phao ? 6 : 0));
      for (let s = 0; s < w.foes.top; s += 1) w.foes.hp[s] = 1e6;
      loadMagazine(w, 0, false, false);
      const ticks = watch(w, seconds + 1.5, kind);
      expect(ticks.length, GUN_SPECS[gun]!.key).toBe(units);
      expect((ticks.at(-1)! - ticks[0]!) / 60, GUN_SPECS[gun]!.key).toBeCloseTo(seconds - seconds / units, 1);
      expect(w.guns.mags[0]).toBe(0);
    }
  });

  it("a word loads one magazine, two at most; Rèn level 3 holds three; Rèn ×1.2 and ×1.4 on every blow", () => {
    for (const [level, cap] of [[1, MAG_MAX], [2, MAG_MAX], [3, MAG_CAP]] as const) {
      const w = arena([GUN.xung], { levels: [level] });
      for (let k = 0; k < cap; k += 1) expect(loadMagazine(w, 0, false, false)).toBe(true);
      expect(loadMagazine(w, 0, false, false)).toBe(false);
      expect(w.guns.mags[0]).toBe(cap);
      expect(w.guns.damage[0]).toBeCloseTo(FORGE.damage[level - 1]!, 9);
    }
    // The queued magazines move up in order (a level-3 gun's third keeps its quality).
    const w = arena([GUN.xung], { levels: [3] });
    loadMagazine(w, 0, false, false);
    loadMagazine(w, 0, true, true);
    loadMagazine(w, 0, false, true);
    w.guns.left[0] = 1;
    w.guns.cooldown[0] = 0;
    place(w, KIND.mine, 0, mz + 5);
    w.foes.hp[0] = 1e6;
    step(w);
    expect(w.guns.mags[0]).toBe(2);
    expect([w.guns.perfect[0], w.guns.rate[0]]).toEqual([1, QUALITY.fastRate]);
    expect(w.guns.rate[1]).toBe(QUALITY.fastRate);
  });
});

describe("Vỏ and the clean magazine (§5.1)", () => {
  it("Vỏ comes off every blow and leaves at least 1; Ray meets ×0.25, a clean magazine ×0.75 (Ray ×0.19), Pháo Sao ×0.5", () => {
    const w = arena([GUN.xung]);
    const brute = place(w, KIND.brute, 0, mz + 10);
    const hit = (damage: number, pierce: number): number => {
      const before = w.events.written;
      damageFoe(w, brute, damage, 0, 0, 1, pierce);
      return w.events.value[eventsSince(w, before, EV.hit)[0]!]!;
    };
    const armour = FOES[KIND.brute]!.armour;
    expect(hit(7, 1)).toBeCloseTo(7 - armour, 6);
    expect(hit(3, 1)).toBe(1);
    expect(hit(70, RAY.armour)).toBeCloseTo(70 - armour * 0.25, 6);
    expect(hit(7, QUALITY.cleanArmour)).toBeCloseTo(7 - armour * 0.75, 6);
    expect(hit(70, RAY.armour * QUALITY.cleanArmour)).toBeCloseTo(70 - armour * 0.1875, 6);
    expect(hit(22, PHAO.armour)).toBeCloseTo(22 - armour * 0.5, 6);
    // A foe without Vỏ takes the blow as it is (S0).
    const mine = place(w, KIND.mine, 3, mz + 10);
    const before = w.events.written;
    damageFoe(w, mine, 7, 0, 0, 1, 1);
    expect(w.events.value[eventsSince(w, before, EV.hit)[0]!]).toBe(7);
    expect(w.events.flags[eventsSince(w, before, EV.hit)[0]!]! & FLAG.armour).toBe(0);
  });

  it("magazines carry their armour share: clean words load Vỏ × 0.75 (Ray × 0.1875), others the gun's", () => {
    const w = arena([GUN.xung, GUN.ray]);
    loadMagazine(w, 0, true, false);
    loadMagazine(w, 1, false, false);
    loadMagazine(w, 1, true, false);
    expect(w.guns.pierce[0]).toBe(QUALITY.cleanArmour);
    expect(w.guns.pierce[MAG_CAP]).toBe(RAY.armour);
    expect(w.guns.pierce[MAG_CAP + 1]).toBeCloseTo(RAY.armour * QUALITY.cleanArmour, 9);
  });
});

describe("big foes and reach (§5.1, §6)", () => {
  it("Khiên and every foe up to radius 0.8 sit in the grid; Trâu and Đầu Đàn in the big list", () => {
    const w = arena([GUN.xung]);
    const kinds = [KIND.mine, KIND.scout, KIND.shield, KIND.splitter, KIND.shard, KIND.brute, KIND.leader];
    kinds.forEach((kind, i) => place(w, kind, -9 + i * 3, mz + 12));
    w.grid.build(w.foes, w.shots);
    const big = new Set(Array.from(w.grid.big.subarray(0, w.grid.bigCount)));
    for (let s = 0; s < w.foes.top; s += 1) expect(big.has(s), "kind " + w.foes.kind[s]).toBe(FOES[w.foes.kind[s]!]!.radius > 0.8);
    expect(FOES[KIND.shield]!.radius).toBeLessThanOrEqual(0.8);
  });

  it("a big foe is in reach once its body touches the range: Xung's depth by its near edge, Pháo Sao's near band by its far edge", () => {
    const r = FOES[KIND.brute]!.radius;
    // Xung: the centre beyond the range, the near edge inside it.
    const x = arena([GUN.xung]);
    freeze(x);
    place(x, KIND.brute, 0, mz + XUNG.range + r - 0.2);
    loadMagazine(x, 0, false, false);
    expect(watch(x, 0.5, EV.shot).length).toBeGreaterThan(0);
    const out = arena([GUN.xung]);
    freeze(out);
    place(out, KIND.brute, 0, mz + XUNG.range + r + 0.3);
    loadMagazine(out, 0, false, false);
    expect(watch(out, 0.5, EV.shot).length).toBe(0);
    // Pháo Sao: the centre short of the band's near edge, its far edge inside it; a mine as short is out.
    const p = arena([GUN.phao]);
    freeze(p);
    place(p, KIND.brute, 0, mz + PHAO.near - r + 0.3);
    loadMagazine(p, 0, false, false);
    expect(watch(p, 1, EV.launch).length).toBeGreaterThan(0);
    const q = arena([GUN.phao]);
    freeze(q);
    place(q, KIND.mine, 0, mz + PHAO.near - 0.6);
    loadMagazine(q, 0, false, false);
    expect(watch(q, 1, EV.launch).length).toBe(0);
  });
});

describe("Ray (§5.1)", () => {
  it("pierces up to 6 foes on its line, each passed taking ×0.85 off the next; a shield on the line breaks at once", () => {
    const w = arena([GUN.ray]);
    freeze(w);
    for (let i = 0; i < 8; i += 1) place(w, KIND.scout, 0, mz + 4 + i * 2);
    for (let s = 0; s < w.foes.top; s += 1) w.foes.hp[s] = 1e6;
    w.guns.crit.fill(0);
    loadMagazine(w, 0, false, false);
    w.guns.crit[0] = 0;
    const before = w.events.written;
    for (let t = 0; t < 30 && eventsSince(w, before, EV.rail).length === 0; t += 1) step(w);
    const hits = eventsSince(w, before, EV.hit).map((i) => w.events.value[i]!);
    expect(hits.length).toBe(RAY.pierce);
    hits.forEach((value, k) => expect(value).toBeCloseTo(RAY.damage * RAY.falloff ** k, 4));
    // A shield across the line: broken by the first shot, and it counts as one pierced.
    const s = arena([GUN.ray]);
    freeze(s);
    const bearer = place(s, KIND.shield, 0, mz + 10);
    expect(s.foes.shield[bearer]).toBeGreaterThanOrEqual(0);
    step(s);
    loadMagazine(s, 0, false, false);
    const from = s.events.written;
    for (let t = 0; t < 30 && eventsSince(s, from, EV.rail).length === 0; t += 1) step(s);
    expect(eventsSince(s, from, EV.shieldBreak).length).toBe(1);
    expect(s.shields.count).toBe(0);
    expect(s.foes.mark[bearer]! & 1).toBe(1);
  });

  it("charges each shot on its target first (an event), and picks a Đầu Đàn over a Trâu over a scout", () => {
    const w = arena([GUN.ray]);
    freeze(w);
    const scout = place(w, KIND.scout, -5, mz + 6);
    const brute = place(w, KIND.brute, 5, mz + 12);
    const leader = place(w, KIND.leader, 0, mz + 20);
    loadMagazine(w, 0, false, false);
    const before = w.events.written;
    step(w);
    const charge = eventsSince(w, before, EV.charge);
    expect(charge.length).toBe(1);
    expect(w.events.ref[charge[0]!]).toBe(leader);
    expect(w.events.value[charge[0]!]).toBeCloseTo(RAY.charge, 6);
    // The shot comes RAY.charge s later.
    const rails = watch(w, 0.3, EV.rail);
    expect(rails.length).toBe(1);
    expect((rails[0]! - w.events.tick[charge[0]!]!) / 60).toBeCloseTo(RAY.charge, 1);
    expect([scout, brute]).toHaveLength(2);
  });
});

describe("Pháo Sao (§5.1)", () => {
  it("lands where the heaviest cluster in the 8–24 m band will be, and bursts: full at the centre, falling evenly to the edge", () => {
    expect(burstDamage(PHAO.damage, 0)).toBe(PHAO.damage);
    expect(burstDamage(PHAO.damage, PHAO.radius)).toBeCloseTo(PHAO.edge, 9);
    expect(burstDamage(PHAO.damage, PHAO.radius / 2)).toBeCloseTo((PHAO.damage + PHAO.edge) / 2, 9);
    const w = arena([GUN.phao]);
    freeze(w);
    for (let i = 0; i < 9; i += 1) place(w, KIND.mine, 4 + (i % 3) * 0.9, mz + 16 + Math.floor(i / 3) * 0.9);
    place(w, KIND.mine, -6, mz + 12);
    for (let s = 0; s < w.foes.top; s += 1) w.foes.hp[s] = 1e6;
    loadMagazine(w, 0, false, false);
    const before = w.events.written;
    step(w);
    const launch = eventsSince(w, before, EV.launch);
    expect(launch.length).toBe(1);
    expect(w.events.x[launch[0]!]).toBeGreaterThan(4);
    expect(w.events.z[launch[0]!]).toBeGreaterThan(mz + 15);
    // It lands after its flight and strikes the cluster, not the lone mine.
    const bursts = watch(w, PHAO.flight + 0.05, EV.burst);
    expect(bursts.length).toBe(1);
    expect(w.foes.hp[9]).toBe(1e6);
  });

  it("falls past shields: the foes behind a Khiên take its blow", () => {
    const w = arena([GUN.phao]);
    freeze(w);
    const bearer = place(w, KIND.shield, 0, mz + 12);
    const behind = place(w, KIND.mine, 0, mz + 13.2);
    w.foes.hp[behind] = 1e6;
    w.foes.hp[bearer] = 1e6;
    step(w);
    loadMagazine(w, 0, false, false);
    watch(w, 1.2, EV.burst);
    expect(w.foes.hp[behind]).toBeLessThan(1e6);
    expect(w.shields.hp[w.foes.shield[bearer]!]).toBe(FOES[KIND.shield]!.shield);
  });
});

describe("Tán (§5.1)", () => {
  it("fans 7 pellets ±18° round its target and pushes what it hits back, but never a Trâu", () => {
    expect(TAN_FAN).toHaveLength(7);
    for (const [c, s] of TAN_FAN) expect(c * c + s * s).toBeCloseTo(1, 12);
    expect(Math.acos(TAN_FAN[0]![0]) * (180 / Math.PI)).toBeCloseTo(18, 6);
    const w = arena([GUN.tan]);
    freeze(w);
    const mine = place(w, KIND.mine, 0, mz + 5);
    const brute = place(w, KIND.brute, 3, mz + 5);
    w.foes.hp[mine] = 1e6;
    w.foes.hp[brute] = 1e6;
    const z0 = [w.foes.z[mine]!, w.foes.z[brute]!];
    loadMagazine(w, 0, false, false);
    const before = w.events.written;
    for (let t = 0; t < 30; t += 1) step(w);
    expect(w.events.value[eventsSince(w, before, EV.volley)[0]!]).toBe(7);
    const knocked = eventsSince(w, before, EV.hit).filter((i) => (w.events.flags[i]! & FLAG.knock) !== 0).map((i) => w.events.slot[i]);
    expect(knocked).toContain(mine);
    expect(knocked).not.toContain(brute);
    expect(w.foes.z[mine]!).toBeGreaterThan(z0[0]! + TAN.knock);
    expect(Math.abs(w.foes.z[brute]! - z0[1]!)).toBeLessThan(0.05);
  });
});

describe("Khiên's shield (§6)", () => {
  function shielded(gun: GunId) {
    const w = arena([gun]);
    freeze(w);
    const bearer = place(w, KIND.shield, 0, mz + 6.5);
    const behind = place(w, KIND.mine, 0, mz + 8);
    w.foes.hp[bearer] = 1e6;
    w.foes.hp[behind] = 1e6;
    step(w);
    return { w, bearer, behind, shield: w.foes.shield[bearer]! };
  }

  it("stops Xung and Tán from the front (no damage to the bearer or the pack behind it while it stands); Xung does not waste rounds on it, Tán's pellets wear it (TAN.shield)", () => {
    for (const gun of [GUN.xung, GUN.tan] as const) {
      const { w, bearer, behind, shield } = shielded(gun);
      loadMagazine(w, 0, false, false);
      for (let t = 0; t < 120; t += 1) {
        step(w);
        if (w.shields.alive[shield] === 0) break;
        expect(w.foes.hp[bearer], GUN_SPECS[gun]!.key).toBe(1e6);
        expect(w.foes.hp[behind], GUN_SPECS[gun]!.key).toBe(1e6);
      }
      if (gun === GUN.xung) {
        expect(w.shields.hp[shield]).toBe(FOES[KIND.shield]!.shield);
        // Xung holds its fire on a shielded line: the magazine waits.
        expect(w.guns.left[0]).toBe(XUNG.rounds);
      } else expect(w.shields.hp[shield]!).toBeLessThan(FOES[KIND.shield]!.shield);
    }
    // A Tán volley into the shield: pellets stop on its face (shieldHit events), nothing behind it is hurt.
    const { w } = shielded(GUN.tan);
    loadMagazine(w, 0, false, false);
    const before = w.events.written;
    for (let t = 0; t < 60; t += 1) step(w);
    expect(eventsSince(w, before, EV.shieldHit).length).toBeGreaterThan(0);
    expect(eventsSince(w, before, EV.hit).length).toBe(0);
  });

  it("Tia burns it down first, then reaches the bearer and what was behind it; it never comes back", () => {
    const { w, bearer, behind, shield } = shielded(GUN.tia);
    loadMagazine(w, 0, false, false);
    loadMagazine(w, 0, false, false);
    let broke = -1;
    for (let t = 0; t < 300; t += 1) {
      step(w);
      if (broke < 0 && w.shields.alive[shield] === 0) broke = t;
      if (broke < 0) expect(w.foes.hp[behind]).toBe(1e6);
    }
    expect(broke).toBeGreaterThan(0);
    expect(w.foes.hp[bearer]).toBeLessThan(1e6);
    expect(w.foes.hp[behind]).toBeLessThan(1e6);
    expect(w.foes.shield[bearer]).toBe(-1);
  });

  it("turns toward the ship at a capped rate, never snapping", () => {
    const w = arena([GUN.xung]);
    const bearer = place(w, KIND.shield, 8, mz + 10);
    const k = w.foes.shield[bearer]!;
    w.shields.nx[k] = 1;
    w.shields.nz[k] = 0;
    let last = [1, 0];
    for (let t = 0; t < 120; t += 1) {
      step(w);
      const n = [w.shields.nx[k]!, w.shields.nz[k]!];
      const turned = Math.acos(Math.min(1, n[0]! * last[0]! + n[1]! * last[1]!));
      expect(turned).toBeLessThanOrEqual(SHIELD.turn / 60 + 1e-6);
      last = n;
    }
    const tx = -w.foes.x[bearer]!;
    const tz = mz - w.foes.z[bearer]!;
    const length = Math.hypot(tx, tz);
    expect(last[0]! * (tx / length) + last[1]! * (tz / length)).toBeGreaterThan(0.999);
  });
});

describe("Tách (§6)", () => {
  it("breaks into 3 shards spread across 1.2 m (after the step's blows), real foes that walk on", () => {
    const w = arena([GUN.xung]);
    freeze(w);
    const s = place(w, KIND.splitter, 0, mz + 8);
    const before = w.events.written;
    damageFoe(w, s, 1000, 0, 0, 1);
    expect(w.foes.count).toBe(0);
    step(w);
    expect(eventsSince(w, before, EV.split).length).toBe(1);
    const shards: number[] = [];
    for (let k = 0; k < w.foes.top; k += 1) if (w.foes.alive[k] === 1) shards.push(k);
    expect(shards.map((k) => w.foes.kind[k])).toEqual([KIND.shard, KIND.shard, KIND.shard]);
    const xs = shards.map((k) => w.foes.x[k]!).sort((a, b) => a - b);
    expect(xs[2]! - xs[0]!).toBeCloseTo(2.4, 6);
    expect(w.foes.hp[shards[0]!]).toBe(FOES[KIND.shard]!.hp);
  });
});

describe("words for the bays (§5.1)", () => {
  it("heavy guns take words up to a letter longer (HEAVY: the long end since the R1 close), never past 10 letters; every shown word starts with its own letter", () => {
    for (const e of [15, 25, 35, 50, 70]) {
      const [lo, hi] = lengthFor(e);
      const [hlo, hhi] = lengthFor(e, true);
      expect([hlo, hhi]).toEqual([Math.min(HEAVY.cap, lo + HEAVY.short), Math.min(HEAVY.cap, hi + HEAVY.long)]);
      expect(hhi).toBeLessThanOrEqual(10);
    }
    const deck = sharedDeck();
    const w = createWorld({ seed: 3, deck, expected: 35, kit: { guns: [GUN.xung, GUN.ray, GUN.phao], levels: [1, 1, 1], bays: 3, armour: 100 } });
    const [hlo, hhi] = lengthFor(35, true);
    for (let round = 0; round < 60; round += 1) {
      const words = Array.from(w.typing.word, (index) => deck[index]!);
      expect(new Set(words.map((word) => word[0])).size).toBe(3);
      for (const bay of [1, 2]) {
        expect(words[bay]!.length).toBeGreaterThanOrEqual(hlo);
        expect(words[bay]!.length).toBeLessThanOrEqual(hhi);
      }
      // Type bay (round % 3)'s word.
      const bay = round % 3;
      step(w, [...words[bay]!].map((c) => ({ t: "key" as const, letter: c.charCodeAt(0) - 97 })));
      w.guns.mags.fill(0);
    }
  });
});

describe("gate G3: the counters hold in small scenes, as a chapter's stage fires the guns (§11.4)", () => {
  const SEEDS = [1, 2, 3, 4, 5, 6];
  const stage = COUNTER_STAGE;
  const timeTo = (guns: GunId, setup: (w: World, seed: number) => void, clean: (n: number) => boolean, stand = false) =>
    SEEDS.map((seed) => {
      const w = arena([guns], { seed, stage });
      if (stand) freeze(w);
      setup(w, seed);
      return runUntil(w, feeder(clean), cleared, 120);
    }).reduce((a, b) => a + b, 0) / SEEDS.length;
  const armourOf = (gun: GunId, setup: (w: World, seed: number) => void) =>
    SEEDS.map((seed) => {
      const w = arena([gun], { seed, stage });
      setup(w, seed);
      runUntil(w, feeder((n) => n % 5 !== 4), cleared, 40);
      return lost(w);
    }).reduce((a, b) => a + b, 0) / SEEDS.length;
  const sixBrutes = (w: World) => {
    for (let i = 0; i < 6; i += 1) place(w, KIND.brute, -7.5 + i * 3, mz + 9 + (i % 2) * 0.8);
  };

  it("Ray brings down 6 Trâu at least twice as fast as Xung, even with every magazine clean; Xung's clean magazines ≥ 25 % faster than dirty ones", () => {
    const ray = timeTo(GUN.ray, sixBrutes, () => true, true);
    const xungClean = timeTo(GUN.xung, sixBrutes, () => true, true);
    const xungDirty = timeTo(GUN.xung, sixBrutes, () => false, true);
    expect(xungClean / ray).toBeGreaterThanOrEqual(2);
    expect(xungDirty / xungClean).toBeGreaterThanOrEqual(1.25);
  });

  it("Pháo Sao clears a cluster of 10 mines 16 m out at least 1.5× as fast as Xung", () => {
    const cluster = (w: World, seed: number) => {
      for (let i = 0; i < 10; i += 1) place(w, KIND.mine, -2 + (i % 5) + (seed % 3) * 0.2, mz + 16 + Math.floor(i / 5) * 1.2);
    };
    const phao = timeTo(GUN.phao, cluster, (n) => n % 5 !== 4);
    const xung = timeTo(GUN.xung, cluster, (n) => n % 5 !== 4);
    expect(xung / phao).toBeGreaterThanOrEqual(1.5);
  });

  it("Tán holds a wave of 40 mines rushing in to 6 m, losing at least 30 % less armour than Ray", () => {
    const tan = armourOf(GUN.tan, SCENES.swarmNear.setup);
    const ray = armourOf(GUN.ray, SCENES.swarmNear.setup);
    expect(tan).toBeLessThanOrEqual(ray * 0.7);
  });

  it("Tán and Tia clear Tách shards faster than Ray (seconds to clear plus the armour they take, as G3m)", () => {
    // Four broken Tách: three shards each, 1.2 m apart, as they burst out.
    const shards = (w: World, seed: number) => {
      for (let i = 0; i < 12; i += 1) place(w, KIND.shard, -6 + Math.floor(i / 3) * 4 + ((i % 3) - 1) * 1.2 + (seed % 4) * 0.1, mz + 8 + (Math.floor(i / 3) % 2) * 2 + (i % 3 === 1 ? 0.5 : 0));
    };
    const cost = (gun: GunId) =>
      SEEDS.map((seed) => {
        const w = arena([gun], { seed, stage });
        shards(w, seed);
        const time = runUntil(w, feeder((n) => n % 5 !== 4), cleared, 40);
        return time + lost(w);
      }).reduce((a, b) => a + b, 0) / SEEDS.length;
    const ray = cost(GUN.ray);
    expect(cost(GUN.tan)).toBeLessThan(ray);
    expect(cost(GUN.tia)).toBeLessThan(ray);
  });
});

describe("gate G3m: COUNTERS is what the scenes measure, on seeds 1–16 and 17–32 (§5.2)", () => {
  const sets = COUNTER_SEED_SETS.map((seeds) => measureCounters(seeds));

  it("every cell of the table carries a mark its measured cost allows on each seed set (either mark within COUNTER_MARGIN of a threshold)", () => {
    sets.forEach((measured, k) => {
      for (const row of COUNTER_ROWS) {
        const ok = measured[row].allowed.map((marks, gun) => marks.includes(COUNTERS[row][gun]!));
        expect(ok, "seeds from " + COUNTER_SEED_SETS[k]![0] + ": " + row + " " + measured[row].cost.map((c) => c.toFixed(1)).join(" ") + " allows " + JSON.stringify(measured[row].allowed)).toEqual([true, true, true, true, true]);
      }
    });
    expect(counterMisfits(sets, COUNTERS)).toEqual([]);
    expect(countersMatch(sets, COUNTERS)).toBe(true);
  });

  /**
   * No known miss since R1 guns (changelog 2026-10-24-s1-r1-guns.md): Xung's
   * chapter magazine gives it ● on swarmNear and splitter (R1 review pass 2
   * had pinned "xung: ● on 1 row(s)" here).
   */
  const KNOWN_MISSES: string[] = [];

  it("holds §5.2's rules (no gun ● everywhere; each gun ● on ≥ 2 rows and ✕ on ≥ 2; every pair leaves a row without ●)", () => {
    expect(counterRules(COUNTERS)).toEqual(KNOWN_MISSES);
    const xungEverywhere = Object.fromEntries(COUNTER_ROWS.map((row) => [row, [2, ...COUNTERS[row].slice(1)]])) as Record<CounterRow, number[]>;
    expect(counterRules(xungEverywhere)).toEqual(["xung: ● on every row", "xung: ✕ on 0 row(s), not ≥ 2", ...["tia", "tan", "ray", "phao"].map((gun) => "xung+" + gun + ": ● on every row")]);
  });
});

describe("no state between worlds", () => {
  it("a run is the same whatever ran before it in the page (scratch arrays and query results never carry over)", () => {
    const run = () => {
      const w = arena([GUN.xung, GUN.tan]);
      SCENES.swarmNear.setup(w, 2);
      runUntil(w, feeder(), cleared, 20);
      return hashHex(w);
    };
    const first = run();
    // A busy world in between: shields, Ray, Pháo Sao, Tia.
    const busy = arena([GUN.ray, GUN.phao, GUN.tia]);
    SCENES.shield.setup(busy, 1);
    SCENES.splitter.setup(busy, 1);
    runUntil(busy, feeder(), cleared, 20);
    expect(run()).toBe(first);
    expect(ENDLESS - busy.hp).toBeGreaterThanOrEqual(0);
  });
});
