/**
 * Every shot of the five guns, seen (docs/FEEL_PASS_S1.md §4.1–4.2, §4.6,
 * §11–12): each leaves its real muzzle (Ship sockets) and joins the sim's
 * path within 3 m, so where it hits stays the sim's. Xung: 3D bolts, a 3.7 m
 * tracer, a star and a soft flash (a magazine's first round twice as big,
 * sparks, a 1.5 px shove); Tán: three flame tongues, smoke, casings, amber
 * bolts; Pháo Sao: an upward flash, shells ≥ 4 % of the view long, a burst a
 * fifth of the view; a Trâu's or Đầu Đàn's death as its own event (bigKill);
 * the hits' looks by gun. Ray and Tia are BeamFx's (beams.ts). Shots light
 * the deck and the horde (lights.ts). Reads the world, never writes it.
 */
import * as THREE from "three";
import type { ThemeAudio } from "../audio/theme-audio";
import type { Trauma } from "../kit/feedback";
import type { ParticlePool } from "../kit/three";
import { GUN, PHAO } from "../content/guns";
import { FIELD, STORE } from "../content/rules";
import { EV, FLAG, type Ring } from "../sim/events";
import { ROUND } from "../sim/stores";
import { magazineUnits } from "../sim/weapons";
import type { World } from "../sim/world";
import { BeamFx } from "./beams";
import { BOLT, type Bolts } from "./bolts";
import { CELL, FLAT, Streaks, type Glows, type Strips } from "./fx";
import { FEEL, LIGHT, joinWeight, screenMetres } from "./gun-rules";
import type { GunLights } from "./lights";
import type { Stage } from "./scene";
import { MUZZLE, PILOT_COLORS, type Pilot, type Ship } from "./ship";
import { AIM, AIM_PRIO } from "./ship-rules";
import { BLOW as C } from "./theme";
import { tier } from "../kit/feedback";

const BAYS = 8;
/** Height of a shell's arc at the middle of its flight (m). */
const ARC = 6;
const F = 1 / 60;
const Y = 0.95;

/** A big kill's cloud by layer (a sooty base, a dark body, lit tops): puffs, height (m), spread, width from / to (× the view's 16 %), alpha. */
const CLOUD = { n: [5, 16, 23], y: [0.4, 1, 1.8], spread: [1.1, 1.4, 1.1], from: [1.2, 1.4, 0.8], to: [2.8, 4.2, 2.4], alpha: [1.5, 1.6, 0.8] } as const;
const CLOUD_COLOR = [C.soot, C.smokeBody, C.smokeLit] as const;

/** A point of a shell's arc from `m` to (tx, 0.3, tz) at u (0 … 1): a parabola ARC m high at the middle. */
function arcPoint(m: THREE.Vector3, tx: number, tz: number, u: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(m.x + (tx - m.x) * u, m.y + (0.3 - m.y) * u + ARC * 4 * u * (1 - u), m.z + (tz - m.z) * u);
}

export type ShotParts = { stage: Stage; glows: Glows; smoke: Glows; strips: Strips; sparks: ParticlePool; trauma: Trauma; ship: Ship; lights: GunLights; bolts: Bolts; audio: ThemeAudio; pilot: Pilot };

export class ShotFx {
  readonly beams: BeamFx;
  private readonly streaks = new Streaks(32);
  /** Per Xung round (bullet slot): the real muzzle's offset from the sim's when it left (three axes). */
  private readonly ox = new Float32Array(STORE.bullets);
  private readonly oy = new Float32Array(STORE.bullets);
  private readonly oz = new Float32Array(STORE.bullets);
  /** Per bay: the last volley's muzzle offset (its pellets), a fresh magazine, rounds of it fired, the last round and tail (ms), a tail owed. */
  private readonly px = new Float32Array(BAYS);
  private readonly py = new Float32Array(BAYS);
  private readonly pz = new Float32Array(BAYS);
  private readonly fresh = new Uint8Array(BAYS);
  private readonly fired = new Int32Array(BAYS);
  private readonly lastShot = new Float64Array(BAYS).fill(-1e9);
  private readonly lastTail = new Float64Array(BAYS).fill(-1e9);
  private readonly owed = new Uint8Array(BAYS);
  /** Per shell slot: where it left (three). */
  private readonly sx = new Float32Array(STORE.shells);
  private readonly sy = new Float32Array(STORE.shells);
  private readonly sz = new Float32Array(STORE.shells);
  private side = 0;
  private tiaHits = 0;
  /** Metres per view height at the muzzle's depth (× a share of the view: a flash's size). */
  private mPerView = 1;
  private readonly at = new THREE.Vector3();
  private readonly m = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly w3 = new THREE.Vector3();
  private readonly shot: THREE.Color;
  private readonly shotHi: THREE.Color;
  private readonly tia: THREE.Color;
  private readonly draconis: boolean;

  constructor(private readonly p: ShotParts) {
    this.draconis = p.pilot === "draconis";
    this.shot = PILOT_COLORS[p.pilot].shot;
    this.shotHi = this.draconis ? new THREE.Color("#ffb15c") : C.elite;
    this.tia = this.draconis ? PILOT_COLORS.draconis.beam : C.swarm;
    this.beams = new BeamFx({ ...p, streaks: this.streaks, size: (share) => this.size(share) }, this.tia);
  }

  /** The view's size changed: how big a share of its height is at the muzzle. */
  resize(): void {
    const s = this.p.stage;
    const a = s.project(0, FIELD.muzzleZ, Y, this.at, true).x;
    const b = s.project(1, FIELD.muzzleZ, Y, this.v, true).x;
    this.mPerView = screenMetres(1, s.height, Math.abs(b - a));
  }

  /** The ship's muzzles on screen (centre, left, right, core; CSS px): the scenarios' probe. */
  muzzles(): number[][] {
    return [0, 1, 2, 3].map((k) => {
      const m = this.p.ship.muzzle(this.m, k);
      const p = this.p.stage.project(m.x, -m.z, m.y, this.at);
      return [Math.round(p.x), Math.round(p.y)];
    });
  }

  /** Metres that look `share` of the view's height at sim depth z (the muzzle's when not given). */
  private size(share: number, x = 0, z: number = FIELD.muzzleZ): number {
    if (z === FIELD.muzzleZ) return share * this.mPerView;
    const s = this.p.stage;
    const a = s.project(x, z, 1, this.at, true).x;
    return screenMetres(share, s.height, Math.abs(s.project(x + 1, z, 1, this.v, true).x - a));
  }

  private spark(x: number, y: number, z: number, dx: number, dy: number, dz: number, count: number, speed: number, color: THREE.Color, size: number, life: number, spread = 1.2): void {
    for (let k = 0; k < count; k += 1) {
      const s = speed * (0.5 + Math.random() * 0.8);
      this.v.set((dx + (Math.random() - 0.5) * spread) * s, (dy + Math.random() * 0.6) * s, (dz + (Math.random() - 0.5) * spread) * s);
      this.p.sparks.spawn(this.w3.set(x, y, z), this.v, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 3.2, gravity: 9 });
    }
  }

  /** A gun's event (EV.shot, load, volley, charge, launch, burst; rail, beamStart, beamEnd go to the beams), and the ship's kick and turn for it (§5); `now` in ms. */
  event(R: Ring, i: number, w: World, now: number): void {
    const kind = R.kind[i]!;
    const bay = R.slot[i]! & (BAYS - 1);
    const dx = R.dx[i]!;
    const dz = R.dz[i]!;
    const g = this.p.glows;
    const ship = this.p.ship;
    if (kind === EV.load) {
      // A magazine into an idle bay: its gun's next shot is the first of a magazine.
      if (R.value[i] === 1) {
        this.fresh[bay] = 1;
        this.fired[bay] = 0;
      }
      // The ship lunges 0.35 m forward as the word feeds the gun (§3.4, §5.2).
      ship.kick("load");
    } else if (kind === EV.shot) {
      const first = this.fresh[bay] === 1;
      this.fresh[bay] = 0;
      this.fired[bay] = this.fired[bay]! + 1;
      if (this.fired[bay]! >= magazineUnits(w.stage, GUN.xung)) {
        this.fired[bay] = 0;
        this.fresh[bay] = 1;
      }
      this.side ^= 1;
      const m = ship.muzzle(this.m, this.side === 1 ? MUZZLE.left : MUZZLE.right);
      const b = R.ref[i]!;
      if (b >= 0 && b < STORE.bullets) {
        this.ox[b] = m.x;
        this.oy[b] = m.y - Y;
        this.oz[b] = m.z + R.z[i]!;
      }
      const crit = (R.flags[i]! & FLAG.crit) !== 0;
      const soft = this.size(first ? 0.08 : 0.04) * 2.2;
      g.burst(CELL.star4, m.x, m.y, m.z, 0.5, first ? 1.6 : 1.1, 3 * F, crit ? C.crit : this.shot, 3);
      g.burst(CELL.soft, m.x, m.y, m.z, soft * 0.7, soft, (first ? 4 : 3) * F, this.shot, first ? 2.6 : 2);
      g.burst(CELL.core, m.x, m.y, m.z, soft * 0.25, soft * 0.4, (first ? 4 : 3) * F, C.hot, 2.4);
      this.p.lights.flash(first ? LIGHT.xungFirst : LIGHT.xung, m.x, m.y, m.z, this.shot);
      if (first) {
        this.spark(m.x, m.y, m.z, dx, 0.4, -dz, 6, 7, this.shotHi, 0.22, 0.35, 1.6);
        this.p.trauma.kick(-dx, dz, 1.5);
      }
      ship.kick("xung", this.side === 1 ? MUZZLE.left : MUZZLE.right);
      ship.cue(AIM_PRIO.xung, dx * AIM.reach, R.z[i]! + dz * AIM.reach);
      this.p.audio.xung(m.x / FIELD.halfW, first);
      if (first || now - this.lastTail[bay]! >= 500) {
        this.lastTail[bay] = now;
        this.p.audio.xungTail(m.x / FIELD.halfW);
      }
      this.lastShot[bay] = now;
      this.owed[bay] = 1;
    } else if (kind === EV.volley) {
      const m = ship.muzzle(this.m, MUZZLE.centre);
      this.px[bay] = m.x;
      this.py[bay] = m.y - Y;
      this.pz[bay] = m.z + R.z[i]!;
      // Three tongues of flame along the fan (2.2 m, 4 frames), a white-hot flash 10 % of the view, smoke, two casings.
      for (const a of [-0.3, 0, 0.3]) {
        const c = Math.cos(a);
        const s = Math.sin(a);
        const ex = dx * c - dz * s;
        const ez = dz * c + dx * s;
        this.streaks.add(m.x, m.y, m.z, m.x + ex * 2.2, m.y, m.z - ez * 2.2, 0.6, C.tan, 3.2, 1, 4 * F);
      }
      // Three pools of light on the deck along the fan, out to 3 m (3 frames).
      for (let d = 1; d <= 3; d += 1) g.burst(CELL.soft + FLAT, dx * d, 0.06, -(FIELD.muzzleZ + dz * d), 1.2 + 0.5 * d, 1.6 + 0.6 * d, 3 * F, C.tan, 1.5 - 0.25 * d);
      const soft = this.size(0.1) * 2.2;
      g.burst(CELL.soft, m.x, m.y, m.z, soft * 0.7, soft, 4 * F, C.hot, 2.2);
      g.burst(CELL.soft, m.x, m.y + 0.3, m.z, 1, 2.4, 0.5, C.smoke, 0.7, 0, 3, 0);
      this.spark(m.x, m.y, m.z, dz, 0.8, dx, 1, 4, C.hot, 0.2, 0.5, 0.4);
      this.spark(m.x, m.y, m.z, -dz, 0.8, -dx, 1, 4, C.hot, 0.2, 0.5, 0.4);
      this.p.lights.flash(LIGHT.tan, m.x + dx, m.y, m.z - dz, C.tan);
      ship.kick("tan");
      ship.cue(AIM_PRIO.tan, dx * 6, R.z[i]! + dz * 6);
      this.p.trauma.kick(-dx, dz, 3);
    } else if (kind === EV.launch) {
      const m = ship.muzzle(this.m, MUZZLE.core);
      const L = w.shells;
      for (let k = 0; k < L.top; k += 1) {
        if (L.alive[k] === 0 || L.id[k] !== R.ref[i]) continue;
        this.sx[k] = m.x;
        this.sy[k] = m.y;
        this.sz[k] = m.z;
      }
      // An upward streak 2.5 m (5 frames), a white-hot flash 6 % of the view, a column of smoke.
      this.streaks.add(m.x, m.y, m.z, m.x, m.y + 2.5, m.z, 0.55, C.phao, 3, 1, 5 * F);
      const soft = this.size(0.06) * 3;
      g.burst(CELL.soft, m.x, m.y + 0.2, m.z, soft * 0.7, soft, 3 * F, C.hot, 3);
      g.burst(CELL.soft, m.x, m.y + 0.3, m.z, 1, 3, 0.7, C.smoke, 0.9, 0, 1.6, 0);
      ship.kick("phao");
      ship.cue(AIM_PRIO.phao, R.x[i]!, R.z[i]!);
    } else if (kind === EV.burst) {
      const x = R.x[i]!;
      const z = R.z[i]!;
      const radius = R.value[i]!;
      // Sized on the view, not in metres: a white flash a fifth of its height (3 frames), the fireball, a shock ring, smoke rising.
      const core = this.size(0.18, x, z) * 2.2;
      g.burst(CELL.soft, x, 1.4, -z, core * 0.8, core * 1.4, 3 * F, C.white, 1.5);
      g.burst(CELL.core, x, 1, -z, core * 0.5, core, 5 * F, C.hot, 2.8);
      g.burst(CELL.star8, x, 1.2, -z, 1.2, core * 0.9, 0.2, C.phao, 2.4);
      g.burst(CELL.ring + FLAT, x, 0.08, -z, 0.4, Math.max(radius * 2.6, core * 0.8), 0.45, C.phao, 2.4);
      g.burst(CELL.soft + FLAT, x, 0.07, -z, radius * 1.4, radius * 1.8, 1.2, C.ember, 0.45);
      g.burst(CELL.soft, x, 1.2, -z, core * 0.35, core * 0.7, 1.4, C.smoke, 0.8, 0, 1.4, 0);
      this.spark(x, 0.8, -z, 0, 1.4, 0, 32, 9, C.hot, 0.3, 0.7, 2.4);
      this.p.lights.flash(LIGHT.phao, x, 1.5, -z, C.phao);
      this.p.trauma.add(0.05);
    } else if (kind === EV.charge) ship.cue(AIM_PRIO.ray, R.x[i]!, R.z[i]!);
    else if (kind === EV.rail || kind === EV.beamStart || kind === EV.beamEnd) this.beams.event(R, i, now);
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
    const v = this.size(0.16, x, z) * k;
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
    this.spark(x, 1, -z, 0, 1.6, 0, 36, 10, C.hot, 0.32, 0.8, 2.2);
    for (let i = 0; i < 14; i += 1) this.p.sparks.spawn(this.w3.set(x + (r() - 0.5) * 0.5 * v, 1 + r() * 2, -z), this.v.set((r() - 0.5) * 2, 0.5 + r(), (r() - 0.5)), C.ember, 0.28, 1.4 + r(), { drag: 1.2, gravity: -0.6 });
    return tier(3).stopMs;
  }

  /** A blow's look by gun (Combat draws numbers and sounds); `armour`: Vỏ's look is drawn (gunfx). */
  hit(x: number, z: number, dx: number, dz: number, flags: number, t: number, k: number, armour: boolean): void {
    const g = this.p.glows;
    if ((flags & FLAG.phao) !== 0) return;
    if ((flags & FLAG.ray) !== 0) {
      g.burst(CELL.star8, x, 1, -z, 0.6 * k, 2 * k, 4 * F, C.ray, 2.6);
      this.spark(x, 1, -z, dx, 0.3, -dz, 6, 10, C.rayCore, 0.24, 0.35, 0.8);
      return;
    }
    if (armour) return;
    if ((flags & FLAG.tan) !== 0) {
      g.burst(CELL.star4, x, 0.9, -z, 0.3 * k, 0.9 * k, 0.08, C.tan, 1.6);
      this.spark(x, 0.9, -z, dx, 0.3, -dz, 3, 6, C.tan, 0.2, 0.3, 0.8);
      return;
    }
    if ((flags & FLAG.tia) !== 0) {
      this.tiaHits += 1;
      g.burst(CELL.star4, x, 0.9, -z, 0.4 * k, 0.95 * k, 0.08, this.tia, 1.2);
      if ((this.tiaHits & 1) === 0) this.spark(x, 0.9, -z, dx, 0.4, -dz, 2, 5, this.tia, 0.22, 0.35, 2.4);
      return;
    }
    // Xung: a 4-ray star in its bright tint (a crit's 8 rays gold, a perfect crit's 12 and a ring), sparks back along the round.
    const row = tier(t, FEEL.tiers);
    const color = t >= 3 ? C.perfect : t === 2 ? C.crit : this.shotHi;
    g.burst(row.rays === 12 ? CELL.star12 : row.rays === 8 ? CELL.star8 : CELL.star4, x, 0.9, -z, 0.45 * k, (1.1 + (t - 1) * 0.55) * k, (3 + t - 1) * F, color, 2);
    if (row.ring) g.burst(CELL.ring, x, 0.9, -z, 0.4, 3.2, 0.3, C.perfect, 2);
    this.spark(x, 0.9, -z, -dx, 0.3, dz, Math.max(4, row.sparks), 6 + t * 2, color, 0.24, 0.4, 1.6);
  }

  /** Per frame: bolts, tracers, pellets, shells, the beams (Ray, Tia), timed streaks, the light pool, Xung's tails. */
  draw(w: World, dt: number, time: number, lead: number): void {
    const now = time * 1000;
    const S = this.p.strips;
    const g = this.p.glows;
    const bolts = this.p.bolts;
    bolts.begin();
    this.tiaHits = 0;
    const B = w.bullets;
    for (let b = 0; b < B.top; b += 1) {
      if (B.alive[b] === 0) continue;
      const pellet = B.kind[b] === ROUND.pellet;
      const x = B.x[b]! + B.vx[b]! * lead;
      const z = B.z[b]! + B.vz[b]! * lead;
      const speed = Math.hypot(B.vx[b]!, B.vz[b]!) || 1;
      const ux = B.vx[b]! / speed;
      const uz = B.vz[b]! / speed;
      const s = Math.hypot(x, z - FIELD.muzzleZ);
      // The tracer: 3.7 m behind a round (0.08 s at 46 m/s), 2 m behind a pellet; both join the sim's path in 3 m.
      const back = Math.min(s, pellet ? 2 : 3.7);
      const bay = B.bay[b]! & (BAYS - 1);
      const ox = pellet ? this.px[bay]! : this.ox[b]!;
      const oy = pellet ? this.py[bay]! : this.oy[b]!;
      const oz = pellet ? this.pz[bay]! : this.oz[b]!;
      const kh = joinWeight(s);
      const kt = joinWeight(s - back);
      const hx = x + ox * kh;
      const hy = (pellet ? 0.9 : Y) + oy * kh;
      const hz = -z + oz * kh;
      const tx = x - ux * back + ox * kt;
      const ty = (pellet ? 0.9 : Y) + oy * kt;
      const tz = -(z - uz * back) + oz * kt;
      if (pellet) {
        S.add(tx, ty, tz, hx, hy, hz, 0.16, C.tan, 2.6, 0.9);
        bolts.add(BOLT.tan, hx, hy, hz, ux, 0, -uz, time * 10 + b);
        continue;
      }
      const flags = B.flags[b]!;
      const crit = (flags & FLAG.crit) !== 0;
      const color = crit && (flags & FLAG.perfect) !== 0 ? C.perfect : crit ? C.crit : this.shot;
      if (this.draconis) {
        S.add(tx, ty, tz, hx, hy, hz, crit ? 0.7 : 0.55, color, 2, 0.7);
        if (!bolts.add(BOLT.xung, hx, hy, hz, ux, 0, -uz, time * 12 + b, crit ? 1.15 : 1)) g.stamp(CELL.soft, hx, hy, hz, crit ? 1.6 : 1.2, 0, color, 1.6);
      } else {
        S.add(tx, ty, tz, hx, hy, hz, crit ? 0.24 : 0.18, color, 2.4, 0.9);
        // The bolt's dark hull reads ~20 × 8 px from behind the ship: a comet head (a short wide streak, a hot glow) makes each round a lit shot that blooms.
        const head = Math.min(back, 1.1);
        const kq = joinWeight(s - head);
        S.add(x - ux * head + ox * kq, Y + oy * kq, -(z - uz * head) + oz * kq, hx, hy, hz, crit ? 0.5 : 0.4, color, 1.8, 0.75);
        bolts.add(BOLT.xung, hx, hy, hz, ux, 0, -uz, time * 12 + b, crit ? 1.15 : 1);
        g.stamp(CELL.soft, hx, hy, hz, crit ? 1.6 : 1.25, 0, color, 2.1);
      }
    }
    this.shells(w, time, lead);
    this.beams.draw(w, dt, time);
    this.streaks.draw(S, dt);
    bolts.end();
    this.p.lights.update(dt);
    // Xung's corridor slap after the last round of a run.
    for (let bay = 0; bay < BAYS; bay += 1) {
      if (this.owed[bay] === 1 && now - this.lastShot[bay]! > 150) {
        this.owed[bay] = 0;
        this.p.audio.xungTail(0);
      }
    }
  }

  /** Pháo Sao's shells: crimson bolts nose-first along their arcs, a fading trail, the landing ring tightening. */
  private shells(w: World, time: number, lead: number): void {
    const L = w.shells;
    const S = this.p.strips;
    const g = this.p.glows;
    for (let k = 0; k < L.top; k += 1) {
      if (L.alive[k] === 0) continue;
      const t = Math.min(1, (L.flight[k]! - L.left[k]! + lead) / L.flight[k]!);
      const tx = L.x[k]!;
      const tz = -L.z[k]!;
      this.m.set(this.sx[k]!, this.sy[k]!, this.sz[k]!);
      if (this.m.lengthSq() === 0) this.p.ship.muzzle(this.m, MUZZLE.core);
      arcPoint(this.m, tx, tz, t, this.at);
      arcPoint(this.m, tx, tz, Math.max(0, t - 0.08), this.v);
      S.add(this.v.x, this.v.y, this.v.z, this.at.x, this.at.y, this.at.z, 0.45, C.phao, 2.2, 0.8);
      arcPoint(this.m, tx, tz, Math.max(0, t - 0.01), this.w3);
      // At least 4 % of the view long however far it flies (a 1 m bolt read as a 10 px dot 20 m out).
      const big = Math.max(1, this.size(0.04, this.at.x, -this.at.z));
      if (!this.p.bolts.add(BOLT.phao, this.at.x, this.at.y, this.at.z, this.at.x - this.w3.x, this.at.y - this.w3.y, this.at.z - this.w3.z, time * 8 + k, big)) g.stamp(CELL.core, this.at.x, this.at.y, this.at.z, 0.6 * big, 0, C.hot, 2.4);
      g.stamp(CELL.soft, this.at.x, this.at.y, this.at.z, 1.4 * big, 0, C.phao, 1.6);
      g.stamp(CELL.ring + FLAT, tx, 0.06, tz, PHAO.radius * (1.2 - 0.4 * t) * 2, time * 2, C.danger, 1.2);
    }
  }
}
