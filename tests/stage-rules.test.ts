import { describe, expect, it } from "vitest";
import { MODES, learnFactor, stageHeader, STANDARD_PACE } from "../src/content/balance";
import { CHAPTER_1, stageById } from "../src/content/chapter-1";
import { KIND } from "../src/content/foes";
import { GUN } from "../src/content/guns";
import { ATTENTION, MISSING, RIFT, checkChapter, type Stage } from "../src/content/stage-rules";
import { gunSets, kitScore, mainRow, stageThreat, uncovered } from "../src/content/threat";
import { EV, OBJECTIVE, TELEGRAPH } from "../src/sim/events";
import { hashHex } from "../src/sim/hash";
import { damageFoe } from "../src/sim/projectiles";
import { hiddenMask } from "../src/sim/words";
import { createWorld, runLog, step, type World } from "../src/sim/world";
import { emptyTally, runSample } from "../src/app/skill";
import { chooseGuns } from "./survival/tactics";
import { playOut, sharedDeck, typistBot } from "./survival/typist-bot";

/**
 * The stage rules of S1 R1 (docs/BUILD_S1.md §7, §8, §15): the chapter's
 * table passes checkChapter (and a broken one fails), Săn ends when enough
 * leaders fall (the horde pulls back, harmless) and is lost when too many get
 * through, Vết nứt warns and pours its mines, Thiếu chữ hides letters without
 * changing the deal, special packs come at their times, the attention
 * budget holds on every stage, and stage runs replay.
 */
const deck = sharedDeck();
const world = (stage: string, seed = 1, extra: Partial<Parameters<typeof createWorld>[0]> = {}) => createWorld({ seed, deck, stage, ...extra });

function eventsOf(w: World, kind: number, from = 0): number[] {
  const out: number[] = [];
  for (let i = Math.max(from, w.events.written - w.events.size); i < w.events.written; i += 1) if (w.events.kind[i % w.events.size] === kind) out.push(i % w.events.size);
  return out;
}

describe("chapter 1's table (§7.5, §8)", () => {
  it("passes checkChapter: distinct triples, each thing taught where it first appears, one mechanic and one foe a stage, no hard rule with a heavy hazard", () => {
    expect(checkChapter(CHAPTER_1)).toEqual([]);
    expect(CHAPTER_1.map((stage) => stage.id)).toEqual(["c1-s1", "c1-s2", "c1-s3", "c1-s4"]);
  });

  it("fails a chapter broken on purpose", () => {
    const [s1, s2, s3, s4] = CHAPTER_1 as [Stage, Stage, Stage, Stage];
    // Khiên before it is taught, and stage 3's triple twice.
    const broken: Stage[] = [{ ...s1, packs: { ...s1.packs, shield: { share: 0.1, from: 0 } } }, s2, s3, { ...s3, id: "c1-s3b" }, s4];
    const problems = checkChapter(broken);
    expect(problems.some((p) => p.includes("c1-s1") && p.includes("shield"))).toBe(true);
    expect(problems.some((p) => p.includes("c1-s3b") && p.includes("same objective"))).toBe(true);
    // Two new foes in one stage.
    const crowded: Stage[] = [{ ...s1, teach: ["brute", "shield"], packs: { brute: { share: 0.05, from: 80 }, shield: { share: 0.05, from: 80 } } }];
    expect(checkChapter(crowded).some((p) => p.includes("more than one foe"))).toBe(true);
    // A hunt whose leaders come after its cap.
    expect(checkChapter([{ ...s2, objective: { kind: "hunt", need: 3, leaders: [20, 50, 300], cap: 240 } }]).some((p) => p.includes("cannot be won"))).toBe(true);
  });

  it("gives each stage its reference kit: bays, armour, Rèn levels to the guns in the order picked", () => {
    const s4 = stageById("c1-s4");
    const header = stageHeader(STANDARD_PACE, s4, [GUN.ray, GUN.tia], { e: 35, a: 0.95, cv: 0.25, fatigue: 0 });
    expect(header.kit).toEqual({ guns: [GUN.ray, GUN.tia], levels: [2, 1], bays: 2, armour: 100 });
    const w = createWorld({ seed: 1, deck, ...header });
    expect(Array.from(w.guns.level)).toEqual([2, 1]);
    expect(w.hp).toBe(100);
  });
});

describe("ρ: the learning rule's factor (§7.3, §11.1)", () => {
  it("is 1 on standard words; ≈ 0.87 for the standard typist on Thiếu chữ; never below 0.6; it scales the stage's spawns", () => {
    const standard = { e: 35, a: 0.95, cv: 0.25, fatigue: 0 };
    expect(learnFactor(standard, "standard")).toBe(1);
    const rho = learnFactor(standard, "missing");
    expect(rho).toBeGreaterThan(0.84);
    expect(rho).toBeLessThan(0.9);
    expect(learnFactor({ e: 5, a: 0.8, cv: 0.4, fatigue: 0 }, "missing")).toBeGreaterThanOrEqual(0.6);
    const header = stageHeader(STANDARD_PACE, stageById("c1-s4"), [GUN.xung, GUN.tia], standard);
    expect(header.learn).toBe(rho);
    const a = createWorld({ seed: 2, deck, ...header });
    const b = createWorld({ seed: 2, deck, ...header, learn: 1 });
    expect(a.scales.rate).toBeCloseTo(b.scales.rate * rho, 9);
    expect(hashHex(a)).not.toBe(hashHex(b));
  });
});

describe("Săn Đầu Đàn (§7.1)", () => {
  const hunt = stageById("c1-s2");
  const leaders = hunt.objective.kind === "hunt" ? hunt.objective : null;

  it("walks the leaders in at their times with an escort ahead and a horn; the director never adds or removes one", () => {
    const w = world("c1-s2", 3);
    w.hp = 1e9;
    w.foeCap = 120;
    // Neither won nor lost on the way: every leader gets to walk in.
    w.objective.need = 99;
    w.objective.of = 999;
    const arrivals: number[] = [];
    let seen = 0;
    while (w.phase === "play" && w.time < leaders!.leaders.at(-1)! + 2) {
      step(w);
      const list = eventsOf(w, EV.leader, seen);
      seen = w.events.written;
      for (const i of list) arrivals.push(w.events.tick[i]! / 60);
    }
    expect(arrivals.length).toBe(leaders!.leaders.length);
    arrivals.forEach((t, i) => expect(t).toBeCloseTo(leaders!.leaders[i]!, 1));
    let count = 0;
    for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1 && w.foes.kind[s] === KIND.leader) count += 1;
    expect(count + w.objective.done + w.objective.leaked).toBe(leaders!.leaders.length);
    expect(w.phase).toBe("play");
  });

  it("is won once `need` leaders fall: the horde pulls back, harmless, for 2 s, then the stage ends", () => {
    const w = world("c1-s2", 4);
    w.hp = 1e9;
    w.foeCap = 120;
    while (w.phase === "play" && w.objective.retreat < 0 && w.time < 239) {
      step(w);
      // Every leader that walks into the corridor falls at once (through the sim's damage path, as a gun's blow).
      for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1 && w.foes.kind[s] === KIND.leader && w.foes.z[s]! < 38) killFoe(w, s);
    }
    expect(w.objective.done).toBe(leaders!.need);
    expect(eventsOf(w, EV.retreat).length).toBe(1);
    const retreat = w.objective.retreat;
    const hp = w.hp;
    const breaches = w.stats.breaches;
    while (w.phase === "play") step(w);
    expect(w.phase).toBe("won");
    expect(w.time).toBeCloseTo(retreat + 2, 1);
    // Harmless while it fades: no armour lost, nobody breached.
    expect(w.hp).toBe(hp);
    expect(w.stats.breaches).toBe(breaches);
  });

  it("is lost when more leaders get through than it can spare (leaders − need)", () => {
    const w = world("c1-s2", 5);
    w.hp = 1e9;
    w.foeCap = 120;
    while (w.phase === "play") step(w);
    expect(w.phase).toBe("lost");
    expect(w.objective.leaked).toBe(leaders!.leaders.length - leaders!.need + 1);
    const progress = eventsOf(w, EV.objective).filter((i) => w.events.slot[i] === OBJECTIVE.hunt);
    expect(progress.length).toBeGreaterThan(0);
  });
});

/** A blow through the sim's damage path that kills foe `s`. */
function killFoe(w: World, s: number): void {
  damageFoe(w, s, 1e6, 0, 0, 1, 1);
}

describe("Vết nứt (§7.2)", () => {
  it("warns RIFT.warn s ahead on a wall at 9–13 m (a telegraph), then pours its mines there over a second", () => {
    const w = world("c1-s3", 6, { director: false });
    w.hp = 1e9;
    w.foeCap = 120;
    const warns: { t: number; x: number; z: number }[] = [];
    const opens: { t: number; n: number; x: number; z: number }[] = [];
    let seen = 0;
    while (w.time < 70) {
      const before = w.foes.count;
      step(w);
      for (const i of eventsOf(w, EV.telegraph, seen)) if (w.events.slot[i] === TELEGRAPH.rift) warns.push({ t: w.time, x: w.events.x[i]!, z: w.events.z[i]! });
      for (const i of eventsOf(w, EV.rift, seen)) opens.push({ t: w.time, n: w.events.value[i]!, x: w.events.x[i]!, z: w.events.z[i]! });
      seen = w.events.written;
      expect(w.foes.count).toBeGreaterThanOrEqual(before - 50);
    }
    expect(warns.length).toBeGreaterThanOrEqual(2);
    expect(opens.length).toBe(warns.length);
    warns.forEach((warn, k) => {
      expect(opens[k]!.t - warn.t).toBeCloseTo(RIFT.warn, 1);
      expect(Math.abs(warn.x)).toBeGreaterThan(9);
      expect(warn.z).toBeGreaterThanOrEqual(RIFT.zMin);
      expect(warn.z).toBeLessThanOrEqual(RIFT.zMax);
      expect(opens[k]!.n).toBe(Math.max(RIFT.min, Math.min(RIFT.max, Math.round(RIFT.foes * w.scales.rate))));
    });
    // The first one at its time (25 s) unless the budget moved it later.
    expect(opens[0]!.t).toBeGreaterThanOrEqual(25 - 1e-6);
  });

  it("scales with the mode and k, 4–12 mines", () => {
    for (const mode of MODES) for (const pace of [0.75, 1, 1.3]) {
      const w = world("c1-s3", 7, { mode, pace });
      const n = Math.max(RIFT.min, Math.min(RIFT.max, Math.round(RIFT.foes * w.scales.rate)));
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(12);
    }
  });
});

describe("the attention budget (§7.6)", () => {
  it("never starts two telegraphs within 4 s, nor a rift in a surge's first seconds or in a storm: stages 1–4 × 20 seeds × 3 modes", () => {
    let clashes = 0;
    let telegraphs = 0;
    for (const stage of CHAPTER_1) {
      for (const mode of MODES) {
        for (let seed = 1; seed <= 20; seed += 1) {
          const w = world(stage.id, seed, { mode });
          w.hp = 1e9;
          // No crowd keeps the run quick (the timeline does not depend on it); the director, finding it calm, keeps pulling surges earlier.
          w.foeCap = 0;
          let last = -1e9;
          let seen = 0;
          while (w.phase === "play" && w.time < 200) {
            step(w);
            for (const i of eventsOf(w, EV.telegraph, seen)) {
              telegraphs += 1;
              if (w.time - last < ATTENTION.gap - 1e-6) clashes += 1;
              last = w.time;
            }
            for (const i of eventsOf(w, EV.rift, seen)) {
              const t = w.time;
              for (let k = 0; k < w.plan.surgeAt.length; k += 1) {
                if (t >= w.plan.surgeAt[k]! && t < w.plan.surgeAt[k]! + ATTENTION.surgeQuiet) clashes += 1;
                if (w.plan.storm[k] === 1 && t >= w.plan.surgeAt[k]! && t <= w.plan.surgeEnd[k]!) clashes += 1;
              }
              expect(i).toBeGreaterThanOrEqual(0);
            }
            seen = w.events.written;
          }
        }
      }
    }
    expect(telegraphs).toBeGreaterThan(500);
    expect(clashes).toBe(0);
  }, 60_000);
});

describe("Thiếu chữ (§7.3)", () => {
  it("hides one letter (two from 7 letters), never the first, never two side by side", () => {
    let state = 99;
    const rng = { int: (min: number, max: number) => min + ((state = (Math.imul(state, 48271) + 7) >>> 0) % (max - min + 1)) };
    for (let length = 2; length <= 10; length += 1) {
      for (let k = 0; k < 200; k += 1) {
        const mask = hiddenMask(length, rng);
        const bits = [...Array(length).keys()].filter((p) => (mask & (1 << p)) !== 0);
        expect(bits.length).toBe(length <= MISSING.short ? 1 : 2);
        expect(bits).not.toContain(0);
        if (bits.length === 2) expect(bits[1]! - bits[0]!).toBeGreaterThan(1);
      }
    }
  });

  it("deals exactly the words it would without the rule (its own stream), and a wrong key on a hidden letter shows it", () => {
    const words = (stage: string) => {
      const w = world(stage, 8, { kit: { guns: [GUN.xung, GUN.tia], levels: [1, 1], bays: 2, armour: 100 }, learn: 1 });
      const out: string[] = [];
      for (let round = 0; round < 30; round += 1) {
        const text = w.deck[w.typing.word[round % 2]!]!;
        out.push(text);
        step(w, [...text].map((c) => ({ t: "key" as const, letter: c.charCodeAt(0) - 97 })));
        w.guns.mags.fill(0);
      }
      return { out, w };
    };
    // Same seed, a stage without the rule and one with it (stages differ in nothing that deals words).
    const plain = words("c1-s3");
    const hidden = words("c1-s4");
    expect(hidden.out).toEqual(plain.out);
    const w = hidden.w;
    expect(w.typing.hidden[0]).not.toBe(0);
    // Find the hidden letter of bay 0, type up to it, then a wrong key there.
    const text = w.deck[w.typing.word[0]!]!;
    const p = [...text].findIndex((_, i) => (w.typing.hidden[0]! & (1 << i)) !== 0);
    const keys = [...text.slice(0, p)].map((c) => ({ t: "key" as const, letter: c.charCodeAt(0) - 97 }));
    const wrong = ((text.charCodeAt(p) - 97 + 5) % 26) as number;
    step(w, [...keys, { t: "key", letter: wrong }]);
    expect(w.typing.shown[0]! & (1 << p)).not.toBe(0);
    expect(w.typing.errors[0]).toBe(1);
  });
});

describe("special packs (§8)", () => {
  it("bring stage 1's first Trâu pack at 80 s (never before), and Khiên packs with their shields on stage 4", () => {
    const w = world("c1-s1", 9, { director: false });
    w.hp = 1e9;
    w.foeCap = 200;
    let firstBrute = -1;
    while (w.phase === "play" && firstBrute < 0) {
      step(w);
      for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1 && w.foes.kind[s] === KIND.brute) firstBrute = w.time;
    }
    expect(firstBrute).toBeGreaterThanOrEqual(80);
    expect(firstBrute).toBeLessThan(85);
    const s4 = world("c1-s4", 9, { director: false });
    s4.hp = 1e9;
    s4.foeCap = 200;
    let bearers = 0;
    while (s4.time < 60) {
      step(s4);
      bearers = 0;
      for (let s = 0; s < s4.foes.top; s += 1) if (s4.foes.alive[s] === 1 && s4.foes.kind[s] === KIND.shield) bearers += 1;
      if (bearers > 0) break;
    }
    expect(bearers).toBeGreaterThan(0);
    expect(s4.shields.count).toBe(bearers);
  });
});

describe("guns for a stage (§11.2)", () => {
  it("weighs each stage's danger by row and scores kits by their best mark per row; the bots pick by tactics", () => {
    for (const stage of CHAPTER_1) {
      const weights = stageThreat(stage);
      expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      expect(gunSets(2)).toHaveLength(10);
      const best = gunSets(2).reduce((a, b) => (kitScore(b, weights) > kitScore(a, weights) ? b : a));
      expect(kitScore(best, weights)).toBeLessThanOrEqual(1);
      expect([...chooseGuns(stage, "good", 1)].sort()).toEqual([...best].sort());
      expect(chooseGuns(stage, "poor", 1)).toEqual([GUN.xung, GUN.tia]);
    }
    expect(mainRow(stageThreat(stageById("c1-s2")))).toBe("armoured");
    expect(mainRow(stageThreat(stageById("c1-s4")))).toBe("shield");
    expect(mainRow(stageThreat(stageById("c1-s1")))).toBe("armoured");
    expect(uncovered([GUN.xung, GUN.tan], stageThreat(stageById("c1-s4")))).toContain("shield");
  });
});

describe("the skill profile on a hard learning rule (§7.3)", () => {
  it("a Thiếu chữ run gives accuracy and seconds to the first key, never speed or spread", () => {
    const header = stageHeader(STANDARD_PACE, stageById("c1-s4"), [GUN.xung, GUN.tia], { e: 35, a: 0.95, cv: 0.25, fatigue: 0 });
    const { session, bot } = typistBot({ seed: 12, deck, ...header }, "standard", 78);
    playOut(session, bot, 60 * 60);
    const w = session.world;
    const sample = runSample(w, w.meter.summary("quit"), "won", false, emptyTally());
    expect(sample.wpm).toBeUndefined();
    expect(sample.cv).toBeUndefined();
    expect(sample.keys).toBeGreaterThan(50);
    expect(sample.correctKeys! / sample.keys!).toBeLessThan(0.97);
    const plain = typistBot({ seed: 12, deck, ...stageHeader(STANDARD_PACE, stageById("c1-s3"), [GUN.xung, GUN.tia], { e: 35, a: 0.95, cv: 0.25, fatigue: 0 }) }, "standard", 78);
    playOut(plain.session, plain.bot, 60 * 60);
    expect(runSample(plain.session.world, plain.session.world.meter.summary("quit"), "won", false).wpm).toBeGreaterThan(25);
  });
});

describe("stage runs replay (G8)", () => {
  it("a bot's stage run, replayed from its log with the same header, gives the same hash", () => {
    for (const stage of ["c1-s2", "c1-s3", "c1-s4"]) {
      const header = stageHeader(STANDARD_PACE, stageById(stage), [GUN.ray, GUN.tan], { e: 35, a: 0.95, cv: 0.25, fatigue: 0 });
      const { session, bot } = typistBot({ seed: 11, deck, ...header }, "standard", 77);
      playOut(session, bot, 60 * 90);
      const again = createWorld({ seed: 11, deck, ...header });
      runLog(again, session.log, session.world.tick);
      expect(hashHex(again), stage).toBe(hashHex(session.world));
    }
  });
});
