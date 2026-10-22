/**
 * Reads the sim's event ring once a frame and turns it into the layers of a
 * blow (SURVIVAL_MODE_PLAN.md 5): tiers (src/feedback/tiers.ts) decide the
 * flash, knock-back, sparks, star, ring, debris, number, sound, shake and
 * hit stop; kills in one place in one frame merge into one burst of size
 * √N; the Tia column, Xung rounds and scout shots are drawn from the sim's
 * state each frame. Nothing is allocated per event.
 */
import * as THREE from "three";
import { AudioCues } from "../../feedback/audio-cues";
import { Debris } from "../../feedback/debris";
import { HitStop } from "../../feedback/hitstop";
import { NumberField, NumberSprites, STYLE, type Rect } from "../../feedback/numbers";
import { STOP_GAP_MS, tier } from "../../feedback/tiers";
import { Trauma } from "../../feedback/trauma";
import { ParticlePool } from "../../scene3d/particles";
import { textures } from "../../scene3d/textures";
import { FIELD, TIA, type Tier } from "../content/rules";
import { EV, FLAG } from "../sim/events";
import type { World } from "../sim/world";
import type { Crowd } from "./crowd";
import { CELL, Column, FLAT, Glows, Strips } from "./fx";
import type { Stage } from "./scene";
import { VIEW_TIERS } from "./scene";
import { PILOT_COLORS, type Pilot, type Ship } from "./ship";

const C = {
  white: new THREE.Color("#ffffff"),
  hot: new THREE.Color("#fff3d6"),
  pink: new THREE.Color("#ff6fd0"),
  cyan: new THREE.Color("#7fe8ff"),
  gold: new THREE.Color("#ffc23a"),
  perfect: new THREE.Color("#9ffff2"),
  red: new THREE.Color("#ff3b4e"),
  ember: new THREE.Color("#ff7a32"),
  shard: new THREE.Color("#bff6ff"),
  shard2: new THREE.Color("#ff9be0"),
};
const MAX_CLUSTERS = 48;
/** Far blows draw larger (up to 1.5× at the gate), so the fight at the edge of range still reads. */
export const far = (z: number): number => 1 + 0.5 * Math.min(1, Math.max(0, z / 60));
const KILL_RING = 2048;

export type CombatHooks = {
  stop(ms: number): void;
  wordDone(slot: number, index: number, perfect: boolean): void;
  hurt(): void;
  ended(won: boolean): void;
};

export class Combat {
  readonly glows: Glows;
  readonly strips: Strips;
  readonly sparks: ParticlePool;
  readonly debris: Debris;
  readonly numbers = new NumberField();
  readonly sprites = new NumberSprites();
  readonly trauma = new Trauma();
  readonly hitstop = new HitStop();
  readonly audio: AudioCues;
  private readonly column: Column;
  private cursor = 0;
  private readonly kills = new Float64Array(KILL_RING).fill(-1e9);
  private killCount = 0;
  private readonly cluster = { n: new Int32Array(MAX_CLUSTERS), key: new Int32Array(MAX_CLUSTERS), x: new Float32Array(MAX_CLUSTERS), z: new Float32Array(MAX_CLUSTERS), dx: new Float32Array(MAX_CLUSTERS), dz: new Float32Array(MAX_CLUSTERS), scout: new Uint8Array(MAX_CLUSTERS) };
  private clusters = 0;
  private readonly v = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly screen = new THREE.Vector3();
  private readonly shot: THREE.Color;
  private readonly fire: boolean;
  private readonly beam: THREE.Color;
  private shots = 0;
  private tiaHits = 0;
  /** A test switch (the keys scenario): ask for a T3 stop every frame. */
  forceStops = false;
  private forcedAt = -1e9;
  stopsAsked = 0;

  constructor(private readonly stage: Stage, private readonly crowd: Crowd, private readonly ship: Ship, pilot: Pilot, tierName: Tier, volume: number, private readonly hooks: CombatHooks) {
    const spec = VIEW_TIERS[tierName];
    this.shot = PILOT_COLORS[pilot].shot;
    this.fire = pilot === "draconis";
    this.beam = PILOT_COLORS[pilot].beam;
    this.glows = new Glows(spec.bursts);
    this.strips = new Strips(2100);
    this.sparks = new ParticlePool(spec.particles, textures().spark);
    this.debris = new Debris(spec.debris);
    this.numbers.limit = spec.numbers;
    this.column = new Column(this.beam, TIA.length, 3.6, FIELD.muzzleZ);
    this.audio = new AudioCues(volume);
    stage.scene.add(this.column.mesh, this.debris.mesh, this.strips.mesh, this.glows.mesh, this.sparks.points);
  }

  /** Point sprites are sized in world units: px per unit at distance 1. */
  resize(height: number, rects: readonly Rect[]): void {
    this.sparks.setScale(height / (2 * Math.tan(THREE.MathUtils.degToRad(this.stage.camera.fov) / 2)));
    this.numbers.protected = rects;
    this.numbers.fontPx = Math.max(16, Math.min(30, height / 34));
  }

  killsWithin(now: number, ms: number): number {
    let count = 0;
    for (let i = 0; i < KILL_RING; i += 1) if (now - this.kills[i]! <= ms) count += 1;
    return count;
  }

  private spark(x: number, y: number, z: number, dx: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number): void {
    for (let k = 0; k < count; k += 1) {
      const spread = (Math.random() - 0.5) * 2.4;
      const s = speed * (0.4 + Math.random() * 0.9);
      this.v.set((dx + dz * spread) * s, 1.5 + Math.random() * 4, -(dz - dx * spread) * s);
      this.sparks.spawn(this.at.set(x, y, -z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** Projects sim (x, z) and spawns a number; `dx, dz` the blow. */
  private number(key: number, x: number, z: number, value: number, style: number, tierId: number, dx: number, dz: number, now: number): void {
    const profile = tier(tierId).number;
    if (profile === null) return;
    this.stage.project(x, z, 1.6, this.screen);
    this.numbers.spawn(key, this.screen.x, this.screen.y, value, style, tierId, profile.size, profile.life, dx, -dz, now);
  }

  /** This frame's events. `now` in ms (wall clock), `seconds` the same in s. */
  read(w: World, now: number): void {
    const R = w.events;
    const seconds = now / 1000;
    if (this.cursor < R.written - R.size) this.cursor = R.written - R.size;
    this.clusters = 0;
    this.tiaHits = 0;
    for (; this.cursor < R.written; this.cursor += 1) {
      const i = this.cursor % R.size;
      const kind = R.kind[i]!;
      const flags = R.flags[i]!;
      const x = R.x[i]!;
      const z = R.z[i]!;
      const dx = R.dx[i]!;
      const dz = R.dz[i]!;
      const pan = x / FIELD.halfW;
      switch (kind) {
        case EV.shot: {
          this.ship.muzzle(this.at);
          const crit = (flags & FLAG.crit) !== 0;
          this.glows.burst(CELL.star4, this.at.x, this.at.y, this.at.z, 0.7, 1.5, 0.06, crit ? C.gold : this.shot, 3);
          this.glows.burst(CELL.soft, this.at.x, this.at.y, this.at.z, 1.2, 2.2, 0.08, this.shot, 1.6);
          this.ship.fired();
          this.trauma.kick(-dx, dz, 2);
          if ((this.shots++ & 1) === 0) this.audio.shot(this.at.x / FIELD.halfW);
          break;
        }
        case EV.hit: {
          const tia = (flags & FLAG.tia) !== 0;
          const crit = (flags & FLAG.crit) !== 0;
          const perfect = (flags & FLAG.perfect) !== 0;
          const t = tia ? (crit ? 2 : 1) : crit ? (perfect ? 3 : 2) : 1;
          const profile = tier(t);
          this.crowd.reactions.hit(R.slot[i]!, R.ref[i]!, t, dx, dz, seconds);
          const y = 0.9;
          const k = far(z);
          if (tia) {
            this.tiaHits += 1;
            this.glows.burst(CELL.star4, x, y, -z, 0.4 * k, 0.95 * k, 0.08, this.beam, 1.2);
            if ((this.tiaHits & 1) === 0) this.spark(x, y, z, dx, dz, 2, 5, this.beam, 0.22, 0.35);
          } else {
            const color = t >= 3 ? C.perfect : t === 2 ? C.gold : this.shot;
            this.glows.burst(profile.rays === 12 ? CELL.star12 : profile.rays === 8 ? CELL.star8 : CELL.star4, x, y, -z, 0.5 * t * k, (1.1 + t * 0.55) * k, 0.1 + t * 0.03, color, 2.6);
            if (profile.ring) this.glows.burst(CELL.ring, x, y, -z, 0.4, 3.2, 0.3, C.perfect, 2);
            this.spark(x, y, z, -dx, -dz, profile.sparks, 6 + t * 2, color, 0.24, 0.4);
            if (profile.debris > 0) this.debris.burst(x, y, -z, dx, -dz, profile.debris >> 1, 4, C.shard, C.white);
          }
          const style = tia ? STYLE.tick : perfect && crit ? STYLE.perfect : crit ? STYLE.crit : STYLE.normal;
          // Beam ticks roll up per 3 m of the column, not per foe: a handful of numbers, not a stack.
          this.number(tia ? -1 - Math.floor(z / 3) : R.ref[i]!, x, z, R.value[i]!, style, t, dx, dz, seconds);
          this.audio.hit(t, pan, now);
          this.trauma.add(tia ? 0.006 : profile.trauma);
          if (!tia && t >= 2) this.ask(this.hitstop.request(t, now));
          break;
        }
        case EV.kill:
          this.gather(x, z, dx, dz, (flags & FLAG.scout) !== 0);
          this.kills[this.killCount++ % KILL_RING] = now;
          break;
        case EV.breach:
          this.glows.burst(CELL.ring + FLAT, x, 0.08, -z, 0.6, 6, 0.5, C.red, 2.6);
          this.glows.burst(CELL.core, x, 0.8, -z, 2, 3.5, 0.2, C.red, 2.2);
          this.spark(x, 0.6, z, 0, 1, 14, 9, C.red, 0.3, 0.5);
          this.trauma.add(0.22);
          this.audio.hurt(true);
          this.ship.hurt();
          this.hooks.hurt();
          break;
        case EV.playerHit:
          this.ship.muzzle(this.at);
          this.glows.burst(CELL.star8, this.at.x, 1.1, this.at.z + 1, 1.5, 4, 0.25, C.red, 2.6);
          this.trauma.add(0.2);
          this.trauma.kick(dx, -dz, 6);
          this.audio.hurt(false);
          this.ship.hurt();
          this.hooks.hurt();
          break;
        case EV.foeShot:
          this.glows.burst(CELL.star4, x, 1.2, -z + 0.6, 0.6, 1.6, 0.12, C.ember, 2.4);
          break;
        case EV.shotDown:
          this.glows.burst(CELL.star8, x, 1, -z, 0.6, 2, 0.16, C.ember, 2.6);
          this.spark(x, 1, z, 0, 1, 8, 6, C.ember, 0.22, 0.35);
          break;
        case EV.keyOk:
        case EV.keyBad:
          this.audio.key(kind === EV.keyOk, R.ref[i]!);
          break;
        case EV.load:
          this.audio.load((flags & FLAG.perfect) !== 0, R.slot[i]!);
          break;
        case EV.word:
          this.hooks.wordDone(R.slot[i]!, R.ref[i]!, (flags & FLAG.perfect) !== 0);
          break;
        case EV.beamStart:
          this.audio.beam(true, x / FIELD.halfW);
          this.glows.burst(CELL.flare, x, 0.6, -FIELD.muzzleZ - 2, 4, 12, 0.3, this.beam, 2.5);
          break;
        case EV.beamEnd:
          this.audio.beam(false, x / FIELD.halfW);
          break;
        case EV.beamPulse:
          // Burn left on the floor along the column.
          for (let k = 0; k < 3; k += 1) this.glows.burst(CELL.soft + FLAT, x + (Math.random() - 0.5) * 0.6, 0.06, -(FIELD.muzzleZ + Math.random() * TIA.length * 0.9), 1.5, 1.8, 2.4, this.beam, 0.85);
          break;
        case EV.spawn:
          this.glows.burst(CELL.soft, x, 1.5, -FIELD.gateZ, 6, 11, 0.5, C.pink, 1.2);
          break;
        case EV.end:
          this.audio.end(R.slot[i] === 1);
          this.hooks.ended(R.slot[i] === 1);
          break;
      }
    }
    if (this.tiaHits > 0) this.audio.pulse(w.guns.beamX / FIELD.halfW, this.tiaHits);
    let killed = 0;
    for (let c = 0; c < this.clusters; c += 1) killed += this.explode(c, now);
    if (killed > 0) this.ask(this.hitstop.kill(killed, now));
    // The keys scenario: a T3 stop as often as the 150 ms spacing allows.
    if (this.forceStops && now - this.forcedAt >= STOP_GAP_MS) {
      this.forcedAt = now;
      this.ask(tier(3).stopMs);
    }
    this.audio.flush(now);
  }

  private ask(ms: number): void {
    if (ms <= 0) return;
    this.stopsAsked += 1;
    this.hooks.stop(ms);
  }

  /** Kills in one 3 m cell this frame merge. */
  private gather(x: number, z: number, dx: number, dz: number, scout: boolean): void {
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
      }
    }
    K.n[c] = K.n[c]! + 1;
    K.x[c] = K.x[c]! + x;
    K.z[c] = K.z[c]! + z;
    K.dx[c] = K.dx[c]! + dx;
    K.dz[c] = K.dz[c]! + dz;
    if (scout) K.scout[c] = 1;
  }

  /** One burst of size √N for a cluster of N kills; returns N. */
  private explode(c: number, now: number): number {
    const K = this.cluster;
    const n = K.n[c]!;
    const x = K.x[c]! / n;
    const z = K.z[c]! / n;
    const length = Math.hypot(K.dx[c]!, K.dz[c]!) || 1;
    const dx = K.dx[c]! / length;
    const dz = K.dz[c]! / length;
    const scout = K.scout[c] === 1;
    const size = Math.sqrt(n) * (scout ? 1.5 : 1) * far(z);
    const tint = scout ? C.gold : C.pink;
    this.glows.burst(CELL.core, x, 1, -z, 1 * size, 2.4 * size, 0.12, C.hot, 2.4);
    this.glows.burst(scout ? CELL.star12 : CELL.star8, x, 1.1, -z, 1.3 * size, 3.8 * size, 0.18, tint, 2.2, 0, 0, 0, (Math.random() - 0.5) * 3);
    this.glows.burst(CELL.soft, x, 1, -z, 1.8 * size, 3.6 * size, 0.32, tint, 0.8);
    // A wide streak of light for a scout or a heap of kills: the big moments read from far off.
    if (scout || n >= 3) this.glows.burst(CELL.flare, x, 1.2, -z, 3 * size, 8 * size, 0.18, scout ? C.gold : C.cyan, 2.2);
    this.glows.burst(CELL.ring + FLAT, x, 0.08, -z, 0.6, 4.2 * size, 0.42, scout ? C.gold : C.cyan, 1.8);
    this.glows.burst(CELL.soft + FLAT, x, 0.07, -z, 2 * size, 2.6 * size, 1.2, C.pink, 0.35);
    this.spark(x, 1, z, dx, dz, Math.min(40, 10 + n * 4), 10 + size * 2.5, C.hot, 0.34, 0.55);
    this.spark(x, 1, z, dx, dz, Math.min(20, 5 + n * 2), 6, C.cyan, 0.26, 0.85);
    this.debris.burst(x, 0.9, -z, dx, -dz, Math.min(40, (scout ? 9 : 5) + n * 3), 5.5 + size, C.shard, C.shard2);
    this.audio.kill(n, x / FIELD.halfW, scout, now);
    this.trauma.add(Math.min(0.2, (scout ? 0.1 : 0.025) * Math.sqrt(n)));
    if (scout) this.ask(this.hitstop.request(2, now));
    return n;
  }

  /** Draws the frame: rounds, scout shots, the column, and every pool. `lead` extrapolates moving things (s). */
  draw(w: World, dt: number, time: number, lead: number): void {
    this.glows.step(dt);
    const B = w.bullets;
    this.strips.begin();
    for (let b = 0; b < B.top; b += 1) {
      if (B.alive[b] === 0) continue;
      const x = B.x[b]! + B.vx[b]! * lead;
      const z = B.z[b]! + B.vz[b]! * lead;
      const flags = B.flags[b]!;
      const crit = (flags & FLAG.crit) !== 0;
      const color = crit && (flags & FLAG.perfect) !== 0 ? C.perfect : crit ? C.gold : this.shot;
      if (this.fire) {
        // Draconis: fireballs, a hot head trailing flame.
        this.strips.add(x - B.vx[b]! * 0.07, 0.95, -(z - B.vz[b]! * 0.07), x, 0.95, -z, crit ? 0.7 : 0.55, color, 2, 0.7);
        this.glows.stamp(CELL.soft, x, 0.95, -z, crit ? 1.6 : 1.2, 0, color, 1.6);
      } else this.strips.add(x - B.vx[b]! * 0.05, 0.95, -(z - B.vz[b]! * 0.05), x, 0.95, -z, crit ? 0.42 : 0.3, color, 2.4, 0.9);
    }
    const S = w.shots;
    for (let s = 0; s < S.top; s += 1) {
      if (S.alive[s] === 0) continue;
      const x = S.x[s]! + S.vx[s]! * lead;
      const z = S.z[s]! + S.vz[s]! * lead;
      const pulse = 1 + Math.sin(time * 18 + s) * 0.15;
      this.glows.stamp(CELL.soft, x, 1.1, -z, 1.7 * pulse, 0, C.red, 2.2);
      this.glows.stamp(CELL.core, x, 1.1, -z, 0.55, 0, C.hot, 2.2);
    }
    const G = w.guns;
    const on = G.beamOn === 1;
    const power = on ? 1 + (G.perfect[2] === 1 ? 0.35 : 0) : 0;
    this.column.update(on, G.beamX, power, time);
    if (this.column.power > 0.02) {
      const k = this.column.power;
      const bx = G.beamX;
      const near = FIELD.muzzleZ + 0.6;
      this.strips.add(bx, 0.4, -near, bx, 0.4, -(FIELD.muzzleZ + TIA.length), 1 * k, this.beam, 0.8 * k, 0.8 * k);
      this.ship.muzzle(this.at);
      this.strips.add(this.at.x, this.at.y, this.at.z, bx, 0.45, -near, 0.55 * k, this.beam, 2 * k, k);
      this.glows.stamp(CELL.star8, bx, 0.6, -near, 2.6 * k, time * 3, this.beam, 2.4 * k);
      this.glows.stamp(CELL.soft, this.at.x, this.at.y, this.at.z, 1.8 * k, 0, this.beam, 2 * k);
      if (on && Math.random() < dt * 40) {
        const zz = FIELD.muzzleZ + Math.random() * TIA.length;
        this.v.set((Math.random() - 0.5) * 2, 2 + Math.random() * 4, (Math.random() - 0.5) * 2);
        this.sparks.spawn(this.at.set(bx + (Math.random() - 0.5) * 1.2, 0.3, -zz), this.v, this.beam, 0.25, 0.5, { drag: 2, gravity: 4 });
      }
    }
    this.strips.end();
    this.glows.flush();
    this.sparks.update(dt, 0);
    this.debris.update(dt);
    this.numbers.update(dt);
    this.sprites.write(this.numbers, this.stage.width, this.stage.height);
  }
}
