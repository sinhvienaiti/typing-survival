/**
 * Tuyến Cuối's balance data (docs/games/BALANCE.md §4, §9.3; changelog
 * 2026-10-23-balance.md): the three modes, the run header a player's skill
 * profile sets before a stage (pace k, the word length E, the director), what
 * k scales, and the pace director's step table. Numbers only, no clock: the
 * header is written into every replay, so the same header, seed and keys give
 * the same run.
 */
import {
  BANDS, FAMILIARITY_SPEED, botSpec, capacity, effectiveE, paceK, round3,
  type Band, type BandMode, type PaceTable, type SkillValues,
} from "../kit/balance";
import { GUN, HEAVY, type GunId } from "./guns";
import { EXPECTED_WPM, LENGTH_BY_E } from "./rules";
import { LEARN_RULES, PACE_HOLD, type LearnRule, type Stage } from "./stage-rules";

export const MODES = ["relax", "balanced", "challenge"] as const satisfies readonly BandMode[];
export type Mode = (typeof MODES)[number];

/**
 * Per mode, what the stage's numbers are multiplied by: calm and lull spawn
 * rates, surge rates, walking speed, the near zone's drain. Balanced is the
 * stage as tuned (×1). Tuned with the bots (pnpm survival:balance) until each
 * mode's band of BALANCE.md §3 holds.
 */
export type ModeSpec = { readonly label: string; readonly note: string; readonly rate: number; readonly surge: number; readonly speed: number; readonly drain: number };
export const MODE_SPECS: { readonly [M in Mode]: ModeSpec } = {
  relax: { label: "Thư giãn", note: "Bầy thưa, đi chậm: gõ thong thả, học từ là chính", rate: 0.66, surge: 0.5, speed: 0.9, drain: 0.5 },
  balanced: { label: "Cân bằng", note: "Căng vừa sức: lúc dồn, lúc thở", rate: 1, surge: 1, speed: 1, drain: 1 },
  challenge: { label: "Thử thách", note: "Bầy dày, đỉnh tràn gắt: giữ tuyến là kỳ công", rate: 1.12, surge: 1.1, speed: 1.06, drain: 1.15 },
};

export const DEFAULT_MODE: Mode = "balanced";

export const isMode = (value: unknown): value is Mode => typeof value === "string" && (MODES as readonly string[]).includes(value);

export const bandOf = (mode: Mode): Band => BANDS[mode];

/** The word length band for a typist at E (LENGTH_BY_E) and its mean ℓ̄; a heavy gun's is a letter longer at both ends, at most HEAVY.cap. */
export function lengthFor(e: number, heavy = false): readonly [number, number] {
  let len: readonly [number, number] = LENGTH_BY_E[0].len;
  for (const entry of LENGTH_BY_E) if (e >= entry.minE) len = entry.len;
  return heavy ? [Math.min(HEAVY.cap, len[0] + HEAVY.extra), Math.min(HEAVY.cap, len[1] + HEAVY.extra)] : len;
}
export const meanLength = (e: number): number => {
  const [lo, hi] = lengthFor(e);
  return (lo + hi) / 2;
};

/**
 * k's capacity C(E) (kit balance/pace) with this game's words: ℓ̄ of E's
 * length band, d of "known" words (the stage deals the vocabulary's first
 * three levels: good, water, house…), and the reference: C of the standard
 * bot's effective speed (35 WPM, 95 %, CV 0.25), so the standard bot plays
 * at k = 1 exactly (BALANCE.md §4.1, C_ref).
 */
export const PACE_D = FAMILIARITY_SPEED.known;
const STANDARD = botSpec("standard");
export const PACE_REF = capacity(effectiveE({ e: STANDARD.wpm, a: STANDARD.accuracy, cv: STANDARD.cv }), meanLength(STANDARD.wpm), PACE_D);

/** k for a profile (two ways, 0.75–1.30, rounded to 1/1000). */
export function paceFor(view: Pick<SkillValues, "e" | "a" | "cv" | "fatigue">): number {
  const e = Math.round(view.e);
  return paceK(effectiveE({ e: view.e, a: view.a, cv: view.cv, fatigue: view.fatigue }), { len: meanLength(e), d: PACE_D, ref: PACE_REF });
}

/**
 * The run's pace (from the skill profile): the mode, pace k, E for the word
 * lengths and Nhanh, and whether the in-run director runs. "Nhịp tự điều
 * theo cách bạn gõ: Tắt" plays the standard pace: k = 1, E 35, no director
 * (the same fixed parameters a fair-score run would use).
 */
export type RunPace = { readonly mode: Mode; readonly pace: number; readonly expected: number; readonly director: boolean };

/** The guns on the bays (bay order), their Rèn levels, how many bays, the armour the line starts with. */
export type RunKit = { readonly guns: readonly GunId[]; readonly levels: readonly number[]; readonly bays: number; readonly armour: number };

/**
 * The run header (written into the replay with the seed; docs/BUILD_S1.md
 * §11.1): the pace, the stage ("s0" the trial, "c1-s4" …), the kit, the
 * stage's learning factor ρ (spawns × k × ρ), the telegraph scale (R3) and
 * the recall words (Nghĩa, R2). The same seed, header and keys give the same run.
 */
export type RunHeader = RunPace & {
  readonly stage: string;
  readonly kit: RunKit;
  readonly learn: number;
  readonly telegraph: number;
  readonly recall: readonly number[];
};

export const TRIAL_KIT: RunKit = { guns: [GUN.xung, GUN.tia], levels: [1, 1], bays: 2, armour: 100 };

export const STANDARD_PACE: RunPace = { mode: DEFAULT_MODE, pace: 1, expected: EXPECTED_WPM, director: true };
export const STANDARD_HEADER: RunHeader = { ...STANDARD_PACE, stage: "s0", kit: TRIAL_KIT, learn: 1, telegraph: 1, recall: [] };

/**
 * ρ (§7.3, §11.1): capacity with the rule's familiarity over capacity with
 * known words, at the typist's E_eff and ℓ̄, 0.6–1.0, rounded to 1/1000.
 * The stage's spawns run at k × ρ: a typist on k's floor still gets room
 * when the words get harder.
 */
export function learnFactor(view: Pick<SkillValues, "e" | "a" | "cv" | "fatigue">, rule: LearnRule): number {
  const familiarity = LEARN_RULES[rule].familiarity;
  if (familiarity === "known") return 1;
  const eff = effectiveE({ e: view.e, a: view.a, cv: view.cv, fatigue: view.fatigue });
  const len = meanLength(Math.round(view.e));
  const known = capacity(eff, len, PACE_D);
  return known > 0 ? round3(Math.max(0.6, Math.min(1, capacity(eff, len, FAMILIARITY_SPEED[familiarity]) / known))) : 1;
}

/** The kit for a stage: its bays, armour and Rèn levels, the levels going to the guns in the order they were picked. */
export function stageKit(stage: Stage, guns: readonly GunId[]): RunKit {
  const picked = guns.slice(0, stage.kit.bays);
  return { guns: picked, levels: picked.map((_, index) => stage.kit.levels[index] ?? 1), bays: stage.kit.bays, armour: stage.kit.armour };
}

/** The standard typist's view (E 35, 95 %, CV 0.25): ρ when "Nhịp tự điều" is off. */
export const STANDARD_VIEW = { e: STANDARD.wpm, a: STANDARD.accuracy, cv: STANDARD.cv, fatigue: 0 } as const;

/** The whole header of a stage run: the pace, the stage, its kit and ρ (from the typist's view; the standard one when the pace is fixed). */
export function stageHeader(pace: RunPace, stage: Stage, guns: readonly GunId[], view: Pick<SkillValues, "e" | "a" | "cv" | "fatigue">, recall: readonly number[] = []): RunHeader {
  const learn = learnFactor(pace.director ? view : STANDARD_VIEW, stage.learn);
  return { ...pace, stage: stage.id, kit: stage.id === "s0" ? TRIAL_KIT : stageKit(stage, guns), learn, telegraph: 1, recall };
}

export function runHeader(view: Pick<SkillValues, "e" | "a" | "cv" | "fatigue">, mode: Mode, adapt: boolean): RunPace {
  if (!adapt) return { mode, pace: 1, expected: EXPECTED_WPM, director: false };
  const expected = Math.max(10, Math.min(150, Math.round(view.e)));
  return { mode, pace: paceFor(view), expected, director: true };
}

/**
 * What pace k scales (BALANCE.md §9.3): spawn rates (the spawn interval is
 * 1/k), the surges' size, and the horde's walking speed, which is a timing
 * knob here (how long a foe takes to reach the line), at half strength.
 */
export const PACE_GAIN = { surge: 1, speed: 0.2 } as const;

export type Scales = { readonly rate: number; readonly surge: number; readonly speed: number; readonly drain: number };

export function scalesFor(mode: Mode, k: number): Scales {
  const spec = MODE_SPECS[mode];
  return {
    rate: spec.rate * k,
    surge: spec.surge * (1 + PACE_GAIN.surge * (k - 1)),
    speed: spec.speed * (1 + PACE_GAIN.speed * (k - 1)),
    drain: spec.drain,
  };
}

/**
 * The director's steps in this game (BALANCE.md §4.2, §9.3): harder, the
 * next pack's spawn interval −7 %, one Bọc Thép affix on the next plain pack,
 * the coming surge 3 s earlier, the coming lull 3 s shorter; easier, a
 * repair pod when near defeat (once a wave) first, then the reverse of each.
 * The kit keeps the caps (±15 % spawn interval, ±10 % W, 2 steps a wave).
 * eliteCost: one armoured pack ≈ 8 mines × 14 HP extra over the stage's W
 * (≈ 16,000 HP): ≈ 7 ‰, rounded up; the sim reports the real one. Each
 * stage carries its own table by objective (content/stage-rules.ts); this
 * is Trụ vững's, the trial's.
 */
export const SURVIVAL_PACE_TABLE: PaceTable = PACE_HOLD;

/** FlowMeter snapshots every this many ticks (0.1 s): kills, damage and drops add up in between. */
export const FLOW_EVERY = 6;

/**
 * The warm-up: the director's window starts over at this tick (15 s), when
 * the horde's stream has reached the guns; the first seconds (the vanguard
 * walking in, the first words) are calm for everyone by design and judged
 * with them every run would step harder at 20 s. The stage totals keep them.
 */
export const WARMUP_TICKS = 15 * 60;
