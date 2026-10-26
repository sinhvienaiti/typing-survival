/**
 * The line guns, seen (docs/FEEL_PASS_S1.md §4.1–4.2): Ray and Tia leave the
 * ship's centre muzzle and run on to the sim's line 3 m out, so where they
 * strike stays the sim's. Ray shows its frost bolt hovering over the muzzle
 * while a magazine waits armed, pulls it in (× 3 bright, 1 → 0.3) as it
 * charges, then fires a 3.4 m muzzle streak, a star 12 % of the view and a
 * line held 0.35 s with ion rings and a band of light on the deck. Tia is a
 * white-hot core in a hot glow and a faint haze, growing out in 3 frames and
 * thinning away in 6, with two held lights (the muzzle, 60 % along). Their
 * loops (gun.ray.armed, gun.tia.loop) follow. Reads the world, never writes it.
 */
import * as THREE from "three";
import { GUN, RAY, TIA } from "../content/guns";
import { FIELD } from "../content/rules";
import { EV, type Ring } from "../sim/events";
import { beamEnd } from "../sim/guns/aim";
import { bayOf, firing } from "../sim/weapons";
import type { World } from "../sim/world";
import { BOLT } from "./bolts";
import { CELL, Column, type Streaks } from "./fx";
import { LIGHT } from "./gun-rules";
import type { ShotParts } from "./shots";
import { MUZZLE } from "./ship";
import { BLOW as C } from "./theme";

const RAILS = 8;
/** Ray's line: held, then fading (s). */
const RAIL_HOLD = 0.35;
const RAIL_FADE = 0.15;
const F = 1 / 60;
const Y = 0.95;

export type BeamParts = ShotParts & { streaks: Streaks; size(share: number): number };

export class BeamFx {
  readonly column: Column;
  /** Ray's lines: real muzzle (x, y, z), the sim's point 3 m out (x, z), the far end (x, z), age. */
  private readonly rails = new Float32Array(RAILS * 8);
  private railCount = 0;
  private tiaOn = -1e9;
  private tiaOff = -1e9;
  private armed = false;
  private tiaLoop = false;
  private readonly m = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly w3 = new THREE.Vector3();
  private readonly end = new Float64Array(2);

  constructor(private readonly p: BeamParts, private readonly tia: THREE.Color) {
    this.column = new Column(tia, TIA.length, 3.6, FIELD.muzzleZ);
  }

  /** EV.rail, beamStart, beamEnd; `now` in ms. */
  event(R: Ring, i: number, now: number): void {
    const kind = R.kind[i]!;
    const dx = R.dx[i]!;
    const dz = R.dz[i]!;
    const g = this.p.glows;
    if (kind === EV.rail) {
      const m = this.p.ship.muzzle(this.m, MUZZLE.centre);
      const k = (this.railCount++ % RAILS) * 8;
      const r = this.rails;
      r[k] = m.x; r[k + 1] = m.y; r[k + 2] = m.z;
      r[k + 3] = dx * 3; r[k + 4] = -(FIELD.muzzleZ + dz * 3);
      r[k + 5] = R.x[i]!; r[k + 6] = -R.z[i]!; r[k + 7] = 0;
      // A muzzle streak 3.4 m (5 frames), a star 12 % of the view (4 frames), ion rings along the line.
      this.p.streaks.add(m.x, m.y, m.z, m.x + dx * 3.4, m.y, m.z - dz * 3.4, 0.5, C.rayCore, 3.4, 1, 5 * F);
      const star = this.p.size(0.12) * 2.8;
      g.burst(CELL.star8, m.x, m.y, m.z, star * 0.6, star, 4 * F, C.ray, 2.8);
      g.burst(CELL.core, m.x, m.y, m.z, star * 0.2, star * 0.35, 4 * F, C.rayCore, 2.6);
      g.burst(CELL.soft, m.x, m.y, m.z, star * 0.8, star, 4 * F, C.rayCore, 3);
      const ex = R.x[i]!;
      const ez = -R.z[i]!;
      const length = Math.hypot(ex - r[k + 3]!, ez - r[k + 4]!);
      for (let d = 2.5; d < length; d += 3.2) {
        const t = d / length;
        g.burst(CELL.ring, r[k + 3]! + (ex - r[k + 3]!) * t, Y, r[k + 4]! + (ez - r[k + 4]!) * t, 0.3, 1.4, 0.3, C.ray, 1.6);
      }
      this.p.lights.flash(LIGHT.ray, m.x, m.y, m.z, C.ray);
      this.p.ship.fired(0.5);
      this.p.trauma.kick(-dx, dz, 4);
      this.p.trauma.add(0.08);
    } else if (kind === EV.beamStart) {
      this.tiaOn = now / 1000;
      const m = this.p.ship.muzzle(this.m, MUZZLE.centre);
      const soft = this.p.size(0.07) * 2.2;
      g.burst(CELL.soft, m.x, m.y, m.z, soft * 0.7, soft, 3 * F, C.hot, 2.6);
      g.burst(CELL.core, m.x, m.y, m.z, soft * 0.25, soft * 0.4, 3 * F, C.white, 2.4);
    } else if (kind === EV.beamEnd) this.tiaOff = now / 1000;
  }

  draw(w: World, dt: number, time: number): void {
    this.ray(w, dt, time);
    this.beam(w, time, dt);
  }

  /** Ray: its lines (real muzzle → the sim's line 3 m out → the far end), the frost bolt armed over the muzzle, the charge. */
  private ray(w: World, dt: number, time: number): void {
    const S = this.p.strips;
    const g = this.p.glows;
    const r = this.rails;
    for (let q = 0; q < Math.min(RAILS, this.railCount); q += 1) {
      const k = q * 8;
      const age = (r[k + 7] = r[k + 7]! + dt);
      if (age >= RAIL_HOLD + RAIL_FADE) continue;
      const f = age < RAIL_HOLD ? 1 : 1 - (age - RAIL_HOLD) / RAIL_FADE;
      for (let seg = 0; seg < 2; seg += 1) {
        const ax = seg === 0 ? r[k]! : r[k + 3]!;
        const ay = seg === 0 ? r[k + 1]! : Y;
        const az = seg === 0 ? r[k + 2]! : r[k + 4]!;
        const bx = seg === 0 ? r[k + 3]! : r[k + 5]!;
        const bz = seg === 0 ? r[k + 4]! : r[k + 6]!;
        S.add(ax, ay, az, bx, Y, bz, 0.5 * f, C.ray, 1.8 * f, 0);
        S.add(ax, ay, az, bx, Y, bz, 0.12 + 0.06 * f, C.rayCore, 2.4 * f, f);
        // A flat band of light along the line on the deck for 0.3 s.
        if (age < 0.3) S.add(ax, 0.05, az, bx, 0.05, bz, 1.2, C.ray, 0.7 * (1 - age / 0.3), 0.15);
      }
    }
    const G = w.guns;
    let armed = false;
    const m = this.p.ship.muzzle(this.m, MUZZLE.centre);
    for (let bay = 0; bay < G.gun.length; bay += 1) {
      if (G.gun[bay] !== GUN.ray || G.mags[bay]! <= 0) continue;
      const charging = G.charge[bay]! > 0;
      // 0 while armed, 0 → 1 through the charge: the bolt flares (× 3), shrinks (1 → 0.3) and drops into the muzzle.
      const p = charging ? 1 - G.charge[bay]! / RAY.charge : 0;
      armed ||= !charging;
      // Armed, it turns slowly (2 rad/s) so its length shows from the camera behind the ship; charging, it swings onto the aim.
      const spin = time * 2;
      const ax = charging ? G.aimX[bay]! : Math.sin(spin);
      const az = charging ? G.aimZ[bay]! : Math.cos(spin);
      // §4.2 says 0.25 m over the muzzle at 0.9 m long; from the camera behind the ship that sat inside the muzzle's glow (b4 frames): 0.4 m and × 1.25.
      const lift = 0.4 * (1 - p);
      const size = 1.25 * (1 - 0.7 * p);
      // The nose sits ahead of the muzzle; the bolt hangs back along the aim.
      this.p.bolts.add(BOLT.ray, m.x + ax * 0.45 * size, m.y + lift, m.z - az * 0.45 * size, ax, 0, -az, 0, size);
      this.p.bolts.setGlow(BOLT.ray, charging ? 1 + 2 * p : 1 + 0.35 * Math.sin(time * 12.566));
      g.stamp(CELL.soft, m.x, m.y + lift, m.z, 0.7 + 0.5 * p, 0, C.ray, charging ? 1 + p : 0.45);
      if (!charging) continue;
      // The charge: a white-blue core shrinking into the muzzle (smaller than before, so the bolt dropping in shows).
      const c = 1 - p;
      g.stamp(CELL.core, m.x, m.y, m.z, 0.3 + 0.9 * c, 0, C.rayCore, 2);
      g.stamp(CELL.soft, m.x, m.y, m.z, 1.4 * c + 0.5, 0, C.ray, 1.2);
      S.add(m.x, m.y, m.z, m.x + ax * 26, m.y, m.z - az * 26, 0.05, C.ray, 0.9 * (1 - c), 0.3);
    }
    if (armed !== this.armed) {
      this.armed = armed;
      this.p.audio.loop("gun.ray.armed", armed, 0);
    }
  }

  /** Tia: a white-hot core, its hot glow and a faint haze, real muzzle → the sim's ray 3 m out → its far end; it grows out in 3 frames and thins away in 6. */
  private beam(w: World, time: number, dt: number): void {
    const G = w.guns;
    const bay = bayOf(w, GUN.tia);
    const on = bay >= 0 && G.beamOn[bay] === 1;
    const power = on ? 1 + (G.perfect[firing(bay)] === 1 ? 0.35 : 0) : 0;
    beamEnd(bay >= 0 ? G.beamX[bay]! : 0, this.end);
    const ex = this.end[0]!;
    const ez = this.end[1]!;
    const len = Math.hypot(ex, ez - FIELD.muzzleZ) || 1;
    const ux = ex / len;
    const uz = (ez - FIELD.muzzleZ) / len;
    this.column.update(on, ux, uz, power, time);
    if (on !== this.tiaLoop) {
      this.tiaLoop = on;
      this.p.audio.loop("gun.tia.loop", on, ex / FIELD.halfW);
    }
    const thin = on ? 1 : Math.max(0, 1 - (time - this.tiaOff) / (6 * F));
    if (thin <= 0 || bay < 0) return;
    // It grows from the muzzle over 3 frames (a third on the frame it starts).
    const grow = Math.min(1, Math.max(0, (time - this.tiaOn + F) / (3 * F)));
    const k = Math.max(power, 1) * thin;
    const m = this.p.ship.muzzle(this.m, MUZZLE.centre);
    const S = this.p.strips;
    const fx = m.x + (ex - m.x) * grow;
    const fz = m.z + (-ez - m.z) * grow;
    // Real muzzle → the sim's ray 3 m out → its far end (straight while it grows).
    const joint = grow >= 1;
    const jx = joint ? ux * 3 : fx;
    const jy = joint ? 0.82 : 0.55;
    const jz = joint ? -(FIELD.muzzleZ + uz * 3) : fz;
    for (let seg = 0; seg < (joint ? 2 : 1); seg += 1) {
      const x0 = seg === 0 ? m.x : jx;
      const y0 = seg === 0 ? m.y : jy;
      const z0 = seg === 0 ? m.z : jz;
      const x1 = seg === 0 ? jx : fx;
      const y1 = seg === 0 ? jy : 0.55;
      const z1 = seg === 0 ? jz : fz;
      // A faint haze 2.4 m, the hot glow 1.1 m, the white-hot core 0.22 m; the light it throws on the deck.
      S.add(x0, y0, z0, x1, y1, z1, 2.4 * thin, this.tia, 0.18 * k, 0);
      S.add(x0, y0, z0, x1, y1, z1, 1.1 * thin, this.tia, 1.3 * k, 0);
      S.add(x0, y0, z0, x1, y1, z1, 0.22 * thin, C.hot, 1.4 * k, 0.6);
      S.add(x0, 0.4, z0, x1, 0.4, z1, 1.1 * thin, this.tia, 0.5 * k, 0.4 * k);
    }
    const g = this.p.glows;
    g.stamp(CELL.star8, m.x, m.y, m.z, 2.6 * k, time * 3, this.tia, 2.4 * k);
    g.stamp(CELL.soft, fx, 0.6, fz, 2.4 * k, 0, this.tia, 1.8 * k);
    if (on) {
      this.p.lights.hold(1, LIGHT.tia, m.x, m.y, m.z, this.tia);
      this.p.lights.hold(2, LIGHT.tiaSlide, m.x + (ex - m.x) * 0.6, 0.9, m.z + (-ez - m.z) * 0.6, this.tia);
      if (Math.random() < dt * 40) {
        const t = Math.random();
        this.v.set((Math.random() - 0.5) * 2, 2 + Math.random() * 4, (Math.random() - 0.5) * 2);
        this.p.sparks.spawn(this.w3.set(m.x + (ex - m.x) * t + (Math.random() - 0.5) * 1.2, 0.3, m.z + (-ez - m.z) * t), this.v, this.tia, 0.25, 0.5, { drag: 2, gravity: 4 });
      }
    }
  }
}
