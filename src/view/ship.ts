/**
 * The player's ship at the bottom of the corridor (docs/BUILD_S0.md
 * §3): Vanguard by default, or Draconis; the model rides in Campaign 3D's
 * Hero rig (banking, knock-back, engine ribbons). It turns toward Xung's aim
 * and kicks back on each round. Shots leave its real muzzles (FEEL_PASS_S1
 * §4.1: FX_MUZZLE_L / _R for Xung, FX_MUZZLE for the rest, FX_CORE for Pháo
 * Sao), read once a frame. Without its model a small hull made in code stands
 * in (muzzles 0.45 m either side), so the page always plays.
 */
import * as THREE from "three";
import { Hero, loadModel, pickModelTier } from "../kit/three";
import { models } from "./models";
import { FIELD } from "../content/rules";

export type Pilot = "vanguard" | "draconis";
/** Muzzle sockets: the centre gun, Xung's left and right, the core (Pháo Sao fires upward from it). */
export const MUZZLE = { centre: 0, left: 1, right: 2, core: 3 } as const;
const SOCKETS = ["FX_MUZZLE", "FX_MUZZLE_L", "FX_MUZZLE_R", "FX_CORE"] as const;
export const PILOT_COLORS: Record<Pilot, { shot: THREE.Color; beam: THREE.Color }> = {
  vanguard: { shot: new THREE.Color("#3db8ff"), beam: new THREE.Color("#ff8c32") },
  draconis: { shot: new THREE.Color("#ff8a3a"), beam: new THREE.Color("#ff5a1f") },
};

function stand(): THREE.Group {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#aeb8c2", metalness: 0.75, roughness: 0.35, emissive: "#0d2a4a" }));
  const wings = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.9), new THREE.MeshStandardMaterial({ color: "#46525e", metalness: 0.7, roughness: 0.45 }));
  wings.position.z = 0.4;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2, 3) }));
  glow.position.z = 1.15;
  group.add(hull, wings, glow);
  return group;
}

export class Ship {
  readonly root = new THREE.Group();
  private hero: Hero | null = null;
  private readonly fallback = stand();
  private yaw = 0;
  private kick = 0;
  private hurtFlash = 0;
  private readonly tip = new THREE.Vector3();
  private readonly mouths = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private readonly nodes: (THREE.Object3D | null)[] = [null, null, null, null];
  /** The engine's glow × this (the clean streak's tier 3, FEEL_PASS_S1 §3.6). */
  boost = 1;
  loaded = false;

  constructor(scene: THREE.Scene, readonly pilot: Pilot) {
    this.root.position.set(0, 0.9, 0);
    this.root.add(this.fallback);
    scene.add(this.root);
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
        });
        this.fallback.removeFromParent();
        this.root.add(hero.root);
        for (const ribbon of hero.ribbons) scene.add(ribbon.mesh);
        this.hero = hero;
        SOCKETS.forEach((name, k) => (this.nodes[k] = hero.node(name)));
        this.loaded = true;
        return;
      } catch {
        // Not on this server: try the next, else keep the stand-in.
      }
    }
  }

  /** Muzzle `which` (MUZZLE) in world space, as of this frame's update. */
  muzzle(out: THREE.Vector3, which = 0): THREE.Vector3 {
    return out.copy(this.mouths[which]!);
  }

  /** Reads the sockets after the rig moved; the stand-in's (and a missing socket's) from the yaw. */
  private place(): void {
    // The ship's right in three: (cos yaw, 0, −sin yaw).
    const c = Math.cos(this.yaw) * 0.45;
    const s = Math.sin(this.yaw) * 0.45;
    const centre = this.mouths[0]!.set(Math.sin(-this.yaw) * 1.4, 0.95, -FIELD.muzzleZ + 0.2);
    this.mouths[1]!.set(centre.x - c, 0.95, centre.z + s);
    this.mouths[2]!.set(centre.x + c, 0.95, centre.z - s);
    this.mouths[3]!.set(0, 1.25, -0.2);
    this.nodes.forEach((node, k) => node?.getWorldPosition(this.mouths[k]!));
  }

  /** The ship's core (FX_CORE) in world space; the hull's centre without the model. */
  core(out: THREE.Vector3): THREE.Vector3 {
    if (this.hero !== null) return this.hero.socketWorld(this.hero.sockets.core, out, [0, 0, 0]);
    return out.set(this.fallback.position.x, this.root.position.y + 0.15, this.fallback.position.z);
  }

  /** A round fired: a small kick (`strength`: Tán's blast kicks harder). */
  fired(strength = 0.35): void {
    this.kick = Math.min(1, this.kick + strength);
    this.hero?.hurt(strength * 0.09);
  }

  hurt(): void {
    this.hurtFlash = 1;
    this.hero?.hurt(0.4);
  }

  /** Aim (sim) is Xung's unit direction; turns at most ~50° either way. */
  update(dt: number, time: number, aimX: number, aimZ: number, eye: THREE.Vector3): void {
    const target = Math.max(-0.9, Math.min(0.9, Math.atan2(-aimX, aimZ)));
    this.yaw += (target - this.yaw) * (1 - Math.exp(-14 * dt));
    this.kick *= Math.exp(-18 * dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    if (this.hero !== null) {
      this.hero.turnYaw = this.yaw;
      this.hero.update(dt, time, 0, 0);
      this.hero.setLook(this.hurtFlash, 0.4 * this.boost + this.kick * 0.6, 1);
      this.place();
      // Engine trails stream back toward the camera: the ship holds still in a flowing field.
      this.hero.tips.forEach((tip, index) => {
        const ribbon = this.hero!.ribbons[index];
        if (ribbon !== undefined) ribbon.update(tip.getWorldPosition(this.tip), dt, dt * 9, eye, 0.7);
      });
    } else {
      this.fallback.rotation.y = this.yaw;
      this.fallback.position.z = this.kick * 0.25;
      this.place();
    }
  }
}
