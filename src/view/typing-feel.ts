/**
 * Each key of a word, seen and heard (docs/FEEL_PASS_S1.md §3, §12). Reads
 * the sim's typing events with its own cursor (never writing the world) and
 * drives the word line and bays (hud.ts, strip.ts), the field and the sounds:
 * - a right key pops its letter and marks the field on its own frame
 *   (KEY_MARK): a bolt from under the letter into the ship's core, a star at
 *   each end, the deck under the ship lit with a ring out past the painted
 *   one; the core glows brighter with each letter of the locked word; a note
 *   climbs the A-minor pentatonic;
 * - a wrong key dims the core with red sparks; a stray key only ghosts;
 * - Pulse Gun's two muzzles and Heat Beam's gather the locked word (CHARGE:
 *   phase A, growing with each letter, embers drawn in on each key);
 * - a finished word flashes the core and runs a stream to the muzzle; into a
 *   full bay its last key's bolt is thrown aside;
 * - the clean streak widens the marks, adds an octave, keeps the core aglow.
 * Reduced motion: a still bolt, no sparks, a fainter ring. No shot per key (§3.1).
 */
import * as THREE from "three";
import type { ThemeAudio } from "../audio/theme-audio";
import type { ParticlePool } from "../kit/three";
import { GUN } from "../content/guns";
import { EV, FLAG } from "../sim/events";
import type { World } from "../sim/world";
import { CELL, FLAT, type Glows, type Strips } from "./fx";
import type { Hud } from "./hud";
import type { Stage } from "./scene";
import { MUZZLE, type Ship } from "./ship";
import { BLOW } from "./theme";
import { CHARGE, CleanStreak, KEY_MARK as K, chargePower, chargeSize, keyMarkLive } from "./type-rules";

/** Key marks kept (10 keys a second hold 2 at once). */
const MARKS = 8;
const PENDING = 32;
const F = 1 / 60;
/** The gun colours (GUN ids: Xung, Tia, Tán, Ray, Pháo Sao); Ray's mark in its ink (its white-blue drowned in Tia's light). */
const GUN_COLOR = [BLOW.volt, BLOW.swarm, BLOW.tan, new THREE.Color("#8fa3ff"), BLOW.phao] as const;
const PAN = [-0.35, 0.35, -0.6, 0.6] as const;
const TYPING = new THREE.Color("#7ff5e0");

export class TypeFeel {
  private cursor = 0;
  readonly streak = new CleanStreak();
  // Key marks: where the bolt leaves (under the letter), its key's time (s), gun (+ 8 thrown aside: a full bay), its crackle's seed.
  private readonly mx = new Float32Array(MARKS);
  private readonly my = new Float32Array(MARKS);
  private readonly mz = new Float32Array(MARKS);
  private readonly mt = new Float64Array(MARKS).fill(-1e9);
  private readonly mg = new Uint8Array(MARKS);
  private readonly ms = new Float32Array(MARKS);
  private marks = 0;
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
  /** A beam (Tia) lights the deck: the deck parts of a key's mark burn brighter (§13). */
  private lit = false;
  /** The core's intensity drawn last frame (the scenarios' probe). */
  private shown = 0;
  private readonly core = new THREE.Vector3();
  private readonly glow = new THREE.Vector3();
  private readonly tip = new THREE.Vector3();
  private readonly from = new THREE.Vector3();
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

  /** The keys' billboards and strips alive now (§6: ≤ 12 at 10 keys a second; the scenarios read it through info()). */
  get live(): number {
    let n = 0;
    for (let m = 0; m < MARKS; m += 1) n += keyMarkLive(this.lastTime - this.mt[m]!);
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
    this.lit = w.guns.beamOn.includes(1);
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
        const q = this.pending;
        if (q < PENDING) {
          this.pIndex[q] = typed - 1; this.pGun[q] = w.guns.gun[slot]!; this.pAside[q] = 0; this.pSlot[q] = slot;
          this.pending = q + 1;
        }
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

  /** After hud.update(): this frame's keys mark the field from under their letters, whole on f0 (KEY_MARK; the bolt in draw()). */
  land(now: number): void {
    const t = now / 1000;
    const reduced = this.hud.reduced;
    const tier = this.streak.tier;
    this.ship.core(this.core);
    for (let p = 0; p < this.pending; p += 1) {
      if (!this.hud.strip.anchor(this.pIndex[p]!, this.point)) continue;
      const tip = this.stage.unproject(this.point.x, this.point.y, 0.95, this.tip);
      const m = this.marks++ % MARKS;
      const aside = this.pAside[p] === 1;
      const c = GUN_COLOR[this.pGun[p]!] ?? BLOW.volt;
      this.mx[m] = tip.x; this.my[m] = tip.y; this.mz[m] = tip.z; this.mt[m] = t;
      this.mg[m] = this.pGun[p]! + (aside ? 8 : 0);
      this.ms[m] = Math.random() * 100;
      // Its star just under the plate (behind it, it lit the plate's backdrop; the DOM spark marks the letter itself).
      this.glows.burst(CELL.star4, tip.x, tip.y - 0.4, tip.z, K.star * 0.5, K.star, 4 * F, c, K.power, 0, 0, 0, 0, NaN);
      if (!reduced) for (let k = 0; k < 3; k += 1) this.sparks.spawn(tip, this.v.set((Math.random() - 0.5) * 3, -1 - Math.random() * 2, (Math.random() - 0.5) * 2), c, 0.2, 0.3, { drag: 3, gravity: 6 });
      if (aside) continue;
      this.hitAt = now;
      this.gather(this.pGun[p]!, c, reduced);
      const wide = (tier >= 1 ? 1.15 : 1) * (reduced ? 0.8 : 1);
      this.glows.burst(CELL.star8, this.glow.x, this.glow.y, this.glow.z, K.core * 0.5, K.core, 4 * F, c, K.power * 0.85, 0, 0, 0, 0, NaN);
      const lit = this.lit ? K.lit : 1;
      this.glows.burst(CELL.soft + FLAT, this.core.x, 0.07, this.core.z, K.pool, K.pool * 1.25, 3 * F, c, 0.35, 0, 0, 0, 0, NaN);
      this.glows.burst(CELL.ring + FLAT, this.core.x, 0.08, this.core.z, K.ring[0] * wide, K.ring[1] * wide, K.ringLife, c, K.ringPower * lit * (reduced ? 0.6 : 1), 0, 0, 0, 0, NaN);
      if (tier >= 4) this.glows.burst(CELL.ring + FLAT, this.core.x, 0.085, this.core.z, 1, 2.6, 0.2, TYPING, 0.45);
    }
    this.pending = 0;
  }

  /** Draws the bolts, the core, the priming spark and the stream (between the combat's strips.begin() and end()). */
  draw(w: World, time: number): void {
    const now = time * 1000;
    const dt = this.lastTime < 0 ? 0 : Math.max(0, time - this.lastTime);
    this.lastTime = time;
    const T = w.typing;
    this.ship.core(this.core);
    // The core is drawn a little toward the camera so the hull never hides it.
    this.glow.copy(this.stage.camera.position).sub(this.core).normalize().multiplyScalar(0.8).add(this.core);
    const reduced = this.hud.reduced;
    for (let m = 0; m < MARKS; m += 1) {
      const age = time - this.mt[m]!;
      if (age < 0 || age >= K.life) continue;
      // Whole for 2 frames, then gone by the fifth; it ends in the core, or 1.6 m aside and down (a full bay takes nothing).
      const fade = Math.min(1, (1 - age / K.life) / 0.6);
      const aside = this.mg[m]! >= 8 ? (this.ms[m]! % 2 < 1 ? -1.6 : 1.6) : 0;
      const sx = this.mx[m]!, sy = this.my[m]!, sz = this.mz[m]!;
      const end = aside === 0 ? this.glow : this.tip.set(sx + aside, sy - 0.5, sz);
      // Bowed out to the letter's side, off Tia's column (§13); its joints jump at f2 and f4, a crackle (under reduced motion they hold still, nearer the line).
      const seed = this.ms[m]! + (reduced ? 0 : Math.floor(age * 30) * 7);
      const width = K.width * (this.streak.tier >= 1 ? 1.25 : 1) * (this.lit ? 1.2 : 1);
      const side = Math.abs(sx - end.x) > 0.3 ? Math.sign(sx - end.x) : this.ms[m]! % 2 < 1 ? -1 : 1;
      const c = GUN_COLOR[this.mg[m]! & 7] ?? BLOW.volt;
      let ax = sx; let ay = sy; let az = sz;
      for (let j = 1; j <= 4; j += 1) {
        const u = j / 4;
        const bx = sx + (end.x - sx) * u + (aside === 0 ? 4 * u * (1 - u) * K.bow * side : 0) + (j < 4 ? Math.sin(seed * 12.9898 + j * 78.233) * K.jitter * (reduced ? 0.4 : 1) : 0);
        const by = sy + (end.y - sy) * u;
        const bz = sz + (end.z - sz) * u;
        // Past the first, each joint is drawn from half a segment back: its faded tail lies on the one before (a whole line).
        const back = j === 1 ? 0 : 0.5;
        this.strips.add(ax - (bx - ax) * back, ay - (by - ay) * back, az - (bz - az) * back, bx, by, bz, width, c, K.power * fade, 0.9 * fade);
        // A fork off the middle joint, out and down toward the deck.
        if (j === 2) this.strips.add(bx, by, bz, bx + side * K.fork, by - 0.35, bz + (end.z - sz) * 0.15, width * 0.6, c, K.power * fade * 0.8, 0.7 * fade);
        ax = bx; ay = by; az = bz;
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
    // Into Pulse Gun or Heat Beam it is smaller (× 1.35, 3): their muzzles carry the release (phase R), the core no longer whites them out.
    if (flash >= 0 && flash < 45) {
      const muzzle = this.coreGun === GUN.xung || this.coreGun === GUN.tia;
      radius *= muzzle ? 1.35 : 1.8;
      intensity = muzzle ? 3 : 4;
    }
    this.shown = intensity;
    if (intensity > 0.01) this.glows.stamp(CELL.core, this.glow.x, this.glow.y, this.glow.z, radius, 0, color, intensity);
    // Pulse Gun's and Heat Beam's muzzles gather the word (A) and let go on the load's frame, where the release takes over (R); the other guns' muzzle flickers from half the word (12 Hz).
    if (locked && (this.coreGun === GUN.xung || this.coreGun === GUN.tia)) this.charge(this.coreL, now, time, reduced);
    else if (locked && this.coreL >= 0.5 && Math.sin(time * Math.PI * 24) > 0) {
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

  /** Phase A at Pulse Gun's two muzzles or Heat Beam's: a glow in the gun's colour, a core a third of it, a star from half the word. */
  private charge(p: number, now: number, time: number, reduced: boolean): void {
    const gun = this.coreGun;
    const c = GUN_COLOR[gun] ?? BLOW.volt;
    const size = chargeSize(p, now - this.hitAt);
    const power = chargePower(p, now - this.hitAt);
    for (let s = 0; s < (gun === GUN.xung ? 2 : 1); s += 1) {
      const m = this.ship.muzzle(this.tip, gun === GUN.xung ? MUZZLE.left + s : MUZZLE.centre);
      this.glows.stamp(CELL.soft, m.x, m.y, m.z, size, 0, c, power);
      this.glows.stamp(CELL.core, m.x, m.y, m.z, size * CHARGE.core, 0, c, power * 1.3);
      if (p >= CHARGE.star) this.glows.stamp(gun === GUN.xung ? CELL.star4 : CELL.star8, m.x, m.y, m.z, size * 1.3, reduced ? 0.4 : time * (3 + 6 * p) + s, c, power * 0.7);
    }
  }

  /** A key into Pulse Gun or Heat Beam: embers drawn into its muzzles from CHARGE.reach m (fewer under reduced motion). */
  private gather(gun: number, c: THREE.Color, reduced: boolean): void {
    if (gun !== GUN.xung && gun !== GUN.tia) return;
    const [r0, r1] = CHARGE.reach;
    for (let k = 0; k < (reduced ? 2 : CHARGE.embers) * (gun === GUN.xung ? 2 : 1); k += 1) {
      const m = this.ship.muzzle(this.tip, gun === GUN.xung ? MUZZLE.left + (k & 1) : MUZZLE.centre);
      const a = Math.random() * 6.283;
      const r = r0 + Math.random() * (r1 - r0);
      this.v.set(Math.cos(a) * r, Math.abs(Math.sin(a)) * r * 0.8, -0.3 * r);
      this.sparks.spawn(this.from.copy(m).add(this.v), this.v.multiplyScalar(-1 / CHARGE.emberLife), c, 0.2, CHARGE.emberLife, { drag: 0, gravity: 0 });
    }
  }
}
