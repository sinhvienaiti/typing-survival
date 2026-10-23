/**
 * Scoring guns for a stage (docs/BUILD_S1.md §11.2), shared by the bots and
 * the briefing: each counter row's weight is its share of the stage's danger
 * (its share of the horde's hit points × a danger factor: the swarm near the
 * line × 1.5, the objective's foes × 2, scouts × 1.2), and a kit scores
 * Σ weight × the best mark any of its guns has on the row (● 1, ○ 0.5, ✕ 0).
 * Counting ● alone would always pick the big-foe guns; the swarm is most of
 * the danger.
 */
import { FOES, KIND, PACK } from "./foes";
import { COUNTERS, COUNTER_ROWS, GUN_IDS, type CounterRow, type GunId } from "./guns";
import type { Stage } from "./stage-rules";
import { stageFoes } from "./stage-s0";

export type RowWeights = Readonly<Record<CounterRow, number>>;

const VALUE = [0, 0.5, 1] as const;
/** Danger factors (§11.2). */
const DANGER = { near: 1.5, objective: 2, scout: 1.2 } as const;

/** The stage's danger by counter row, normalised to sum 1. */
export function stageThreat(stage: Stage): RowWeights {
  const w: Record<CounterRow, number> = { swarmFar: 0, swarmNear: 0, scout: 0, armoured: 0, shield: 0, splitter: 0 };
  const foes = stageFoes(stage);
  const mine = FOES[KIND.mine]!.hp;
  let special = 0;
  const brute = stage.packs.brute?.share ?? 0;
  const shield = stage.packs.shield?.share ?? 0;
  const splitter = stage.packs.splitter?.share ?? 0;
  special = brute + shield + splitter;
  const plain = foes * (1 - special);
  const scouts = stage.scouts.share;
  // Plain packs: half the swarm is met far out, half at the line.
  w.swarmFar += (plain * (1 - scouts) * mine) / 2;
  w.swarmNear += ((plain * (1 - scouts) * mine) / 2) * DANGER.near;
  w.scout += plain * scouts * FOES[KIND.scout]!.hp * DANGER.scout;
  if (brute > 0) {
    const packs = (foes * brute) / (1 + PACK.brute.follow);
    w.armoured += packs * FOES[KIND.brute]!.hp;
    w.swarmNear += packs * PACK.brute.follow * mine * DANGER.near;
  }
  if (shield > 0) {
    const packs = (foes * shield) / (1 + PACK.shield.follow);
    w.shield += packs * (FOES[KIND.shield]!.hp + FOES[KIND.shield]!.shield + PACK.shield.follow * mine);
  }
  if (splitter > 0) w.splitter += foes * splitter * (FOES[KIND.splitter]!.hp + 3 * FOES[KIND.shard]!.hp);
  if (stage.objective.kind === "hunt") w.armoured += stage.objective.leaders.length * (FOES[KIND.leader]!.hp + PACK.leader.escort * mine) * DANGER.objective;
  if (stage.hazard?.kind === "rift") w.swarmNear += (stageFoes(stage) / 30) * mine * DANGER.near;
  let total = 0;
  for (const row of COUNTER_ROWS) total += w[row];
  for (const row of COUNTER_ROWS) w[row] = total > 0 ? w[row] / total : 0;
  return w;
}

/** A kit's score on a stage's rows: Σ weight × the best mark among its guns. */
export function kitScore(guns: readonly GunId[], weights: RowWeights): number {
  let score = 0;
  for (const row of COUNTER_ROWS) {
    let best = 0;
    for (const gun of guns) best = Math.max(best, VALUE[COUNTERS[row][gun]! as 0 | 1 | 2]);
    score += weights[row] * best;
  }
  return score;
}

/** Every set of `n` distinct guns, in gun order. */
export function gunSets(n: number): GunId[][] {
  const out: GunId[][] = [];
  const pick = (from: number, set: GunId[]): void => {
    if (set.length === n) {
      out.push(set.slice());
      return;
    }
    for (let g = from; g < GUN_IDS.length; g += 1) pick(g + 1, [...set, GUN_IDS[g]!]);
  };
  pick(0, []);
  return out;
}

/** The rows a kit leaves without any gun ● or ○ on them, heaviest first (the briefing's yellow marks). */
export function uncovered(guns: readonly GunId[], weights: RowWeights): CounterRow[] {
  return COUNTER_ROWS.filter((row) => weights[row] > 0.02 && guns.every((gun) => COUNTERS[row][gun] === 0)).sort((a, b) => weights[b] - weights[a]);
}

/** The row that weighs most outside the swarm packs (their mines and the scouts riding in them): the stage's "main foe" (§9). */
export function mainRow(weights: RowWeights): CounterRow | null {
  let best: CounterRow | null = null;
  for (const row of COUNTER_ROWS) if (row !== "swarmFar" && row !== "swarmNear" && row !== "scout" && weights[row] > 0.02 && (best === null || weights[row] > weights[best])) best = row;
  return best;
}
