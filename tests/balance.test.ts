import { describe, expect, it } from "vitest";
import { BANDS, SKILL_FULL, botParams, newSkillProfile, parseSkill, serializeSkill, type PaceDecision } from "../src/kit/balance";
import { SEEN_KEY, SKILL_KEY, WordHistory, emptyTally, headerFor, loadProfile, recordRun, runSample, saveProfile, skillReport, tallyWord, type TextStore } from "../src/app/skill";
import { FLOW_EVERY, MODE_SPECS, PACE_GAIN, SURVIVAL_PACE_TABLE, WARMUP_TICKS, paceFor, runHeader, scalesFor } from "../src/content/balance";
import { FOES, KIND } from "../src/content/foes";
import { MAG_MAX, XUNG } from "../src/content/guns";
import { DRAIN, ELITE, FIELD, NEAR, PATH, SHIP, SUPPORT } from "../src/content/rules";
import { STAGE_S0 } from "../src/content/stage-s0";
import { EV } from "../src/sim/events";
import { hashHex } from "../src/sim/hash";
import { LEVER_INDEX, applyPace, flowSnapshot, noteKill, paceStep, pressure } from "../src/sim/pace";
import { createWorld, runLog, step, type WorldOptions } from "../src/sim/world";
import { botProfile, botRows, gates, runMatrix } from "../scripts/balance-lib";
import { playOut, sharedDeck, survivalParams, typistBot } from "./survival/typist-bot";

/**
 * The balance pass (docs/games/BALANCE.md step 3, §9.3; changelog
 * 2026-10-23-balance.md): the skill profile is stored under the kit's key and
 * learns from runs; pace k comes from the blended profile and goes into the
 * run header, which scales the stage; the in-run FlowMeter reads the world
 * and the pace director's decisions map through this game's step table; the
 * bots type through the page's input path; the report gives every gate.
 */
const deck = sharedDeck();
const world = (seed = 1, extra: Partial<WorldOptions> = {}) => createWorld({ seed, deck, ...extra });

class MemoryStore implements TextStore {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): boolean {
    this.items.set(key, value);
    return true;
  }
}

/** A stage played by the standard bot (director as asked). */
function played(seed: number, extra: Partial<WorldOptions> = {}) {
  const { session, bot } = typistBot({ seed, deck, ...extra }, "standard", 7919 * seed + 13);
  playOut(session, bot);
  return { session, bot, w: session.world };
}

describe("skill profile (BALANCE.md §2)", () => {
  it("lives under the kit's key with the game's other keys, and reads back as it was saved; a broken one starts fresh", () => {
    expect(SKILL_KEY).toBe("survival.skill");
    expect(SEEN_KEY.startsWith("survival.")).toBe(true);
    const store = new MemoryStore();
    expect(loadProfile(store, "balanced")).toEqual(newSkillProfile("adult", "balanced"));
    const profile = botProfile(botRows().find((row) => row.id === "fast")!, "balanced");
    saveProfile(store, profile);
    expect(store.getItem(SKILL_KEY)).toBe(serializeSkill(profile));
    expect(loadProfile(store, "balanced")).toEqual(profile);
    // The mode chosen now wins over the stored one.
    expect(loadProfile(store, "challenge").mode).toBe("challenge");
    store.setItem(SKILL_KEY, "{not json");
    expect(loadProfile(store, "relax")).toEqual(newSkillProfile("adult", "relax"));
  });

  it("learns from a played run: speed, accuracy, spread and seconds to the first key, by familiarity", () => {
    const { w } = played(3, { director: false });
    const history = new WordHistory();
    const tally = emptyTally();
    const R = w.events;
    for (let i = Math.max(0, R.written - R.size); i < R.written; i += 1) {
      const k = i % R.size;
      if (R.kind[k] !== EV.word) continue;
      const text = w.deck[R.ref[k]!]!;
      tallyWord(tally, history.finished(text), text.length, R.dx[k]!, R.dz[k]!, R.x[k] === 0);
    }
    expect(tally.new.words).toBe(w.stats.words);
    const sample = runSample(w, w.meter.summary(w.phase === "won" ? "won" : "lost"), w.phase === "won" ? "won" : "lost", true, tally);
    const spec = botParams("standard");
    // Speed from the clean words: the bot's E; accuracy its a; spread near its CV.
    expect(sample.wpm!).toBeGreaterThan(spec.wpm * 0.9);
    expect(sample.wpm!).toBeLessThan(spec.wpm * 1.1);
    expect(sample.correctKeys! / sample.keys!).toBeCloseTo(spec.accuracy, 1);
    expect(sample.cv!).toBeGreaterThan(spec.cv * 0.7);
    expect(sample.cv!).toBeLessThan(spec.cv * 1.4);
    // "known" words: 0.35–0.6 s to the first key (plus at most a tick or two).
    expect(sample.byFamiliarity!.new!.recognize!).toBeGreaterThan(0.33);
    expect(sample.byFamiliarity!.new!.recognize!).toBeLessThan(0.65);
    const update = recordRun(newSkillProfile("adult", "balanced"), sample);
    expect(update.accepted).toBe(true);
    expect(update.profile.measures.e.n).toBe(w.stats.words);
    expect(update.profile.measures.e.value).toBeCloseTo(sample.wpm!, 6);
    expect(update.profile.trend.stages).toBe(1);
    // What the panel shows.
    const report = skillReport(update.profile, "balanced");
    expect(report.measured).toBe(true);
    expect(report.advice.length).toBeGreaterThan(10);
    // The history counts words: a word finished three times is known.
    const words = new WordHistory(JSON.stringify(history));
    for (let k = 0; k < 2; k += 1) words.finished(w.deck[w.typing.done[0]!]!);
    expect(words.familiarity(w.deck[w.typing.done[0]!]!)).toBe("known");
  });

  it("leaves quits, AFK runs, short runs and outliers out (the kit's rules), counting the trend", () => {
    const { w } = played(4, { director: false });
    const flow = w.meter.summary("won");
    const base = newSkillProfile("adult", "balanced");
    expect(recordRun(base, runSample(w, flow, "quit", false)).reason).toBe("quit");
    expect(recordRun(base, { ...runSample(w, flow, "won", false), afk: true }).reason).toBe("afk");
    expect(recordRun(base, { ...runSample(w, flow, "won", false), words: 3 }).reason).toBe("short");
    const settled = { ...base, measures: { ...base.measures, e: { value: 35, n: SKILL_FULL.e } } };
    const outlier = recordRun(settled, { ...runSample(w, flow, "won", false), wpm: 120 });
    expect(outlier.accepted).toBe(false);
    expect(outlier.reason).toBe("outlier");
    expect(outlier.profile.trend.stages).toBe(1);
    // An away player: no key for over 20 s with the fight on.
    const idle = world(5);
    for (let t = 0; t < 60 * 25; t += 1) step(idle);
    idle.stats.words = 20;
    expect(runSample(idle, idle.meter.summary("lost"), "lost", false).afk).toBe(true);
  });
});

describe("pace k and the run header (BALANCE.md §4.1)", () => {
  const view = (id: string) => {
    const row = botRows().find((bot) => bot.id === id)!;
    return { e: row.profile.e, a: row.profile.a, cv: row.profile.cv, fatigue: 0 };
  };

  it("is 1 for the standard bot exactly (C_ref), two ways and clamped for the others; off plays the standard pace", () => {
    expect(paceFor(view("standard"))).toBe(1);
    expect(paceFor(view("novice"))).toBe(0.75);
    expect(paceFor(view("child"))).toBe(0.75);
    expect(paceFor(view("steady"))).toBeGreaterThan(0.75);
    expect(paceFor(view("steady"))).toBeLessThan(1);
    expect(paceFor(view("skilled"))).toBeGreaterThan(1.15);
    expect(paceFor(view("fast"))).toBeGreaterThan(1.2);
    expect(paceFor(view("fast"))).toBeLessThanOrEqual(1.3);
    expect(runHeader(view("fast"), "challenge", true)).toEqual({ mode: "challenge", pace: paceFor(view("fast")), expected: 70, director: true });
    expect(runHeader(view("fast"), "relax", false)).toEqual({ mode: "relax", pace: 1, expected: 35, director: false });
    // The report's bots get theirs through a profile, blended as the page blends it.
    expect(headerFor(botProfile(botRows().find((bot) => bot.id === "novice")!, "balanced"), "balanced", true)).toEqual(runHeader(view("novice"), "balanced", true));
    // A fresh profile reads as the mode's defaults (Balanced: the standard typist), the mode asked for winning over the stored one.
    expect(headerFor(newSkillProfile("adult", "balanced"), "balanced", true).pace).toBe(1);
    expect(headerFor(newSkillProfile("adult", "balanced"), "relax", true)).toEqual(headerFor(newSkillProfile("adult", "relax"), "relax", true));
  });

  it("scales spawn rates by k, surges' size by k, walking speed by half of it, all over the mode; the header is in the hash", () => {
    for (const mode of ["relax", "balanced", "challenge"] as const) {
      const scales = scalesFor(mode, 0.8);
      expect(scales.rate).toBeCloseTo(MODE_SPECS[mode].rate * 0.8, 9);
      expect(scales.surge).toBeCloseTo(MODE_SPECS[mode].surge * (1 + PACE_GAIN.surge * -0.2), 9);
      expect(scales.speed).toBeCloseTo(MODE_SPECS[mode].speed * (1 + PACE_GAIN.speed * -0.2), 9);
    }
    // Walking speed at full stride, far out.
    const slow = world(1, { pace: 0.75, director: false });
    const s = slow.foes.add(KIND.mine, 0, FIELD.gateZ - 2, 1e6, 0);
    step(slow);
    expect(-slow.foes.vz[s]!).toBeCloseTo(FOES[KIND.mine]!.speed * slow.scales.speed, 1);
    // The same seed spawns about k times as many foes over the stage.
    const spawned = (pace: number) => {
      const w = world(9, { pace, director: false });
      w.hp = 1e9;
      while (w.phase === "play") step(w);
      return w.spawn.spawned;
    };
    const ratio = spawned(1.3) / spawned(1);
    expect(ratio).toBeGreaterThan(1.22);
    expect(ratio).toBeLessThan(1.38);
    // The header is state: another k, mode or director is another world; the same header replays to the same hash.
    const a = world(2, { pace: 0.9 });
    expect(hashHex(a)).not.toBe(hashHex(world(2, { pace: 0.91 })));
    expect(hashHex(a)).not.toBe(hashHex(world(2, { pace: 0.9, mode: "challenge" })));
    expect(hashHex(a)).not.toBe(hashHex(world(2, { pace: 0.9, director: false })));
    const { session } = typistBot({ seed: 2, deck, pace: 0.9, expected: 30 }, "novice", 77);
    const live = session.world;
    const bot = typistBot({ seed: 2, deck, pace: 0.9, expected: 30 }, "novice", 77);
    playOut(bot.session, bot.bot, 60 * 70);
    const again = world(2, { pace: 0.9, expected: 30 });
    runLog(again, bot.session.log, bot.session.world.tick);
    expect(hashHex(again)).toBe(hashHex(bot.session.world));
    expect(live.tick).toBe(0);
  });

  it("sets the word lengths and the Nhanh bar from E", () => {
    const slow = world(1, { expected: 15 });
    const fast = world(1, { expected: 70 });
    const lengths = (w: ReturnType<typeof world>) => Array.from(w.typing.band, (index) => w.deck[index]!.length);
    expect(Math.max(...lengths(slow))).toBeLessThanOrEqual(5);
    expect(Math.min(...lengths(fast))).toBeGreaterThanOrEqual(6);
    expect(fast.expected).toBe(70);
  });
});

describe("the FlowMeter snapshot (BALANCE.md §3 for this game)", () => {
  it("danger: a foe or a scout shot in the near zone; live words: bays whose gun takes a magazine; busy: a word under way; backlog: words owed at the line", () => {
    const w = world(3);
    const far = w.foes.add(KIND.mine, 0, NEAR.z + 3, FOES[KIND.mine]!.hp, 0);
    pressure(w, 0);
    let snap = flowSnapshot(w);
    expect(snap.danger).toBe(false);
    expect(snap.live).toBe(2);
    expect(snap.busy).toBe(false);
    expect(snap.capped).toBe(false);
    w.foes.z[far] = NEAR.z - 1;
    pressure(w, 0);
    snap = flowSnapshot(w);
    expect(snap.danger).toBe(true);
    expect(snap.backlog).toBe(0);
    // 30 mines at the line: 420 HP = two magazines of Xung owed.
    for (let k = 0; k < 29; k += 1) w.foes.add(KIND.mine, -10 + k * 0.7, NEAR.z - 2, FOES[KIND.mine]!.hp, 0);
    pressure(w, 0);
    expect(flowSnapshot(w).backlog).toBe(Math.floor((30 * FOES[KIND.mine]!.hp) / (XUNG.rounds * XUNG.damage)));
    // Both guns full and no word under way: nothing to type (idle); a lock is busy.
    w.guns.mags[0] = MAG_MAX;
    w.guns.mags[1] = MAG_MAX;
    expect(flowSnapshot(w).live).toBe(0);
    const text = w.deck[w.typing.word[0]!]!;
    step(w, [{ t: "key", letter: text.charCodeAt(0) - 97 }]);
    expect(flowSnapshot(w).busy).toBe(true);
    // A scout shot in the near zone is danger too.
    const clear = world(4);
    clear.shots.add(0, NEAR.z - 1, 0, -6, 9);
    pressure(clear, 0);
    expect(flowSnapshot(clear).danger).toBe(true);
  });

  it("carries the kills' path fractions, the dropped locks and the typed damage since the last feed, then starts over", () => {
    const w = world(5);
    noteKill(w, 10);
    noteKill(w, PATH.from + 5);
    w.pace.drops = 2;
    w.pace.damage = 77;
    const snap = flowSnapshot(w);
    expect(snap.kills).toEqual([(PATH.from - 10) / (PATH.from - FIELD.bottomZ), 0]);
    expect(snap.abandons).toBe(2);
    expect(snap.damage).toEqual({ typed: 77, other: 0 });
    // paceStep feeds every FLOW_EVERY ticks and clears what it carried.
    const v = world(6);
    for (let t = 0; t < FLOW_EVERY; t += 1) step(v);
    expect(v.meter.ticks).toBe(FLOW_EVERY);
    expect(v.pace.killCount).toBe(0);
    // A dropped lock (Backspace to zero) counts.
    const u = world(7);
    const first = u.deck[u.typing.word[1]!]!;
    step(u, [{ t: "key", letter: first.charCodeAt(0) - 97 }, { t: "back" }]);
    expect(u.stats.drops).toBe(1);
  });

  it("feeds the meter to the end of the stage, starts the director's window over after the warm-up", () => {
    const w = world(8, { seconds: 30 });
    w.hp = 1e9;
    while (w.phase === "play") step(w);
    expect(w.meter.ticks).toBe(w.tick);
    expect(w.meter.window().ticks).toBe(w.tick - WARMUP_TICKS);
    expect(w.meter.summary("won").ticks).toBe(w.tick);
  });

  it("leaches armour from foes inside the drain zone, more the closer they are, at most maxLeech foes' worth", () => {
    const w = world(9);
    const z = 9.2;
    w.foes.add(KIND.mine, 0, z, 1e6, 0);
    pressure(w, 1);
    expect(w.pace.drainOwed).toBeCloseTo((DRAIN.perFoe * (DRAIN.from - z)) / (DRAIN.from - FIELD.bottomZ), 9);
    const crowd = world(10);
    for (let k = 0; k < 80; k += 1) crowd.foes.add(KIND.mine, -10 + (k % 20), FIELD.bottomZ + 0.5, 1e6, 0);
    const before = crowd.hp;
    pressure(crowd, 1);
    expect(before - crowd.hp + crowd.pace.drainOwed).toBeCloseTo(DRAIN.perFoe * DRAIN.maxLeech, 6);
    expect(crowd.stats.drained).toBe(before - crowd.hp);
  });
});

describe("the pace director in the sim (BALANCE.md §4.2, this game's step table)", () => {
  const decision = (lever: PaceDecision["lever"], dir: 1 | -1, amount: number, extra: Partial<PaceDecision> = {}): PaceDecision => ({ id: 1, tick: 0, wave: 1, dir, lever, amount, cost: 0, tension: dir * -100, level: dir, spawnScale: 1000, ...extra });

  it("spawn: the next foes come ±7 % sooner; every step is a `pace` event", () => {
    const w = world(11, { director: false });
    applyPace(w, decision("spawn", 1, -70, { spawnScale: 930 }));
    expect(w.pace.spawnScale).toBe(930);
    const R = w.events;
    const last = (R.written - 1) % R.size;
    expect([R.kind[last], R.slot[last], R.dz[last]]).toEqual([EV.pace, LEVER_INDEX.spawn, 930]);
    // Owed at 1000 / 930 the rate.
    const a = world(12, { director: false });
    const b = world(12, { director: false });
    applyPace(b, decision("spawn", 1, -70, { spawnScale: 930 }));
    step(a);
    step(b);
    expect(b.spawn.owed / a.spawn.owed).toBeCloseTo(1000 / 930, 6);
  });

  it("elite: one Giáp affix on the next plain pack, real cost reported; −1 takes it off the next armoured one", () => {
    const w = world(13);
    w.time = 30;
    w.director.log.push({ type: "pace", ...decision("elite", 1, 1, { id: 9, cost: SURVIVAL_PACE_TABLE.eliteCost }) });
    applyPace(w, decision("elite", 1, 1, { id: 9 }));
    // One plain pack of 8 owed now (no vanguard: packs have come already).
    w.spawn.packs = 1;
    w.spawn.size = 8;
    w.spawn.owed = 8;
    step(w);
    expect(w.spawn.spawned).toBe(8);
    let armoured = 0;
    for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1 && w.foes.elite[s] === 1) armoured += 1;
    expect(armoured).toBe(8);
    expect(w.pace.eliteCount).toBe(0);
    for (let s = 0; s < w.foes.top; s += 1) if (w.foes.elite[s] === 1) expect(w.foes.maxHp[s]).toBe(FOES[w.foes.kind[s]!]!.hp * ELITE.hp);
    expect(w.director.log.at(-1)!.cost).not.toBe(SURVIVAL_PACE_TABLE.eliteCost);
    expect(w.director.log.at(-1)!.cost).toBeGreaterThan(0);
    // −1: the stage's own armoured pack (every ELITE.every-th) comes plain.
    const v = world(13);
    v.time = 30;
    v.spawn.packs = ELITE.every - 1;
    applyPace(v, decision("elite", -1, -1, { id: 2 }));
    v.spawn.size = 8;
    v.spawn.owed = 8;
    step(v);
    expect(v.spawn.spawned).toBe(8);
    for (let s = 0; s < v.foes.top; s += 1) if (v.foes.alive[s] === 1) expect(v.foes.elite[s]).toBe(0);
    expect(v.pace.eliteCount).toBe(0);
    // Without the step that pack is armoured.
    const u = world(13);
    u.time = 30;
    u.spawn.packs = ELITE.every - 1;
    u.spawn.size = 8;
    u.spawn.owed = 8;
    step(u);
    for (let s = 0; s < u.foes.top; s += 1) if (u.foes.alive[s] === 1) expect(u.foes.elite[s]).toBe(1);
  });

  it("peak and lull: the coming surge 3 s earlier or later, the coming lull 3 s shorter or longer; one under way never moves", () => {
    const w = world(14);
    const at = w.plan.surgeAt[0]!;
    const lull = w.plan.lullEnd[0]!;
    applyPace(w, decision("peak", 1, -SURVIVAL_PACE_TABLE.peakTicks));
    expect(w.plan.surgeAt[0]).toBeCloseTo(at - 3, 9);
    expect(w.plan.lullEnd[0]).toBeCloseTo(lull - 3, 9);
    applyPace(w, decision("lull", -1, SURVIVAL_PACE_TABLE.lullTicks));
    expect(w.plan.lullEnd[0]).toBeCloseTo(lull, 9);
    // Under way: the first surge stays; the second moves.
    w.time = w.plan.surgeAt[0]! + 1;
    const second = w.plan.surgeAt[1]!;
    applyPace(w, decision("peak", -1, SURVIVAL_PACE_TABLE.peakTicks));
    expect(w.plan.surgeAt[0]).toBeCloseTo(at - 3, 9);
    expect(w.plan.surgeAt[1]).toBeCloseTo(second + 3, 9);
    // A lull never shorter than nothing.
    for (let k = 0; k < 5; k += 1) applyPace(w, decision("lull", 1, -SURVIVAL_PACE_TABLE.lullTicks));
    expect(w.plan.lullEnd[0]).toBeGreaterThanOrEqual(w.plan.surgeEnd[0]!);
  });

  it("support: a repair pod of SUPPORT.hp armour (never past full), an event for the view", () => {
    const w = world(15);
    w.hp = 20;
    applyPace(w, decision("support", -1, 1));
    expect(w.hp).toBe(20 + SUPPORT.hp);
    expect(w.stats.supports).toBe(1);
    const R = w.events;
    expect(R.kind[(R.written - 2) % R.size]).toBe(EV.support);
    w.hp = SHIP.hp - 5;
    applyPace(w, decision("support", -1, 1));
    expect(w.hp).toBe(SHIP.hp);
  });

  it("judges a whole run within the kit's caps and goes into the hash; off ('Tắt') it never steps", () => {
    const on = played(16);
    const summary = on.w.director.summary();
    expect(on.w.director.enabled).toBe(true);
    expect(summary.maxWaveSteps).toBeLessThanOrEqual(2);
    expect(summary.spawnMin).toBeGreaterThanOrEqual(850);
    expect(summary.spawnMax).toBeLessThanOrEqual(1150);
    expect(on.w.director.band).toBe(BANDS.balanced);
    const off = played(16, { director: false });
    expect(off.w.director.off).toBe("setting");
    expect(off.w.director.log).toEqual([]);
    expect(off.w.pace.spawnScale).toBe(1000);
    // The director's decisions replay: the same header and keys, the same steps and hash.
    const again = world(16);
    runLog(again, on.session.log, on.w.tick);
    expect(again.director.log).toEqual(on.w.director.log);
    expect(hashHex(again)).toBe(hashHex(on.w));
    expect(on.w.pace.wave).toBe(3);
    expect(STAGE_S0.surges.length + 1).toBe(3);
  });
});

describe("bots and the report (BALANCE.md §6, §7)", () => {
  it("bots press keys through the page's input path; the session's log replays to the same world", () => {
    const { session, bot, w } = played(17);
    expect(bot.pressed).toBeGreaterThan(200);
    expect(session.log.filter((command) => command.t === "key").length).toBe(bot.pressed);
    const again = world(17);
    runLog(again, session.log, w.tick);
    expect(hashHex(again)).toBe(hashHex(w));
    // A typist that never types loses (B5); the standard bot plays with backspace 0 here (nothing to erase).
    expect(survivalParams("standard").backspace).toBe(0);
    const idle = typistBot({ seed: 17, deck }, "no-type", 1);
    playOut(idle.session, idle.bot);
    expect(idle.session.world.phase).toBe("lost");
    expect(idle.bot.pressed).toBe(0);
  });

  it("summarises bot × mode cells and gives every gate B1–B9", () => {
    const cells = runMatrix({ seeds: 2, bots: ["standard", "no-type"], modes: ["balanced"] });
    expect(cells.map((cell) => [cell.bot.id, cell.mode, cell.director, cell.runs.length])).toEqual([
      ["standard", "balanced", true, 2],
      ["no-type", "balanced", true, 2],
      ["standard", "balanced", false, 2],
    ]);
    const standard = cells[0]!;
    expect(standard.runs[0]!.header.pace).toBe(1);
    expect(standard.summary.runs).toBe(2);
    expect(standard.summary.learnOk).toBe(true);
    expect(standard.summary.killSeconds).toBeGreaterThan(0);
    expect(cells[1]!.summary.learnOk).toBe(null);
    expect(cells[1]!.summary.win).toBe(0);
    const results = gates(cells);
    expect(results.map((gate) => gate.id)).toEqual(["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"]);
    // Cells missing for a gate make it "skip", never "pass".
    expect(results.find((gate) => gate.id === "B6")!.status).toBe("skip");
    expect(results.find((gate) => gate.id === "B9")!.status).toBe("skip");
  });
});
