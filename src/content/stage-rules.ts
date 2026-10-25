/**
 * Stage rules (docs/BUILD_S1.md §7): what a stage is made of (objective,
 * hazard, learning rule, its horde and timeline, the reference kit), the S1
 * library of each, the attention budget, and `checkChapter`, which a
 * chapter's table must pass (§7.5). Numbers only: the sim reads them.
 */
import type { PaceTable } from "../kit/balance";

export type CalmSpan = { readonly from: number; readonly to: number; readonly rate: number };
export type Surge = { readonly at: number; readonly seconds: number; readonly rate: number; readonly lull: number; readonly lullRate: number };
export type Vanguard = { readonly z: number; readonly n: number };

export type ObjectiveKind = "hold" | "hunt";
export type StageObjective =
  /** Trụ vững: still standing when the time runs out. */
  | { readonly kind: "hold"; readonly seconds: number }
  /** Săn Đầu Đàn: `need` of the leaders arriving at `leaders` (s); lost when more than leaders − need get through; `cap` s at most. */
  | { readonly kind: "hunt"; readonly need: number; readonly leaders: readonly number[]; readonly cap: number };

export type HazardKind = "rift";
export type StageHazard = { readonly kind: "rift"; readonly period: number; readonly first: number };

export type LearnRule = "standard" | "missing";

/** A special pack's share of the foes spawned from `from` s (the first one comes at `from`). */
export type PackShare = { readonly share: number; readonly from: number };
export type SpecialPack = "brute" | "shield" | "splitter";

/** The reference kit a stage is balanced for (§8): bays, Rèn levels (the first chosen gun gets the first), armour. */
export type StageKit = { readonly bays: number; readonly levels: readonly number[]; readonly armour: number };

export type Stage = {
  /** "s0" for the trial, "c1-s4" for chapter 1's stage 4. */
  readonly id: string;
  readonly chapter: number;
  /** 1 … 10 in its chapter, 0 for the trial. */
  readonly index: number;
  readonly name: string;
  readonly objective: StageObjective;
  readonly hazard: StageHazard | null;
  readonly learn: LearnRule;
  /** Packs already in the corridor at the start (front row at z, size × mode and k). */
  readonly vanguard: readonly Vanguard[];
  readonly calm: readonly CalmSpan[];
  /** Every calm and lull rate × a seeded draw in [lo, hi]. */
  readonly tide: readonly [number, number];
  readonly surgeSpread: readonly [number, number];
  readonly storm: { readonly chance: number; readonly spread: readonly [number, number] };
  readonly surges: readonly Surge[];
  /** Scouts in the back rows of plain packs: their share of the members, from `from` s. */
  readonly scouts: { readonly share: number; readonly from: number };
  readonly packs: { readonly [P in SpecialPack]?: PackShare };
  /** Where the near zone's drain starts (m; rules.ts DRAIN.from when absent: the trial's 16), and its rate × DRAIN.perFoe (1 when absent). */
  readonly drainFrom?: number;
  readonly drainRate?: number;
  /** What the stage teaches (first appearances: foe kinds and mechanics, §7.5). */
  readonly teach: readonly string[];
  readonly kit: StageKit;
  readonly pace: PaceTable;
};

export const OBJECTIVE_LABELS: Readonly<Record<ObjectiveKind, string>> = { hold: "Trụ vững", hunt: "Săn Đầu Đàn" };
export const HAZARD_LABELS: Readonly<Record<HazardKind, string>> = { rift: "Vết nứt" };
/** Heavy hazards halve the storm chance and never meet a hard learning rule (§7.2, §7.3). */
export const HAZARD_HEAVY: Readonly<Record<HazardKind, boolean>> = { rift: false };

/**
 * Learning rules (§7.3): the familiarity k and the bots read for the stage's
 * words, the accuracy a star asks (a hidden letter guessed wrong is an
 * error: the star does not punish a learner), and whether it is hard (its
 * runs do not update E and CV).
 */
export const LEARN_RULES: Readonly<Record<LearnRule, { readonly label: string; readonly familiarity: "known" | "learning" | "new"; readonly starAccuracy: number; readonly hard: boolean }>> = {
  standard: { label: "Chuẩn", familiarity: "known", starAccuracy: 0.95, hard: false },
  missing: { label: "Thiếu chữ", familiarity: "learning", starAccuracy: 0.9, hard: true },
};

/** Thiếu chữ: words of up to `short` letters hide one letter, longer ones two; never the first, never two side by side. */
export const MISSING = { short: 6 } as const;

/**
 * Vết nứt (§7.2): every `period` s from `first`, warned `warn` s ahead by a
 * crack glowing on the left or right wall at z `zMin`–`zMax`, then `foes`
 * mines (× the mode and k, `min`–`max`) pour out over `spill` s, inside the
 * guns' reach. R1 review: z 9–13 → 11–15 (G3c tuning: at 9–13 they poured
 * out almost at the line). R1 close: 13–17 m and 5 mines, once the clean
 * magazine lost its extra damage (Mới, Trẻ em and Tia + Pháo Sao on stage 3).
 */
export const RIFT = { warn: 2.5, zMin: 13, zMax: 17, foes: 5, min: 4, max: 12, spill: 1 } as const;

/**
 * The attention budget (§7.6): one telegraph at a time (a surge's banner, a
 * rift's warning, a leader's horn), two starting at least `gap` s apart; no
 * hazard in the first `surgeQuiet` s of a surge, no rift in a storm surge.
 */
export const ATTENTION = { gap: 4, surgeQuiet: 3 } as const;

/** Săn: once enough leaders fall the horde pulls back: `retreat` s of fading, harmless, then the stage is won. */
export const HUNT = { retreat: 2 } as const;

/** The director's steps by objective (§11.1). The kit keeps the caps. */
const STEP = { spawnStep: 70, peakTicks: 180, lullTicks: 180 } as const;
export const PACE_HOLD: PaceTable = { up: ["spawn", "elite", "peak", "lull"], down: ["support", "spawn", "elite", "lull", "peak"], eliteCost: 10, ...STEP };
export const PACE_HUNT: PaceTable = { up: ["spawn", "elite", "peak"], down: ["support", "spawn", "elite", "peak"], eliteCost: 10, ...STEP };

/** The stage's length or its safety cap (s). */
export const stageSeconds = (stage: Stage): number => (stage.objective.kind === "hold" ? stage.objective.seconds : stage.objective.cap);

/** Foe kinds and mechanics a stage uses (for checkChapter and the briefing). */
export function stageUses(stage: Stage): string[] {
  const uses = new Set<string>(["mine", stage.objective.kind]);
  if (stage.scouts.share > 0) uses.add("scout");
  for (const pack of Object.keys(stage.packs)) uses.add(pack);
  if (stage.objective.kind === "hunt") uses.add("leader");
  if (stage.hazard !== null) uses.add(stage.hazard.kind);
  if (stage.learn !== "standard") uses.add(stage.learn);
  return [...uses];
}

/** What every player knows before chapter 1 (S0): the swarm, scouts, holding the line, standard words. */
const KNOWN = ["mine", "scout", "hold", "standard"];
const MECHANICS = new Set(["hold", "hunt", "rift", "missing"]);

/**
 * The chapter's constraints (§7.5) that the table alone decides: distinct
 * (objective, hazard, rule) triples; each new thing first used where the
 * stage teaches it; at most one new mechanic and one new foe a stage; no
 * hard learning rule with a heavy hazard; hunt leaders within the stage.
 * Returns the problems (empty: the chapter passes).
 */
export function checkChapter(stages: readonly Stage[]): string[] {
  const problems: string[] = [];
  const triples = new Set<string>();
  const known = new Set(KNOWN);
  for (const stage of stages) {
    const triple = stage.objective.kind + "/" + (stage.hazard?.kind ?? "none") + "/" + stage.learn;
    if (triples.has(triple)) problems.push(stage.id + ": the same objective, hazard and rule as an earlier stage");
    triples.add(triple);
    for (const thing of stageUses(stage)) if (!known.has(thing) && !stage.teach.includes(thing)) problems.push(stage.id + ": uses " + thing + " before a stage teaches it");
    const taught = stage.teach.filter((thing) => !known.has(thing));
    if (taught.filter((thing) => MECHANICS.has(thing)).length > 1) problems.push(stage.id + ": teaches more than one mechanic");
    if (taught.filter((thing) => !MECHANICS.has(thing)).length > 1) problems.push(stage.id + ": teaches more than one foe");
    for (const thing of stage.teach) known.add(thing);
    if (stage.hazard !== null && HAZARD_HEAVY[stage.hazard.kind] && LEARN_RULES[stage.learn].hard) problems.push(stage.id + ": a hard learning rule with a heavy hazard");
    if (stage.objective.kind === "hunt") {
      const { need, leaders, cap } = stage.objective;
      if (need > leaders.length || leaders.some((at) => at >= cap)) problems.push(stage.id + ": the hunt cannot be won in its time");
    }
    if (stage.kit.levels.length > stage.kit.bays) problems.push(stage.id + ": more Rèn levels than bays");
  }
  return problems;
}
