/**
 * The player's ship at the bottom of the corridor (docs/BUILD_S0.md §3):
 * Vanguard by default, or Draconis, the model in Campaign 3D's Hero rig
 * (engine ribbons, the hit knock). It lives on the screen without moving the
 * sim (docs/FEEL_PASS_S1.md §5, numbers in ship-rules.ts): it drifts toward
 * the side the horde presses (±1.6 m) and banks into the move, turns its whole
 * body to the heaviest blow of the last 0.3 s, kicks back and pitches up by
 * gun, lunges 0.35 m forward when a word loads, hovers, and its engines burn
 * harder with thrust. The sim keeps it and its muzzles at (0; 1.7); shots
 * leave its real muzzles (FX_MUZZLE_L / _R for Xung, FX_MUZZLE for the rest,
 * FX_CORE for Pháo Sao) and join the sim's path within 3 m (§4.1). Reduced
 * motion: no drift, lunge or hover; recoil × 0.3. Without its model a small
 * hull made in code stands in (muzzles 0.45 m either side), so the page always
 * plays.
 */
import * as THREE from "three";
import { Hero, damp, loadModel, pickModelTier } from "../kit/three";
import { GUN } from "../content/guns";
import { FIELD } from "../content/rules";
import { beamEnd } from "../sim/guns/aim";
import type { World } from "../sim/world";
import { CELL, type Glows, type Strips } from "./fx";
import { models } from "./models";
import { AIM, AIM_LEVELS, AIM_PRIO, DRIFT, ENGINE, HOLD, KICK, KICKS, NOSE_MAX_Z, REDUCED, driftBank, driftTarget, holdStep, hover, kickLevel, pickAim, springStep, threatSums, thrust, yawTo, type KickName } from "./ship-rules";
import { BLOW } from "./theme";

export type Pilot = "vanguard" | "draconis";
/** Muzzle sockets: the centre gun, Xung's left and right, the core (Pháo Sao fires upward from it). */
export const MUZZLE = { centre: 0, left: 1, right: 2, core: 3 } as const;
const SOCKETS = ["FX_MUZZLE", "FX_MUZZLE_L", "FX_MUZZLE_R", "FX_CORE"] as const;
/** Where a socket stands when the model has none (ship space: the root rides 0.9 m over the deck). */
const ANCHORS: readonly (readonly [number, number, number])[] = [[0, 0.05, -1.5], [-0.45, 0.05, -1.5], [0.45, 0.05, -1.5], [0, 0.35, -0.2]];
const ENGINES = ["FX_ENGINE_L", "FX_ENGINE_R", "FX_ENGINE_C"] as const;
const RIDE = 0.9;
export const PILOT_COLORS: Record<Pilot, { shot: THREE.Color; beam: THREE.Color }> = {
  vanguard: { shot: new THREE.Color("#3db8ff"), beam: new THREE.Color("#ff8c32") },
  draconis: { shot: new THREE.Color("#ff8a3a"), beam: new THREE.Color("#ff5a1f") },
};
const KICK_INDEX = Object.fromEntries(KICKS.map((name, k) => [name, k])) as Record<KickName, number>;

function stand(): THREE.Group {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#aeb8c2", metalness: 0.75, roughness: 0.35, emissive: "#0d2a4a" }));
  const wings = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.9), new THREE.MeshStandardMaterial({ color: "#46525e", metalness: 0.7, roughness: 0.45 }));
  wings.position.z = 0.4;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2, 3) }));
  glow.position.z = 1.15;
  glow.name = "FX_ENGINE_C";
  group.add(hull, wings, glow);
  return group;
}

/** The pose drawn this frame (the scenarios' probe, info().ship): metres, radians, 0 … 1. */
export type ShipPose = { x: number; vx: number; target: number; weight: number; yaw: number; aim: number; back: number; down: number; pitch: number; roll: number; bob: number; nose: number; thrust: number };

export class Ship {
  readonly root = new THREE.Group();
  private hero: Hero | null = null;
  private readonly fallback = stand();
  private readonly tip = new THREE.Vector3();
  private readonly mouths = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private readonly anchors: THREE.Object3D[] = ANCHORS.map(([x, y, z]) => {
    const node = new THREE.Object3D();
    node.position.set(x, y, z);
    return node;
  });
  private readonly nodes: THREE.Object3D[] = this.anchors.slice();
  private engines: THREE.Object3D[] = [];
  /** The engine's glow × this (the clean streak's tier 3, FEEL_PASS_S1 §3.6). */
  boost = 1;
  loaded = false;
  /** The motion's own clock (s): it runs with the frames drawn, so the hover and kicks hold still under the pause. */
  private t = 0;
  private hurtFlash = 0;
  /** Springs: the drift (x, vx) and the turn (yaw, its speed). */
  private readonly drift = new Float64Array(2);
  private readonly turn = new Float64Array(2);
  private readonly kickAt = new Float64Array(KICKS.length).fill(-1e9);
  private side = 1;
  private readonly cueAt = new Float64Array(AIM_LEVELS).fill(-1e9);
  private readonly cueX = new Float64Array(AIM_LEVELS);
  private readonly cueZ = new Float64Array(AIM_LEVELS);
  private charge = 0;
  private burn = 0;
  /** The kit rig's own slow sway (Hero.update banks ±0.05 rad at 0.9 rad/s): followed here and taken off, so the hover is §5.4's. */
  private kitBank = 0;
  /** The nose's sim z with the ship at rest (the lunge stops it at NOSE_MAX_Z). */
  private nose = 1.2;
  private readonly sums = { wx: 0, wz: 0, w: 0 };
  private readonly hov = { y: 0, roll: 0, pitch: 0 };
  private readonly end = new Float64Array(2);
  private readonly color: THREE.Color;
  readonly pose: ShipPose = { x: 0, vx: 0, target: 0, weight: 0, yaw: 0, aim: 0, back: 0, down: 0, pitch: 0, roll: 0, bob: 0, nose: 0, thrust: 0 };

  constructor(scene: THREE.Scene, readonly pilot: Pilot, public reduced = false) {
    this.root.position.set(0, RIDE, 0);
    this.root.rotation.order = "YXZ";
    this.root.add(this.fallback, ...this.anchors);
    this.engines = [this.fallback.getObjectByName("FX_ENGINE_C")!];
    this.color = pilot === "draconis" ? BLOW.ember : PILOT_COLORS.vanguard.shot;
    scene.add(this.root);
    this.root.updateMatrixWorld(true);
    this.measureNose();
    this.place();
  }

  async load(scene: THREE.Scene): Promise<void> {
    const kind = this.pilot === "vanguard" ? "ships" : "heroes";
    for (const id of this.pilot === "vanguard" ? ["vanguard"] : ["draconis-v3", "draconis-v2", "draconis"]) {
      const entry = await models.entry(kind, id);
      const url = entry === null ? null : pickModelTier(entry, "high");
      if (url === null) continue;
      try {
        const gltf = await loadModel(url);
        const ship = this.pilot === "vanguard";
        const hero = new Hero(gltf.scene, gltf.animations, {
          tipsPerSide: ship ? 0 : 2,
          trail: 24,
          palette: [PILOT_COLORS[this.pilot].shot, new THREE.Color("#ffffff")],
          fitSize: ship ? 3.2 : 3.6,
          trailSockets: ship ? ["FX_ENGINE_L", "FX_ENGINE_R", "FX_ENGINE_C"] : undefined,
          pitch: { idle: 0, fly: 0, boost: 0 },
          knock: ship ? 1 : 0.6,
          faceAway: !ship,
          // The hover is this file's (§5.4).
          bob: false,
        });
        this.fallback.removeFromParent();
        this.root.add(hero.root);
        for (const ribbon of hero.ribbons) scene.add(ribbon.mesh);
        this.hero = hero;
        this.kitBank = 0;
        SOCKETS.forEach((name, k) => (this.nodes[k] = hero.node(name) ?? this.anchors[k]!));
        this.engines = ENGINES.map((name) => hero.node(name)).filter((node): node is THREE.Object3D => node !== null);
        this.root.updateMatrixWorld(true);
        this.measureNose();
        this.loaded = true;
        return;
      } catch {
        // Not on this server: try the next, else keep the stand-in.
      }
    }
  }

  /** The nose's sim z at rest: the model's farthest point forward with the ship unturned at the origin. */
  private measureNose(): void {
    const saved = this.root.position.clone();
    const rotation = this.root.rotation.clone();
    this.root.position.set(0, RIDE, 0);
    this.root.rotation.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.hero?.root ?? this.fallback);
    this.nose = Number.isFinite(box.min.z) ? -box.min.z : 1.2;
    this.root.position.copy(saved);
    this.root.rotation.copy(rotation);
    this.root.updateMatrixWorld(true);
  }

  /** Muzzle `which` (MUZZLE) in world space, as of this frame's update. */
  muzzle(out: THREE.Vector3, which = 0): THREE.Vector3 {
    return out.copy(this.mouths[which]!);
  }

  /** Reads the sockets (or their anchors) after the ship moved. */
  private place(): void {
    this.nodes.forEach((node, k) => node.getWorldPosition(this.mouths[k]!));
  }

  /** The ship's core (FX_CORE) in world space; its anchor without one. */
  core(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.mouths[MUZZLE.core]!);
  }

  /** A gun's kick or a load's lunge (§5.2); `side` the Xung muzzle that fired (MUZZLE.left / right): the body rocks ±0.6° by it. */
  kick(name: KickName, side = 0): void {
    this.kickAt[KICK_INDEX[name]] = this.t;
    if (name === "xung") this.side = side === MUZZLE.left ? 1 : -1;
  }

  /** A blow to turn to (§5.1): its priority (AIM_PRIO) and the sim point it goes for. */
  cue(prio: number, x: number, z: number): void {
    this.cueAt[prio] = this.t;
    this.cueX[prio] = x;
    this.cueZ[prio] = z;
  }

  hurt(): void {
    this.hurtFlash = 1;
    this.hero?.hurt(0.4);
  }

  /**
   * One frame: the drift from the near horde, the turn to the heaviest blow
   * (`aim`, the sim's unit aim of the bay firing, when no blow was cued), the
   * kicks and held states, the hover; then the rig and the sockets.
   */
  update(dt: number, w: World, aim: Float64Array, eye: THREE.Vector3): void {
    this.t += dt;
    const t = this.t;
    const live = !this.reduced;
    // §5.3: drift toward the side the horde presses.
    threatSums(w.foes, this.sums);
    const target = live ? driftTarget(this.sums.wx, this.sums.w, t) : 0;
    springStep(this.drift, 0, target, DRIFT.omega, DRIFT.zeta, DRIFT.vmax, dt);
    const x = this.drift[0]!;
    const vx = this.drift[1]!;
    // §5.2 held states: Ray charging, Tia burning (and Tia's ray as the lightest blow to turn to).
    const G = w.guns;
    let charging = false;
    let burning = false;
    for (let b = 0; b < G.gun.length; b += 1) {
      if (G.gun[b] === GUN.ray && G.mags[b]! > 0 && G.charge[b]! > 0) charging = true;
      if (G.gun[b] === GUN.tia && G.beamOn[b] === 1) {
        burning = true;
        beamEnd(G.beamX[b]!, this.end);
        this.cue(AIM_PRIO.tia, this.end[0]!, this.end[1]!);
      }
    }
    this.charge = holdStep(this.charge, charging, HOLD.charge.rise, HOLD.charge.fall, dt);
    this.burn = holdStep(this.burn, burning, HOLD.tia.rise, HOLD.tia.fall, dt);
    // §5.1: turn to the heaviest blow of the last 0.3 s; else face the near horde, else along the sim's last aim.
    const p = pickAim(this.cueAt, t);
    const S = this.sums;
    const facing = p > 0 ? yawTo(x, FIELD.muzzleZ, this.cueX[p]!, this.cueZ[p]!) : S.w >= DRIFT.fade[0] ? yawTo(x, FIELD.muzzleZ, S.wx / S.w, S.wz / S.w) : yawTo(0, 0, aim[0]!, aim[1]!);
    springStep(this.turn, 0, facing, AIM.omega, AIM.zeta, AIM.speed, dt);
    // §5.2: kicks by gun and the lunge of a load (none under reduced motion; recoil × 0.3).
    const scale = live ? 1 : REDUCED.recoil;
    let back = 0;
    let down = 0;
    let pitch = 0;
    let push = 0;
    for (let k = 0; k < KICKS.length; k += 1) {
      const name = KICKS[k]!;
      const spec = KICK[name];
      const lunge = name === "load";
      if (lunge && !live) continue;
      const level = kickLevel(t - this.kickAt[k]!, spec.rise, spec.ret) * (lunge ? 1 : scale);
      if (level <= 0) continue;
      back += spec.back * level;
      down += spec.down * level;
      pitch += spec.pitch * level;
      push = Math.max(push, lunge ? level : (level * Math.abs(spec.back)) / KICK.tan.back);
    }
    back += HOLD.tia.back * this.burn * scale;
    down += HOLD.charge.down * this.charge * scale;
    const shake = (HOLD.charge.shake * this.charge * Math.sin(2 * Math.PI * HOLD.charge.hz * t) + HOLD.tia.shake * this.burn * Math.sin(2 * Math.PI * HOLD.tia.hz * t)) * scale;
    const yaw = this.turn[0]! + this.side * AIM.wobble * kickLevel(t - this.kickAt[KICK_INDEX.xung]!, KICK.xung.rise, AIM.wobbleRet) * scale;
    // The nose stays behind sim z 2.1 m however far it lunges.
    const cos = Math.cos(yaw);
    if (back < 0 && cos > 0) back = Math.max(back, -Math.max(0, NOSE_MAX_Z - this.nose) / cos);
    if (live) hover(t, this.hov);
    else this.hov.y = this.hov.roll = this.hov.pitch = 0;
    const roll = driftBank(vx) + this.hov.roll;
    const sin = Math.sin(yaw);
    this.root.position.set(x + sin * back + shake, RIDE + this.hov.y - down, cos * back);
    this.root.rotation.set(pitch + this.hov.pitch, yaw, 0, "YXZ");
    this.root.updateMatrixWorld(true);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    const power = thrust(vx, push);
    if (this.hero !== null) {
      this.kitBank = damp(this.kitBank, Math.sin(t * 0.9) * 0.05, 7, dt);
      this.hero.turnYaw = 0;
      this.hero.turnBank = roll - this.kitBank;
      this.hero.update(dt, t, 0, 0);
      this.hero.setLook(this.hurtFlash, 0.4 * this.boost + push * 0.6, 1);
      this.place();
      // Engine trails stream back toward the camera.
      this.hero.tips.forEach((tip, index) => {
        const ribbon = this.hero!.ribbons[index];
        if (ribbon !== undefined) ribbon.update(tip.getWorldPosition(this.tip), dt, dt * 9, eye, 0.7);
      });
    } else {
      this.fallback.rotation.z = roll;
      this.fallback.updateMatrixWorld(true);
      this.place();
    }
    const P = this.pose;
    P.x = x;
    P.vx = vx;
    P.target = target;
    P.weight = this.sums.w;
    P.yaw = yaw;
    P.aim = p;
    P.back = back;
    P.down = down;
    P.pitch = pitch + this.hov.pitch;
    P.roll = roll;
    P.bob = this.hov.y;
    P.nose = this.nose + (back < 0 ? -back * cos : 0);
    P.thrust = power;
  }

  /**
   * §5.4: the engines' halo (0.35 m, 0.7, ±10 % at 18 Hz) and a flame
   * streaming back, both growing with thrust (× 1.6; 0.6 → 1.4 m). Drawn into
   * the fight's glows and strips (between strips.begin() and end()): no draw
   * call of their own.
   */
  drawEngines(glows: Glows, strips: Strips): void {
    if (this.engines.length === 0) return;
    const u = this.pose.thrust;
    const flicker = 1 + ENGINE.flicker * Math.sin(2 * Math.PI * ENGINE.flickerHz * this.t);
    const halo = 2 * ENGINE.halo * (1 + (ENGINE.boost - 1) * u);
    // The clean streak's tier 3 burns them × 1.3 (§3.6).
    const k = flicker * this.boost;
    const flame = ENGINE.flame[0] + (ENGINE.flame[1] - ENGINE.flame[0]) * u;
    // Back along the ship's axis, a little down: toward the camera behind and above.
    const yaw = this.pose.yaw;
    const bx = Math.sin(yaw);
    const bz = Math.cos(yaw);
    for (const node of this.engines) {
      const at = node.getWorldPosition(this.tip);
      glows.stamp(CELL.soft, at.x, at.y, at.z, halo * flicker, 0, this.color, ENGINE.alpha * (1 + 0.5 * u) * this.boost);
      glows.stamp(CELL.core, at.x, at.y, at.z, halo * 0.35, 0, BLOW.hot, (0.5 + 0.6 * u) * k);
      strips.add(at.x + bx * flame, at.y - 0.1 * flame, at.z + bz * flame, at.x, at.y, at.z, 0.22 + 0.12 * u, this.color, (0.9 + 0.9 * u) * k, 0.35 + 0.3 * u);
    }
  }
}
