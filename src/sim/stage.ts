/**
 * The stage's objective (docs/BUILD_S1.md §7.1): Trụ vững is won when the
 * time runs out with armour left; Săn Đầu Đàn when `need` leaders fall (the
 * horde then pulls back: harmless, fading for HUNT.retreat s, and the stage
 * is won), lost when more than leaders − need get through or at the safety
 * cap. Leaders walk in at their times (sim/spawn.ts); the pace director never
 * touches them.
 */
import { HUNT, stageSeconds, type Stage } from "../content/stage-rules";
import { EV, OBJECTIVE } from "./events";
import type { World } from "./world";

export function createObjective(stage: Stage) {
  const hunt = stage.objective.kind === "hunt" ? stage.objective : null;
  return {
    kind: hunt === null ? OBJECTIVE.hold : OBJECTIVE.hunt,
    /** Leaders down, needed, through the line, and how many come. */
    done: 0,
    need: hunt?.need ?? 0,
    leaked: 0,
    of: hunt?.leaders.length ?? 0,
    /** The next leader to walk in (index into the stage's times). */
    next: 0,
    /** World seconds the horde started pulling back (−1: not yet). */
    retreat: -1,
    cap: stageSeconds(stage),
  };
}

export type Objective = ReturnType<typeof createObjective>;

function progress(w: World): void {
  const O = w.objective;
  w.events.push(w.tick, EV.objective, O.kind, O.done, O.leaked, 0, 0, 0, O.need, 0);
}

/** A leader fell: one more towards the hunt; enough of them and the horde pulls back. */
export function noteLeaderDown(w: World, _slot: number): void {
  const O = w.objective;
  if (O.kind !== OBJECTIVE.hunt || O.retreat >= 0) return;
  O.done += 1;
  progress(w);
  if (O.done >= O.need) {
    O.retreat = w.time;
    w.events.push(w.tick, EV.retreat, -1, 0, 0, 0, 0, 0, HUNT.retreat, 0);
  }
}

/** A leader reached the line. */
export function noteLeak(w: World): void {
  const O = w.objective;
  if (O.kind !== OBJECTIVE.hunt) return;
  O.leaked += 1;
  progress(w);
}

/** The stage's end now, if any: "won", "lost" or null (armour first: a broken line loses). */
export function stageOutcome(w: World): "won" | "lost" | null {
  if (w.hp <= 0) return "lost";
  const O = w.objective;
  if (O.kind === OBJECTIVE.hold) return w.time >= w.seconds - 1e-9 ? "won" : null;
  if (O.retreat >= 0) return w.time >= O.retreat + HUNT.retreat - 1e-9 ? "won" : null;
  if (O.leaked > O.of - O.need) return "lost";
  return w.time >= w.seconds - 1e-9 ? "lost" : null;
}
