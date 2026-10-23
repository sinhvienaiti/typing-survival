/**
 * The balance matrix of Tuyến Cuối (docs/games/BALANCE.md §3, §6, §7): every
 * standard bot (plus the B6 tactics pair) in every mode over many seeds,
 * typed through the page's input path (tests/survival/typist-bot.ts), each run
 * with the header its profile would set (pace k, E, director). A run gives
 * the FlowMeter's summary, the director's, how long foes lived, the
 * learning check, what the run measured of the typist, and the step cost.
 * scripts/balance.ts prints it; tests/balance.test.ts runs a small one.
 */
import {
  BOT_IDS, SKILL_FULL, botSpec, newSkillProfile, runGates, summarizeRuns,
  type BandMode, type BotModeSummary, type FlowSummary, type GateResult, type PaceSummary, type RunRecord, type SkillProfile, type TypistParams,
} from "../src/kit/balance";
import { headerFor, runSample } from "../src/app/skill";
import { MODES, type Mode, type RunHeader } from "../src/content/balance";
import { EV } from "../src/sim/events";
import type { World } from "../src/sim/world";
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
  readonly won: boolean;
  readonly hp: number;
  readonly words: number;
  readonly kills: number;
  readonly peakFoes: number;
  readonly damage: { readonly drain: number; readonly breach: number; readonly shot: number };
  readonly measured: { readonly e: number | null; readonly a: number | null; readonly cv: number | null };
  readonly stepMs: readonly number[];
  readonly paceSteps: number;
};

/** Distinct words before the band is used up and first letters that always differ (the deck's rules), and room to learn (≥ 8 words). */
const MIN_WORDS = 8;

export function runOne(deck: readonly string[], bot: BotRow, mode: Mode, seed: number, director = true, time = false): RunResult {
  const header = headerFor(botProfile(bot, mode), mode, true);
  const options = { seed, deck, ...header, director: director && header.director };
  const { session, bot: typist } = typistBot(options, bot.params, 7919 * seed + 13);
  const w = session.world;
  const seen = new Set<number>();
  let repeats = 0;
  let sameFirst = 0;
  let read = 0;
  const stepMs: number[] = [];
  const check = (world: World): void => {
    const R = world.events;
    for (let i = Math.max(read, R.written - R.size); i < R.written; i += 1) {
      if (R.kind[i % R.size] !== EV.word) continue;
      const index = R.ref[i % R.size]!;
      if (seen.has(index) && seen.size < world.typing.band.length) repeats += 1;
      seen.add(index);
    }
    read = R.written;
    if (world.deck[world.typing.word[0]!]![0] === world.deck[world.typing.word[1]!]![0]) sameFirst += 1;
  };
  if (time) {
    while (w.phase === "play" && w.tick < 60 * 400) {
      typist.act(w);
      const start = performance.now();
      session.tick();
      stepMs.push(performance.now() - start);
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
    learnOk: typed ? repeats === 0 && sameFirst === 0 && w.stats.words >= MIN_WORDS : undefined,
    header,
    won: outcome === "won",
    hp: w.hp,
    words: w.stats.words,
    kills: w.stats.kills,
    peakFoes: w.stats.peakFoes,
    damage: { drain: w.stats.drained, breach: w.stats.breachDamage, shot: w.stats.shotDamage },
    measured: { e: sample.wpm ?? null, a: sample.keys !== undefined && sample.keys > 0 ? (sample.correctKeys ?? 0) / sample.keys : null, cv: sample.cv ?? null },
    stepMs,
    paceSteps: w.director.log.length,
  };
}

export type Cell = { readonly bot: BotRow; readonly mode: Mode; readonly director: boolean; readonly runs: readonly RunResult[]; readonly summary: BotModeSummary };

export type MatrixOptions = { seeds: number; bots?: readonly string[]; modes?: readonly Mode[]; directorOff?: readonly string[]; time?: boolean; firstSeed?: number };

/** Every bot × mode × seed (director on), and `directorOff` bots again with it off (B7). */
export function runMatrix(options: MatrixOptions, progress?: (done: number, total: number) => void): Cell[] {
  const deck = sharedDeck();
  const bots = botRows().filter((bot) => options.bots === undefined || options.bots.includes(bot.id));
  const modes = options.modes ?? MODES;
  const off = options.directorOff ?? ["standard"];
  const jobs: { bot: BotRow; mode: Mode; director: boolean }[] = [];
  for (const bot of bots) for (const mode of modes) jobs.push({ bot, mode, director: true });
  for (const bot of bots) if (off.includes(bot.id)) for (const mode of modes) jobs.push({ bot, mode, director: false });
  const cells: Cell[] = [];
  const first = options.firstSeed ?? 1;
  jobs.forEach((job, index) => {
    const runs: RunResult[] = [];
    for (let seed = first; seed < first + options.seeds; seed += 1) runs.push(runOne(deck, job.bot, job.mode, seed, job.director, options.time === true));
    cells.push({ ...job, runs, summary: summarizeRuns(job.bot.id, job.mode as BandMode, runs, job.director) });
    progress?.(index + 1, jobs.length);
  });
  return cells;
}

export function gates(cells: readonly Cell[]): GateResult[] {
  return runGates({ summaries: cells.map((cell) => cell.summary), options: { tacticsPair: ["standard@good", "standard@poor"] } });
}
