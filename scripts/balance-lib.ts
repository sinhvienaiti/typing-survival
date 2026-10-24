/**
 * The balance matrix of Tuyến Cuối (docs/games/BALANCE.md §3, §6, §7;
 * docs/BUILD_S1.md §11.3): every standard bot (plus the B6 tactics pair) in
 * every mode over many seeds, on every stage asked (the trial "s0" and
 * chapter 1's stages, each with its reference kit and the guns the bot's
 * tactics pick), typed through the page's input path
 * (tests/survival/typist-bot.ts), each run with the header its profile would
 * set (pace k, E, director, ρ). A run gives the FlowMeter's summary, the
 * director's, how long foes lived, the learning check, what the run
 * measured of the typist, the stage's length and the step cost.
 * scripts/balance.ts prints it; tests/balance.test.ts runs a small one.
 */
import {
  BOT_IDS, SKILL_FULL, botSpec, newSkillProfile, runGates, summarizeRuns,
  type BandMode, type BotModeSummary, type FlowSummary, type GateResult, type PaceSummary, type RunRecord, type SkillProfile, type TypistParams,
} from "../src/kit/balance";
import { blendSkill } from "../src/kit/balance";
import { headerFor, runSample } from "../src/app/skill";
import { MODES, stageHeader, type Mode, type RunHeader } from "../src/content/balance";
import { stageById } from "../src/content/chapter-1";
import type { GunId } from "../src/content/guns";
import { EV } from "../src/sim/events";
import { hashHex } from "../src/sim/hash";
import { createWorld, runLog, type World } from "../src/sim/world";
import { chooseGuns } from "../tests/survival/tactics";
import { playOut, sharedDeck, survivalParams, typistBot } from "../tests/survival/typist-bot";

export type BotRow = { readonly id: string; readonly label: string; readonly params: TypistParams; readonly profile: { e: number; a: number; cv: number } };

/** The standard set, and "standard" with good and poor tactics for B6 (same E and a). */
export function botRows(): BotRow[] {
  const rows: BotRow[] = BOT_IDS.map((id) => {
    const spec = botSpec(id);
    return { id, label: spec.label, params: survivalParams(id), profile: { e: spec.wpm, a: spec.accuracy, cv: spec.cv } };
  });
  const standard = botSpec("standard");
  for (const tactics of ["good", "poor"] as const) {
    rows.push({ id: "standard@" + tactics, label: "Chuẩn · " + (tactics === "good" ? "Tốt" : "Kém"), params: survivalParams("standard", { tactics }), profile: { e: standard.wpm, a: standard.accuracy, cv: standard.cv } });
  }
  return rows;
}

/** A profile measured enough that it reads as the bot's own numbers (full confidence on E, a, CV). */
export function botProfile(bot: BotRow, mode: Mode): SkillProfile {
  const base = newSkillProfile("adult", mode);
  return {
    ...base,
    measures: {
      ...base.measures,
      e: { value: bot.profile.e, n: SKILL_FULL.e },
      a: { value: bot.profile.a, n: SKILL_FULL.a },
      cv: { value: bot.profile.cv, n: SKILL_FULL.cv },
    },
  };
}

export type RunResult = RunRecord & {
  readonly header: RunHeader;
  readonly stage: string;
  readonly guns: readonly GunId[];
  /** World seconds the stage lasted. */
  readonly seconds: number;
  /** Telegraphs that started within ATTENTION.gap of the one before (the attention budget: 0). */
  readonly clash: number;
  readonly hash: string;
  readonly won: boolean;
  readonly hp: number;
  readonly words: number;
  readonly kills: number;
  readonly peakFoes: number;
  readonly damage: { readonly drain: number; readonly breach: number; readonly shot: number };
  readonly measured: { readonly e: number | null; readonly a: number | null; readonly cv: number | null };
  readonly paceSteps: number;
};

/**
 * Step costs (ms) folded into 0.01 ms bins up to 50 ms. A matrix keeps no
 * per-step arrays: R1's report pushed every step of ~21 000 runs into one
 * array and broke V8's array length at 100 seeds (R1 review).
 */
export class StepClock {
  readonly bins = new Float64Array(5001);
  count = 0;
  max = 0;
  add(ms: number): void {
    const bin = Math.min(5000, Math.floor(ms * 100));
    this.bins[bin] = this.bins[bin]! + 1;
    this.count += 1;
    if (ms > this.max) this.max = ms;
  }
  quantile(q: number): number {
    let sum = 0;
    for (let bin = 0; bin < this.bins.length; bin += 1) {
      sum += this.bins[bin]!;
      if (sum > q * this.count) return (bin + 0.5) / 100;
    }
    return this.max;
  }
}

/** Distinct words before the band is used up and first letters that always differ (the deck's rules), and room to learn: the novice types ≥ 8 words a stage (G5 asks it of Mới only). */
const MIN_WORDS = 8;
const LEARNER = "novice";

export type RunOptions = { stage?: string; guns?: readonly GunId[] };

/** The header a bot's profile and tactics set for a stage (its guns: the tactics', or `guns`). */
export function botHeader(bot: BotRow, mode: Mode, seed: number, stageId: string, guns?: readonly GunId[]): RunHeader {
  const profile = botProfile(bot, mode);
  const stage = stageById(stageId);
  const pace = headerFor(profile, mode, true);
  return stageHeader(pace, stage, guns ?? chooseGuns(stage, bot.params.tactics, seed), blendSkill({ ...profile, mode }));
}

export function runOne(deck: readonly string[], bot: BotRow, mode: Mode, seed: number, director = true, clock: StepClock | null = null, run: RunOptions = {}): RunResult {
  const header = botHeader(bot, mode, seed, run.stage ?? "s0", run.guns);
  const options = { seed, deck, ...header, director: director && header.director };
  const { session, bot: typist } = typistBot(options, bot.params, 7919 * seed + 13, bot.id.split("@")[0]);
  const w = session.world;
  const seen = new Set<number>();
  let repeats = 0;
  let sameFirst = 0;
  let firstHidden = 0;
  let read = 0;
  let clash = 0;
  let lastTelegraph = -1e9;
  const check = (world: World): void => {
    const R = world.events;
    for (let i = Math.max(read, R.written - R.size); i < R.written; i += 1) {
      const kind = R.kind[i % R.size];
      if (kind === EV.telegraph) {
        if (world.time - lastTelegraph < 4 - 1e-6) clash += 1;
        lastTelegraph = world.time;
      }
      if (kind !== EV.word) continue;
      const index = R.ref[i % R.size]!;
      const band = world.typing.heavy[R.slot[i % R.size]!] === 1 ? world.typing.heavyBand : world.typing.band;
      if (seen.has(index) && seen.size < band.length) repeats += 1;
      seen.add(index);
    }
    read = R.written;
    const T = world.typing;
    for (let a = 0; a < T.word.length; a += 1) {
      if ((T.hidden[a]! & 1) !== 0) firstHidden += 1;
      for (let b = a + 1; b < T.word.length; b += 1) if (world.deck[T.word[a]!]![0] === world.deck[T.word[b]!]![0]) sameFirst += 1;
    }
  };
  if (clock !== null) {
    while (w.phase === "play" && w.tick < 60 * 400) {
      typist.act(w);
      const start = performance.now();
      session.tick();
      clock.add(performance.now() - start);
      check(w);
    }
  } else playOut(session, typist, 60 * 400, check);
  const outcome = w.phase === "won" ? "won" : "lost";
  const flow: FlowSummary = w.meter.summary(outcome);
  const pace: PaceSummary = w.director.summary();
  const sample = runSample(w, flow, outcome, false);
  const typed = bot.params.wpm > 0;
  return {
    flow,
    pace,
    killSeconds: w.stats.kills > 0 ? w.stats.lifeSum / w.stats.kills : undefined,
    learnOk: typed ? repeats === 0 && sameFirst === 0 && firstHidden === 0 && (bot.id !== LEARNER || w.stats.words >= MIN_WORDS) : undefined,
    header,
    stage: header.stage,
    guns: header.kit.guns,
    seconds: w.time,
    clash,
    hash: hashHex(w),
    won: outcome === "won",
    hp: w.hp,
    words: w.stats.words,
    kills: w.stats.kills,
    peakFoes: w.stats.peakFoes,
    damage: { drain: w.stats.drained, breach: w.stats.breachDamage, shot: w.stats.shotDamage },
    measured: { e: sample.wpm ?? null, a: sample.keys !== undefined && sample.keys > 0 ? (sample.correctKeys ?? 0) / sample.keys : null, cv: sample.cv ?? null },
    paceSteps: w.director.log.length,
  };
}

export type Cell = { readonly bot: BotRow; readonly mode: Mode; readonly director: boolean; readonly stage: string; readonly guns?: readonly GunId[]; readonly runs: readonly RunResult[]; readonly summary: BotModeSummary };

export type MatrixOptions = {
  seeds: number; bots?: readonly string[]; modes?: readonly Mode[]; directorOff?: readonly string[]; firstSeed?: number;
  /** Times every step into this histogram (off by default). */
  clock?: StepClock;
  /** Stages ("s0" the trial, "c1-s1" …); the trial alone by default. */
  stages?: readonly string[];
  /** Fixed kits instead of the bots' tactics (G3c: every pair). */
  kits?: readonly (readonly GunId[])[];
};

/** Every stage × bot × mode × seed (director on), and `directorOff` bots again with it off (B7); with `kits`, every kit instead of the tactics' pick. */
export function runMatrix(options: MatrixOptions, progress?: (done: number, total: number) => void): Cell[] {
  const deck = sharedDeck();
  const bots = botRows().filter((bot) => options.bots === undefined || options.bots.includes(bot.id));
  const modes = options.modes ?? MODES;
  const off = options.directorOff ?? ["standard"];
  const stages = options.stages ?? ["s0"];
  const kits: (readonly GunId[] | undefined)[] = options.kits !== undefined ? [...options.kits] : [undefined];
  const jobs: { bot: BotRow; mode: Mode; director: boolean; stage: string; guns?: readonly GunId[] }[] = [];
  for (const stage of stages) {
    for (const guns of kits) {
      for (const bot of bots) for (const mode of modes) jobs.push({ bot, mode, director: true, stage, guns });
      if (guns === undefined) for (const bot of bots) if (off.includes(bot.id)) for (const mode of modes) jobs.push({ bot, mode, director: false, stage });
    }
  }
  const cells: Cell[] = [];
  const first = options.firstSeed ?? 1;
  jobs.forEach((job, index) => {
    const runs: RunResult[] = [];
    for (let seed = first; seed < first + options.seeds; seed += 1) runs.push(runOne(deck, job.bot, job.mode, seed, job.director, options.clock ?? null, { stage: job.stage, guns: job.guns }));
    cells.push({ ...job, runs, summary: summarizeRuns(job.bot.id, job.mode as BandMode, runs, job.director) });
    progress?.(index + 1, jobs.length);
  });
  return cells;
}

/** The kit's gates B1–B9 over cells of one stage (and one kit choice). */
export function gates(cells: readonly Cell[]): GateResult[] {
  return runGates({ summaries: cells.map((cell) => cell.summary), options: { tacticsPair: ["standard@good", "standard@poor"] } });
}

/** A run replayed from its own log to the same hash (gate G8, in Node). */
export function replays(deck: readonly string[], bot: BotRow, mode: Mode, seed: number, stage: string): boolean {
  const header = botHeader(bot, mode, seed, stage);
  const a = typistBot({ seed, deck, ...header }, bot.params, 7919 * seed + 13, bot.id.split("@")[0]);
  playOut(a.session, a.bot, 60 * 400);
  const again = createWorld({ seed, deck, ...header });
  runLog(again, a.session.log, a.session.world.tick);
  return hashHex(again) === hashHex(a.session.world);
}

