/**
 * The horde (docs/BUILD_S0.md §4, docs/BUILD_S1.md §12.1): one InstancedMesh
 * per kind, as Defense's crowd. The models (the rainbow family's mine, scout,
 * tank, shield, splitter) have only an idle clip, so all motion is done
 * here, per instance with no extra draw call: they face the ship, lean into
 * their speed, bob and sway; Trâu and Đầu Đàn step heavily (1.1 Hz, the body
 * dipping 6 cm a step), barely flinch at a blow and drop their heads when
 * they charge; Đầu Đàn is drawn 1.25× a Trâu with gold veins; Khiên walks
 * hunched; Tách staggers and throbs at 2 Hz; a hit flashes white, knocks
 * back and squashes (src/kit/feedback/reaction.ts). A missing model (a clean
 * clone has no local GLBs) is replaced by a stand-in shape made in code.
 * Soft dark spots under each foe keep the crowd readable on the deck. Every
 * kind wears the "Bầy Hố Đen" layer below.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reactions } from "../kit/feedback";
import { loadModel, pickModelTier, textures } from "../kit/three";
import { models } from "./models";
import { FOES, KIND, KINDS } from "../content/foes";
import { MARK } from "../sim/stores";
import { FIELD, STORE } from "../content/rules";
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
  { size: 3.0, lift: 1.35, model: ["rainbow-tank-3d"] },
  { size: 2.3, lift: 1.05, model: ["rainbow-shield-3d"] },
  { size: 1.9, lift: 0.9, model: ["rainbow-splitter-3d"] },
  { size: 1.0, lift: 0.55, model: ["rainbow-splitter-3d"] },
  { size: 3.75, lift: 1.7, model: ["rainbow-tank-3d"] },
] as const;
const CAPACITY = [STORE.foes, 256, 64, 128, 256, 512, 32];
/** How far a blow pushes each kind back (a Trâu barely moves: 0.03 m against 0.12). */
const FLINCH = [1, 1, 0.25, 0.8, 1, 1, 0.25];
const FAR_GROW = 0.2;
/** The Giáp affix draws a foe this much larger (and its veins gold). */
const ARMOUR_GROW = 1.22;

/**
 * "Bầy Hố Đen", the horde's shared material layer (one new faction from the
 * borrowed models): the body goes dark and dull (its own shading and
 * silhouette kept), energy veins run through it and pulse per foe (hot orange
 * in the swarm, electric blue in the elites), a black rim drinks the light
 * with a hot hairline just inside it (light bent round an event horizon),
 * and each foe is pulled out of shape a little, slowly (gravity: a stretch in
 * its instance matrix, free). The vein field is worked out per vertex and
 * interpolated (a crowd of 700 overdraws its pixels several times). The hit
 * flash (white hot) and a hurt elite's red glow still read through all of it.
 */
const STATE_HEAD = /* glsl */ `
attribute vec4 aState;
varying vec4 vState;
varying float vVein;
uniform float uTime;
uniform float uUnit;
`;
const STATE_VERTEX = /* glsl */ `
#include <begin_vertex>
vState = aState;
// Veins: where a sum of wavy sines through the body crosses zero.
vec3 bhP = position * uUnit * 1.55;
vVein = sin(bhP.x * 9.0 + sin(bhP.y * 7.0 + uTime * 0.9) * 1.8) + sin(bhP.y * 8.0 + sin(bhP.z * 6.0 - uTime * 0.7) * 1.6) + sin(bhP.z * 10.0 + sin(bhP.x * 5.0) * 1.7);
`;
const STATE_FRAGMENT_HEAD = /* glsl */ `
varying vec4 vState;
varying float vVein;
uniform float uTime;
uniform vec3 uBody;
uniform vec3 uVein;
uniform vec3 uHairline;
uniform float uVeinGain;
`;
const STATE_COLOR = /* glsl */ `
#include <emissivemap_fragment>
// x: hit flash (white hot), y: hurt (elites glow red), z: the Giáp affix (gold veins), w: the foe's own phase.
totalEmissiveRadiance *= 0.2;
float bhRim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
float bhLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
diffuseColor.rgb = mix(diffuseColor.rgb, uBody * (0.5 + bhLuma), 0.88);
float bhVein = smoothstep(0.34, 0.0, abs(vVein));
float bhPulse = 0.6 + 0.4 * sin(uTime * 3.4 + vState.w * 6.283);
vec3 bhVeinColor = mix(mix(uVein, vec3(2.6, 1.9, 0.6), vState.z), vec3(2.4, 0.5, 0.3), vState.y);
totalEmissiveRadiance += bhVeinColor * bhVein * bhPulse * uVeinGain * (1.0 + vState.y + vState.z * 0.6);
totalEmissiveRadiance += uHairline * smoothstep(0.5, 0.72, bhRim) * (1.0 - smoothstep(0.76, 0.9, bhRim));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), vState.x * 0.85);
totalEmissiveRadiance += vec3(2.6, 2.4, 2.2) * vState.x;
totalEmissiveRadiance += vec3(1.0, 0.25, 0.3) * vState.y * 0.4;
`;
const STATE_OUT = /* glsl */ `
// The rim drinks the light (never the hit flash).
outgoingLight *= 1.0 - smoothstep(0.55, 0.9, bhRim) * 0.92 * (1.0 - vState.x);
#include <opaque_fragment>
`;
/** Per kind: body tint, vein colour (above 1 blooms), hairline, vein strength. Trâu and Đầu Đàn: deep gold; Khiên: blue. */
const FACTION = [
  { body: new THREE.Color(0.075, 0.07, 0.07), vein: new THREE.Color(2.2, 0.48, 0.07), hairline: new THREE.Color(0.75, 0.22, 0.04), gain: 1 },
  { body: new THREE.Color(0.065, 0.075, 0.09), vein: new THREE.Color(0.3, 0.95, 2.4), hairline: new THREE.Color(0.75, 0.22, 0.04), gain: 1.1 },
  { body: new THREE.Color(0.08, 0.07, 0.06), vein: new THREE.Color(2.4, 1.2, 0.18), hairline: new THREE.Color(0.8, 0.45, 0.08), gain: 1.15 },
  { body: new THREE.Color(0.06, 0.07, 0.09), vein: new THREE.Color(0.25, 1.1, 2.6), hairline: new THREE.Color(0.2, 0.5, 0.9), gain: 1.1 },
  { body: new THREE.Color(0.08, 0.065, 0.06), vein: new THREE.Color(2.4, 0.6, 0.1), hairline: new THREE.Color(0.8, 0.25, 0.05), gain: 1.2 },
  { body: new THREE.Color(0.08, 0.065, 0.06), vein: new THREE.Color(2.6, 0.7, 0.12), hairline: new THREE.Color(0.8, 0.25, 0.05), gain: 1.3 },
  { body: new THREE.Color(0.09, 0.075, 0.05), vein: new THREE.Color(2.8, 1.9, 0.35), hairline: new THREE.Color(1.0, 0.75, 0.2), gain: 1.4 },
] as const;

/** Stand-in shapes while a model is missing (placeholders, as S0's: no character modelling in code). */
function placeholder(kind: number): THREE.BufferGeometry {
  const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((part) => (part.index === null ? part : part.toNonIndexed()))) ?? parts[0]!;
  if (kind === KIND.brute || kind === KIND.leader) return merge([new THREE.BoxGeometry(1.4, 0.9, 1.8), new THREE.BoxGeometry(0.8, 0.6, 0.6).translate(0, 0.2, 1.0)]);
  if (kind === KIND.shield) return new THREE.CylinderGeometry(0.5, 0.6, 1.2, 6);
  if (kind === KIND.splitter) return new THREE.DodecahedronGeometry(0.55, 0);
  if (kind === KIND.shard) return new THREE.TetrahedronGeometry(0.45, 0);
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
    const entry = await models.entry("enemies", id);
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
  readonly loaded: boolean[] = new Array<boolean>(KINDS).fill(false);
  private readonly layers: Layer[] = [];
  private readonly shadows: THREE.InstancedMesh;
  /** Shared clock of the horde's material (seconds). */
  private readonly time = { value: 0 };
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly sample = new Float32Array(5);

  constructor(scene: THREE.Scene) {
    for (let kind = 0; kind < KINDS; kind += 1) this.layers.push(this.makeLayer(kind, placeholder(kind), new THREE.MeshStandardMaterial({ color: kind === KIND.scout || kind === KIND.shield ? "#323a44" : "#4a3a32", roughness: 0.45, metalness: 0.5 })));
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
      LOOK.map(async (_, kind) => {
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
    const unit = 1 / Math.max(size.x, size.y, size.z, 0.001);
    const faction = FACTION[kind]!;
    const uniforms = {
      uTime: this.time,
      uUnit: { value: unit },
      uBody: { value: faction.body },
      uVein: { value: faction.vein },
      uHairline: { value: faction.hairline },
      uVeinGain: { value: faction.gain },
    };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = STATE_HEAD + shader.vertexShader.replace("#include <begin_vertex>", STATE_VERTEX);
      shader.fragmentShader = STATE_FRAGMENT_HEAD + shader.fragmentShader.replace("#include <emissivemap_fragment>", STATE_COLOR).replace("#include <opaque_fragment>", STATE_OUT);
    };
    material.customProgramCacheKey = () => "last-line-horde-v2";
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
    this.time.value = now;
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
      const heavy = kind === KIND.brute || kind === KIND.leader;
      // Face the ship (+z in three), lean into the walk, roll with the sway.
      const yaw = speed > 0.2 ? Math.atan2(vx, -vz) : 0;
      // Heavy ones step at 1.1 Hz: the body leans onto the planted side; a charge drops the head; Đầu Đàn holds its head up; Khiên walks hunched.
      const stride = heavy ? Math.sin(now * 6.91 + phase) : 0;
      const pitch = heavy ? ((F.mark[s]! & MARK.charging) !== 0 ? 0.42 : kind === KIND.leader ? 0.02 : 0.14) : kind === KIND.shield ? 0.38 : 0.22 + Math.min(0.25, speed * 0.06) + Math.sin(now * 3 + phase) * 0.06;
      this.euler.set(pitch, yaw * 0.6, heavy ? stride * 0.07 : -vx * 0.18 + Math.sin(now * 2.1 + phase) * 0.08);
      this.quat.setFromEuler(this.euler);
      const armour = F.elite[s] === 1;
      // Tách throbs at 2 Hz.
      const throb = kind === KIND.splitter ? 1 + Math.sin(now * 12.57 + phase) * 0.06 : 1;
      const base = layer.size * throb * (kind === KIND.mine ? 0.92 + (F.phase[s]! % 0.17) : 1) * (armour ? ARMOUR_GROW : 1) * (1 + FAR_GROW * Math.min(1, Math.max(0, F.z[s]! / FIELD.gateZ)));
      // Gravity pulls each foe out of shape a little, slowly, out of step with the others.
      const pull = Math.sin(now * 2.3 + phase) * 0.045;
      this.scale.set(base * r[4]! * (1 - pull), base * r[3]! * (1 + pull * 0.5), base * r[4]! * (1 + pull));
      // Bob: mines and shards quick, Tách lurching, heavy ones dipping 6 cm at each step.
      const bob = heavy ? -Math.abs(stride) * 0.06 : Math.sin(now * (kind === KIND.mine || kind === KIND.shard ? 5.2 : kind === KIND.splitter ? 3.7 : 2.6) + phase) * (kind === KIND.splitter ? 0.16 : 0.12);
      const x = F.x[s]! + vx * lead;
      const z = F.z[s]! + vz * lead;
      const flinch = FLINCH[kind]!;
      this.pos.set(x + r[1]! * flinch, layer.lift + bob, -(z + r[2]! * flinch));
      this.matrix.compose(this.pos, this.quat, this.scale);
      layer.mesh.setMatrixAt(i, this.matrix);
      const o = i * 4;
      layer.state[o] = r[0]!;
      layer.state[o + 1] = kind === KIND.scout || heavy || kind === KIND.shield ? 1 - F.hp[s]! / F.maxHp[s]! : 0;
      layer.state[o + 2] = armour || kind === KIND.leader ? 1 : 0;
      layer.state[o + 3] = F.phase[s]!;
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
