/**
 * The player's ship at the bottom of the corridor (docs/survival/BUILD_S0.md
 * §3): Vanguard by default, or Draconis; the model rides in Campaign 3D's
 * Hero rig (banking, knock-back, engine ribbons). It turns toward Xung's aim
 * and kicks back on each round. Without its model a small hull made in code
 * stands in, so the page always plays.
 */
import * as THREE from "three";
import { loadModel, modelEntry, pickModelTier } from "../../render3d/model-loader";
import { Hero } from "../../scene3d/hero";
import { FIELD } from "../content/rules";

export type Pilot = "vanguard" | "draconis";
export const PILOT_COLORS: Record<Pilot, { shot: THREE.Color; beam: THREE.Color }> = {
  vanguard: { shot: new THREE.Color("#38d4ff"), beam: new THREE.Color("#ffb347") },
  draconis: { shot: new THREE.Color("#ff8a3a"), beam: new THREE.Color("#ff5a1f") },
};

function stand(): THREE.Group {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#c9d6ff", metalness: 0.7, roughness: 0.3, emissive: "#0d2a4a" }));
  const wings = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.9), new THREE.MeshStandardMaterial({ color: "#5a6bb5", metalness: 0.6, roughness: 0.4 }));
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
  loaded = false;

  constructor(scene: THREE.Scene, readonly pilot: Pilot) {
    this.root.position.set(0, 0.9, 0);
    this.root.add(this.fallback);
    scene.add(this.root);
  }

  async load(scene: THREE.Scene): Promise<void> {
    const kind = this.pilot === "vanguard" ? "ships" : "heroes";
    for (const id of this.pilot === "vanguard" ? ["vanguard"] : ["draconis-v3", "draconis-v2", "draconis"]) {
      const entry = await modelEntry(kind, id);
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
        this.loaded = true;
        return;
      } catch {
        // Not on this server: try the next, else keep the stand-in.
      }
    }
  }

  /** The muzzle in world space. */
  muzzle(out: THREE.Vector3): THREE.Vector3 {
    return out.set(Math.sin(-this.yaw) * 1.4, 0.95, -FIELD.muzzleZ + 0.2);
  }

  /** A round fired: a small kick. */
  fired(): void {
    this.kick = Math.min(1, this.kick + 0.35);
    this.hero?.hurt(0.03);
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
      this.hero.setLook(this.hurtFlash, 0.4 + this.kick * 0.6, 1);
      // Engine trails stream back toward the camera: the ship holds still in a flowing field.
      this.hero.tips.forEach((tip, index) => {
        const ribbon = this.hero!.ribbons[index];
        if (ribbon !== undefined) ribbon.update(tip.getWorldPosition(this.tip), dt, dt * 9, eye, 0.7);
      });
    } else {
      this.fallback.rotation.y = this.yaw;
      this.fallback.position.z = this.kick * 0.25;
    }
  }
}
