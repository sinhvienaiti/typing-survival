/**
 * Prints how the S0 stage goes for typing bots (tests/survival/bot.ts: 4 %
 * wrong keys, 0.25 s to read the next word) at a few speeds, over several
 * seeds: wins, ship HP left, foes on screen (on the field and the gate's
 * queue just above it) in the calm (90–150 s) and at the two surges, where
 * the kills land (median depth, m from the ship), breaches, and the step cost.
 *   node --import tsx scripts/survival/balance.ts [wpm…] [--seeds=12]
 */
import { botKeys, bot, sharedDeck } from "../../tests/survival/bot";
import { FIELD } from "../../src/survival/content/rules";
import { EV } from "../../src/survival/sim/events";
import { createWorld, step, type World } from "../../src/survival/sim/world";

const deck = sharedDeck();
const seedsArg = process.argv.find((arg) => arg.startsWith("--seeds="));
const seeds = seedsArg === undefined ? 12 : Number(seedsArg.slice(8));
const speeds = process.argv.slice(2).filter((arg) => !arg.startsWith("--")).map(Number).filter((n) => n > 0);

const onScreen = (w: World): number => {
  let n = 0;
  for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1 && w.foes.z[s]! <= FIELD.gateZ + 4) n += 1;
  return n;
};
const median = (list: number[]): number => [...list].sort((a, b) => a - b)[list.length >> 1]!;
const span = (list: number[]): string => median(list) + " (" + Math.min(...list) + "–" + Math.max(...list) + ")";

for (const wpm of speeds.length > 0 ? speeds : [25, 35, 45, 60]) {
  const runs: { won: boolean; hp: number; calm: number; peak1: number; peak2: number; depth: number; breaches: number; kills: number }[] = [];
  const costs: number[] = [];
  for (let seed = 1; seed <= seeds; seed += 1) {
    const w = createWorld({ seed, deck });
    const b = bot(wpm, 0.04);
    b.seed = 12345 + seed * 7;
    const calm: number[] = [];
    const depths: number[] = [];
    let peak1 = 0;
    let peak2 = 0;
    let seen = 0;
    while (w.phase === "play" && w.tick < 60 * 400) {
      const start = performance.now();
      step(w, botKeys(w, b));
      costs.push(performance.now() - start);
      const R = w.events;
      for (let i = Math.max(seen, R.written - R.size); i < R.written; i += 1) if (R.kind[i % R.size] === EV.kill) depths.push(R.z[i % R.size]!);
      seen = R.written;
      if (w.tick % 15 !== 0) continue;
      const n = onScreen(w);
      if (w.time >= 90 && w.time < 150) calm.push(n);
      if (w.time >= 60 && w.time < 80) peak1 = Math.max(peak1, n);
      if (w.time >= 150 && w.time < 172) peak2 = Math.max(peak2, n);
    }
    runs.push({ won: w.phase === "won", hp: w.hp, calm: calm.length > 0 ? median(calm) : 0, peak1, peak2, depth: +median(depths).toFixed(1), breaches: w.stats.breaches, kills: w.stats.kills });
  }
  costs.sort((a, c) => a - c);
  console.log(JSON.stringify({
    wpm, seeds, wins: runs.filter((run) => run.won).length, hp: span(runs.map((run) => run.hp)), calm: span(runs.map((run) => run.calm)),
    peak1: span(runs.map((run) => run.peak1)), peak2: span(runs.map((run) => run.peak2)), killDepthM: median(runs.map((run) => run.depth)),
    breaches: median(runs.map((run) => run.breaches)), kills: median(runs.map((run) => run.kills)),
    stepMs: { median: +costs[costs.length >> 1]!.toFixed(3), p95: +costs[Math.floor(costs.length * 0.95)]!.toFixed(3) },
  }));
}
