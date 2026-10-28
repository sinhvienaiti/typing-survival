/**
 * Reads the sim's event ring once a frame and turns it into the layers of a
 * blow (SURVIVAL_MODE_PLAN.md 5): tiers (src/kit/feedback/tiers.ts) decide the
 * flash, knock-back, sparks, star, ring, debris, number, sound, shake and
 * hit stop; kills in one place in one frame merge into one burst of size
 * √N that breaks into chunks (chunks.ts, by the gun of the killing blow);
 * the guns' shots, bolts, light and hit looks are ShotFx's (shots.ts); scout
 * shots are drawn from the sim's state each frame. Tiers, numbers and the
 * white flash follow the feel pass's profile (gun-rules FEEL). Nothing is
 * allocated per event.
 */
import * as THREE from "three";
import type { ThemeAudio } from "../audio/theme-audio";
import { Debris, HitStop, NumberField, NumberSprites, STOP_GAP_MS, STYLE, Trauma, tier, type Rect } from "../kit/feedback";
import { ParticlePool, textures } from "../kit/three";
import { KIND } from "../content/foes";
import { GUN, TIA } from "../content/guns";
import { FIELD, type Tier } from "../content/rules";
import { EV, FLAG } from "../sim/events";
import { bayOf } from "../sim/weapons";
import type { World } from "../sim/world";
import { Bolts } from "./bolts";
import { Chunks } from "./chunks";
import type { Crowd } from "./crowd";
import { CELL, FLAT, Glows, Strips } from "./fx";
import { CHUNK_CAP, EDGE, FEEL, KILL_NUMBER, LIGHTS, THROW, numberFont } from "./gun-rules";
import { GunFx } from "./gunfx";
import { RiftCracks, ShieldWalls } from "./hazard-fx";
import { GunLights } from "./lights";
import type { Stage } from "./scene";
import { VIEW_TIERS } from "./scene";
import { ShotFx } from "./shots";
import { PILOT_COLORS, type Pilot, type Ship } from "./ship";
import { BLOW as C } from "./theme";
const MAX_CLUSTERS = 48;
/** Far blows draw larger (up to 1.3× at the gate), so the fight at the edge of range still reads. */
export const far = (z: number): number => 1 + 0.3 * Math.min(1, Math.max(0, z / FIELD.gateZ));
const KILL_RING = 2048;
const PUNCH_MS = 220;
/** The gun of a killing blow (its chunks' throw): Xung and the rest, Tia, Tán, Ray, Pháo Sao. */
const THROWS = [THROW.base, THROW.tia, THROW.tan, THROW.ray, THROW.phao] as const;
const gunOf = (flags: number): number => ((flags & FLAG.phao) !== 0 ? 4 : (flags & FLAG.ray) !== 0 ? 3 : (flags & FLAG.tan) !== 0 ? 2 : (flags & FLAG.tia) !== 0 ? 1 : 0);

export type CombatHooks = {
  stop(ms: number): void;
  /** A word finished: its slot, deck index, perfect; its seconds, seconds to its first key, wrong keys (the skill sample). */
  wordDone(slot: number, index: number, perfect: boolean, seconds: number, recognize: number, errors: number): void;
  hurt(): void;
  /** The pace director's repair pod restored `hp` armour. */
  repaired(hp: number): void;
  ended(won: boolean): void;
};

export class Combat {
  readonly glows: Glows;
  readonly smoke = new Glows(160, true); // a big kill's smoke and scorch laid over the scene: one draw call
  readonly strips: Strips;
  readonly sparks: ParticlePool;
  readonly debris: Debris;
  readonly numbers = new NumberField(FEEL);
  readonly sprites = new NumberSprites(FEEL);
  readonly trauma = new Trauma(FEEL);
  readonly hitstop = new HitStop(FEEL);
  readonly audio: ThemeAudio;
  readonly walls = new ShieldWalls();
  readonly cracks = new RiftCracks();
  readonly lights: GunLights;
  readonly bolts: Bolts;
  readonly chunks: Chunks;
  readonly shots: ShotFx;
  /** The bolts loading; `warmed` once main.ts has compiled the fight's programs (warm.ts). */
  readonly loading: Promise<void>;
  warmed = false;
  private readonly gunfx: GunFx;
  private cursor = 0;
  private readonly kills = new Float64Array(KILL_RING).fill(-1e9);
  private killCount = 0;
  private readonly cluster = { n: new Int32Array(MAX_CLUSTERS), key: new Int32Array(MAX_CLUSTERS), x: new Float32Array(MAX_CLUSTERS), z: new Float32Array(MAX_CLUSTERS), dx: new Float32Array(MAX_CLUSTERS), dz: new Float32Array(MAX_CLUSTERS), scout: new Uint8Array(MAX_CLUSTERS), armour: new Uint8Array(MAX_CLUSTERS), big: new Uint8Array(MAX_CLUSTERS), kind: new Int8Array(MAX_CLUSTERS), gun: new Uint8Array(MAX_CLUSTERS) };
  private clusters = 0;
  private readonly v = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly screen = new THREE.Vector3();
  private readonly beam: THREE.Color;
  private tiaHits = 0;
  /** The Tia bay's sweep (sign of beamTo − beamX) this frame: its kills fly across it. */
  private sweep = 1;
  /** A test switch (the keys scenario): ask for a T3 stop every frame. */
  forceStops = false;
  private forcedAt = -1e9;
  stopsAsked = 0;
  private punchAt = -1e9;
  /** The typing feel (typing-feel.ts): keys and words are its; it draws into this frame's glows and strips. */
  typing: { draw(w: World, time: number): void } | null = null;

  constructor(private readonly stage: Stage, private readonly crowd: Crowd, private readonly ship: Ship, pilot: Pilot, tierName: Tier, audio: ThemeAudio, private readonly hooks: CombatHooks) {
    const spec = VIEW_TIERS[tierName];
    this.beam = pilot === "draconis" ? PILOT_COLORS.draconis.beam : C.swarm;
    this.glows = new Glows(spec.bursts);
    this.strips = new Strips(2100);
    this.sparks = new ParticlePool(spec.particles, textures().spark);
    this.sparks.points.renderOrder = 8; // over a big kill's smoke (embers drift out of it)
    this.debris = new Debris(spec.debris, { profile: FEEL });
    this.numbers.limit = spec.numbers;
    this.audio = audio;
    // The guns' light pool is made with the fight (a fixed count: every lit material compiles once).
    this.lights = new GunLights(stage.scene, stage.deck, LIGHTS[tierName]);
    this.bolts = new Bolts(stage.scene, tierName, pilot === "draconis");
    this.loading = this.bolts.load();
    this.chunks = new Chunks(CHUNK_CAP[tierName]);
    this.shots = new ShotFx({ stage, glows: this.glows, smoke: this.smoke, strips: this.strips, sparks: this.sparks, trauma: this.trauma, ship, lights: this.lights, bolts: this.bolts, audio, pilot });
    this.gunfx = new GunFx({ glows: this.glows, strips: this.strips, sparks: this.sparks, debris: this.debris, trauma: this.trauma, ship, walls: this.walls, cracks: this.cracks, audio, ask: (ms) => this.ask(ms) });
    stage.scene.add(this.shots.beams.column.mesh, this.debris.mesh, this.chunks.mesh, this.chunks.shadows, this.smoke.mesh, this.strips.mesh, this.glows.mesh, this.sparks.points, this.walls.mesh, this.cracks.mesh);
  }

  /** The bolts' models are in (or there are none to load) and the fight's programs are compiled. */
  get ready(): boolean {
    return this.bolts.ready && this.warmed;
  }

  /** The scenarios' probe (info()): bolts drawn by kind, chunks, lights lit, the shake (px), the muzzles on screen (centre, left, right, core; CSS px). */
  probe(): { bolts: number[]; chunks: number; chunk: [number, number]; lights: number; shake: number; muzzles: number[][] } {
    return { bolts: this.bolts.counts(), chunks: this.chunks.live, chunk: this.chunks.watch(), lights: this.lights.lit, shake: Math.round(Math.hypot(this.trauma.offsetX, this.trauma.offsetY) * 100) / 100, muzzles: this.shots.muzzles() };
  }

  /** Point sprites are sized in world units: px per unit at distance 1. */
  resize(height: number, rects: readonly Rect[]): void {
    this.sparks.setScale(height / (2 * Math.tan(THREE.MathUtils.degToRad(this.stage.camera.fov) / 2)));
    this.numbers.protected = rects;
    this.numbers.fontPx = numberFont(height);
    this.shots.resize();
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

  /** Projects sim (x, z) and spawns a number; `dx, dz` the blow; a killing blow's is larger. */
  private number(key: number, x: number, z: number, value: number, style: number, tierId: number, dx: number, dz: number, now: number, kill: boolean): void {
    const profile = tier(tierId, FEEL.tiers).number;
    if (profile === null) return;
    this.stage.project(x, z, 1.6, this.screen);
    this.numbers.spawn(key, this.screen.x, this.screen.y, value, style, tierId, profile.size * (kill ? KILL_NUMBER : 1), profile.life, dx, -dz, now);
  }

  /** This frame's events. `now` in ms (wall clock), `seconds` the same in s. */
  read(w: World, now: number): void {
    const R = w.events;
    const seconds = now / 1000;
    if (this.cursor < R.written - R.size) this.cursor = R.written - R.size;
    this.clusters = 0;
    this.tiaHits = 0;
    const tiaBay = bayOf(w, GUN.tia);
    if (tiaBay >= 0) this.sweep = w.guns.beamTo[tiaBay]! >= w.guns.beamX[tiaBay]! ? 1 : -1;
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
        case EV.shot:
        case EV.load:
          this.shots.event(R, i, w, now);
          break;
        case EV.hit: {
          const tia = (flags & FLAG.tia) !== 0;
          const crit = (flags & FLAG.crit) !== 0;
          const perfect = (flags & FLAG.perfect) !== 0;
          const heavy = (flags & (FLAG.ray | FLAG.phao)) !== 0;
          // Vỏ that stopped most of a blow: a tick, never a big hit.
          const blocked = (flags & FLAG.armour) !== 0 && (flags & FLAG.pierce) === 0;
          const t = blocked ? 1 : tia || (flags & FLAG.tan) !== 0 ? (crit ? 2 : 1) : heavy ? (crit ? 3 : 2) : crit ? (perfect ? 3 : 2) : 1;
          const profile = tier(t, FEEL.tiers);
          this.crowd.reactions.hit(R.slot[i]!, R.ref[i]!, (flags & FLAG.big) !== 0 ? Math.max(1, t - 1) : t, dx, dz, seconds);
          const k = far(z);
          if (blocked) this.audio.gun("hit.armour", pan, now);
          this.shots.hit(x, z, dx, dz, flags, t, k, this.gunfx.armour(x, z, dx, dz, flags, k));
          if (!tia && (flags & (FLAG.tan | FLAG.ray | FLAG.phao)) === 0 && !blocked && profile.debris > 0) this.debris.burst(x, 0.9, -z, dx, -dz, profile.debris >> 1, 4, C.shardHot, C.shardSteel);
          if (tia) this.tiaHits += 1;
          const style = tia || blocked ? STYLE.tick : perfect && crit ? STYLE.perfect : crit ? STYLE.crit : STYLE.normal;
          // Beam ticks roll up per 4 m along the ray, not per foe: two or three numbers, not a stack; Tán's pellets per foe.
          this.number(tia ? -1 - Math.floor(Math.hypot(x, z - FIELD.muzzleZ) / 4) : R.ref[i]!, x, z, R.value[i]!, style, t, dx, dz, seconds, (flags & FLAG.kill) !== 0);
          // §4.3: a foe in Pháo Sao's ring is heard in gun.phao.burst (one sound, never a stack of hits on top).
          if ((flags & FLAG.phao) === 0) this.audio.hit(t, pan, now);
          // §4.6: Xung's blows shake by their tier; Tia, Tán, Ray and Pháo Sao only by their shot (shots.ts).
          if ((flags & (FLAG.tia | FLAG.tan | FLAG.ray | FLAG.phao)) === 0) this.trauma.add(profile.trauma);
          // Ray: a 12 ms stop at most every 300 ms (the hit stop's own spacing); none for Tia, Tán or Pháo Sao.
          if (!tia && (flags & (FLAG.tan | FLAG.phao)) === 0 && t >= 2) this.ask(this.hitstop.request(t, now));
          break;
        }
        case EV.kill: {
          // The kind as the store still holds it (unless its slot was taken again since).
          const s = R.slot[i]!;
          const kind = w.foes.alive[s] === 0 || w.foes.id[s] === R.ref[i] ? w.foes.kind[s]! : -1;
          this.gather(x, z, dx, dz, (flags & FLAG.scout) !== 0, (flags & FLAG.elite) !== 0, (flags & FLAG.big) !== 0, kind, gunOf(flags));
          this.kills[this.killCount++ % KILL_RING] = now;
          break;
        }
        case EV.breach:
          this.glows.burst(CELL.ring + FLAT, x, 0.08, -z, 0.6, 6, 0.5, C.danger, 2.6);
          this.glows.burst(CELL.core, x, 0.8, -z, 3, 3.5, 0.2, C.danger, 2.2); // whole on f0: grown from 2 m, f1 outshone it (first/peak 0.93)
          this.spark(x, 0.6, z, 0, 1, 14, 9, C.ember, 0.3, 0.5);
          this.trauma.add(0.22);
          this.audio.hurt(true);
          this.ship.hurt();
          this.shots.hurt();
          this.hooks.hurt();
          break;
        case EV.playerHit:
          this.ship.muzzle(this.at);
          this.glows.burst(CELL.star8, this.at.x, 1.1, this.at.z + 1, 1.5, 4, 0.25, C.danger, 2.6);
          this.trauma.add(0.2);
          this.trauma.kick(dx, -dz, 6);
          this.audio.hurt(false);
          this.ship.hurt();
          this.shots.hurt();
          this.hooks.hurt();
          break;
        case EV.foeShot:
          this.glows.burst(CELL.star4, x, 1.2, -z + 0.6, 0.6, 1.6, 0.12, C.danger, 2.4);
          this.audio.foeShot(pan);
          break;
        case EV.shotDown:
          this.glows.burst(CELL.star8, x, 1, -z, 0.6, 2, 0.16, C.ember, 2.6);
          this.spark(x, 1, z, 0, 1, 8, 6, C.ember, 0.22, 0.35);
          this.audio.shotDown(pan);
          break;
        case EV.word:
          this.hooks.wordDone(R.slot[i]!, R.ref[i]!, (flags & FLAG.perfect) !== 0, R.dx[i]!, R.dz[i]!, R.x[i]!);
          break;
        case EV.drain: {
          // The near zone leaches the line: the foe flares dull red, sparks drift toward the line, an ember glows on the armour.
          this.glows.burst(CELL.soft, x, 0.9, -z, 0.8, 1.8, 0.3, C.drain, 1.6);
          this.glows.burst(CELL.soft + FLAT, x * 0.6, 0.06, -FIELD.bottomZ, 0.8, 2.2, 0.45, C.drain, 1.2);
          this.spark(x, 0.6, z, 0, -1, 3, 4, C.drain, 0.2, 0.45);
          this.audio.drain(pan, now);
          break;
        }
        case EV.support:
          this.ship.muzzle(this.at);
          this.glows.burst(CELL.ring + FLAT, 0, 0.08, -FIELD.muzzleZ, 1, 9, 0.8, C.repair, 2.2);
          this.glows.burst(CELL.star8, this.at.x, this.at.y, this.at.z, 1.5, 5, 0.5, C.repair, 2.4);
          this.spark(0, 1, FIELD.muzzleZ, 0, 1, 24, 7, C.repair, 0.28, 0.8);
          this.audio.repair();
          this.hooks.repaired(R.value[i]!);
          break;
        case EV.beamStart: {
          // x, z: the ray's far end.
          this.audio.beam(true, x / FIELD.halfW);
          const k = 2 / TIA.length;
          this.glows.burst(CELL.flare, x * k, 0.6, -(FIELD.muzzleZ + (z - FIELD.muzzleZ) * k), 3, 7, 0.25, this.beam, 2.2);
          this.shots.event(R, i, w, now);
          break;
        }
        case EV.beamEnd:
          this.audio.beam(false, x / FIELD.halfW);
          this.shots.event(R, i, w, now);
          break;
        case EV.beamPulse:
          // Burn left on the floor along the ray (x, z: its far end), past its first 3 m (72 of them at 0.85 had sheeted the lower field orange, §12).
          for (let k = 0; k < 2; k += 1) {
            const t = 0.25 + Math.random() * 0.72;
            this.glows.burst(CELL.soft + FLAT, x * t + (Math.random() - 0.5) * 0.6, 0.06, -(FIELD.muzzleZ + (z - FIELD.muzzleZ) * t), 1.5, 1.8, 2.4, this.beam, 0.6);
          }
          break;
        case EV.spawn:
          this.glows.burst(CELL.soft, x, 1.5, -FIELD.gateZ, 6, 11, 0.5, C.spawn, 0.9);
          break;
        case EV.end:
          this.audio.end(R.slot[i] === 1);
          this.hooks.ended(R.slot[i] === 1);
          break;
        default:
          if (kind >= EV.volley) {
            this.shots.event(R, i, w, now);
            this.gunfx.event(R, i, w, seconds, now, pan);
          }
      }
    }
    if (this.tiaHits > 0) this.audio.pulse(w.guns.beamX[Math.max(0, bayOf(w, GUN.tia))]! / FIELD.halfW, this.tiaHits);
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
    if (big) this.ask(this.shots.bigKill(x, z, K.kind[c] === KIND.leader));
    else this.shots.kill(x, z, size, scout, n >= 5, scout ? C.elite : K.armour[c] === 1 ? C.armour : C.swarm);
    this.spark(x, 1, z, dx, dz, Math.min(40, 10 + n * 4), 10 + size * 2.5, C.hot, 0.34, 0.55);
    this.spark(x, 1, z, dx, dz, Math.min(20, 5 + n * 2), 6, scout ? C.volt : C.swarm, 0.26, 0.85);
    // Chunks (§4.5) by the kind (else read from the flags) and the gun: Tia's fly across its sweep.
    const kind = K.kind[c]! >= 0 ? K.kind[c]! : scout ? 1 : big ? 2 : 0;
    const gun = K.gun[c]!;
    const th = big ? THROW.big : THROWS[gun]!;
    const across = gun === 1;
    this.chunks.burst(x, z, across ? -dz * this.sweep : dx, across ? dx * this.sweep : dz, kind, n, K.armour[c] === 1 ? EDGE.armour : -1, th.up, th.out, th.spread);
    this.audio.kill(n, x / FIELD.halfW, scout, now);
    this.trauma.add(Math.min(0.2, (scout ? 0.1 : 0.025) * Math.sqrt(n)));
    // A heap of kills or a scout punches the view along the blow (at most every PUNCH_MS: a sweep is not a buzz).
    if ((scout || n >= 4) && now - this.punchAt >= PUNCH_MS) {
      this.punchAt = now;
      this.trauma.kick(dx, -dz, Math.min(5, 2 + n * 0.4));
    }
    if (scout) this.ask(this.hitstop.request(2, now));
    return n;
  }

  /** Where the ship turns (into `out`, sim x and z of a unit direction): the bay firing now, a Tia ray when only it burns, else the first bay's last aim. */
  aim(w: World, out: Float64Array): Float64Array {
    const G = w.guns;
    let bay = -1;
    let ray = -1;
    for (let b = 0; b < G.gun.length; b += 1) {
      if (G.mags[b]! <= 0) continue;
      if (G.gun[b] === GUN.tia) ray = G.beamOn[b] === 1 ? b : ray;
      else if (bay < 0) bay = b;
    }
    if (bay < 0 && ray >= 0) {
      const norm = Math.hypot(G.beamX[ray]!, TIA.length);
      out[0] = G.beamX[ray]! / norm;
      out[1] = TIA.length / norm;
      return out;
    }
    const b = bay < 0 ? 0 : bay;
    out[0] = G.aimX[b]!;
    out[1] = G.aimZ[b]!;
    return out;
  }

  /** Draws the frame: the guns' shots (shots.ts), scout shots, and every pool. `lead` extrapolates moving things (s). */
  draw(w: World, dt: number, time: number, lead: number): void {
    this.glows.step(dt);
    this.smoke.step(dt);
    this.strips.begin();
    const S = w.shots;
    for (let s = 0; s < S.top; s += 1) {
      if (S.alive[s] === 0) continue;
      const x = S.x[s]! + S.vx[s]! * lead;
      const z = S.z[s]! + S.vz[s]! * lead;
      const pulse = 1 + Math.sin(time * 18 + s) * 0.15;
      this.glows.stamp(CELL.soft, x, 1.1, -z, 1.7 * pulse, 0, C.danger, 2.2);
      this.glows.stamp(CELL.core, x, 1.1, -z, 0.55, 0, C.hot, 2.2);
    }
    this.shots.draw(w, dt, time, lead);
    this.gunfx.draw(w, dt, time, lead);
    this.typing?.draw(w, time);
    this.ship.drawEngines(this.glows, this.strips);
    this.walls.update(w, time, lead);
    this.cracks.update(time);
    this.strips.end();
    this.glows.flush();
    this.smoke.flush();
    this.sparks.update(dt, 0);
    this.debris.update(dt);
    this.chunks.update(dt);
    this.numbers.update(dt);
    this.sprites.write(this.numbers, this.stage.width, this.stage.height);
  }
}
