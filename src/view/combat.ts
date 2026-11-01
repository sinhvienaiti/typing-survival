/**
 * Reads the sim's event ring once a frame and hands each event to the
 * module that shows it (SURVIVAL_MODE_PLAN.md 5; split by ALIVE_PLAN AL-00):
 * tiers (src/kit/feedback/tiers.ts) decide a hit's flash, knock-back, sparks,
 * debris, number (damage-numbers.ts), sound, shake and hit stop; kills merge
 * and break into chunks in kills.ts; the guns' shots, bolts, light and hit
 * looks are ShotFx's (shots.ts), their S1 sounds GunFx's (gunfx.ts); the
 * foes' events FoeFx's (foe-fx.ts), the stage's StageFx's (stage-fx.ts);
 * scout shots are drawn from the sim's state each frame. A later package
 * adds its reaction from its own file through the cue bus (on()), after the
 * built-in one. The firing character is a PilotRig (pilot.ts). Tiers,
 * numbers and the white flash follow the feel pass's profile (gun-rules
 * FEEL). Nothing is allocated per event.
 */
import * as THREE from "three";
import type { ThemeAudio } from "../audio/theme-audio";
import { Debris, HitStop, STOP_GAP_MS, STYLE, Trauma, tier, type Rect } from "../kit/feedback";
import { ParticlePool, textures } from "../kit/three";
import { GUN, TIA, type GunId } from "../content/guns";
import { FIELD, type Tier } from "../content/rules";
import { EV, FLAG, type Ring } from "../sim/events";
import { bayOf } from "../sim/weapons";
import type { World } from "../sim/world";
import { Bolts } from "./bolts";
import { Chunks } from "./chunks";
import type { Crowd } from "./crowd";
import { CELL, FLAT, Glows, Strips } from "./fx";
import { DamageNumbers } from "./damage-numbers";
import { FoeFx } from "./foe-fx";
import { BLOOM, CHUNK_CAP, FEEL, LIGHTS, SMOKE_POOL } from "./gun-rules";
import { GunFx } from "./gunfx";
import { RiftCracks, ShieldWalls } from "./hazard-fx";
import { Kills, far } from "./kills";
import { GunLights } from "./lights";
import { PILOT_COLORS, type Pilot, type PilotRig } from "./pilot";
import type { Stage } from "./scene";
import { VIEW_TIERS } from "./scene";
import { ShotFx } from "./shots";
import { StageFx } from "./stage-fx";
import { BLOW as C } from "./theme";

export { far } from "./kills";

/** A reaction on the cue bus (Combat.on): the event at ring slot `i`, this frame's world, `now` in ms. */
export type Cue = (R: Ring, i: number, w: World, now: number) => void;

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
  readonly damage: DamageNumbers;
  readonly smoke = new Glows(SMOKE_POOL, true); // smoke and scorches laid over the scene (big kills, guns, the hurt ship): one draw call
  readonly strips: Strips;
  readonly sparks: ParticlePool;
  readonly debris: Debris;
  /** The damage numbers' field and sprites (damage-numbers.ts), as main.ts and the dev handle read them. */
  readonly numbers: DamageNumbers["field"];
  readonly sprites: DamageNumbers["sprites"];
  readonly trauma = new Trauma(FEEL);
  readonly hitstop = new HitStop(FEEL);
  readonly audio: ThemeAudio;
  readonly walls = new ShieldWalls();
  readonly cracks = new RiftCracks();
  readonly lights: GunLights;
  readonly bolts: Bolts;
  readonly chunks: Chunks;
  readonly shots: ShotFx;
  readonly kills: Kills;
  /** The bolts loading; `warmed` once main.ts has compiled the fight's programs (warm.ts). */
  readonly loading: Promise<void>;
  warmed = false;
  private readonly gunfx: GunFx;
  private readonly foeFx: FoeFx;
  private readonly stageFx: StageFx;
  /** The cue bus: reactions by EV kind, added by later packages from their own files (on()). */
  private readonly cues: Cue[][] = [];
  private cursor = 0;
  private readonly v = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly beam: THREE.Color;
  private tiaHits = 0;
  /** A test switch (the keys scenario): ask for a T3 stop every frame. */
  forceStops = false;
  private forcedAt = -1e9;
  stopsAsked = 0;
  /** The typing feel (typing-feel.ts): keys and words are its; it draws into this frame's glows and strips. */
  typing: { draw(w: World, time: number): void } | null = null;

  constructor(private readonly stage: Stage, private readonly crowd: Crowd, private readonly ship: PilotRig, pilot: Pilot, tierName: Tier, guns: readonly GunId[], audio: ThemeAudio, private readonly hooks: CombatHooks) {
    const spec = VIEW_TIERS[tierName];
    this.beam = pilot === "draconis" ? PILOT_COLORS.draconis.beam : C.swarm;
    // L1: on the bloom tiers the halos stay under its threshold; only thin cores bloom.
    this.glows = new Glows(spec.bursts, false, spec.bloom ? BLOOM.halo : 0);
    this.strips = new Strips(2100, false, spec.bloom ? BLOOM.halo : 0);
    this.sparks = new ParticlePool(spec.particles, textures().spark);
    this.sparks.points.renderOrder = 8; // over a big kill's smoke (embers drift out of it)
    this.debris = new Debris(spec.debris, { profile: FEEL });
    this.damage = new DamageNumbers(stage, spec.numbers);
    this.numbers = this.damage.field;
    this.sprites = this.damage.sprites;
    this.audio = audio;
    // The guns' light pool is made with the fight (a fixed count: every lit material compiles once).
    this.lights = new GunLights(stage.scene, stage.deck, LIGHTS[tierName]);
    this.bolts = new Bolts(stage.scene, tierName, pilot === "draconis", guns);
    this.loading = this.bolts.load();
    this.chunks = new Chunks(CHUNK_CAP[tierName]);
    this.shots = new ShotFx({ stage, glows: this.glows, smoke: this.smoke, strips: this.strips, sparks: this.sparks, trauma: this.trauma, ship, lights: this.lights, bolts: this.bolts, audio, pilot });
    this.kills = new Kills({ glows: this.glows, smoke: this.smoke, sparks: this.sparks, chunks: this.chunks, lights: this.lights, trauma: this.trauma, hitstop: this.hitstop, audio, size: (share, x, z) => this.shots.size(share, x, z), ask: (ms) => this.ask(ms) });
    this.gunfx = new GunFx({ audio });
    this.foeFx = new FoeFx({ glows: this.glows, strips: this.strips, sparks: this.sparks, debris: this.debris, trauma: this.trauma, walls: this.walls, audio, ask: (ms) => this.ask(ms) });
    this.stageFx = new StageFx({ glows: this.glows, sparks: this.sparks, trauma: this.trauma, cracks: this.cracks, audio, ask: (ms) => this.ask(ms) });
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

  /**
   * The cue bus: `fn` runs for every event of `kind` (EV), after the built-in
   * reaction, in the order added. A package's new reaction lives in its own
   * file and registers here; nothing is allocated per event.
   */
  on(kind: number, fn: Cue): void {
    (this.cues[kind] ??= []).push(fn);
  }

  /** Point sprites are sized in world units: px per unit at distance 1. */
  resize(height: number, rects: readonly Rect[]): void {
    this.sparks.setScale(height / (2 * Math.tan(THREE.MathUtils.degToRad(this.stage.camera.fov) / 2)));
    this.damage.resize(height, rects);
    this.shots.resize();
  }

  killsWithin(now: number, ms: number): number {
    return this.kills.within(now, ms);
  }

  private spark(x: number, y: number, z: number, dx: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number): void {
    for (let k = 0; k < count; k += 1) {
      const spread = (Math.random() - 0.5) * 2.4;
      const s = speed * (0.4 + Math.random() * 0.9);
      this.v.set((dx + dz * spread) * s, 1.5 + Math.random() * 4, -(dz - dx * spread) * s);
      this.sparks.spawn(this.at.set(x, y, -z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** This frame's events. `now` in ms (wall clock), `seconds` the same in s. */
  read(w: World, now: number): void {
    const R = w.events;
    const seconds = now / 1000;
    if (this.cursor < R.written - R.size) this.cursor = R.written - R.size;
    this.kills.begin();
    this.tiaHits = 0;
    const tiaBay = bayOf(w, GUN.tia);
    if (tiaBay >= 0) this.kills.sweep = w.guns.beamTo[tiaBay]! >= w.guns.beamX[tiaBay]! ? 1 : -1;
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
          this.shots.hit(x, z, dx, dz, flags, t, k, this.foeFx.armour(x, z, dx, dz, flags, k));
          if (!tia && (flags & (FLAG.tan | FLAG.ray | FLAG.phao)) === 0 && !blocked && profile.debris > 0) this.debris.burst(x, 0.9, -z, dx, -dz, profile.debris >> 1, 4, C.shardHot, C.shardSteel);
          if (tia) this.tiaHits += 1;
          const style = tia || blocked ? STYLE.tick : perfect && crit ? STYLE.perfect : crit ? STYLE.crit : STYLE.normal;
          // Beam ticks roll up per 4 m along the ray, not per foe: two or three numbers, not a stack; Tán's pellets per foe.
          this.damage.spawn(tia ? -1 - Math.floor(Math.hypot(x, z - FIELD.muzzleZ) / 4) : R.ref[i]!, x, z, R.value[i]!, style, t, dx, dz, seconds, (flags & FLAG.kill) !== 0);
          // §4.3: a foe in Pháo Sao's ring is heard in gun.phao.burst (one sound, never a stack of hits on top).
          if ((flags & FLAG.phao) === 0) this.audio.hit(t, pan, now);
          // §4.6: Xung's blows shake by their tier; Tia, Tán, Ray and Pháo Sao only by their shot (shots.ts).
          if ((flags & (FLAG.tia | FLAG.tan | FLAG.ray | FLAG.phao)) === 0) this.trauma.add(profile.trauma);
          // Ray: a 12 ms stop at most every 300 ms (the hit stop's own spacing); none for Tia, Tán or Pháo Sao.
          if (!tia && (flags & (FLAG.tan | FLAG.phao)) === 0 && t >= 2) this.ask(this.hitstop.request(t, now));
          break;
        }
        case EV.kill:
          this.kills.event(R, i, w, now);
          break;
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
            this.gunfx.event(R, i, now, pan);
            this.foeFx.event(R, i, w, seconds, now);
            this.stageFx.event(R, i, w, seconds, now);
          }
      }
      const cues = this.cues[kind];
      if (cues !== undefined) for (let c = 0; c < cues.length; c += 1) cues[c]!(R, i, w, now);
    }
    if (this.tiaHits > 0) this.audio.pulse(w.guns.beamX[Math.max(0, bayOf(w, GUN.tia))]! / FIELD.halfW, this.tiaHits);
    const killed = this.kills.end(now);
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
    this.foeFx.draw(w, dt, time, lead);
    this.stageFx.draw(w, dt, time);
    this.typing?.draw(w, time);
    this.ship.drawFx(this.glows, this.strips);
    this.walls.update(w, time, lead);
    this.cracks.update(time);
    this.strips.end();
    this.glows.flush();
    this.smoke.flush();
    this.sparks.update(dt, 0);
    this.debris.update(dt);
    this.chunks.update(dt);
    this.damage.draw(dt);
  }
}
