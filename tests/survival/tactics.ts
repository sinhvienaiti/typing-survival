/**
 * The bots' decisions outside a fight (docs/BUILD_S1.md §11.2): which guns to
 * take into a stage. good: the set (2 or 3 guns, by bays) with the best
 * score on the stage's danger (content/threat.ts); fair: half the time as
 * good, half a random set; poor: always Xung + Tia (the S0 pair, the first
 * two cards: a player keeping what they know), Tán as a third. Draws come
 * from the run's own seed, so every run replays.
 */
import { RngStream } from "../../src/kit/platform/rng";
import type { Tactics } from "../../src/kit/balance";
import { GUN, type GunId } from "../../src/content/guns";
import type { Stage } from "../../src/content/stage-rules";
import { gunSets, kitScore, stageThreat } from "../../src/content/threat";

/** The kit a bot of `tactics` takes into `stage` (its bays' worth of guns). */
export function chooseGuns(stage: Stage, tactics: Tactics, seed: number): GunId[] {
  const bays = stage.kit.bays;
  if (stage.id === "s0") return [GUN.xung, GUN.tia];
  if (tactics === "poor") return ([GUN.xung, GUN.tia, GUN.tan] as GunId[]).slice(0, bays);
  const sets = gunSets(bays);
  const rng = new RngStream((seed * 2654435761) >>> 0);
  if (tactics === "fair" && rng.float() < 0.5) return sets[rng.int(0, sets.length - 1)]!;
  const weights = stageThreat(stage);
  let best = sets[0]!;
  let bestScore = -1;
  for (const set of sets) {
    const score = kitScore(set, weights);
    if (score > bestScore + 1e-9) {
      best = set;
      bestScore = score;
    }
  }
  // The gun counting most on the stage first (it gets the stage's higher Rèn level).
  return best.slice().sort((a, b) => kitScore([b], weights) - kitScore([a], weights));
}
