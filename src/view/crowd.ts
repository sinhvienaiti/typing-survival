/**
 * The horde (docs/survival/BUILD_S0.md §4): one InstancedMesh per kind, as
 * Defense's crowd. The models (rainbow mine and scout) have only an idle
 * clip, so walking is done here: they face the ship, lean into their speed,
 * bob and sway; a hit flashes them white, knocks them back a little and
 * squashes them (src/feedback/reaction.ts), all per-instance numbers with no
 * extra draw call. A missing model (a clean clone has no local GLBs) is
 * replaced by a shape made in code. Soft dark spots under each foe keep the
 * crowd readable on the glass.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reactions } from "../../feedback/reaction";
import { loadModel, modelEntry, pickModelTier } from "../../render3d/model-loader";
import { textures } from "../../scene3d/textures";
import { FIELD, FOES, KIND, STORE } from "../content/rules";
import type { World } from "../sim/world";

type Layer = { mesh: THREE.InstancedMesh; state: Float32Array; attribute: THREE.InstancedBufferAttribute; size: number; lift: number; count: number };

/**
 * Drawn size (m, longest side) and height above the floor per kind: a little
 * larger than the body, so a horde reads as a mass; far foes are drawn up to
 * 1.2× larger still, against the perspective (FAR_GROW).
 */
const LOOK = [
  { size: 1.55, lift: 0.75, model: ["rainbow-mine-3d", "rainbow-mine-lod"] },
  { size: 2.3, lift: 1.0, model: ["rainbow-scout-3d", "rainbow-scout-lod"] },
] as const;
const CAPACITY = [STORE.foes, 256];
const FAR_GROW = 0.2;

const STATE_HEAD = /* glsl */ `
attribute vec4 aState;
varying vec4 vState;
`;
const STATE_FRAGMENT_HEAD = /* glsl */ `
varying vec4 vState;
uniform vec3 uRim;
`;
const STATE_COLOR = /* glsl */ `
#include <emissivemap_fragment>
// x: hit flash (white hot), y: hurt (scouts darken and glow red), z: spawn fade-in.
float rim = pow(1.0 - abs(normalize(vNormal).z), 2.0);
totalEmissiveRadiance += uRim * rim * 0.6;
totalEmissiveRadiance += vec3(1.0, 0.25, 0.3) * vState.y * 0.6;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), vState.x * 0.85);
totalEmissiveRadiance += vec3(2.6, 2.4, 2.2) * vState.x;
`;

function placeholder(kind: number): THREE.BufferGeometry {
  if (kind === KIND.mine) {
    // A spiked orb.
    const parts: THREE.BufferGeometry[] = [new THREE.IcosahedronGeometry(0.42, 1)];
    for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const spike = new THREE.ConeGeometry(0.12, 0.38, 6);
      spike.translate(0, 0.52, 0);
      spike.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z)));
      parts.push(spike);
    }
    return mergeGeometries(parts.map((part) => (part.index === null ? part : part.toNonIndexed()))) ?? parts[0]!;
  }
  // A dart with swept wings, nose toward +z (the ship).
  const body = new THREE.ConeGeometry(0.3, 1.4, 6).rotateX(Math.PI / 2);
  const wings = new THREE.BoxGeometry(1.6, 0.08, 0.5);
  wings.translate(0, 0, -0.25);
  return mergeGeometries([body, wings].map((part) => (part.index === null ? part : part.toNonIndexed()))) ?? body;
}

async function modelGeometry(ids: readonly string[]): Promise<{ geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } | null> {
  for (const id of ids) {
    const entry = await modelEntry("enemies", id);
    const url = entry === null ? null : pickModelTier(entry, "high");
    if (url === null) continue;
    try {
      const scene = (await loadModel(url)).scene;
      scene.updateMatrixWorld(true);
      let mesh: THREE.Mesh | null = null;
      scene.traverse((object) => {
        if (mesh === null && (object as THREE.Mesh).isMesh) mesh = object as THREE.Mesh;
      });
      if (mesh === null) continue;
      const found = mesh as THREE.Mesh;
      const geometry = floatGeometry(found.geometry);
      geometry.applyMatrix4(found.matrixWorld);
      const material = (Array.isArray(found.material) ? found.material[0] : found.material) as THREE.MeshStandardMaterial;
      return { geometry, material: material.clone() };
    } catch {
      // A listed model the server does not have (a clean clone): try the next, then the shape.
    }
  }
  return null;
}

/** Float copies of the attributes (a meshopt GLB stores them quantized, which a transform would clip). */
function floatGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = source.getAttribute(name);
    if (attribute === undefined) continue;
    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i += 1) {
      values[i * attribute.itemSize] = attribute.getX(i);
      values[i * attribute.itemSize + 1] = attribute.getY(i);
      if (attribute.itemSize > 2) values[i * attribute.itemSize + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
  }
  const index = source.getIndex();
  if (index !== null) geometry.setIndex(Array.from(index.array as ArrayLike<number>));
  return geometry;
}

export class Crowd {
  readonly group = new THREE.Group();
  readonly reactions = new Reactions(STORE.foes);
  readonly loaded: boolean[] = [false, false];
  private readonly layers: Layer[] = [];
  private readonly shadows: THREE.InstancedMesh;
  private readonly rim = { value: new THREE.Color("#ff7ad9") };
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly sample = new Float32Array(5);

  constructor(scene: THREE.Scene) {
    for (const kind of [KIND.mine, KIND.scout]) this.layers.push(this.makeLayer(kind, placeholder(kind), new THREE.MeshStandardMaterial({ color: kind === KIND.mine ? "#ff6fcf" : "#7fe8ff", roughness: 0.35, metalness: 0.4, emissive: kind === KIND.mine ? "#5a0f44" : "#0f3a52" })));
    const spot = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(spot, new THREE.MeshBasicMaterial({ map: textures().soft, color: "#000000", transparent: true, opacity: 0.55, depthWrite: false }), STORE.foes);
    this.shadows.count = 0;
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = -1;
    this.group.add(this.shadows);
    scene.add(this.group);
  }

  /** Loads the family's models; a kind keeps its shape if its model cannot load. */
  async load(): Promise<void> {
    await Promise.all(
      [KIND.mine, KIND.scout].map(async (kind) => {
        const found = await modelGeometry(LOOK[kind]!.model);
        if (found === null) return;
        const old = this.layers[kind]!;
        old.mesh.removeFromParent();
        old.mesh.geometry.dispose();
        this.layers[kind] = this.makeLayer(kind, found.geometry, found.material);
        this.loaded[kind] = true;
      }),
    );
  }

  private makeLayer(kind: number, geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial): Layer {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const centre = box.getCenter(new THREE.Vector3());
    geometry.translate(-centre.x, -centre.y, -centre.z);
    const size = box.getSize(new THREE.Vector3());
    if (geometry.getAttribute("normal") === undefined) geometry.computeVertexNormals();
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRim = this.rim;
      shader.vertexShader = STATE_HEAD + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvState = aState;");
      shader.fragmentShader = STATE_FRAGMENT_HEAD + shader.fragmentShader.replace("#include <emissivemap_fragment>", STATE_COLOR);
    };
    material.customProgramCacheKey = () => "survival-crowd-v1";
    const capacity = CAPACITY[kind]!;
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const state = new Float32Array(capacity * 4);
    const attribute = new THREE.InstancedBufferAttribute(state, 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aState", attribute);
    mesh.count = 0;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    const look = LOOK[kind]!;
    return { mesh, state, attribute, size: look.size / Math.max(size.x, size.y, size.z, 0.001), lift: look.lift, count: 0 };
  }

  /** Writes every live foe into its kind's instances; `now` in seconds (wall clock, for the reactions). */
  update(w: World, now: number, lead: number): void {
    const F = w.foes;
    for (const layer of this.layers) layer.count = 0;
    let shadows = 0;
    for (let s = 0; s < F.top; s += 1) {
      if (F.alive[s] === 0) continue;
      const kind = F.kind[s]!;
      const layer = this.layers[kind]!;
      const i = layer.count;
      if (i >= layer.mesh.instanceMatrix.count) continue;
      layer.count += 1;
      const r = this.reactions.sample(s, F.id[s]!, now, this.sample);
      const phase = F.phase[s]! * 6.283;
      const vx = F.vx[s]!;
      const vz = F.vz[s]!;
      const speed = Math.hypot(vx, vz);
      // Face the ship (+z in three), lean into the walk, roll with the sway.
      const yaw = speed > 0.2 ? Math.atan2(vx, -vz) : 0;
      this.euler.set(0.22 + Math.min(0.25, speed * 0.06) + Math.sin(now * 3 + phase) * 0.06, yaw * 0.6, -vx * 0.18 + Math.sin(now * 2.1 + phase) * 0.08);
      this.quat.setFromEuler(this.euler);
      const base = layer.size * (kind === KIND.mine ? 0.92 + (F.phase[s]! % 0.17) : 1) * (1 + FAR_GROW * Math.min(1, Math.max(0, F.z[s]! / FIELD.gateZ)));
      this.scale.set(base * r[4]!, base * r[3]!, base * r[4]!);
      const bob = Math.sin(now * (kind === KIND.mine ? 5.2 : 2.6) + phase) * 0.12;
      const x = F.x[s]! + vx * lead;
      const z = F.z[s]! + vz * lead;
      this.pos.set(x + r[1]!, layer.lift + bob, -(z + r[2]!));
      this.matrix.compose(this.pos, this.quat, this.scale);
      layer.mesh.setMatrixAt(i, this.matrix);
      const o = i * 4;
      layer.state[o] = r[0]!;
      layer.state[o + 1] = kind === KIND.scout ? 1 - F.hp[s]! / FOES[kind]!.hp : 0;
      layer.state[o + 2] = 0;
      layer.state[o + 3] = 0;
      if (shadows < STORE.foes) {
        const spot = FOES[kind]!.radius * 2.6;
        this.matrix.compose(this.pos.set(x, 0.03, -z), this.quat.identity(), this.scale.set(spot, 1, spot));
        this.shadows.setMatrixAt(shadows, this.matrix);
        shadows += 1;
      }
    }
    for (const layer of this.layers) {
      layer.mesh.count = layer.count;
      layer.mesh.instanceMatrix.needsUpdate = true;
      layer.attribute.needsUpdate = true;
    }
    this.shadows.count = shadows;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  drawn(): number {
    return this.layers.reduce((sum, layer) => sum + layer.count, 0);
  }
}
