/**
 * The stage's own events as light and sound (docs/BUILD_S1.md §12; moved
 * from gunfx.ts by ALIVE_PLAN AL-00, behaviour unchanged; AL-07 owns the
 * objective in wave 3, AL-11 the telegraphs and the rift in wave 4): a Pack
 * Leader down on Săn (a T4 blow, a 45 ms stop), a rift's warning and its
 * opening (hazard-fx RiftCracks), a rift's glow over its crack each frame.
 */
import * as THREE from "three";
import type { ParticlePool } from "../kit/three";
import type { Trauma } from "../kit/feedback";
import { tier } from "../kit/feedback";
import { FIELD } from "../content/rules";
import { EV, OBJECTIVE, TELEGRAPH, type Ring } from "../sim/events";
import type { World } from "../sim/world";
import type { ThemeAudio } from "../audio/theme-audio";
import { CELL, FLAT, type Glows } from "./fx";
import type { RiftCracks } from "./hazard-fx";
import { BLOW as C } from "./theme";

export type StageFxParts = {
  glows: Glows; sparks: ParticlePool; trauma: Trauma; cracks: RiftCracks; audio: ThemeAudio;
  /** Ask the world for a hit stop of `ms`. */
  ask(ms: number): void;
};

export class StageFx {
  private readonly at = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  /** Leaders down so far (the objective's events count them). */
  private huntDone = 0;

  constructor(private readonly p: StageFxParts) {}

  private spark(x: number, y: number, z: number, dx: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number, spread = 2.4): void {
    for (let k = 0; k < count; k += 1) {
      const side = (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.9);
      this.v.set((dx + dz * side) * s, 1.2 + Math.random() * 3.5, -(dz - dx * side) * s);
      this.p.sparks.spawn(this.at.set(x, y, -z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** A stage event (EV.objective, telegraph, rift): its look, then its sound; `time` in s, `now` in ms. Other kinds pass. */
  event(R: Ring, i: number, _w: World, time: number, now: number): void {
    const a = this.p.audio;
    switch (R.kind[i]) {
      case EV.objective:
        // A leader down (Săn): a T4 blow, a 45 ms stop, its fall.
        if (R.slot[i] === OBJECTIVE.hunt && R.ref[i]! > this.huntDone) {
          this.huntDone = R.ref[i]!;
          a.gun("leader.down", 0, now);
          this.p.trauma.add(tier(4).trauma);
          this.p.ask(45);
        }
        return;
      case EV.telegraph:
        if (R.slot[i] !== TELEGRAPH.rift) return;
        this.p.cracks.warn(R.dx[i]!, R.z[i]!, R.value[i]!, time);
        return a.gun("rift.warn", R.dx[i]!, now);
      case EV.rift:
        this.riftLook(R.x[i]!, R.z[i]!);
        this.p.cracks.open(R.x[i]! > 0 ? 1 : -1, R.z[i]!, time);
        return a.gun("rift.open", R.x[i]! / FIELD.halfW, now);
    }
  }

  /** Torn open, big enough to see from the word line (test pass 27/10: a 40 px flash gone in 0.45 s): a white-hot tear, a column of molten light up the wall for 0.9 s, a ring running out over the deck, sparks and smoke pouring in. */
  private riftLook(x: number, z: number): void {
    const g = this.p.glows;
    const side = x > 0 ? -1 : 1;
    this.spark(x, 1, z, side, 0, 40, 9, C.rift, 0.34, 0.9, 2);
    g.burst(CELL.core, x, 1.2, -z, 2, 5, 0.15, C.hot, 2.8);
    g.burst(CELL.soft, x, 1, -z, 3, 7, 1.6, C.smoke, 0.9, side * 1.5, 0.6, 0);
    g.burst(CELL.flare, x, 1.5, -z, 6, 14, 0.9, C.rift, 2.4, 0, 0, 0, 0, Math.PI / 2);
    g.burst(CELL.ring + FLAT, x, 0.08, -z, 1, 9, 0.9, C.rift, 2.2);
    this.p.trauma.add(0.12);
    this.p.trauma.kick(side, 0, 3);
  }

  /** Per frame: a rift's glow standing over its crack, rising through the warning, flaring while it pours. */
  draw(w: World, _dt: number, time: number): void {
    const H = w.hazards;
    if (H.state === 0 || H.next >= H.count) return;
    const side = H.side[H.next]!;
    const x = side * (FIELD.halfW - FIELD.wall - 0.4);
    const z = -H.z[H.next]!;
    const warm = H.state === 1 ? Math.max(0, Math.min(1, 1 - (H.at[H.next]! - w.time) / 2.5)) : 1;
    const flicker = 0.8 + 0.2 * Math.sin(time * 30);
    this.p.glows.stamp(CELL.soft, x, 1, z, 2 + 3 * warm, 0, C.rift, (0.6 + 1.6 * warm) * flicker);
    this.p.glows.stamp(CELL.flare, x, 0.9, z, 3 + 3 * warm, Math.PI / 2, C.rift, warm * 1.8 * flicker);
  }
}
