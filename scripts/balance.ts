/**
 * Prints how an S0 run goes for typing bots (tests/survival/bot.ts) at a few
 * speeds: foes on the field every 15 s, kills, ship HP, words, the outcome,
 * and the step cost.
 *   node --import tsx scripts/survival/balance.ts [wpm…]
 */
import { botKeys, bot, sharedDeck } from "../../tests/survival/bot";
import { hashHex } from "../../src/survival/sim/hash";
import { createWorld, step } from "../../src/survival/sim/world";

const deck = sharedDeck();
const speeds = process.argv.slice(2).map(Number).filter((n) => n > 0);
for (const wpm of speeds.length > 0 ? speeds : [25, 35, 45, 60]) {
  const w = createWorld({ seed: 1, deck });
  const b = bot(wpm, 0.04);
  const field: number[] = [];
  let worst = 0;
  const costs: number[] = [];
  while (w.phase === "play" && w.tick < 60 * 400) {
    const start = performance.now();
    step(w, botKeys(w, b));
    costs.push(performance.now() - start);
    if (w.tick % 900 === 0) field.push(w.foes.count);
    worst = Math.max(worst, w.foes.count);
  }
  costs.sort((a, c) => a - c);
  const s = w.stats;
  console.log(JSON.stringify({
    wpm, phase: w.phase, seconds: +w.time.toFixed(1), hp: w.hp, kills: s.kills, scoutKills: s.scoutKills, spawned: w.spawn.spawned, breaches: s.breaches,
    shotsDown: s.shotsDown, words: s.words, clean: s.clean, fast: s.fast, peak: s.peakFoes, every15s: field, stepMs: { median: +costs[costs.length >> 1]!.toFixed(3), p95: +costs[Math.floor(costs.length * 0.95)]!.toFixed(3) }, hash: hashHex(w),
  }));
}
