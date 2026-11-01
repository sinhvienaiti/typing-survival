/**
 * Kills, seen (moved whole from combat.ts and shots.ts by ALIVE_PLAN AL-00,
 * behaviour unchanged; AL-08 owns their colours in wave 2, AL-09 the rest in
 * wave 3). Kills in one 3 m cell in one frame merge into one burst of size √N
 * that breaks into chunks (chunks.ts, by the gun of the killing blow); a
 * Trâu's or Đầu Đàn's death is its own event (bigKill: a warm flash, a
 * fireball, a dark cloud laid over the deck, a scorch, embers). It keeps the
 * clock of recent kills the HUD counts. Nothing is allocated per event.
 */
import * as THREE from "three";
import type { ThemeAudio } from "../audio/theme-audio";
import type { HitStop, Trauma } from "../kit/feedback";
import { tier } from "../kit/feedback";
import type { ParticlePool } from "../kit/three";
import { KIND } from "../content/foes";
import { FIELD } from "../content/rules";
import { FLAG, type Ring } from "../sim/events";
import type { World } from "../sim/world";
import type { Chunks } from "./chunks";
import { CELL, FLAT, type Glows } from "./fx";
import { EDGE, LIGHT, THROW } from "./gun-rules";
import type { GunLights } from "./lights";
import { BLOW as C } from "./theme";

const MAX_CLUSTERS = 48;
const KILL_RING = 2048;
const PUNCH_MS = 220;
const F = 1 / 60;
/** Far blows draw larger (up to 1.3× at the gate), so the fight at the edge of range still reads. */
export const far = (z: number): number => 1 + 0.3 * Math.min(1, Math.max(0, z / FIELD.gateZ));
/** The gun of a killing blow (its chunks' throw): Xung and the rest, Tia, Tán, Ray, Pháo Sao. */
const THROWS = [THROW.base, THROW.tia, THROW.tan, THROW.ray, THROW.phao] as const;
const gunOf = (flags: number): number => ((flags & FLAG.phao) !== 0 ? 4 : (flags & FLAG.ray) !== 0 ? 3 : (flags & FLAG.tan) !== 0 ? 2 : (flags & FLAG.tia) !== 0 ? 1 : 0);

/** A big kill's cloud by layer (a sooty base, a dark body, lit tops): puffs, height (m), spread, width from / to (× the view's 16 %), alpha. */
const CLOUD = { n: [5, 16, 23], y: [0.4, 1, 1.8], spread: [1.1, 1.4, 1.1], from: [1.2, 1.4, 0.8], to: [2.8, 4.2, 2.4], alpha: [1.5, 1.6, 0.8] } as const;
const CLOUD_COLOR = [C.soot, C.smokeBody, C.smokeLit] as const;

export type KillParts = {
  glows: Glows; smoke: Glows; sparks: ParticlePool; chunks: Chunks; lights: GunLights; trauma: Trauma; hitstop: HitStop; audio: ThemeAudio;
  /** Metres that look `share` of the view's height at sim (x, z) (ShotFx.size). */
  size(share: number, x: number, z: number): number;
  /** Ask the world for a hit stop of `ms`. */
  ask(ms: number): void;
};

export class Kills {
  private readonly ring = new Float64Array(KILL_RING).fill(-1e9);
  private count = 0;
  private readonly cluster = { n: new Int32Array(MAX_CLUSTERS), key: new Int32Array(MAX_CLUSTERS), x: new Float32Array(MAX_CLUSTERS), z: new Float32Array(MAX_CLUSTERS), dx: new Float32Array(MAX_CLUSTERS), dz: new Float32Array(MAX_CLUSTERS), scout: new Uint8Array(MAX_CLUSTERS), armour: new Uint8Array(MAX_CLUSTERS), big: new Uint8Array(MAX_CLUSTERS), kind: new Int8Array(MAX_CLUSTERS), gun: new Uint8Array(MAX_CLUSTERS) };
  private clusters = 0;
  private punchAt = -1e9;
  /** The Tia bay's sweep (sign of beamTo − beamX) this frame: its kills fly across it (Combat sets it). */
  sweep = 1;
  private readonly at = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly w3 = new THREE.Vector3();

  constructor(private readonly p: KillParts) {}

  /** Kills within `ms` before `now` (the HUD's "kills in 3 s"). */
  within(now: number, ms: number): number {
    let count = 0;
    for (let i = 0; i < KILL_RING; i += 1) if (now - this.ring[i]! <= ms) count += 1;
    return count;
  }

  /** A new frame of events: no clusters yet. */
  begin(): void {
    this.clusters = 0;
  }

  /** EV.kill at ring slot `i`: gathered into its cell (the burst comes in end()). */
  event(R: Ring, i: number, w: World, now: number): void {
    const flags = R.flags[i]!;
    // The kind as the store still holds it (unless its slot was taken again since).
    const s = R.slot[i]!;
    const kind = w.foes.alive[s] === 0 || w.foes.id[s] === R.ref[i] ? w.foes.kind[s]! : -1;
    this.gather(R.x[i]!, R.z[i]!, R.dx[i]!, R.dz[i]!, (flags & FLAG.scout) !== 0, (flags & FLAG.elite) !== 0, (flags & FLAG.big) !== 0, kind, gunOf(flags));
    this.ring[this.count++ % KILL_RING] = now;
  }

  /** The frame's bursts, one a cluster; returns how many foes died (Combat's kill stop). */
  end(now: number): number {
    let killed = 0;
    for (let c = 0; c < this.clusters; c += 1) killed += this.explode(c, now);
    return killed;
  }

  private spark(x: number, y: number, z: number, dx: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number): void {
    for (let k = 0; k < count; k += 1) {
      const spread = (Math.random() - 0.5) * 2.4;
      const s = speed * (0.4 + Math.random() * 0.9);
      this.v.set((dx + dz * spread) * s, 1.5 + Math.random() * 4, -(dz - dx * spread) * s);
      this.p.sparks.spawn(this.at.set(x, y, -z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** Sparks thrown from three-space (x, y, z) along (dx, dy, dz) (shots.ts's spray, for bigKill). */
  private spray(x: number, y: number, z: number, dx: number, dy: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number, spread = 1.2): void {
    for (let k = 0; k < count; k += 1) {
      const s = speed * (0.5 + Math.random() * 0.8);
      this.v.set((dx + (Math.random() - 0.5) * spread) * s, (dy + Math.random() * 0.6) * s, (dz + (Math.random() - 0.5) * spread) * s);
      this.p.sparks.spawn(this.w3.set(x, y, z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** Kills in one 3 m cell this frame merge (the first kill's kind and gun set its chunks). */
  private gather(x: number, z: number, dx: number, dz: number, scout: boolean, armour: boolean, big: boolean, kind: number, gun: number): void {
    const K = this.cluster;
    const key = Math.floor(x / 3) * 100 + Math.floor(z / 3);
    let c = 0;
    while (c < this.clusters && K.key[c] !== key) c += 1;
    if (c === this.clusters) {
      if (c >= MAX_CLUSTERS) c = MAX_CLUSTERS - 1;
      else {
        this.clusters += 1;
        K.key[c] = key;
        K.n[c] = 0;
        K.x[c] = K.z[c] = K.dx[c] = K.dz[c] = 0;
        K.scout[c] = 0;
        K.armour[c] = 0;
        K.big[c] = 0;
        K.kind[c] = kind;
        K.gun[c] = gun;
      }
    }
    K.n[c] = K.n[c]! + 1;
    K.x[c] = K.x[c]! + x;
    K.z[c] = K.z[c]! + z;
    K.dx[c] = K.dx[c]! + dx;
    K.dz[c] = K.dz[c]! + dz;
    if (scout) K.scout[c] = 1;
    if (armour) K.armour[c] = 1;
    if (big) K.big[c] = 1;
  }

  /** One burst of size √N for a cluster of N kills; returns N. */
  private explode(c: number, now: number): number {
    const K = this.cluster;
    const p = this.p;
    const n = K.n[c]!;
    const x = K.x[c]! / n;
    const z = K.z[c]! / n;
    const length = Math.hypot(K.dx[c]!, K.dz[c]!) || 1;
    const dx = K.dx[c]! / length;
    const dz = K.dz[c]! / length;
    const scout = K.scout[c] === 1;
    const big = K.big[c] === 1;
    // A Trâu or Đầu Đàn breaks like a heap of kills: T3, heavy debris.
    const size = Math.sqrt(n) * (scout ? 1.5 : big ? 2.4 : 1) * far(z);
    // A big foe's death is its own event (§12); a heap's or a scout's reads from far off.
    if (big) p.ask(this.bigKill(x, z, K.kind[c] === KIND.leader));
    else this.kill(x, z, size, scout, n >= 5, scout ? C.elite : K.armour[c] === 1 ? C.armour : C.swarm);
    this.spark(x, 1, z, dx, dz, Math.min(40, 10 + n * 4), 10 + size * 2.5, C.hot, 0.34, 0.55);
    this.spark(x, 1, z, dx, dz, Math.min(20, 5 + n * 2), 6, scout ? C.volt : C.swarm, 0.26, 0.85);
    // Chunks (§4.5) by the kind (else read from the flags) and the gun: Tia's fly across its sweep.
    const kind = K.kind[c]! >= 0 ? K.kind[c]! : scout ? 1 : big ? 2 : 0;
    const gun = K.gun[c]!;
    const th = big ? THROW.big : THROWS[gun]!;
    const across = gun === 1;
    p.chunks.burst(x, z, across ? -dz * this.sweep : dx, across ? dx * this.sweep : dz, kind, n, K.armour[c] === 1 ? EDGE.armour : -1, th.up, th.out, th.spread);
    p.audio.kill(n, x / FIELD.halfW, scout, now);
    p.trauma.add(Math.min(0.2, (scout ? 0.1 : 0.025) * Math.sqrt(n)));
    // A heap of kills or a scout punches the view along the blow (at most every PUNCH_MS: a sweep is not a buzz).
    if ((scout || n >= 4) && now - this.punchAt >= PUNCH_MS) {
      this.punchAt = now;
      p.trauma.kick(dx, -dz, Math.min(5, 2 + n * 0.4));
    }
    if (scout) p.ask(p.hitstop.request(2, now));
    return n;
  }

  /** A heap of N kills (or a scout) at sim (x, z), `size` √N-scaled: a white core and a star kept below a haze that would hide the chunks (bloom 0.85), a streak of light for a scout or 5+, a ring, scorch. */
  kill(x: number, z: number, size: number, scout: boolean, heap: boolean, tint: THREE.Color): void {
    const g = this.p.glows;
    g.burst(CELL.core, x, 1, -z, 0.5 * size, 1.1 * size, 0.08, C.hot, 1.3);
    g.burst(scout ? CELL.star12 : CELL.star8, x, 1.1, -z, 1.3 * size, 3.8 * size, 0.18, tint, 1.8, 0, 0, 0, (Math.random() - 0.5) * 3);
    g.burst(CELL.soft, x, 1, -z, 1.6 * size, 3 * size, 0.28, tint, 0.45);
    if (scout || heap) g.burst(CELL.flare, x, 1.2, -z, 3 * size, 8 * size, 0.18, scout ? C.elite : C.hot, 1.5);
    g.burst(CELL.ring + FLAT, x, 0.08, -z, 0.6, 4.2 * size, 0.42, scout ? C.volt : C.swarm, 1.8);
    g.burst(CELL.soft + FLAT, x, 0.07, -z, 2 * size, 2.6 * size, 1.2, C.ember, 0.35);
  }

  /** A Trâu or Đầu Đàn (`leader`: a quarter bigger, gold) killed at sim (x, z), its own event sized on the view (§12, §13): f0–f2 a warm flash, round and gold where Ray's line is thin and white-blue, the lane lit round it; a fireball rolling up and out; a dark cloud as wide as the flash with lit edges, laid over the deck and the beams 3.5–4.5 s, embers drifting out of it; a scorch 9 s whose cracks glow 7 s; a small ring. Returns its stop (T3). */
  bigKill(x: number, z: number, leader: boolean): number {
    const g = this.p.glows;
    const s = this.p.smoke;
    const k = leader ? 1.25 : 1;
    const v = this.p.size(0.16, x, z) * k;
    const gold = leader ? C.beacon : C.crit;
    const r = () => Math.random();
    // Billboard sizes are full widths: the core's white disc is 0.35 of it (here 17 % of the view across), the rays reach half.
    g.burst(CELL.core, x, 1.2, -z, v * 1.8, v * 2.3, 3 * F, C.hot, 3, 0, 0, 0, 0, NaN);
    g.burst(CELL.star12, x, 1.3, -z, v * 2, v * 3.6, 5 * F, gold, 2.6, 0, 0, 0, 0.6, NaN);
    g.burst(CELL.soft + FLAT, x, 0.07, -z, v * 3, v * 4, 4 * F, gold, 1.2, 0, 0, 0, 0, NaN);
    this.p.lights.flash(LIGHT.big, x, 1.6, -z, gold);
    // The fireball, sized on the view: lumpy puffs of flame, white-hot and gold (not Tia's orange), rolling up and out to both sides (Ray's line stays thin between them).
    for (let i = 0; i < 9; i += 1) {
      const side = (i % 2 === 0 ? -1 : 1) * (0.3 + r());
      g.burst(CELL.puff, x + side * 0.25 * v, 0.9 + r() * 0.6, -z, 0.35 * v, (0.9 + r() * 0.4) * v, 0.3 + r() * 0.15, i < 3 ? C.hot : gold, 1.2, side * 0.45 * v, (0.35 + r() * 0.35) * v, 0, (r() - 0.5) * 2, NaN);
    }
    // The cloud (Glows smoke mode, over the beams), as wide as the flash, rising slowly 3.5–4.5 s: a sooty base, a dark body, lit tops.
    for (let i = 0, l = 0; i < CLOUD.n[2]; i += 1) {
      if (i >= CLOUD.n[l]!) l += 1;
      const a = r() * 6.283;
      const d = (0.15 + r() * CLOUD.spread[l]!) * v;
      s.burst(CELL.puff, x + Math.cos(a) * d, CLOUD.y[l]! + r() * 0.8, -z + Math.sin(a) * d * 0.4, CLOUD.from[l]! * v, (CLOUD.to[l]! + r() * 0.5) * v, 3.5 + r(), CLOUD_COLOR[l]!, CLOUD.alpha[l]!, Math.cos(a) * 0.08 * v, (0.06 + r() * 0.08) * v, 0, (r() - 0.5) * 0.6);
    }
    // The scorch (9 s), its cracks glowing as they cool (7 s), the bed of embers under the chunks (3.5 s).
    const crack = r() * 6.283;
    s.burst(CELL.soft + FLAT, x, 0.062, -z, 1.5 * v, 1.6 * v, 9, C.scorch, 0.8);
    s.burst(CELL.star12 + FLAT, x, 0.064, -z, 1.7 * v, 1.8 * v, 9, C.scorch, 0.9, 0, 0, 0, 0, crack);
    g.burst(CELL.star12 + FLAT, x, 0.066, -z, 1.4 * v, 1.5 * v, 7, C.ember, 1.1, 0, 0, 0, 0, crack);
    g.burst(CELL.star8 + FLAT, x, 0.067, -z, 0.9 * v, 0.95 * v, 7, C.ember, 0.9, 0, 0, 0, 0, crack + 0.3);
    g.burst(CELL.soft + FLAT, x, 0.065, -z, 7 * k, 8 * k, 3.5, C.swarm, 0.55);
    g.burst(CELL.ring + FLAT, x, 0.08, -z, 2, 5 * k, 0.35, C.hot, 1.1);
    this.spray(x, 1, -z, 0, 1.6, 0, 36, 10, C.hot, 0.32, 0.8, 2.2);
    for (let i = 0; i < 14; i += 1) this.p.sparks.spawn(this.w3.set(x + (r() - 0.5) * 0.5 * v, 1 + r() * 2, -z), this.v.set((r() - 0.5) * 2, 0.5 + r(), (r() - 0.5)), C.ember, 0.28, 1.4 + r(), { drag: 1.2, gravity: -0.6 });
    return tier(3).stopMs;
  }
}
