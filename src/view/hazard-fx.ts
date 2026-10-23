/**
 * Effects that stand in the corridor (docs/BUILD_S1.md §12): Khiên's energy
 * walls and Vết nứt's cracks, each one instanced shader quad (one draw call
 * for all of them; no models, only light).
 *   ShieldWalls: a curved hex-cell wall facing the ship at each shield (sim
 *   x, z, its facing), cracking in three steps as its hit points fall, a
 *   ripple running out from the last place it was struck.
 *   RiftCracks: a jagged crack in the deck at a wall's foot, glowing hotter
 *   through its warning, then torn open (molten edge, flicker) while it
 *   pours, fading (gunfx adds the glow standing over it).
 */
import * as THREE from "three";
import { instancedQuads, uploadQuads } from "../kit/feedback";
import { SHIELD } from "../content/foes";
import { FIELD } from "../content/rules";
import type { World } from "../sim/world";
import { BLOW } from "./theme";

const WALL_VERTEX = /* glsl */ `
attribute vec4 iPos;
attribute vec4 iState;
varying vec2 vUv;
varying vec4 vState;
void main() {
  vUv = uv;
  vState = iState;
  // iPos: centre x, z (three), facing x, z. The quad spans the wall's width across the facing, bowed toward the ship.
  vec2 face = iPos.zw;
  vec2 across = vec2(-face.y, face.x);
  float u = position.x;
  float bow = (1.0 - 4.0 * u * u) * 0.35;
  vec3 world = vec3(iPos.x, 0.0, iPos.y) + vec3(across.x, 0.0, across.y) * u * ${SHIELD.width.toFixed(2)} + vec3(face.x, 0.0, face.y) * bow;
  world.y = (position.y + 0.5) * 2.0 + 0.1;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;
const WALL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
varying vec4 vState;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  // vState: hp left (0 … 1), seconds since the last hit, where it hit (0 … 1 across), the wall's fade in.
  vec2 p = vec2(vUv.x * 7.0, vUv.y * 5.2);
  vec2 r = vec2(1.0, 1.732);
  vec2 a = mod(p, r) - r * 0.5;
  vec2 b = mod(p - r * 0.5, r) - r * 0.5;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  float cell = smoothstep(0.42, 0.5, max(abs(g.x) * 0.866 + abs(g.y) * 0.5, abs(g.y)));
  float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(1.0, 0.85, vUv.y);
  float since = vState.y;
  float ring = length(vec2((vUv.x - vState.z) * 2.6, vUv.y - 0.5));
  float ripple = exp(-since * 3.0) * smoothstep(0.12, 0.0, abs(ring - since * 3.2));
  float flash = exp(-since * 9.0) * smoothstep(0.5, 0.0, ring);
  // Cracks: three steps as the hit points fall.
  float broken = (1.0 - vState.x) * 3.0;
  vec2 q = floor(p * vec2(1.0, 1.0));
  float crack = step(hash(q) * 3.0 + 0.2, broken) * cell;
  float shimmer = 0.75 + 0.25 * sin(uTime * 3.0 + vUv.y * 9.0 + vUv.x * 4.0);
  vec3 color = uColor * (0.22 + cell * 0.7 * shimmer) + vec3(1.0) * (ripple * 0.9 + flash * 0.8) - uColor * crack * 0.55 + vec3(1.0, 0.6, 0.3) * crack * 0.25;
  gl_FragColor = vec4(color * edge * vState.w, 1.0);
}`;

export class ShieldWalls {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly pos: Float32Array;
  private readonly state: Float32Array;
  private readonly uniforms = { uTime: { value: 0 }, uColor: { value: BLOW.shield.clone().multiplyScalar(1.4) } };
  /** Per shield slot: when it was last struck (s), where (0 … 1), when it appeared (s). */
  private readonly hitAt = new Float32Array(SHIELD.max).fill(-100);
  private readonly hitU = new Float32Array(SHIELD.max).fill(0.5);
  private readonly bornAt = new Float32Array(SHIELD.max);
  private readonly bornId = new Int32Array(SHIELD.max);

  constructor() {
    this.pos = new Float32Array(SHIELD.max * 4);
    this.state = new Float32Array(SHIELD.max * 4);
    const geometry = instancedQuads({ iPos: [this.pos, 4], iState: [this.state, 4] });
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WALL_VERTEX, fragmentShader: WALL_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
  }

  /** A blow on shield `k` at sim point (x, z). */
  struck(w: World, k: number, x: number, z: number, time: number): void {
    const H = w.shields;
    if (k < 0 || k >= SHIELD.max) return;
    const across = (x - H.x[k]!) * -H.nz[k]! + (z - H.z[k]!) * H.nx[k]!;
    this.hitAt[k] = time;
    this.hitU[k] = Math.max(0, Math.min(1, 0.5 + across / SHIELD.width));
  }

  /** Writes every live shield; `lead` extrapolates with its bearer. */
  update(w: World, time: number, lead: number): void {
    const H = w.shields;
    const F = w.foes;
    this.uniforms.uTime.value = time;
    let n = 0;
    for (let k = 0; k < H.top; k += 1) {
      if (H.alive[k] === 0) continue;
      if (this.bornId[k] !== H.id[k]) {
        this.bornId[k] = H.id[k]!;
        this.bornAt[k] = time;
      }
      const s = H.owner[k]!;
      const ahead = F.alive[s] === 1 ? lead : 0;
      const o = n * 4;
      this.pos[o] = H.x[k]! + (F.vx[s] ?? 0) * ahead;
      this.pos[o + 1] = -(H.z[k]! + (F.vz[s] ?? 0) * ahead);
      // Facing in three's axes (sim z is −z there).
      this.pos[o + 2] = H.nx[k]!;
      this.pos[o + 3] = -H.nz[k]!;
      this.state[o] = H.hp[k]! / H.maxHp[k]!;
      this.state[o + 1] = time - this.hitAt[k]!;
      this.state[o + 2] = this.hitU[k]!;
      this.state[o + 3] = Math.min(1, (time - this.bornAt[k]!) * 3);
      n += 1;
    }
    uploadQuads(this.mesh.geometry, n);
  }
}

const CRACK_VERTEX = /* glsl */ `
attribute vec4 iPos;
attribute vec2 iState;
varying vec2 vUv;
varying vec2 vState;
void main() {
  vUv = uv;
  vState = iState;
  // iPos: wall x (three), centre z (three), half length, side (−1 left, 1 right). The quad lies on the deck at the wall's foot (the camera reads the floor, not the parapet's face).
  vec3 world = vec3(iPos.x - iPos.w * (position.y + 0.5) * 1.6, 0.05, iPos.y + position.x * iPos.z * 2.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;
const CRACK_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
varying vec2 vState;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  // vState: warning 0 … 1 (glowing hotter), open 0 … 1 (torn, then fading).
  float x = vUv.x;
  float jag = (hash(floor(x * 14.0)) - 0.5) * 0.22 + sin(x * 31.0) * 0.06;
  float line = abs(vUv.y - 0.5 - jag);
  float width = 0.02 + vState.y * 0.16;
  float core = smoothstep(width, 0.0, line);
  float glow = smoothstep(width * 5.0 + 0.1, 0.0, line);
  float ends = smoothstep(0.0, 0.18, x) * smoothstep(1.0, 0.82, x);
  float flicker = 0.75 + 0.25 * sin(uTime * 40.0 + x * 9.0);
  float heat = max(vState.x, vState.y) * flicker;
  vec3 color = uColor * glow * 1.4 + vec3(1.0, 0.9, 0.7) * core * 2.0;
  gl_FragColor = vec4(color * ends * heat, 1.0);
}`;

const MAX_CRACKS = 4;

export class RiftCracks {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly pos = new Float32Array(MAX_CRACKS * 4);
  private readonly state = new Float32Array(MAX_CRACKS * 2);
  private readonly uniforms = { uTime: { value: 0 }, uColor: { value: BLOW.rift.clone() } };
  /** Recent cracks: side, depth (sim), when warned and opened (s). */
  private readonly cracks: { side: number; z: number; warned: number; opened: number; warn: number }[] = [];

  constructor() {
    const geometry = instancedQuads({ iPos: [this.pos, 4], iState: [this.state, 2] });
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: CRACK_VERTEX, fragmentShader: CRACK_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
  }

  warn(side: number, z: number, seconds: number, time: number): void {
    if (this.cracks.length >= MAX_CRACKS) this.cracks.shift();
    this.cracks.push({ side, z, warned: time, opened: -1, warn: seconds });
  }

  open(side: number, z: number, time: number): void {
    const crack = this.cracks.find((c) => c.side === side && Math.abs(c.z - z) < 0.5 && c.opened < 0);
    if (crack !== undefined) crack.opened = time;
    else this.cracks.push({ side, z, warned: time - 2.5, opened: time, warn: 2.5 });
  }

  update(time: number): void {
    this.uniforms.uTime.value = time;
    let n = 0;
    for (let i = this.cracks.length - 1; i >= 0; i -= 1) {
      const c = this.cracks[i]!;
      const warm = Math.min(1, (time - c.warned) / c.warn);
      const open = c.opened < 0 ? 0 : Math.max(0, 1 - Math.max(0, time - c.opened - 1.2) / 2.5);
      if (c.opened >= 0 && open <= 0) {
        this.cracks.splice(i, 1);
        continue;
      }
      const o = n * 4;
      this.pos[o] = c.side * (FIELD.halfW - FIELD.wall + 0.3);
      this.pos[o + 1] = -c.z;
      this.pos[o + 2] = 2.2;
      this.pos[o + 3] = c.side;
      this.state[n * 2] = c.opened < 0 ? 0.25 + warm * 0.75 : 0;
      this.state[n * 2 + 1] = open;
      n += 1;
    }
    uploadQuads(this.mesh.geometry, n);
  }
}
