/**
 * Each key of a word, seen and heard (docs/FEEL_PASS_S1.md §3). Reads the
 * sim's typing events with its own cursor on the ring (it never writes the
 * world) and drives the word line and the bays (hud.ts, strip.ts), the
 * ship's core on the field and the typing sounds:
 * - a right key pops its letter and sends 4 shards of energy down from under
 *   it into the ship's core (FX_CORE), which glows brighter with each letter
 *   of the locked word (0.35 + 0.5·L m, 1.2 + 1.6·L; a priming spark at the
 *   muzzle from half the word); a ring of light runs out on the deck under
 *   the ship; a note climbs the A-minor pentatonic;
 * - a wrong key dims the core with red sparks; a stray key only ghosts;
 * - a finished word flashes the core and runs a stream of energy to the
 *   muzzle (a perfect one adds a teal ring); a word into a full bay throws
 *   its shards aside and never reaches the core;
 * - the clean streak adds shards, a wider ring, an octave, a core that keeps
 *   a glow, a brighter engine, and a teal ring a key from 20.
 * No shot is drawn per key: shots are the sim's (§3.1). Pooled: nothing is
 * allocated per key; 0 draw calls of its own (the combat's glows and strips).
 */
import * as THREE from "three";
import type { ThemeAudio } from "../audio/theme-audio";
import type { ParticlePool } from "../kit/three";
import { EV, FLAG } from "../sim/events";
import type { World } from "../sim/world";
import { CELL, FLAT, type Glows, type Strips } from "./fx";
import type { Hud } from "./hud";
import type { Stage } from "./scene";
import type { Ship } from "./ship";
import { BLOW } from "./theme";
import { CleanStreak } from "./type-rules";

const SHARDS = 32;
/** At most this many shards fly at once (§3.1: ≤ 8 at 10 keys a second, the streak's fifth shard included). */
const LIVE_MAX = 8;
const PENDING = 32;
/** The gun colours (GUN ids: Xung, Tia, Tán, Ray, Pháo Sao), as the bays' --gun. */
const GUN_COLOR = [BLOW.volt, BLOW.swarm, BLOW.tan, BLOW.ray, BLOW.phao] as const;
const PAN = [-0.35, 0.35, -0.6, 0.6] as const;
const TYPING = new THREE.Color("#7ff5e0");
/**
 * A shard's streak and the key's deck ring. §3.1 draws 0.25 × 0.06 m and a
 * 0.55 ring: on the first frames that is 7 × 2 px and a ring hidden under
 * the hull (tmp/…/feel/typing/run1); drawn here 0.4 × 0.1 m and 1.1 (HDR).
 */
const SHARD = { length: 0.4, width: 0.1 } as const;
const RING = 1.1;

export class TypeFeel {
  private cursor = 0;
  readonly streak = new CleanStreak();
  // Shards: start, launch time (s), flight (s), mode (0 into the core, 1 thrown aside), aside direction, gun.
  private readonly sx = new Float32Array(SHARDS);
  private readonly sy = new Float32Array(SHARDS);
  private readonly sz = new Float32Array(SHARDS);
  private readonly t0 = new Float64Array(SHARDS);
  private readonly life = new Float32Array(SHARDS);
  private readonly mode = new Uint8Array(SHARDS);
  private readonly ax = new Float32Array(SHARDS);
  private readonly gun = new Uint8Array(SHARDS);
  private readonly alive = new Uint8Array(SHARDS);
  // Keys of this frame waiting for the line to show them (their letter's place): letter index, gun, thrown aside.
  private readonly pIndex = new Int32Array(PENDING);
  private readonly pGun = new Uint8Array(PENDING);
  private readonly pAside = new Uint8Array(PENDING);
  private readonly pSlot = new Int8Array(PENDING);
  private pending = 0;
  // The core: shown level (0 … 1) and colour, its last receive, wrong key, flash; the stream to the muzzle.
  private coreOn = 0;
  private coreL = 0;
  private coreGun = 0;
  private hitAt = -1e9;
  private badAt = -1e9;
  private flashAt = -1e9;
  private flowAt = -1e9;
  private flowGun = 0;
  private lastTime = -1;
  /** The core's intensity drawn last frame (the scenarios' probe). */
  private shown = 0;
  private readonly core = new THREE.Vector3();
  private readonly glow = new THREE.Vector3();
  private readonly tip = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly point = { x: 0, y: 0 };

  constructor(
    private readonly hud: Hud,
    private readonly stage: Stage,
    private readonly ship: Ship,
    private readonly glows: Glows,
    private readonly strips: Strips,
    private readonly sparks: ParticlePool,
    private readonly audio: ThemeAudio,
  ) {}

  /** Live shards (the scenarios read it through info()). */
  get live(): number {
    let n = 0;
    for (let s = 0; s < SHARDS; s += 1) n += this.alive[s]!;
    return n;
  }

  /** The core's level now (0 … 1 of the locked word typed; 0 when it shows nothing). */
  get level(): number {
    return this.coreOn > 0.02 ? this.coreL : 0;
  }

  /** The scenarios' probe: the core's level, its screen point (CSS px), live shards, the streak. */
  probe(): { level: number; glow: number; x: number; y: number; shards: number; streak: number; layout: { stripes: number; glow: number; reach: number } } {
    const p = this.stage.project(this.glow.x, -this.glow.z, this.glow.y, this.tip);
    return { level: this.level, glow: Math.round(this.shown * 100) / 100, x: Math.round(p.x), y: Math.round(p.y), shards: this.live, streak: this.streak.n, layout: this.hud.placed };
  }

  /** This frame's typing events: the line, the bays, the sounds; shards wait for land(). Call before hud.update(). */
  read(w: World, now: number): void {
    const R = w.events;
    if (this.cursor < R.written - R.size) this.cursor = R.written - R.size;
    for (; this.cursor < R.written; this.cursor += 1) {
      const i = this.cursor % R.size;
      const kind = R.kind[i]!;
      if (kind !== EV.keyOk && kind !== EV.keyBad && kind !== EV.word) continue;
      const slot = R.slot[i]!;
      const tier = this.streak.tier;
      if (kind === EV.keyOk) {
        const typed = R.value[i]!;
        this.hud.strip.typed(typed - 1, now);
        this.audio.key(typed, R.ref[i]!, tier >= 2);
        if (this.pending < PENDING) {
          this.pIndex[this.pending] = typed - 1;
          this.pGun[this.pending] = w.guns.gun[slot]!;
          this.pAside[this.pending] = 0;
          this.pSlot[this.pending] = slot;
          this.pending += 1;
        }
        this.ringUnder(w.guns.gun[slot]!, tier);
      } else if (kind === EV.keyBad) {
        const due = R.value[i]!;
        this.hud.keyBad(slot, due, String.fromCharCode(97 + R.ref[i]!), now);
        this.audio.keyBad(due, slot < 0);
        if (slot >= 0) {
          this.badAt = now;
          this.ship.core(this.core);
          const red = BLOW.danger;
          for (let k = 0; k < 3; k += 1) this.sparks.spawn(this.core, this.v.set((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3), red, 0.22, 0.32, { drag: 3, gravity: 6 });
          const broke = this.streak.bad(true);
          this.hud.streak(this.streak.n, broke, this.streak.tier, now);
        }
      } else {
        const next = (this.cursor + 1) % R.size;
        const loaded = this.cursor + 1 < R.written && R.kind[next] === EV.load && R.slot[next] === slot;
        const flags = R.flags[i]!;
        const perfect = (flags & FLAG.perfect) !== 0;
        const gun = w.guns.gun[slot]!;
        const length = w.deck[R.ref[i]!]!.length;
        this.hud.wordDone(slot, R.ref[i]!, perfect, !loaded, now);
        this.audio.word(loaded ? (perfect ? "perfect" : "load") : "full", length, PAN[slot] ?? 0);
        if (loaded) {
          this.flashAt = now;
          this.flowAt = now;
          this.flowGun = gun;
          this.coreGun = gun;
          if (perfect) {
            this.ship.core(this.core);
            this.glows.burst(CELL.ring + FLAT, this.core.x, 0.09, this.core.z, 1, 3.5, 0.25, BLOW.perfect, 0.9);
          }
        } else {
          // The last key's shards fly aside: the full bay takes nothing.
          for (let p = 0; p < this.pending; p += 1) if (this.pSlot[p] === slot) this.pAside[p] = 1;
        }
        const up = this.streak.word((flags & FLAG.clean) !== 0);
        if (up) this.audio.streak();
        this.hud.streak(this.streak.n, 0, this.streak.tier, now);
      }
    }
  }

  /** A ring of light on the deck under the ship (a key); wider with the streak, and a teal one from 20. */
  private ringUnder(gun: number, tier: number): void {
    this.ship.core(this.core);
    const wide = tier >= 1 ? 1.15 : 1;
    this.glows.burst(CELL.ring + FLAT, this.core.x, 0.08, this.core.z, 0.8 * wide, 2 * wide, 0.15, GUN_COLOR[gun] ?? BLOW.volt, RING);
    if (tier >= 4) this.glows.burst(CELL.ring + FLAT, this.core.x, 0.085, this.core.z, 1, 2.6, 0.2, TYPING, 0.45);
  }

  /** After hud.update(): this frame's keys send their shards from under their letters on the line. */
  land(now: number): void {
    const seconds = now / 1000;
    const count = this.streak.tier >= 1 ? 5 : 4;
    for (let p = 0; p < this.pending; p += 1) {
      if (!this.hud.strip.anchor(this.pIndex[p]!, this.point)) continue;
      this.stage.unproject(this.point.x, this.point.y, 0.95, this.tip);
      for (let k = 0; k < count; k += 1) {
        const s = this.free();
        this.sx[s] = this.tip.x + (Math.random() - 0.5) * 0.25;
        this.sy[s] = this.tip.y;
        this.sz[s] = this.tip.z;
        // Two leave on the key's own frame (f0), the others staggered by up to 25 ms.
        this.t0[s] = seconds + (k < 2 ? 0 : Math.random() * 0.025);
        this.life[s] = 0.07 + Math.random() * 0.03;
        this.mode[s] = this.pAside[p]!;
        this.ax[s] = (k % 2 === 0 ? -1 : 1) * (2.5 + Math.random() * 2);
        this.gun[s] = this.pGun[p]!;
        this.alive[s] = 1;
      }
    }
    this.pending = 0;
  }

  /** A free shard; the oldest flying one when LIVE_MAX already fly. */
  private free(): number {
    let oldest = -1;
    let open = -1;
    let live = 0;
    for (let s = 0; s < SHARDS; s += 1) {
      if (this.alive[s] === 0) {
        if (open < 0) open = s;
        continue;
      }
      live += 1;
      if (oldest < 0 || this.t0[s]! < this.t0[oldest]!) oldest = s;
    }
    return live >= LIVE_MAX || open < 0 ? oldest : open;
  }

  /** Draws the shards, the core, the priming spark and the stream (between the combat's strips.begin() and end()). */
  draw(w: World, time: number): void {
    const now = time * 1000;
    const dt = this.lastTime < 0 ? 0 : Math.max(0, time - this.lastTime);
    this.lastTime = time;
    const T = w.typing;
    this.ship.core(this.core);
    // The core is drawn a little toward the camera so the hull never hides it.
    this.glow.copy(this.stage.camera.position).sub(this.core).normalize().multiplyScalar(0.8).add(this.core);
    for (let s = 0; s < SHARDS; s += 1) {
      if (this.alive[s] === 0) continue;
      const age = time - this.t0[s]!;
      if (age < 0) continue;
      const k = age / this.life[s]!;
      const color = GUN_COLOR[this.gun[s]!] ?? BLOW.volt;
      if (this.mode[s] === 0) {
        if (k >= 1) {
          this.alive[s] = 0;
          this.hitAt = now;
          continue;
        }
        // Falls faster and faster into the core.
        const e = k * k;
        const x = this.sx[s]! + (this.glow.x - this.sx[s]!) * e;
        const y = this.sy[s]! + (this.glow.y - this.sy[s]!) * e;
        const z = this.sz[s]! + (this.glow.z - this.sz[s]!) * e;
        this.v.set(this.glow.x - x, this.glow.y - y, this.glow.z - z);
        const left = this.v.length();
        this.v.multiplyScalar(Math.min(SHARD.length, left) / Math.max(1e-4, left));
        this.strips.add(x - this.v.x, y - this.v.y, z - this.v.z, x, y, z, SHARD.width, color, 2.4, 0.9);
      } else {
        // Thrown aside: it slows and fades.
        if (k >= 2) {
          this.alive[s] = 0;
          continue;
        }
        const d = age * (1 - k * 0.3);
        const x = this.sx[s]! + this.ax[s]! * d;
        const y = this.sy[s]! - 0.6 * d;
        this.strips.add(x - Math.sign(this.ax[s]!) * SHARD.length, y + 0.05, this.sz[s]!, x, y, this.sz[s]!, SHARD.width, color, 2.2 * (1 - k / 2), 0.7);
      }
    }
    // The core follows the locked word (its bay's colour); let go, it fades in 200 ms (a 0.2 glow stays from streak tier 2).
    const locked = T.lock >= 0;
    if (locked) {
      const length = w.deck[T.word[T.lock]!]!.length;
      this.coreL = length > 0 ? T.typed[T.lock]! / length : 0;
      this.coreGun = w.guns.gun[T.lock]!;
      this.coreOn = 1;
    } else {
      const base = this.streak.tier >= 2 ? 0.2 : 0;
      this.coreOn = base + (this.coreOn - base) * Math.exp(-dt / 0.065);
      if (this.coreOn - base < 0.01) this.coreOn = base;
      this.coreL *= Math.exp(-dt / 0.065);
    }
    const color = GUN_COLOR[this.coreGun] ?? BLOW.volt;
    let radius = 0.35 + 0.5 * this.coreL;
    let intensity = (1.2 + 1.6 * this.coreL) * this.coreOn;
    const got = now - this.hitAt;
    if (got >= 0 && got < 90) intensity *= 1 + 0.3 * (1 - got / 90);
    const bad = now - this.badAt;
    if (bad >= 0 && bad < 200) intensity *= bad < 50 && Math.floor(bad / 16.7) % 2 === 0 ? 0.45 : 0.75;
    const flash = now - this.flashAt;
    // 3 frames (0, 16.7, 33.3 ms; the frame clock's sums sit a hair under 50 at the fourth).
    if (flash >= 0 && flash < 45) {
      radius *= 1.8;
      intensity = 4;
    }
    this.shown = intensity;
    if (intensity > 0.01) this.glows.stamp(CELL.core, this.glow.x, this.glow.y, this.glow.z, radius, 0, color, intensity);
    // From half the word, a small spark flickers at the muzzle (12 Hz): the gun is about to be fed.
    if (locked && this.coreL >= 0.5 && Math.sin(time * Math.PI * 24) > 0) {
      this.ship.muzzle(this.tip);
      this.glows.stamp(CELL.star4, this.tip.x, this.tip.y, this.tip.z, 0.3, time * 4, color, 2);
    }
    // A loaded word: a stream of energy runs from the core to the muzzle in 3 frames.
    const flow = now - this.flowAt;
    if (flow >= 0 && flow < 85) {
      this.ship.muzzle(this.tip);
      const k = Math.min(1, flow / 50);
      const fade = flow < 50 ? 1 : 1 - (flow - 50) / 35;
      const c = GUN_COLOR[this.flowGun] ?? BLOW.volt;
      this.strips.add(this.glow.x, this.glow.y, this.glow.z, this.glow.x + (this.tip.x - this.glow.x) * k, this.glow.y + (this.tip.y - this.glow.y) * k, this.glow.z + (this.tip.z - this.glow.z) * k, 0.35, c, 2.4 * fade, 0.8 * fade);
    }
    this.ship.boost = this.streak.tier >= 3 ? 1.3 : 1;
  }
}
