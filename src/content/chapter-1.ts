/**
 * Chapter 1 "Hành Lang VC-7" (docs/BUILD_S1.md §8): stages 1–4 in R1 (5–9
 * in R2, the boss in R3). Rates at k = 1 in Cân bằng are starting points
 * tuned with the bots; the mode and k scale them like S0's.
 *
 * How R1 reads §8's "Toán (tỉ lệ toán)": the share of the stage's foes that
 * come in packs of that kind. Plain packs (mines with scouts in their back
 * rows: "lính" is the scouts' share of their members) are the rest. A Trâu
 * pack is a Trâu with 5 mines behind it, a Khiên pack a Khiên with a wedge
 * of 6. Special packs are dealt evenly by their share from `from` s on, the
 * first one at `from` (no draw: every run of a stage shows its new foe).
 */
import { PACE_HOLD, PACE_HUNT, stageSeconds, type Stage, type Surge } from "./stage-rules";
import { STAGE_S0, TRIAL } from "./stage-s0";

const surge = (at: number): Surge => ({ at, seconds: 8, rate: 8.5, lull: 4, lullRate: 1.5 });
const calm = (rate: number, to: number) => [{ from: 0, to, rate }];
/**
 * Chapter stages drain from 14 m, not the trial's 16 (R1 review, G3c): a kit
 * of near guns (Xung + Tán reach 11.7 m) bled armour from foes it could not
 * touch, while a kit of far guns lost little; the band only it could not
 * answer is now 2 m narrower.
 */
const common = { chapter: 1, vanguard: STAGE_S0.vanguard, tide: STAGE_S0.tide, surgeSpread: STAGE_S0.surgeSpread, drainFrom: 14 } as const;
/**
 * drainRate (R1 close, 40-seed rounds): the near zone bleeds twice as fast
 * on stages 1 and 4, so S falls into §3's band for most bots without a
 * pack more (more foes broke Ẩu, Mới and Trẻ em first). Stage 3 keeps 1
 * (its rifts pour foes inside the zone), stage 2 too: the hunt ends near
 * 110 s, and more drain only sank the pairs without Ray (G3c). Stage 4's
 * Khiên packs 13 → 10 %: at k 1.2–1.25 Khá and Nhanh, whose Xung + Pháo Sao
 * has nothing for a shield inside 6 m, lost 70 armour of 100 there.
 */
const storm = (chance: number) => ({ chance, spread: STAGE_S0.storm.spread });

export const CHAPTER_1: readonly Stage[] = [
  {
    ...common,
    id: "c1-s1",
    index: 1,
    name: "Ca trực đầu",
    objective: { kind: "hold", seconds: 150 },
    hazard: null,
    learn: "standard",
    calm: calm(4.4, 150),
    storm: storm(0.15),
    surges: [surge(50), surge(115)],
    scouts: { share: 0.12, from: 12 },
    packs: { brute: { share: 0.06, from: 80 } },
    teach: ["brute"],
    kit: { bays: 2, levels: [1, 1], armour: 100 },
    pace: PACE_HOLD,
    drainRate: 2,
  },
  {
    ...common,
    id: "c1-s2",
    index: 2,
    name: "Săn Pack Leader",
    objective: { kind: "hunt", need: 3, leaders: [20, 58, 96, 134, 172], cap: 240 },
    hazard: null,
    learn: "standard",
    calm: calm(3.4, 240),
    storm: storm(0.15),
    surges: [surge(70)],
    scouts: { share: 0.12, from: 12 },
    packs: { brute: { share: 0.08, from: 30 } },
    teach: ["hunt", "leader"],
    kit: { bays: 2, levels: [1, 1], armour: 100 },
    pace: PACE_HUNT,
  },
  {
    ...common,
    id: "c1-s3",
    index: 3,
    name: "Vách nứt",
    objective: { kind: "hold", seconds: 165 },
    hazard: { kind: "rift", period: 30, first: 25 },
    learn: "standard",
    calm: calm(3.9, 165),
    storm: storm(0.15),
    surges: [surge(55), surge(140)],
    scouts: { share: 0.12, from: 12 },
    packs: { brute: { share: 0.08, from: 30 } },
    teach: ["rift"],
    kit: { bays: 2, levels: [1, 1], armour: 100 },
    pace: PACE_HOLD,
  },
  {
    ...common,
    id: "c1-s4",
    index: 4,
    name: "Khiên sáng",
    objective: { kind: "hold", seconds: 165 },
    hazard: null,
    learn: "missing",
    calm: calm(3.8, 165),
    storm: storm(0.25),
    surges: [surge(55), surge(140)],
    scouts: { share: 0.12, from: 12 },
    packs: { shield: { share: 0.1, from: 20 } },
    teach: ["shield", "missing"],
    kit: { bays: 2, levels: [2, 1], armour: 100 },
    pace: PACE_HOLD,
    drainRate: 2,
  },
];

export const STAGES: readonly Stage[] = [TRIAL, ...CHAPTER_1];
export const STAGE_IDS: readonly string[] = STAGES.map((stage) => stage.id);

export function stageById(id: string): Stage {
  const stage = STAGES.find((entry) => entry.id === id);
  if (stage === undefined) throw new Error("stage: unknown " + id);
  return stage;
}

export const isStageId = (value: unknown): value is string => typeof value === "string" && STAGE_IDS.includes(value);

export { stageSeconds };
