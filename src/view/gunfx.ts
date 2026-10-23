/**
 * The S1 guns and foes as light and motion (docs/BUILD_S1.md §12), fed by
 * Combat from the sim's events and drawn each frame from its state, through
 * Combat's pools (glows, strips, sparks, debris; nothing allocated per event):
 *   Tán: a three-tongue muzzle blast, a harder recoil, a 3 px camera shove
 *   against the shot; amber pellet streaks; small 4-ray stars on hits.
 *   Ray: a white-blue core shrinking at the muzzle through its charge and a
 *   faint line to the target; then a long thin line held 0.25 s, fading,
 *   ion rings along it, sparks along the shot at each foe pierced.
 *   Pháo Sao: a mortar thump (grey smoke, a flash upward); the shell's arc
 *   (a parabola timed to the sim's landing) with a fading trail and a thin red
 *   ring on the floor where it will land; the burst: an 8-ray star, a ring
 *   running out on the floor, debris; bursts close together chain.
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
import { FOES, KIND } from "../content/foes";
import { GUN, PHAO, RAY } from "../content/guns";
import { FIELD } from "../content/rules";
import { EV, FLAG, OBJECTIVE, TELEGRAPH } from "../sim/events";
import type { Ring } from "../sim/events";
import { ROUND } from "../sim/stores";
import type { World } from "../sim/world";
import { CELL, FLAT, type Glows, type Strips } from "./fx";
import type { RiftCracks, ShieldWalls } from "./hazard-fx";
import type { ThemeAudio } from "../audio/theme-audio";
import { tier } from "../kit/feedback";
import type { Ship } from "./ship";
import { BLOW as C } from "./theme";

const RAILS = 8;
const RAIL_LIFE = 0.25;
/** Height of a shell's arc at the middle of its flight (m). */
const ARC = 6;

/** A point of a shell's arc from the muzzle `m` to (tx, 0.3, tz) at u (0 … 1): a parabola ARC m high at the middle. */
function arcPoint(m: THREE.Vector3, tx: number, tz: number, u: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(m.x + (tx - m.x) * u, m.y + (0.3 - m.y) * u + ARC * 4 * u * (1 - u), m.z + (tz - m.z) * u);
}

export type GunFxParts = {
  glows: Glows; strips: Strips; sparks: ParticlePool; debris: Debris; trauma: Trauma; ship: Ship; walls: ShieldWalls; cracks: RiftCracks; audio: ThemeAudio;
  /** Ask the world for a hit stop of `ms`. */
  ask(ms: number): void;
};

export class GunFx {
  /** Recent Ray lines: from, to (three), age. */
  private readonly rails = new Float32Array(RAILS * 5);
  private railCount = 0;
  private readonly at = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly muzzle = new THREE.Vector3();
  /** Brutes' last step phase (by slot) for the stomp dust. */
  private readonly step = new Float32Array(1024);

  constructor(private readonly p: GunFxParts) {}

  private spark(x: number, y: number, z: number, dx: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number, spread = 2.4): void {
    for (let k = 0; k < count; k += 1) {
      const side = (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.9);
      this.v.set((dx + dz * side) * s, 1.2 + Math.random() * 3.5, -(dz - dx * side) * s);
      this.p.sparks.spawn(this.at.set(x, y, -z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** Leaders down so far (the objective's events count them). */
  private huntDone = 0;

  /** An S1 event (Combat hands every kind from EV.volley on): its look, its sound, its stop; `time` in s, `now` in ms. */
  event(R: Ring, i: number, w: World, time: number, now: number, pan: number): void {
    this.look(R, i, w, time);
    this.sound(R, i, now, pan, time);
  }

  private sound(R: Ring, i: number, now: number, pan: number, time: number): void {
    const a = this.p.audio;
    const at = R.x[i]! / FIELD.halfW;
    switch (R.kind[i]) {
      case EV.volley:
        return a.gun("gun.tan.fire", pan, now);
      case EV.charge:
        return a.gun("gun.ray.charge", pan, now);
      case EV.rail:
        return a.gun("gun.ray.fire", pan, now);
      case EV.launch:
        return a.gun("gun.phao.launch", pan, now);
      case EV.burst:
        return a.gun("gun.phao.burst", at, now);
      case EV.shieldHit:
        return a.gun("shield.hit", at, now);
      case EV.shieldBreak:
        a.gun("shield.break", at, now);
        return this.p.ask(tier(3).stopMs);
      case EV.split:
        return a.gun("foe.split", at, now);
      case EV.leader:
        return a.gun("leader.horn", at, now);
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
        this.p.cracks.open(R.x[i]! > 0 ? 1 : -1, R.z[i]!, time);
        return a.gun("rift.open", at, now);
    }
  }

  private look(R: Ring, i: number, w: World, time: number): void {
    const x = R.x[i]!;
    const z = R.z[i]!;
    const dx = R.dx[i]!;
    const dz = R.dz[i]!;
    const g = this.p.glows;
    switch (R.kind[i]) {
      case EV.volley: {
        this.p.ship.muzzle(this.muzzle);
        const m = this.muzzle;
        // Three tongues of flame along the fan, 50 ms.
        for (const side of [-0.3, 0, 0.3]) {
          const ex = dx + dz * side;
          const ez = dz - dx * side;
          this.p.strips.add(m.x, m.y, m.z, m.x + ex * 1.6, m.y, m.z - ez * 1.6, 0.5, C.tan, 3.2, 1);
          g.burst(CELL.star4, m.x + ex * 0.9, m.y, m.z - ez * 0.9, 0.5, 1.4, 0.05, C.tan, 2.6);
        }
        g.burst(CELL.soft, m.x, m.y, m.z, 1.6, 2.6, 0.1, C.hot, 1.8);
        this.p.ship.fired(0.7);
        this.p.trauma.kick(-dx, dz, 3);
        break;
      }
      case EV.charge: {
        // A faint line to the target while it charges (the core is drawn from the bay's charge each frame).
        this.p.ship.muzzle(this.muzzle);
        g.burst(CELL.flare, this.muzzle.x, this.muzzle.y, this.muzzle.z, 1.2, 0.4, RAY.charge, C.ray, 1.6, 0, 0, 0, 0, Math.atan2(dz, dx));
        break;
      }
      case EV.rail: {
        this.p.ship.muzzle(this.muzzle);
        const m = this.muzzle;
        const k = (this.railCount % RAILS) * 5;
        this.rails[k] = m.x;
        this.rails[k + 1] = m.z;
        this.rails[k + 2] = x;
        this.rails[k + 3] = -z;
        this.rails[k + 4] = 0;
        this.railCount += 1;
        // The long muzzle flash (80 ms) and ion rings along the line.
        g.burst(CELL.flare, m.x, m.y, m.z, 2.2, 3.4, 0.08, C.rayCore, 3, 0, 0, 0, 0, Math.atan2(dz, dx));
        g.burst(CELL.star8, m.x, m.y, m.z, 1.2, 3.2, 0.12, C.ray, 2.6);
        const length = Math.hypot(x - m.x, -z - m.z);
        for (let d = 2.5; d < length; d += 3.2) {
          const t = d / length;
          g.burst(CELL.ring, m.x + (x - m.x) * t, 0.95, m.z + (-z - m.z) * t, 0.3, 1.4, 0.3, C.ray, 1.6);
        }
        this.p.ship.fired(0.5);
        this.p.trauma.kick(-dx, dz, 2);
        break;
      }
      case EV.launch: {
        this.p.ship.muzzle(this.muzzle);
        const m = this.muzzle;
        // Mortar thump: grey smoke rising, a flash upward.
        g.burst(CELL.soft, m.x, m.y + 0.3, m.z, 1, 3, 0.7, C.smoke, 0.9, 0, 1.6, 0);
        g.burst(CELL.flare, m.x, m.y + 0.6, m.z, 1.5, 2.5, 0.1, C.phao, 2.2, 0, 0, 0, 0, Math.PI / 2);
        g.burst(CELL.star4, m.x, m.y, m.z, 0.6, 1.6, 0.08, C.hot, 2.4);
        this.p.ship.fired(0.45);
        break;
      }
      case EV.burst: {
        const radius = R.value[i]!;
        g.burst(CELL.core, x, 1, -z, 1.2, 3.2, 0.14, C.hot, 2.6);
        g.burst(CELL.star8, x, 1.2, -z, 1.2, 3, 0.16, C.phao, 2.4);
        g.burst(CELL.ring + FLAT, x, 0.08, -z, 0.4, radius * 2.2, 0.38, C.phao, 2.2);
        g.burst(CELL.soft + FLAT, x, 0.07, -z, radius * 1.4, radius * 1.8, 1.2, C.ember, 0.45);
        this.spark(x, 0.8, z, 0, 1, 14, 9, C.hot, 0.28, 0.5, 6);
        this.p.debris.burst(x, 0.8, -z, 0, 0, 10, 6, C.shardHot, C.shardSteel);
        this.p.trauma.add(0.05);
        break;
      }
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
      case EV.rift: {
        // Torn open: sparks and smoke pour from the wall.
        const side = x > 0 ? -1 : 1;
        this.spark(x, 1, z, side, 0, 22, 8, C.rift, 0.3, 0.7, 2);
        g.burst(CELL.soft, x, 1, -z, 2, 5, 1.2, C.smoke, 0.8, side * 1.5, 0.6, 0);
        g.burst(CELL.flare, x, 1, -z, 3, 6, 0.3, C.rift, 2.2, 0, 0, 0, 0, Math.PI / 2);
        this.p.trauma.add(0.06);
        break;
      }
    }
  }

  /**
   * An S1 hit's look (Tán, Ray, Pháo Sao, or a blow on Vỏ); false leaves it to
   * Combat's S0 look. `k`: far blows draw larger.
   */
  hit(x: number, z: number, dx: number, dz: number, flags: number, k: number): boolean {
    const g = this.p.glows;
    const armour = (flags & FLAG.armour) !== 0;
    if (armour) {
      if ((flags & FLAG.pierce) !== 0) {
        // A clean magazine's blow: a short white-blue streak into the body.
        this.p.strips.add(x - dx * 1.2, 1, -(z - dz * 1.2), x + dx * 0.3, 1, -(z + dz * 0.3), 0.3, C.pierce, 3, 1);
        g.burst(CELL.star4, x, 1, -z, 0.5 * k, 1.4 * k, 0.1, C.pierce, 2.4);
      } else {
        // Vỏ stopped most of it: orange sparks bounce back.
        g.burst(CELL.star4, x, 1, -z, 0.4 * k, 1.1 * k, 0.08, C.clank, 2.2);
        this.spark(x, 1, z, -dx, -dz, 4, 7, C.clank, 0.22, 0.35, 1.4);
      }
    }
    if ((flags & FLAG.tan) !== 0) {
      if (!armour) g.burst(CELL.star4, x, 0.9, -z, 0.3 * k, 0.9 * k, 0.08, C.tan, 2);
      return true;
    }
    if ((flags & FLAG.ray) !== 0) {
      g.burst(CELL.star8, x, 1, -z, 0.6 * k, 2 * k, 0.12, C.ray, 2.6);
      this.spark(x, 1, z, dx, dz, 6, 10, C.rayCore, 0.24, 0.35, 0.8);
      return true;
    }
    if ((flags & FLAG.phao) !== 0) return true;
    return armour;
  }

  /** Per frame: pellets, shells and their landing rings, Ray's lines and charge, beacons, stomps. */
  draw(w: World, dt: number, time: number, lead: number): void {
    const g = this.p.glows;
    const S = this.p.strips;
    const B = w.bullets;
    for (let b = 0; b < B.top; b += 1) {
      if (B.alive[b] === 0 || B.kind[b] !== ROUND.pellet) continue;
      const x = B.x[b]! + B.vx[b]! * lead;
      const z = B.z[b]! + B.vz[b]! * lead;
      S.add(x - B.vx[b]! * 0.035, 0.9, -(z - B.vz[b]! * 0.035), x, 0.9, -z, 0.22, C.tan, 2.6, 0.9);
    }
    this.p.ship.muzzle(this.muzzle);
    const m = this.muzzle;
    const L = w.shells;
    for (let k = 0; k < L.top; k += 1) {
      if (L.alive[k] === 0) continue;
      const t = Math.min(1, (L.flight[k]! - L.left[k]! + lead) / L.flight[k]!);
      const tx = L.x[k]!;
      const tz = -L.z[k]!;
      arcPoint(m, tx, tz, t, this.at);
      arcPoint(m, tx, tz, Math.max(0, t - 0.08), this.v);
      S.add(this.v.x, this.v.y, this.v.z, this.at.x, this.at.y, this.at.z, 0.45, C.phao, 2.2, 0.8);
      g.stamp(CELL.core, this.at.x, this.at.y, this.at.z, 0.6, 0, C.hot, 2.4);
      g.stamp(CELL.soft, this.at.x, this.at.y, this.at.z, 1.4, 0, C.phao, 1.6);
      // Where it will land: a thin red ring on the floor, tightening.
      g.stamp(CELL.ring + FLAT, tx, 0.06, tz, PHAO.radius * (1.2 - 0.4 * t) * 2, time * 2, C.danger, 1.2);
    }
    // Ray's lines: thin, white-blue, fading over RAIL_LIFE.
    for (let r = 0; r < Math.min(RAILS, this.railCount); r += 1) {
      const k = r * 5;
      const age = this.rails[k + 4]! + dt;
      this.rails[k + 4] = age;
      if (age >= RAIL_LIFE) continue;
      const f = 1 - age / RAIL_LIFE;
      S.add(this.rails[k]!, 0.95, this.rails[k + 1]!, this.rails[k + 2]!, 0.95, this.rails[k + 3]!, 0.18 + 0.25 * f, C.ray, 3.2 * f, f);
      S.add(this.rails[k]!, 0.4, this.rails[k + 1]!, this.rails[k + 2]!, 0.4, this.rails[k + 3]!, 1.2 * f, C.ray, 0.6 * f, 0.2 * f);
    }
    const G = w.guns;
    for (let bay = 0; bay < G.gun.length; bay += 1) {
      if (G.gun[bay] !== GUN.ray || G.charge[bay]! <= 0) continue;
      // The charge: a white-blue core shrinking at the muzzle, a faint line to where it aims.
      const c = G.charge[bay]! / RAY.charge;
      g.stamp(CELL.core, m.x, m.y, m.z, 0.4 + 1.4 * c, 0, C.rayCore, 2.6);
      g.stamp(CELL.soft, m.x, m.y, m.z, 2.2 * c + 0.6, 0, C.ray, 1.6);
      S.add(m.x, m.y, m.z, m.x + G.aimX[bay]! * 26, m.y, m.z - G.aimZ[bay]! * 26, 0.05, C.ray, 0.9 * (1 - c), 0.3);
    }
    this.beacons(w, time, lead);
    this.rift(w, time);
  }

  /** A rift's glow standing over its crack: rising through the warning, flaring while it pours. */
  private rift(w: World, time: number): void {
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

  /** Đầu Đàn's beacon and floor stripe; the stomp dust under the nearest Trâu. */
  private beacons(w: World, time: number, lead: number): void {
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
