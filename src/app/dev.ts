/**
 * window.__survival: what the browser scenarios (scripts/visual/scenarios/
 * survival-*.mjs) read and drive; main.ts hands it its parts. It changes a run
 * only through the commands a player could send (plus a dev flood and the
 * view's frame clock), so a scenario's log replays in Node like any other
 * (scripts/replay.ts). S1: the stage, its objective and hazards, every bay,
 * the journey's screens, placing a foe for the effects scenarios.
 */
import { GUN, GUN_KEYS } from "../content/guns";
import { hashHex } from "../sim/hash";
import { bayOf } from "../sim/weapons";
import type { Session } from "./session";

export function installDevHandle(handle: object): void {
  (window as unknown as { __survival?: object }).__survival = handle;
}

/** The run's state as the scenarios read it. */
export function runState(session: Session, onScreen: () => number) {
  const w = session.world;
  const tia = bayOf(w, GUN.tia);
  return {
    tick: w.tick, time: w.time, phase: w.phase, hp: w.hp, armourMax: w.armourMax, foes: w.foes.count, onScreen: onScreen(), bullets: w.bullets.count, shots: w.shots.count, shells: w.shells.count, shields: w.shields.count,
    mags: Array.from(w.guns.mags), beam: tia >= 0 && w.guns.beamOn[tia] === 1 ? w.guns.beamX[tia]! : null, stats: { ...w.stats }, spawned: w.spawn.spawned, waiting: w.spawn.waiting,
    stage: w.header.stage, guns: Array.from(w.header.kit.guns, (gun) => GUN_KEYS[gun]),
    objective: { ...w.objective }, rifts: { next: w.hazards.next, count: w.hazards.count, state: w.hazards.state, at: Array.from(w.hazards.at.subarray(0, w.hazards.count)) },
    kinds: countKinds(session),
  };
}

function countKinds(session: Session): number[] {
  const w = session.world;
  const out = new Array<number>(8).fill(0);
  for (let s = 0; s < w.foes.top; s += 1) if (w.foes.alive[s] === 1) out[w.foes.kind[s]!] = out[w.foes.kind[s]!]! + 1;
  return out;
}

/** How many events of each kind the ring holds (the last 16,384): the scenarios check a gun fired, a shield broke… */
export function eventCounts(session: Session): number[] {
  const R = session.world.events;
  const out = new Array<number>(40).fill(0);
  for (let i = Math.max(0, R.written - R.size); i < R.written; i += 1) out[R.kind[i % R.size]!] = out[R.kind[i % R.size]!]! + 1;
  return out;
}

/** Every bay's word as the scenarios type it (with Thiếu chữ's hidden letters). */
export function bays(session: Session) {
  const w = session.world;
  const T = w.typing;
  return Array.from(T.word, (index, s) => ({
    text: w.deck[index]!, typed: T.lock === s ? T.typed[s]! : 0, locked: T.lock === s, mags: w.guns.mags[s]!, gun: GUN_KEYS[w.guns.gun[s]!] ?? "", hidden: T.hidden[s]!, shown: T.shown[s]!,
  }));
}

/** What a Node replay needs (scripts/replay.ts), read at one instant. */
export function snapshot(session: Session, extra: object) {
  const w = session.world;
  return { seed: w.seed, ...extra, ...w.header, kit: { ...w.header.kit, guns: Array.from(w.header.kit.guns), levels: Array.from(w.header.kit.levels) }, recall: Array.from(w.header.recall), tick: w.tick, hash: hashHex(w), log: session.log.slice(), paceLog: w.director.log.slice() };
}

/** Frame costs (ms) of the last RING frames: steps + events + HUD, the draw, the intervals. */
export class FrameCosts {
  static readonly RING = 1200;
  readonly update = new Float32Array(FrameCosts.RING);
  readonly draw = new Float32Array(FrameCosts.RING);
  readonly interval = new Float32Array(FrameCosts.RING);
  n = 0;

  /** This frame's slot. */
  get at(): number {
    return this.n % FrameCosts.RING;
  }

  read() {
    const n = Math.min(this.n, FrameCosts.RING);
    const take = (list: Float32Array) => Array.from({ length: n }, (_, k) => list[(this.n - n + k) % FrameCosts.RING]!);
    return { update: take(this.update), draw: take(this.draw), interval: take(this.interval) };
  }
}

/** The damage numbers on screen and their boxes (the scenarios check none covers the protected rectangles). */
export function numberBoxes(N: { alive: ArrayLike<number>; live: number; dropped: number; protected: readonly object[]; overlaps(): number; box(i: number, out: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number }; text(i: number): string }) {
  const boxes: { x: number; y: number; w: number; h: number; text: string }[] = [];
  for (let i = 0; i < N.alive.length; i += 1) if (N.alive[i] === 1) boxes.push({ ...N.box(i, { x: 0, y: 0, w: 0, h: 0 }), text: N.text(i) });
  return { live: N.live, overlaps: N.overlaps(), dropped: N.dropped, rects: N.protected.slice(), boxes };
}
