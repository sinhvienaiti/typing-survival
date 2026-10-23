import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createWorld, step, type Command } from "../src/sim/world";
import { sharedDeck } from "./survival/typist-bot";
import { decodeLog, foldEvents, newTrace } from "./survival/trace";

/**
 * The trial ("Trận thử", the S0 stage) still plays the game it played at
 * 00ed734 (docs/BUILD_S1.md §14 R1 step 1): 6 seeds × 3 bots, their logged
 * keys replayed, give the same events of the S0 kinds, in the same order,
 * with the same numbers, and the same end. tests/golden/s0-trace.json comes
 * from scripts/s0-trace.ts; the world hash may differ (stores gained columns).
 */
type GoldenRun = {
  bot: string; seed: number; header: { mode: "relax" | "balanced" | "challenge"; pace: number; expected: number; director: boolean };
  tick: number; phase: string; hp: number; stats: Record<string, number>; trace: { hash: number; count: number; kinds: number[] }; log: string;
};
const golden = JSON.parse(readFileSync(new URL("./golden/s0-trace.json", import.meta.url), "utf8")) as { runs: GoldenRun[] };
const deck = sharedDeck();

describe("the S0 trial's event trace (golden)", () => {
  for (const run of golden.runs) {
    it(run.bot + " seed " + run.seed, () => {
      const w = createWorld({ seed: run.seed, deck, ...run.header });
      const log: Command[] = decodeLog(run.log);
      const trace = newTrace();
      let next = 0;
      while (w.tick < run.tick) {
        const from = next;
        while (next < log.length && log[next]!.tick === w.tick) next += 1;
        step(w, log.slice(from, next));
        foldEvents(trace, w.events);
      }
      expect({ phase: w.phase, hp: w.hp }).toEqual({ phase: run.phase, hp: run.hp });
      for (const [key, value] of Object.entries(run.stats)) expect((w.stats as Record<string, number>)[key], key).toBe(value);
      expect(trace.kinds).toEqual(run.trace.kinds);
      expect(trace.count).toBe(run.trace.count);
      expect(trace.hash >>> 0).toBe(run.trace.hash);
    });
  }
});
