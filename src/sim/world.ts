/**
 * The Sinh Tồn world and its fixed 60 Hz step (docs/survival/BUILD_S0.md §1).
 * Pure TypeScript: no clock, no DOM, randomness only from the seeded streams
 * of src/platform/rng. The same seed, deck, options and command log give the
 * same world, tick by tick, in Node and in every browser.
 *
 * Typing runs at full rate every tick; the rest of the world steps by
 * DT × scale, where a hit stop (a logged `stop` command) sets the scale to
 * HITSTOP_SCALE for a few ticks and the guns hold their fire: keys are never
 * slowed or dropped, and the rounds of a word finished meanwhile wait.
 */
import { createRng, type Rng } from "../../platform/rng";
import { BULLET_CAP, DT, EXPECTED_WPM, FOE_CAP, HITSTOP_SCALE, SHIP, STORE, type Tier } from "../content/rules";
import { STAGE_S0 } from "../content/stage-s0";
import { Ring, EV } from "./events";
import { Grid } from "./hits";
import { moveFoes, separate } from "./move";
import { moveBullets, moveShots } from "./projectiles";
import { flood, spawnStep } from "./spawn";
import { Bullets, Foes, Shots } from "./stores";
import { createGuns, fireGuns } from "./weapons";
import { backspace, createTyping, dealFirstWords, keyPress } from "./words";

export type Command = { tick: number } & CommandBody;
export type CommandBody = { t: "key"; letter: number } | { t: "back" } | { t: "stop"; ticks: number } | { t: "flood"; n: number };

export type Phase = "play" | "won" | "lost";

export type WorldOptions = {
  seed: number;
  /** The vocabulary, lowercase a–z words; the band of E picks from it. */
  deck: readonly string[];
  tier?: Tier;
  expected?: number;
  seconds?: number;
};

export function createWorld(options: WorldOptions) {
  const tier = options.tier ?? "high";
  const w = {
    seed: options.seed >>> 0,
    tier,
    tick: 0,
    /** World seconds (slowed by hit stops). */
    time: 0,
    scale: 1,
    slowTicks: 0,
    phase: "play" as Phase,
    hp: SHIP.hp as number,
    seconds: options.seconds ?? STAGE_S0.seconds,
    foeCap: FOE_CAP[tier] as number,
    bulletCap: BULLET_CAP[tier] as number,
    expected: options.expected ?? EXPECTED_WPM,
    rng: createRng(options.seed) as Rng,
    spawn: { owed: 0, size: 0, shape: 0, spawned: 0, waiting: 0 },
    foes: new Foes(STORE.foes),
    bullets: new Bullets(STORE.bullets),
    shots: new Shots(STORE.shots),
    grid: new Grid(STORE.foes, STORE.shots),
    guns: createGuns(),
    typing: createTyping(options.deck, options.expected ?? EXPECTED_WPM),
    deck: options.deck,
    stats: { kills: 0, scoutKills: 0, breaches: 0, damageTaken: 0, shotsDown: 0, keysOk: 0, keysBad: 0, words: 0, clean: 0, fast: 0, peakFoes: 0 },
    events: new Ring(),
  };
  dealFirstWords(w);
  return w;
}

export type World = ReturnType<typeof createWorld>;

function apply(w: World, command: CommandBody): void {
  if (command.t === "key") keyPress(w, command.letter);
  else if (command.t === "back") backspace(w);
  else if (command.t === "stop") w.slowTicks = Math.max(w.slowTicks, Math.min(12, Math.max(0, command.ticks | 0)));
  else if (command.t === "flood") flood(w, command.n | 0);
}

/** One tick. `commands` are this tick's, in the order they were sent. */
export function step(w: World, commands: readonly CommandBody[] = []): void {
  if (w.phase !== "play") {
    w.tick += 1;
    return;
  }
  for (const command of commands) apply(w, command);
  w.scale = w.slowTicks > 0 ? HITSTOP_SCALE : 1;
  if (w.slowTicks > 0) w.slowTicks -= 1;
  const dt = DT * w.scale;
  spawnStep(w, dt);
  moveFoes(w, dt);
  moveShots(w, dt);
  w.grid.build(w.foes, w.shots);
  separate(w);
  if (w.scale === 1) fireGuns(w, dt);
  moveBullets(w, dt);
  w.time += dt;
  if (w.foes.count > w.stats.peakFoes) w.stats.peakFoes = w.foes.count;
  if (w.hp <= 0) end(w, "lost");
  else if (w.time >= w.seconds - 1e-9) end(w, "won");
  w.tick += 1;
}

function end(w: World, phase: Phase): void {
  w.phase = phase;
  w.events.push(w.tick, EV.end, phase === "won" ? 1 : 0, 0, 0, 0, 0, 0, w.hp, 0);
}

/** Steps until `tick`, feeding each tick the logged commands stamped with it (a replay). */
export function runLog(w: World, log: readonly Command[], tick: number): void {
  let next = 0;
  while (next < log.length && log[next]!.tick < w.tick) next += 1;
  while (w.tick < tick) {
    const from = next;
    while (next < log.length && log[next]!.tick === w.tick) next += 1;
    step(w, log.slice(from, next));
  }
}
