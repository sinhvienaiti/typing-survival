/**
 * The guns' 3D bolts from Last Line's own library (docs/FEEL_PASS_S1.md §4.1–4.2):
 * one InstancedMesh per kind, each model ~3,000 triangles with its own
 * emissive art, glowing × 2.5 so the bloom takes it. Xung fires
 * vanguard-bolt (Draconis: dragon-fireball), Tán solar-lance-bolt, Ray holds
 * frost-seraph-bolt at its muzzle while armed, Pháo Sao's shells are
 * crimson-talon-bolt. Capped (over the cap a round keeps only its streak);
 * nothing on Low or while a model is missing (the streaks stand alone, as
 * before). Placed every frame; nothing allocated per shot. Their programs
 * compile with the rest of the fight's once they load (warm.ts).
 */
import * as THREE from "three";
import { GUN, type GunId } from "../content/guns";
import type { Tier } from "../content/rules";
import { loadMesh, modelTier } from "./models";

export const BOLT = { xung: 0, tan: 1, ray: 2, phao: 3 } as const;
/** Per kind: models (first found), instance cap, drawn length (m), emissive × this. */
const SPEC = [
  { gun: GUN.xung, ids: ["vanguard-bolt"], cap: 32, length: 1.4, glow: 2.5 },
  { gun: GUN.tan, ids: ["solar-lance-bolt"], cap: 28, length: 0.6, glow: 2.5 },
  { gun: GUN.ray, ids: ["frost-seraph-bolt"], cap: 2, length: 0.9, glow: 2.5 },
  { gun: GUN.phao, ids: ["crimson-talon-bolt"], cap: 8, length: 1, glow: 2.5 },
] as const;
const FIREBALL = { ids: ["dragon-fireball"], cap: 32, length: 1.2, glow: 1.6 } as const;
/** Only equipped guns request files; Low keeps its light streaks. */
export function boltModelRequests(tier: Tier, draconis: boolean, guns: readonly GunId[]) {
  if (tier === "low") return [];
  return SPEC.flatMap((base, kind) => guns.includes(base.gun)
    ? [{ kind, spec: kind === BOLT.xung && draconis ? FIREBALL : base, tier: modelTier(tier) }]
    : []);
}
const NOSE = new THREE.Vector3(0, 0, -1);
const AXIS = new THREE.Vector3(0, 0, 1);

export class Bolts {
  private readonly list: (THREE.InstancedMesh | null)[] = [null, null, null, null];
  private readonly glow = [1, 1, 1, 1];
  private readonly n = new Int32Array(4);
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly spin = new THREE.Quaternion();
  private readonly dir = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  /** Done loading (or nothing to load): the scenarios wait for it. */
  ready = false;

  constructor(private readonly scene: THREE.Scene, private readonly tier: Tier, private readonly draconis: boolean, private readonly guns: readonly GunId[]) {}

  async load(): Promise<void> {
    if (this.tier !== "low") {
      await Promise.all(
        boltModelRequests(this.tier, this.draconis, this.guns).map(async ({ kind, spec, tier }) => {
          const found = await loadMesh("skills", spec.ids, tier);
          if (found === null) return;
          const { geometry, material } = found;
          // Nose at the origin pointing −z, the tail at +z, one unit long.
          geometry.computeBoundingBox();
          const box = geometry.boundingBox!;
          const centre = box.getCenter(new THREE.Vector3());
          geometry.translate(-centre.x, -centre.y, -box.min.z);
          geometry.scale(1 / Math.max(0.01, box.max.z - box.min.z), 1 / Math.max(0.01, box.max.z - box.min.z), 1 / Math.max(0.01, box.max.z - box.min.z));
          material.emissiveIntensity *= spec.glow;
          this.glow[kind] = material.emissiveIntensity;
          const mesh = new THREE.InstancedMesh(geometry, material, spec.cap);
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.count = 0;
          mesh.visible = false;
          mesh.frustumCulled = false;
          mesh.userData.length = spec.length;
          this.list[kind] = mesh;
          this.scene.add(mesh);
        }),
      );
    }
    this.ready = true;
  }

  /** The kind's model is here (a round of it draws as a bolt). */
  has(kind: number): boolean {
    return this.list[kind] !== null;
  }

  begin(): void {
    this.n.fill(0);
  }

  /**
   * A bolt of `kind` with its nose at three point (x, y, z), flying along
   * (dx, dy, dz), turned `roll` rad about its axis, × `size` its length;
   * false over the cap or without the model.
   */
  add(kind: number, x: number, y: number, z: number, dx: number, dy: number, dz: number, roll: number, size = 1): boolean {
    const mesh = this.list[kind];
    if (mesh === null || mesh === undefined || this.n[kind]! >= mesh.instanceMatrix.count) return false;
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) return false;
    this.quat.setFromUnitVectors(NOSE, this.dir.set(dx / length, dy / length, dz / length));
    this.quat.multiply(this.spin.setFromAxisAngle(AXIS, roll));
    const s = (mesh.userData.length as number) * size;
    this.matrix.compose(this.pos.set(x, y, z), this.quat, this.scale.set(s, s, s));
    mesh.setMatrixAt(this.n[kind]!, this.matrix);
    this.n[kind] = this.n[kind]! + 1;
    return true;
  }

  /** The kind's glow × `k` (Ray's armed bolt pulses, flares while it charges). */
  setGlow(kind: number, k: number): void {
    const mesh = this.list[kind];
    if (mesh) (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = this.glow[kind]! * k;
  }

  end(): void {
    this.list.forEach((mesh, kind) => {
      if (mesh === null) return;
      mesh.count = this.n[kind]!;
      mesh.visible = mesh.count > 0;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  /** Bolts drawn this frame by kind (the scenarios' probe). */
  counts(): number[] {
    return Array.from(this.n);
  }
}
