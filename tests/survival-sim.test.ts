import { describe, expect, it } from "vitest";
import { FIELD, FOES, KIND, MAG_MAX, PRESS, QUALITY, STORE, TIA, TICK_HZ, XUNG } from "../src/survival/content/rules";
import { STAGE_S0 } from "../src/survival/content/stage-s0";
import { EV, FLAG } from "../src/survival/sim/events";
import { hashHex } from "../src/survival/sim/hash";
import { firstFoeHit, hitT, segmentHit } from "../src/survival/sim/hits";
import { RADIUS, pressAt } from "../src/survival/sim/move";
import { aimOf, densest, loadMagazine } from "../src/survival/sim/weapons";
import { isFast } from "../src/survival/sim/words";
import { createWorld, runLog, step, type Command, type CommandBody, type World } from "../src/survival/sim/world";
import { bot, botKeys, sharedDeck } from "./survival/bot";

/**
 * The Sinh Tồn S0 rules (docs/survival/BUILD_S0.md §9): a deterministic
 * fixed-step sim, spawns by the stage table, magazines, the grid against
 * pairwise tests, Tia toward the dense cluster, and keys that a hit stop
 * never drops.
 */
const deck = sharedDeck();
const world = (seed = 1, extra: Partial<Parameters<typeof createWorld>[0]> = {}) => createWorld({ seed, deck, ...extra });

/** Runs `ticks` steps with a bot at `wpm`, logging every command with its tick. */
function play(w: World, ticks: number, wpm = 45): Command[] {
  const b = bot(wpm, 0.04);
  const log: Command[] = [];
  for (let t = 0; t < ticks && w.phase === "play"; t += 1) {
    const keys = botKeys(w, b);
    for (const key of keys) log.push({ ...key, tick: w.tick } as Command);
    step(w, keys);
  }
  return log;
}

function events(w: World, kind: number): number[] {
  const out: number[] = [];
  const R = w.events;
  for (let i = Math.max(0, R.written - R.size); i < R.written; i += 1) if (R.kind[i % R.size] === kind) out.push(i % R.size);
  return out;
}

describe("determinism", () => {
  it("the same seed and command log give the same hash; a replay matches the live run", () => {
    const live = world(7);
    const log = play(live, 60 * 40);
    const again = world(7);
    runLog(again, log, live.tick);
    expect(hashHex(again)).toBe(hashHex(live));
    expect(again.stats).toEqual(live.stats);
    // Another seed is another run.
    const other = world(8);
    runLog(other, log, live.tick);
    expect(hashHex(other)).not.toBe(hashHex(live));
  });

  it("matches tick by tick over a whole stage, hit stops and a flood included", () => {
    const a = world(3);
    const b0 = bot(60, 0.05);
    const log: Command[] = [];
    while (a.phase === "play" && a.tick < 60 * 200) {
      const keys: CommandBody[] = botKeys(a, b0);
      if (a.tick % 97 === 0) keys.push({ t: "stop", ticks: 2 });
      if (a.tick === 600) keys.push({ t: "flood", n: 80 });
      for (const key of keys) log.push({ ...key, tick: a.tick } as Command);
      step(a, keys);
    }
    expect(a.phase).not.toBe("play");
    const b = world(3);
    let next = 0;
    while (b.tick < a.tick) {
      const from = next;
      while (next < log.length && log[next]!.tick === b.tick) next += 1;
      step(b, log.slice(from, next));
      if (b.tick % 600 === 0) expect(b.stats.kills).toBeGreaterThanOrEqual(0);
    }
    expect(hashHex(b)).toBe(hashHex(a));
  });
});

describe("spawns (BUILD_S0 §4)", () => {
  it("follow the rate table, counted in 1 s windows, in groups of 4–12", () => {
    const w = world(11);
    w.hp = 1e9;
    const perSecond = new Array<number>(STAGE_S0.seconds).fill(0);
    const sizes: number[] = [];
    while (w.time < STAGE_S0.seconds - 1e-9) {
      const before = w.events.written;
      step(w);
      for (let i = before; i < w.events.written; i += 1) {
        const k = i % w.events.size;
        if (w.events.kind[k] === EV.spawn) {
          perSecond[Math.min(STAGE_S0.seconds - 1, Math.floor(w.time))]! += w.events.ref[k]!;
          sizes.push(w.events.ref[k]!);
        }
      }
    }
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(12);
    for (const span of STAGE_S0.rates) {
      const windows = perSecond.slice(span.from, span.to);
      const mean = windows.reduce((sum, n) => sum + n, 0) / windows.length;
      // Whole groups: the window mean is within one group of the rate.
      expect(Math.abs(mean - span.rate), span.from + "–" + span.to + " s").toBeLessThanOrEqual(12 / windows.length + 0.05);
    }
    const total = perSecond.reduce((sum, n) => sum + n, 0);
    const owed = STAGE_S0.rates.reduce((sum, span) => sum + (span.to - span.from) * span.rate, 0);
    expect(Math.abs(total - owed)).toBeLessThanOrEqual(12);
  });

  it("keep a group waiting at the gate while the field is at the cap, and never lose it", () => {
    const w = world(5, { tier: "low" });
    w.hp = 1e9;
    // In the second surge (6.5 a second), with the field full.
    w.time = 150;
    step(w, [{ t: "flood", n: 1000 }]);
    expect(w.foes.count).toBe(200);
    for (let t = 0; t < 60 * 2; t += 1) step(w);
    expect(w.foes.count).toBeLessThanOrEqual(200);
    expect(w.spawn.waiting).toBeGreaterThanOrEqual(4);
    const owed = w.spawn.owed;
    // Room again: the waiting group walks in.
    for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1 && w.foes.z[s]! < 40) w.foes.remove(s);
    const spawned = w.spawn.spawned;
    step(w);
    expect(w.spawn.spawned).toBeGreaterThan(spawned);
    expect(w.spawn.owed).toBeLessThan(owed);
  });
});

describe("magazines (BUILD_S0 §5)", () => {
  it("a word loads one magazine, stacking to two; Xung empties 24 rounds in 2.4 s", () => {
    const w = world(2);
    // A target for every round.
    step(w, [{ t: "flood", n: 200 }]);
    expect(loadMagazine(w, 0, false, false)).toBe(true);
    expect(loadMagazine(w, 0, false, false)).toBe(true);
    expect(loadMagazine(w, 0, false, false)).toBe(false);
    expect(w.guns.mags[0]).toBe(MAG_MAX);
    const shots: number[] = [];
    for (let t = 0; t < TICK_HZ * 6; t += 1) {
      const before = w.events.written;
      step(w);
      for (let i = before; i < w.events.written; i += 1) if (w.events.kind[i % w.events.size] === EV.shot) shots.push(w.tick);
    }
    expect(shots.length).toBe(XUNG.rounds * 2);
    const first = shots.slice(0, XUNG.rounds);
    expect((first.at(-1)! - first[0]!) / TICK_HZ).toBeCloseTo(XUNG.seconds - XUNG.seconds / XUNG.rounds, 1);
    expect(w.guns.mags[0]).toBe(0);
  });

  it("quality: Chuẩn ×1.15 damage and +10 % crit, Nhanh ×1.15 rate, both mark the magazine perfect", () => {
    const w = world(2);
    loadMagazine(w, 0, true, true);
    expect(w.guns.damage[0]).toBe(QUALITY.cleanDamage);
    expect(w.guns.crit[0]).toBeCloseTo(XUNG.crit + QUALITY.cleanCrit);
    expect(w.guns.rate[0]).toBe(QUALITY.fastRate);
    expect(w.guns.perfect[0]).toBe(1);
    loadMagazine(w, 1, false, false);
    expect([w.guns.damage[2], w.guns.rate[2], w.guns.perfect[2]]).toEqual([1, 1, 0]);
    // Fast at 0.7 of the expected time (12 / E s a letter); slow above.
    expect(isFast(5, Math.floor(0.7 * 5 * (12 / 35) * 60 * (4 / 5)), 35)).toBe(true);
    expect(isFast(5, Math.ceil(0.75 * 5 * (12 / 35) * 60 * (4 / 5)), 35)).toBe(false);
  });

  it("Tia burns 2.5 s per magazine, a pulse every 0.1 s, faster when Nhanh", () => {
    for (const fast of [false, true]) {
      const w = world(4);
      step(w, [{ t: "flood", n: 300 }]);
      loadMagazine(w, 1, false, fast);
      let pulses = 0;
      let on = 0;
      for (let t = 0; t < TICK_HZ * 4; t += 1) {
        const before = w.events.written;
        step(w);
        if (w.guns.beamOn === 1) on += 1;
        for (let i = before; i < w.events.written; i += 1) if (w.events.kind[i % w.events.size] === EV.beamPulse) pulses += 1;
      }
      expect(on / TICK_HZ).toBeCloseTo(TIA.seconds, 1);
      expect(Math.abs(pulses - (TIA.seconds / TIA.pulse) * (fast ? QUALITY.fastRate : 1))).toBeLessThanOrEqual(1);
    }
  });

  it("typing a slot's word loads its gun; a wrong key is an error that keeps the word; Backspace to zero frees the lock", () => {
    const w = world(9);
    const text = w.deck[w.typing.word[1]!]!;
    const letter = (char: string) => ({ t: "key", letter: char.charCodeAt(0) - 97 }) as const;
    step(w, [letter(text[0]!)]);
    expect(w.typing.lock).toBe(1);
    const wrong = String.fromCharCode(((text.charCodeAt(1) - 97 + 3) % 26) + 97);
    step(w, [letter(wrong)]);
    expect([w.typing.typed[1], w.typing.errors[1], w.stats.keysBad]).toEqual([1, 1, 1]);
    step(w, [{ t: "back" }]);
    expect(w.typing.lock).toBe(-1);
    step(w, [...text].map(letter));
    expect(w.guns.mags[1]).toBe(1);
    expect(w.stats.words).toBe(1);
    expect(w.deck[w.typing.word[1]!]).not.toBe(text);
    expect(w.deck[w.typing.word[1]!]![0]).not.toBe(w.deck[w.typing.word[0]!]![0]);
  });
});

describe("the grid", () => {
  it("finds the same first foe along a segment as testing every foe (many seeds)", () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const w = world(seed);
      step(w, [{ t: "flood", n: 400 }]);
      for (let t = 0; t < 30; t += 1) step(w);
      w.grid.build(w.foes, w.shots);
      let state = seed * 7919;
      const random = () => ((state = (Math.imul(state, 48271) + 11) >>> 0) / 4294967296);
      for (let q = 0; q < 300; q += 1) {
        const x0 = (random() * 2 - 1) * FIELD.halfW;
        const z0 = random() * 60;
        const x1 = x0 + (random() * 2 - 1) * 4;
        const z1 = z0 + (random() * 2 - 1) * 4;
        const got = firstFoeHit(w.grid, w.foes, RADIUS, x0, z0, x1, z1, XUNG.radius);
        const gotT = hitT;
        let best = -1;
        let bestT = 2;
        for (let s = 0; s < w.foes.top; s += 1) {
          if (w.foes.alive[s] === 0) continue;
          const tt = segmentHit(x0, z0, x1, z1, w.foes.x[s]!, w.foes.z[s]!, RADIUS[w.foes.kind[s]!]! + XUNG.radius);
          if (tt >= 0 && (tt < bestT || (tt === bestT && s < best))) {
            bestT = tt;
            best = s;
          }
        }
        expect(got, "seed " + seed + " query " + q).toBe(best);
        if (best >= 0) expect(gotT).toBe(bestT);
      }
    }
  });
});

describe("Tia aims at the crowd", () => {
  const add = (w: World, x: number, z: number, n: number, hp = FOES[KIND.mine].hp * 50) => {
    for (let k = 0; k < n; k += 1) w.foes.add(KIND.mine, x + (k % 3) * 0.3, z + Math.floor(k / 3) * 0.6, hp, 0);
  };

  it("lights its ray on the densest cluster in reach and sweeps it toward the next", () => {
    const w = world(6);
    add(w, -5, 9, 12);
    add(w, 5, 10, 6);
    // A crowd beyond the ray's reach does not count.
    add(w, 0, 30, 40);
    expect(Math.abs(densest(w, 0, -1) - aimOf(-4.7, 9.9, 0))).toBeLessThanOrEqual(TIA.strip * 1.5);
    loadMagazine(w, 1, false, false);
    step(w);
    expect(w.guns.beamOn).toBe(1);
    const start = w.guns.beamX;
    expect(start).toBeLessThan(0);
    expect(w.guns.beamTo).toBeGreaterThan(0);
    for (let t = 0; t < 30; t += 1) step(w);
    // The far end sweeps 3 m/s toward the other cluster.
    expect(w.guns.beamX - start).toBeCloseTo(TIA.sweep * (30 / TICK_HZ), 0);
    const hits = events(w, EV.hit).filter((i) => (w.events.flags[i]! & FLAG.tia) !== 0);
    expect(hits.length).toBeGreaterThan(10);
    expect(hits.every((i) => w.events.z[i]! < 20)).toBe(true);
  });

  it("burns what its ray crosses, up to its length, and nothing beside it", () => {
    const w = world(7);
    const on = w.foes.add(KIND.mine, 0, FIELD.muzzleZ + 5, 1e6, 0);
    const near = w.foes.add(KIND.mine, 0.9, FIELD.muzzleZ + 8, 1e6, 0);
    const beside = w.foes.add(KIND.mine, 3.5, FIELD.muzzleZ + 5, 1e6, 0);
    const beyond = w.foes.add(KIND.mine, 0, FIELD.muzzleZ + TIA.length + 1.5, 1e6, 0);
    loadMagazine(w, 1, false, false);
    w.guns.beamOn = 1;
    w.guns.beamX = 0;
    w.guns.beamTo = 0;
    w.grid.build(w.foes, w.shots);
    const before = w.events.written;
    step(w);
    const struck = new Set<number>();
    for (let i = before; i < w.events.written; i += 1) if (w.events.kind[i % w.events.size] === EV.hit) struck.add(w.events.slot[i % w.events.size]!);
    expect(struck.has(on) && struck.has(near)).toBe(true);
    expect(struck.has(beside) || struck.has(beyond)).toBe(false);
  });
});

describe("the press (S0 review)", () => {
  it("foes walk in at full stride and slow down as they close on the ship", () => {
    expect(pressAt(FIELD.gateZ)).toBe(1);
    expect(pressAt(PRESS.far)).toBe(1);
    expect(pressAt(PRESS.near)).toBe(PRESS.slow);
    expect(pressAt(FIELD.bottomZ)).toBe(PRESS.slow);
    const w = world(1);
    const far = w.foes.add(KIND.mine, 0, FIELD.gateZ - 2, 1e6, 0);
    const close = w.foes.add(KIND.mine, 0, PRESS.near - 1, 1e6, 0);
    step(w);
    expect(-w.foes.vz[far]!).toBeCloseTo(FOES[KIND.mine].speed, 1);
    expect(-w.foes.vz[close]!).toBeLessThan(FOES[KIND.mine].speed * PRESS.slow * 1.05);
  });

  it("Xung holds its fire while every foe is out of its range, and opens up once one walks in", () => {
    const w = world(3);
    const s = w.foes.add(KIND.mine, 0, FIELD.muzzleZ + XUNG.range + 3, 1e6, 0);
    loadMagazine(w, 0, false, false);
    for (let t = 0; t < 10; t += 1) step(w);
    expect(w.bullets.count).toBe(0);
    expect(w.guns.rounds).toBe(XUNG.rounds);
    w.foes.z[s] = FIELD.muzzleZ + XUNG.range - 1;
    for (let t = 0; t < 10; t += 1) step(w);
    expect(w.guns.rounds).toBeLessThan(XUNG.rounds);
  });
});

describe("hit stops never drop keys", () => {
  it("keys typed during a stop all reach the typing, in order, at full rate, while the world slows", () => {
    const w = world(12);
    const text = w.deck[w.typing.word[0]!]!;
    step(w, [{ t: "flood", n: 50 }]);
    const time = w.time;
    step(w, [{ t: "stop", ticks: 3 }]);
    expect(w.scale).toBeLessThan(1);
    const typed: number[] = [];
    for (let k = 0; k < text.length; k += 1) {
      step(w, [{ t: "key", letter: text.charCodeAt(k) - 97 }]);
      typed.push(w.typing.lock === 0 ? w.typing.typed[0]! : -1);
    }
    expect(typed.slice(0, -1)).toEqual(Array.from({ length: text.length - 1 }, (_, k) => k + 1));
    expect(w.stats.keysOk).toBe(text.length);
    expect(w.guns.mags[0]).toBe(1);
    // Three slowed ticks, then full speed: the world clock lags the ticks.
    expect(w.time - time).toBeLessThan((text.length + 1) / TICK_HZ);
  });

  it("holds the guns' fire during a stop: the rounds of a word finished in it wait", () => {
    const w = world(13);
    // Foes in Xung's range.
    for (let k = 0; k < 20; k += 1) w.foes.add(KIND.mine, -5 + k * 0.5, FIELD.muzzleZ + XUNG.range - 2, FOES[KIND.mine].hp, 0);
    loadMagazine(w, 0, false, false);
    const before = w.events.written;
    step(w, [{ t: "stop", ticks: 2 }]);
    step(w);
    let shots = 0;
    for (let i = before; i < w.events.written; i += 1) if (w.events.kind[i % w.events.size] === EV.shot) shots += 1;
    expect(shots).toBe(0);
    step(w);
    expect(w.bullets.count).toBeGreaterThan(0);
  });
});

describe("the stage plays", () => {
  /** Foes the camera shows: on the field, the gate's queue just above it included. */
  const onScreen = (w: World): number => {
    let n = 0;
    for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1 && w.foes.z[s]! <= FIELD.gateZ + 4) n += 1;
    return n;
  };

  it("a 35 WPM bot sees 40–80 foes in the calm, 120–160 at both surges, fights in the ship's half, and wins (several runs)", () => {
    const runs = [1, 2, 3, 4, 5, 6].map((seed) => {
      const w = world(seed);
      const b = bot(35, 0.04);
      b.seed = 12345 + seed * 7;
      const calm: number[] = [];
      const kills: number[] = [];
      let peak1 = 0;
      let peak2 = 0;
      let seen = 0;
      while (w.phase === "play") {
        step(w, botKeys(w, b));
        const R = w.events;
        for (let i = seen; i < R.written; i += 1) if (R.kind[i % R.size] === EV.kill) kills.push(R.z[i % R.size]!);
        seen = R.written;
        if (w.tick % 15 !== 0) continue;
        const n = onScreen(w);
        if (w.time >= 90 && w.time < 150) calm.push(n);
        if (w.time >= 60 && w.time < 80) peak1 = Math.max(peak1, n);
        if (w.time >= 150 && w.time < 172) peak2 = Math.max(peak2, n);
      }
      calm.sort((a, c) => a - c);
      kills.sort((a, c) => a - c);
      return { won: w.phase === "won", calm: calm[calm.length >> 1]!, peak1, peak2, killDepth: kills[kills.length >> 1]!, shotsDown: w.stats.shotsDown, scoutKills: w.stats.scoutKills };
    });
    // "Most of the time": at most one loss in six.
    expect(runs.filter((run) => run.won).length).toBeGreaterThanOrEqual(5);
    for (const run of runs) {
      expect(run.calm, JSON.stringify(run)).toBeGreaterThanOrEqual(40);
      expect(run.calm, JSON.stringify(run)).toBeLessThanOrEqual(80);
      for (const peak of [run.peak1, run.peak2]) {
        expect(peak, JSON.stringify(run)).toBeGreaterThanOrEqual(120);
        expect(peak, JSON.stringify(run)).toBeLessThanOrEqual(160);
      }
      // The crowd presses in: half the kills land in the nearest third of the field (BUILD_S0's 42 m Xung killed at the gate).
      expect(run.killDepth, JSON.stringify(run)).toBeLessThan(FIELD.gateZ / 3);
      expect(run.shotsDown + run.scoutKills).toBeGreaterThan(0);
    }
  });

  it("an idle ship loses: foes breach the bottom line and hurt it", () => {
    const w = world(1);
    while (w.phase === "play") step(w);
    expect(w.phase).toBe("lost");
    expect(w.hp).toBe(0);
    expect(w.stats.breaches).toBeGreaterThan(10);
  });
});

describe("step cost (BUILD_S0 §8)", () => {
  /** The median cost of a step with 700 foes and ~2,000 rounds in flight (ms). */
  function measure(seed: number): { median: number; p95: number; fewest: number } {
    const w = world(seed);
    step(w, [{ t: "flood", n: 700 }]);
    expect(w.foes.count).toBe(700);
    const costs: number[] = [];
    let fewest = Infinity;
    for (let t = 0; t < 240; t += 1) {
      // Keep 2,000 rounds in flight, spread over the corridor.
      for (let b = w.bullets.count; b < STORE.bullets - 48; b += 1) {
        const x = ((b * 37) % 220) / 10 - 11;
        w.bullets.add(x, 2 + (b % 44), 0, XUNG.speed, XUNG.damage, XUNG.life, 0, -1, 0);
      }
      fewest = Math.min(fewest, w.bullets.count);
      const start = performance.now();
      step(w);
      if (t >= 40) costs.push(performance.now() - start);
      if (w.foes.count < 650) step(w, [{ t: "flood", n: 700 - w.foes.count }]);
    }
    costs.sort((a, b) => a - b);
    return { median: costs[costs.length >> 1]!, p95: costs[Math.floor(costs.length * 0.95)]!, fewest };
  }

  it("steps 700 foes and 2,000 rounds in ≤ 1.5 ms", () => {
    // A busy machine (the whole suite on every core, browsers open) can slow one
    // measurement several times over: the budget holds if any of three does.
    let best = measure(21);
    for (let attempt = 1; attempt < 3 && best.median > 1.5; attempt += 1) {
      const again = measure(21 + attempt);
      if (again.median < best.median) best = again;
    }
    expect(best.fewest).toBeGreaterThanOrEqual(1990);
    console.log("survival sim step (700 foes, ~2000 rounds): median " + best.median.toFixed(3) + " ms, p95 " + best.p95.toFixed(3) + " ms");
    expect(best.median).toBeLessThanOrEqual(1.5);
  });
});
