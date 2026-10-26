/**
 * Kill chunks (docs/FEEL_PASS_S1.md §4.5): a killed foe breaks into dark
 * steel chunks whose edges glow hot (Lính's electric, Đầu Đàn's gold, a Bọc
 * Thép's pale gold) and cool to steel over 1.2 s. They fly in an arc by the
 * gun of the killing blow (gun-rules THROW: Pháo Sao's highest, Ray's along
 * its line), bounce once, lie 8 s, then sink. Three faceted shapes made in
 * code (an effect, not a model) share one InstancedMesh: each instance shows
 * one, the others collapse in the vertex shader; a soft shadow under each in
 * a second one, fading as it rises: 2 draw calls. A ring pool (the oldest
 * goes first when full), nothing allocated after construction.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FEEL, BIG_CHUNK, CHUNK, CHUNK_PHYSICS, EDGE, chunkCount, chunkStep } from "./gun-rules";
import { BLOW, PALETTE } from "./theme";

const FLOOR = 0.03;
/** State per chunk: x, y, z, vx, vy, vz, bounced, resting (gun-rules chunkStep). */
const S = 8;
const EDGES = [BLOW.shardHot, BLOW.elite, BLOW.beacon, BLOW.armour];
const EDGE_HOT = 2.2;
const EDGE_COLD = 0.12;

/** A faceted shard 1 m across at most: a split octahedron (8 faces), a wedge (8), a slab (12), corners pushed about. */
function shapes(): THREE.BufferGeometry {
  const jitter = (g: THREE.BufferGeometry, seed: number) => {
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i += 1) {
      const k = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
      const r = 0.82 + 0.36 * (k - Math.floor(k));
      p.setXYZ(i, p.getX(i) * r, p.getY(i) * r, p.getZ(i) * r);
    }
    return g;
  };
  const parts = [
    jitter(new THREE.OctahedronGeometry(0.5, 0).scale(1, 0.55, 0.8), 1),
    jitter(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 3, 1).rotateZ(Math.PI / 2).scale(0.9, 1, 1), 2),
    jitter(new THREE.BoxGeometry(0.9, 0.3, 0.6), 3),
  ].map((g, k) => {
    const flat = g.toNonIndexed();
    flat.deleteAttribute("uv");
    flat.computeVertexNormals();
    flat.setAttribute("aShape", new THREE.Float32BufferAttribute(new Float32Array(flat.getAttribute("position").count).fill(k), 1));
    return flat;
  });
  return mergeGeometries(parts)!;
}

const SHADOW_VERTEX = /* glsl */ `
attribute float aShade;
varying vec2 vUv;
varying float vShade;
void main() {
  vUv = uv;
  vShade = aShade;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const SHADOW_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying float vShade;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  gl_FragColor = vec4(0.0, 0.0, 0.0, vShade * smoothstep(1.0, 0.25, r));
}`;

export class Chunks {
  readonly mesh: THREE.InstancedMesh;
  readonly shadows: THREE.InstancedMesh;
  private readonly s: Float32Array;
  private readonly rot: Float32Array;
  private readonly spin: Float32Array;
  private readonly size: Float32Array;
  private readonly age: Float32Array;
  private readonly edge: Uint8Array;
  private readonly alive: Uint8Array;
  private readonly look: Float32Array;
  private readonly lookAttr: THREE.InstancedBufferAttribute;
  private readonly shade: Float32Array;
  private readonly shadeAttr: THREE.InstancedBufferAttribute;
  private cursor = 0;
  /** The chunk the scenarios follow: the first of a burst, taken again once it has lain 0.5 s. */
  private watched = -1;
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly zero = new THREE.Matrix4().makeScale(0, 0, 0);
  live = 0;

  constructor(readonly capacity: number) {
    const material = new THREE.MeshStandardMaterial({ color: PALETTE.steelDark, metalness: 0.7, roughness: 0.42, flatShading: true });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = "attribute float aShape;\nattribute vec4 aLook;\nvarying vec3 vEdge;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvEdge = aLook.rgb;\nif (abs(aShape - aLook.w) > 0.5) transformed = vec3(0.0);");
      // The edges glow: faces turned away from the eye (the rim) carry most of it.
      shader.fragmentShader = "varying vec3 vEdge;\n" + shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nfloat chunkRim = 1.0 - abs(dot(normal, normalize(vViewPosition)));\ntotalEmissiveRadiance += vEdge * (0.3 + 1.7 * chunkRim * chunkRim);");
    };
    material.customProgramCacheKey = () => "last-line-chunks-v1";
    const geometry = shapes();
    this.look = new Float32Array(capacity * 4);
    this.lookAttr = new THREE.InstancedBufferAttribute(this.look, 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aLook", this.lookAttr);
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    const plate = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.shade = new Float32Array(capacity);
    this.shadeAttr = new THREE.InstancedBufferAttribute(this.shade, 1).setUsage(THREE.DynamicDrawUsage);
    plate.setAttribute("aShade", this.shadeAttr);
    this.shadows = new THREE.InstancedMesh(plate, new THREE.ShaderMaterial({ vertexShader: SHADOW_VERTEX, fragmentShader: SHADOW_FRAGMENT, transparent: true, depthWrite: false }), capacity);
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shadows.count = 0;
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = -1;
    const f = (n: number) => new Float32Array(capacity * n);
    [this.s, this.rot, this.spin, this.size, this.age] = [f(S), f(3), f(3), f(1), f(1)];
    this.edge = new Uint8Array(capacity);
    this.alive = new Uint8Array(capacity);
  }

  /**
   * The chunks of `n` kills of `kind` at sim (x, z): thrown along the sim
   * direction (dx, dz) within ±`spread` rad, out `out` and up `up` m/s
   * ([min, max]); `edge` overrides the kind's (EDGE; −1 keeps it). They show
   * from the kill's next frame (§4.4).
   */
  burst(x: number, z: number, dx: number, dz: number, kind: number, n: number, edge: number, up: readonly number[], out: readonly number[], spread: number): number {
    const spec = CHUNK[kind] ?? CHUNK[0]!;
    const count = chunkCount(kind, n);
    const length = Math.hypot(dx, dz) || 1;
    const base = Math.atan2(dz / length, dx / length);
    const total = count.small + count.big;
    const w = this.watched;
    if (w < 0 || this.alive[w] === 0 || (this.s[w * S + 7] === 1 && this.age[w]! > 1.5)) this.watched = this.cursor;
    for (let k = 0; k < total; k += 1) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      if (this.alive[i] === 0) this.live += 1;
      this.alive[i] = 1;
      const big = k < count.big;
      const a = base + (Math.random() * 2 - 1) * spread;
      const speed = out[0]! + Math.random() * (out[1]! - out[0]!);
      const o = i * S;
      this.s[o] = x + (Math.random() - 0.5) * 0.6;
      this.s[o + 1] = 0.4 + Math.random() * 0.5;
      this.s[o + 2] = -(z + (Math.random() - 0.5) * 0.6);
      this.s[o + 3] = Math.cos(a) * speed;
      this.s[o + 4] = up[0]! + Math.random() * (up[1]! - up[0]!);
      this.s[o + 5] = -Math.sin(a) * speed;
      this.s[o + 6] = this.s[o + 7] = 0;
      for (let c = 0; c < 3; c += 1) {
        this.rot[i * 3 + c] = Math.random() * 6.283;
        this.spin[i * 3 + c] = (Math.random() < 0.5 ? -1 : 1) * (CHUNK_PHYSICS.spin[0] + Math.random() * (CHUNK_PHYSICS.spin[1] - CHUNK_PHYSICS.spin[0]));
      }
      this.size[i] = big ? BIG_CHUNK.min + Math.random() * (BIG_CHUNK.max - BIG_CHUNK.min) : spec.min + Math.random() * (spec.max - spec.min);
      this.age[i] = -1 / 60;
      this.edge[i] = edge >= 0 ? edge : spec.edge;
      this.look[i * 4 + 3] = Math.floor(Math.random() * 3);
    }
    return total;
  }

  update(dt: number): void {
    const { restS, fadeS } = FEEL.debris;
    let top = 0;
    for (let i = 0; i < this.capacity; i += 1) {
      if (this.alive[i] === 0) continue;
      const age = (this.age[i] = this.age[i]! + dt);
      if (age >= restS + fadeS) {
        this.alive[i] = 0;
        this.live -= 1;
        this.mesh.setMatrixAt(i, this.zero);
        this.shadows.setMatrixAt(i, this.zero);
        continue;
      }
      top = i + 1;
      if (age < 0) {
        this.mesh.setMatrixAt(i, this.zero);
        this.shadows.setMatrixAt(i, this.zero);
        continue;
      }
      const o = i * S;
      const size = this.size[i]!;
      const flying = this.s[o + 7] === 0;
      if (flying) {
        chunkStep(this.s, o, dt, FLOOR + size * 0.25);
        for (let c = 0; c < 3; c += 1) this.rot[i * 3 + c] = this.rot[i * 3 + c]! + this.spin[i * 3 + c]! * dt;
      }
      // Lying: settle flat (no spin about x and z), then sink and shrink away.
      const lie = flying ? 1 : 0;
      const sink = age > restS ? (age - restS) / fadeS : 0;
      this.euler.set(this.rot[i * 3]! * lie, this.rot[i * 3 + 1]!, this.rot[i * 3 + 2]! * lie);
      this.quat.setFromEuler(this.euler);
      const y = this.s[o + 1]! - sink * size * 0.6;
      this.matrix.compose(this.pos.set(this.s[o]!, y, this.s[o + 2]!), this.quat, this.scale.setScalar(size * (1 - sink * 0.5)));
      this.mesh.setMatrixAt(i, this.matrix);
      // Hot edges cool to steel over coolS.
      const heat = Math.max(0, 1 - age / CHUNK_PHYSICS.coolS);
      const hot = EDGES[this.edge[i]!]!;
      const k = EDGE_COLD + (EDGE_HOT - EDGE_COLD) * heat * heat;
      const cold = 1 - heat;
      this.look[i * 4] = (hot.r * heat + BLOW.shardSteel.r * cold) * k;
      this.look[i * 4 + 1] = (hot.g * heat + BLOW.shardSteel.g * cold) * k;
      this.look[i * 4 + 2] = (hot.b * heat + BLOW.shardSteel.b * cold) * k;
      // The shadow: 1.3 × the chunk's size, lighter as it rises (gone at 2 m).
      const high = Math.max(0, this.s[o + 1]! - FLOOR);
      this.shade[i] = 0.35 * Math.max(0, 1 - high / 2) * (1 - sink);
      this.matrix.compose(this.pos.set(this.s[o]!, 0.025, this.s[o + 2]!), this.quat.identity(), this.scale.set(size * 2.6, 1, size * 2.6));
      this.shadows.setMatrixAt(i, this.matrix);
    }
    this.mesh.count = this.shadows.count = top;
    this.mesh.visible = this.shadows.visible = top > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.shadows.instanceMatrix.needsUpdate = true;
    this.lookAttr.needsUpdate = true;
    this.shadeAttr.needsUpdate = true;
  }

  /** The followed chunk: its slot and height (m; −1 when none or not shown yet). */
  watch(): [number, number] {
    const i = this.watched;
    return [i, i >= 0 && this.alive[i] === 1 && this.age[i]! >= 0 ? Math.round(this.s[i * S + 1]! * 1000) / 1000 : -1];
  }
}

export { EDGE };
