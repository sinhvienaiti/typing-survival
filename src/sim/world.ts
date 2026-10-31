/**
 * The Tuyến Cuối world and its fixed 60 Hz step (docs/BUILD_S0.md §1,
 * docs/BUILD_S1.md). Pure TypeScript: no clock, no DOM, randomness only from
 * the seeded streams of src/kit/platform/rng. The same seed, deck, run header
 * and command log give the same world, tick by tick, in Node and in every
 * browser.
 *
 * Typing runs at full rate every tick; the rest of the world steps by
 * DT × scale, where a hit stop (a logged `stop` command) sets the scale to
 * HITSTOP_SCALE for a few ticks and the guns hold their fire: keys are never
 * slowed or dropped, and the rounds of a word finished meanwhile wait.
 *
 * The run header (content/balance.ts: mode, pace k, E, director; the stage,
 * the kit, ρ) is set before the first step from the player's skill profile
 * and choices, and goes into the replay; the in-run balance (sim/pace.ts)
 * reads the world and changes only what comes next.
 */
import { createRng, type Rng } from "../kit/platform/rng";
import { MODES, STANDARD_HEADER, TRIAL_KIT, scalesFor, type RunHeader, type RunKit } from "../content/balance";
import { stageById } from "../content/chapter-1";
import { BULLET_CAP, DT, FIELD, FOE_CAP, HITSTOP_SCALE, STORE, type Tier } from "../content/rules";
import { stageSeconds } from "../content/stage-rules";
import { KINDS, SHIELD } from "../content/foes";
import { Ring, EV } from "./events";
import { moveShells } from "./guns/phao";
import { createHazards, hazardStep, planHazards } from "./hazards";
import { Grid } from "./hits";
import { moveFoes, moveShields, separate } from "./move";
import { createDirector, createMeter, createPace, kitMagazine, paceStep, pressure } from "./pace";
import { createPlan, planStep } from "./plan";
import { breakSplits, createSplits, moveBullets, moveShots } from "./projectiles";
import { createSpawn, flood, placeFoe, spawnStep } from "./spawn";
import { createObjective, stageOutcome } from "./stage";
import { Bullets, Foes, Shells, Shields, Shots } from "./stores";
import { createGuns, fireGuns } from "./weapons";
import { backspace, createMeasure, createTyping, dealFirstWords, heavyBays, keyPress } from "./words";

export type Command = { tick: number } & CommandBody;
export type CommandBody = { t: "key"; letter: number } | { t: "back" } | { t: "stop"; ticks: number } | { t: "flood"; n: number } | { t: "place"; kind: number; x: number; z: number };

export type Phase = "play" | "won" | "lost";

export type WorldOptions = {
  seed: number;
  /** The vocabulary, lowercase a–z words; the band of E picks from it. */
  deck: readonly string[];
  tier?: Tier;
  /** The run header's parts (content/balance.ts RunHeader); each defaults to the standard trial run. */
  mode?: RunHeader["mode"];
  /** Pace k, 0.75–1.30, rounded to 1/1000. */
  pace?: number;
  /** E (WPM): word lengths and the Nhanh bar. */
  expected?: number;
  /** The in-run pace director runs. */
  director?: boolean;
  /** The stage ("s0" the trial, "c1-s1" …) and the kit on its bays. */
  stage?: string;
  kit?: RunKit;
  /** ρ: the stage's learning factor (spawns × k × ρ). */
  learn?: number;
  telegraph?: number;
  recall?: readonly number[];
  seconds?: number;
};

export function createWorld(options: WorldOptions) {
  const tier = options.tier ?? "high";
  const stageId = options.stage ?? STANDARD_HEADER.stage;
  const stage = stageById(stageId);
  const header: RunHeader = {
    mode: options.mode ?? STANDARD_HEADER.mode,
    pace: Math.round((options.pace ?? STANDARD_HEADER.pace) * 1000) / 1000,
    expected: options.expected ?? STANDARD_HEADER.expected,
    director: options.director ?? STANDARD_HEADER.director,
    stage: stageId,
    kit: options.kit ?? (stageId === "s0" ? TRIAL_KIT : { guns: TRIAL_KIT.guns, levels: stage.kit.levels.slice(0, 2), bays: stage.kit.bays, armour: stage.kit.armour }),
    learn: Math.round((options.learn ?? 1) * 1000) / 1000,
    telegraph: options.telegraph ?? 1,
    recall: options.recall ?? [],
  };
  // ρ is a stage factor like the mode's: it scales the stage's pace as k does.
  const scales = scalesFor(header.mode, header.pace * header.learn);
  const rng: Rng = createRng(options.seed);
  const w = {
    seed: options.seed >>> 0,
    tier,
    header,
    stage,
    scales,
    tick: 0,
    /** World seconds (slowed by hit stops). */
    time: 0,
    scale: 1,
    slowTicks: 0,
    phase: "play" as Phase,
    hp: header.kit.armour,
    armourMax: header.kit.armour,
    seconds: options.seconds ?? stageSeconds(stage),
    foeCap: FOE_CAP[tier] as number,
    bulletCap: BULLET_CAP[tier] as number,
    expected: header.expected,
    /** One magazine of the kit near the line (the FlowMeter's unit of words owed). */
    magazine: kitMagazine(header.kit.guns, stage),
    rng,
    spawn: createSpawn(),
    plan: createPlan(rng.rare, stage),
    pace: createPace(header, scales.rate, stage),
    meter: createMeter(),
    director: createDirector(header, stage),
    objective: createObjective(stage),
    hazards: createHazards(),
    foes: new Foes(STORE.foes),
    bullets: new Bullets(STORE.bullets),
    shots: new Shots(STORE.shots),
    shells: new Shells(STORE.shells),
    shields: new Shields(SHIELD.max),
    splits: createSplits(),
    grid: new Grid(STORE.foes, STORE.shots),
    guns: createGuns(header.kit, stage.chapter),
    typing: createTyping(options.deck, header.expected, heavyBays(header.kit.guns, header.kit.bays)),
    measure: createMeasure(),
    deck: options.deck,
    stats: {
      kills: 0, scoutKills: 0, eliteKills: 0, breaches: 0, damageTaken: 0, drained: 0, shotDamage: 0, breachDamage: 0, supports: 0, shotsDown: 0,
      keysOk: 0, keysBad: 0, backspaces: 0, drops: 0, words: 0, clean: 0, fast: 0, peakFoes: 0, damageDealt: 0, lifeSum: 0,
    },
    events: new Ring(),
  };
  planHazards(w);
  dealFirstWords(w);
  return w;
}

/** The header's mode as a number (for the hash). */
export const modeIndex = (w: { header: RunHeader }): number => MODES.indexOf(w.header.mode);

export type World = ReturnType<typeof createWorld>;

function apply(w: World, command: CommandBody): void {
  if (command.t === "key") keyPress(w, command.letter);
  else if (command.t === "back") backspace(w);
  else if (command.t === "stop") w.slowTicks = Math.max(w.slowTicks, Math.min(12, Math.max(0, command.ticks | 0)));
  else if (command.t === "flood") flood(w, command.n | 0);
  else if (command.t === "place" && command.kind >= 0 && command.kind < KINDS) placeFoe(w, command.kind, Math.max(-11, Math.min(11, command.x)), Math.max(FIELD.bottomZ + 1, Math.min(FIELD.gateZ + 10, command.z)));
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
  hazardStep(w, dt);
  moveFoes(w, dt);
  moveShields(w, dt);
  moveShots(w, dt);
  w.grid.build(w.foes, w.shots);
  separate(w);
  pressure(w, dt);
  if (w.scale === 1 && w.objective.retreat < 0) fireGuns(w, dt);
  moveBullets(w, dt);
  moveShells(w, dt);
  breakSplits(w);
  w.time += dt;
  planStep(w);
  if (w.foes.count > w.stats.peakFoes) w.stats.peakFoes = w.foes.count;
  const outcome = stageOutcome(w);
  if (outcome !== null) end(w, outcome);
  paceStep(w);
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
