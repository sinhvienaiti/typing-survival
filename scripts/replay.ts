/**
 * Replays a browser run's command log in Node and compares the world hash
 * (docs/BUILD_S0.md §9, BUILD_S1.md G8: the same seed, run header and log give
 * the same hash; a replay is the run) and the pace director's steps. The
 * input is what a survival scenario writes: window.__survival.snapshot() =
 * { seed, tier, deck, vocabulary, mode, pace, expected, director, stage, kit,
 * learn, telegraph, recall, tick, hash, log, pace log }.
 * The deck is rebuilt from shared/vocabulary (or the built-in list the page
 * fell back to) and must have the browser's deck hash.
 *   node --import tsx scripts/replay.ts <OUT_DIR>/survival-s0-fight-replay-1280x720.json
 * Prints one JSON line; exits 1 on any difference.
 */
import { readFileSync } from "node:fs";
import { deckHash, fallbackVocab } from "../src/app/vocab";
import { buildDeck } from "../src/content/deck";
import type { Mode, RunKit } from "../src/content/balance";
import type { Tier } from "../src/content/rules";
import type { PaceEvent } from "../src/kit/balance";
import { hashHex } from "../src/sim/hash";
import { createWorld, step, type Command } from "../src/sim/world";

type BrowserRun = {
  seed: number; tier: Tier; deck: string; vocabulary: string; tick: number; hash: string; log: Command[];
  mode: Mode; pace: number; expected: number; director: boolean; paceLog?: PaceEvent[];
  stage?: string; kit?: RunKit; learn?: number; telegraph?: number; recall?: number[];
};

const file = process.argv[2];
if (file === undefined) {
  console.error("usage: node --import tsx scripts/replay.ts <replay.json>");
  process.exit(2);
}
const run = JSON.parse(readFileSync(file, "utf8")) as BrowserRun;
const level = (n: number) => JSON.parse(readFileSync(new URL("../../../shared/vocabulary/levels/" + String(n).padStart(3, "0") + ".json", import.meta.url), "utf8")).entries;
const deck = run.vocabulary === "fallback" ? fallbackVocab().deck : buildDeck([level(1), level(2), level(3)]);
const world = createWorld({ seed: run.seed, deck, tier: run.tier, mode: run.mode, pace: run.pace, expected: run.expected, director: run.director, stage: run.stage, kit: run.kit, learn: run.learn, telegraph: run.telegraph, recall: run.recall });
// Steps like runLog, counting the keys that landed while the world was slowed by a hit stop.
let keysInStops = 0;
let next = 0;
while (world.tick < run.tick) {
  const from = next;
  while (next < run.log.length && run.log[next]!.tick === world.tick) next += 1;
  const commands = run.log.slice(from, next);
  step(world, commands);
  if (world.scale < 1) keysInStops += commands.filter((command) => command.t === "key").length;
}
const paceSteps = world.director.log.length;
const samePace = run.paceLog === undefined || JSON.stringify(run.paceLog) === JSON.stringify(world.director.log);
const result = {
  commands: run.log.length, tick: world.tick, keysInStops, sameDeck: deckHash(deck) === run.deck, browser: run.hash, node: hashHex(world), phase: world.phase,
  header: { mode: run.mode, pace: run.pace, expected: run.expected, director: run.director, stage: run.stage ?? "s0", guns: run.kit?.guns, learn: run.learn }, paceSteps, samePace,
};
const match = result.sameDeck && result.tick === run.tick && result.node === result.browser && samePace;
console.log(JSON.stringify({ match, ...result }));
if (!match) process.exitCode = 1;
