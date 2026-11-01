/**
 * The S1 foes as light, motion and sound (docs/BUILD_S1.md §12; moved from
 * gunfx.ts by ALIVE_PLAN AL-00, behaviour unchanged; AL-09 owns it in wave
 * 3), fed by Combat from the sim's events and drawn each frame from its
 * state, through Combat's pools (glows, strips, sparks, debris; nothing
 * allocated per event).
 *   Vỏ: a blow it stopped throws orange sparks back; a clean magazine's
 *   pierces with a short white-blue streak into the body.
 *   Khiên: its wall ripples where struck (hazard-fx ShieldWalls), sparks
 *   slide off; broken, blue glass flies. Tách: a cracking flash as it splits.
 *   Đầu Đàn: a swaying gold beacon above it and a gold stripe on the floor.
 *   Trâu: dust rings on the deck under the nearest ones as they stomp.
 */
import * as THREE from "three";
import type { ParticlePool } from "../kit/three";
import type { Debris, Trauma } from "../kit/feedback";
import { tier } from "../kit/feedback";
import { FOES, KIND } from "../content/foes";
import { FIELD } from "../content/rules";
import { EV, FLAG, type Ring } from "../sim/events";
import type { World } from "../sim/world";
import type { ThemeAudio } from "../audio/theme-audio";
import { CELL, FLAT, type Glows, type Strips } from "./fx";
import type { ShieldWalls } from "./hazard-fx";
import { BLOW as C } from "./theme";

export type FoeFxParts = {
  glows: Glows; strips: Strips; sparks: ParticlePool; debris: Debris; trauma: Trauma; walls: ShieldWalls; audio: ThemeAudio;
  /** Ask the world for a hit stop of `ms`. */
  ask(ms: number): void;
};

export class FoeFx {
  private readonly at = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  /** Brutes' last step phase (by slot) for the stomp dust; doubles: a float32 copy rounded up re-fired the stomp on every frame drawn at a held time (scenarios). */
  private readonly step = new Float64Array(1024);

  constructor(private readonly p: FoeFxParts) {}

  private spark(x: number, y: number, z: number, dx: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number, spread = 2.4): void {
    for (let k = 0; k < count; k += 1) {
      const side = (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.9);
      this.v.set((dx + dz * side) * s, 1.2 + Math.random() * 3.5, -(dz - dx * side) * s);
      this.p.sparks.spawn(this.at.set(x, y, -z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** A foe's event (EV.shieldHit, shieldBreak, split, leader): its look, then its sound and stop; `time` in s, `now` in ms. Other kinds pass. */
  event(R: Ring, i: number, w: World, time: number, now: number): void {
    const kind = R.kind[i]!;
    if (kind !== EV.shieldHit && kind !== EV.shieldBreak && kind !== EV.split && kind !== EV.leader) return;
    this.look(R, i, w, time);
    const a = this.p.audio;
    const at = R.x[i]! / FIELD.halfW;
    switch (kind) {
      case EV.shieldHit:
        return a.gun("shield.hit", at, now);
      case EV.shieldBreak:
        a.gun("shield.break", at, now);
        return this.p.ask(tier(3).stopMs);
      case EV.split:
        return a.gun("foe.split", at, now);
      case EV.leader:
        return a.gun("leader.horn", at, now);
    }
  }

  private look(R: Ring, i: number, w: World, time: number): void {
    const x = R.x[i]!;
    const z = R.z[i]!;
    const dx = R.dx[i]!;
    const dz = R.dz[i]!;
    const g = this.p.glows;
    switch (R.kind[i]) {
      case EV.shieldHit:
        this.p.walls.struck(w, w.foes.shield[R.slot[i]!] ?? -1, x, z, time);
        g.burst(CELL.star4, x, 1.1, -z, 0.4, 1.3, 0.1, C.glass, 2.2);
        // Sparks slide off the face, sideways.
        this.spark(x, 1.1, z, dz, -dx, 3, 5, C.shield, 0.2, 0.3, 1.2);
        break;
      case EV.shieldBreak:
        g.burst(CELL.star12, x, 1.1, -z, 1.4, 4.2, 0.22, C.glass, 2.6);
        g.burst(CELL.ring, x, 1.1, -z, 0.6, 3.6, 0.3, C.shield, 2);
        this.p.debris.burst(x, 1.1, -z, dx, -dz, 22, 6, C.glass, C.shield);
        this.p.trauma.add(0.08);
        break;
      case EV.split:
        g.burst(CELL.star8, x, 0.9, -z, 0.8, 2.6, 0.16, C.hot, 2.4);
        g.burst(CELL.ring + FLAT, x, 0.08, -z, 0.3, 2.6, 0.3, C.swarm, 1.8);
        this.spark(x, 0.9, z, 0, 1, 10, 6, C.ember, 0.24, 0.4, 6);
        break;
      case EV.leader:
        g.burst(CELL.flare, x, 3, -z, 4, 9, 0.6, C.beacon, 2.4, 0, 0, 0, 0, Math.PI / 2);
        g.burst(CELL.ring + FLAT, x, 0.08, -z, 1, 7, 0.8, C.beacon, 1.8);
        break;
    }
  }

  /** A blow on Vỏ: stopped (orange sparks bounce back) or a clean magazine's pierce (a white-blue streak); false when Vỏ took no part. `k`: far blows draw larger. */
  armour(x: number, z: number, dx: number, dz: number, flags: number, k: number): boolean {
    if ((flags & FLAG.armour) === 0) return false;
    const g = this.p.glows;
    if ((flags & FLAG.pierce) !== 0) {
      this.p.strips.add(x - dx * 1.2, 1, -(z - dz * 1.2), x + dx * 0.3, 1, -(z + dz * 0.3), 0.3, C.pierce, 3, 1);
      g.burst(CELL.star4, x, 1, -z, 0.5 * k, 1.4 * k, 0.1, C.pierce, 2.4);
    } else {
      g.burst(CELL.star4, x, 1, -z, 0.4 * k, 1.1 * k, 0.08, C.clank, 2.2);
      this.spark(x, 1, z, -dx, -dz, 4, 7, C.clank, 0.22, 0.35, 1.4);
    }
    return true;
  }

  /** Per frame: Đầu Đàn's beacon and floor stripe; the stomp dust under the nearest Trâu. */
  draw(w: World, _dt: number, time: number, lead: number): void {
    const F = w.foes;
    const g = this.p.glows;
    for (let s = 0; s < F.top; s += 1) {
      if (F.alive[s] === 0) continue;
      const kind = F.kind[s]!;
      if (kind !== KIND.leader && kind !== KIND.brute) continue;
      const x = F.x[s]! + F.vx[s]! * lead;
      const z = F.z[s]! + F.vz[s]! * lead;
      const phase = (time * 1.1 + F.phase[s]!) % 1;
      if (kind === KIND.leader) {
        const sway = Math.sin((time * 1.1 + F.phase[s]!) * 6.283 + Math.PI) * 0.35;
        this.p.strips.add(x, 2.6, -z, x + sway, 6.4, -z, 0.35, C.beacon, 2.6, 0.9);
        g.stamp(CELL.star4, x + sway, 6.5, -z, 1.2 + 0.3 * Math.sin(time * 6), time, C.beacon, 2.4);
        g.stamp(CELL.soft + FLAT, x, 0.06, -z - 2, 1.4, 0, C.beacon, 0.7);
        this.p.strips.add(x, 0.05, -z, x, 0.05, -(z - 6), 0.5, C.beacon, 0.6, 0.2);
      }
      // A stomp: the step comes round (1.1 Hz) under one within 14 m.
      if (z < 14 && phase < this.step[s]!) g.burst(CELL.ring + FLAT, x, 0.07, -z, FOES[kind]!.radius, FOES[kind]!.radius * 3.2, 0.45, C.smoke, 0.9);
      this.step[s] = phase;
    }
  }
}
