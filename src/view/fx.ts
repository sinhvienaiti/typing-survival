/**
 * The effects of the fight, all pooled and instanced (no allocation in a
 * run): `Glows`, camera-facing billboards from a small atlas painted in code
 * (soft glow, 4/8/12-ray stars, ring, flare) for muzzles, impacts, kill
 * bursts and scout shots; `Strips`, camera-facing streaks between two points
 * for Xung rounds, the Tia column's light and its feed from the ship;
 * `Marks`, glow left on the floor where the Tia column burned.
 */
import * as THREE from "three";

export const CELL = { soft: 0, star4: 1, star8: 2, star12: 3, ring: 4, flare: 5, core: 6 } as const;
/** Add to a cell to lay it flat on the floor. */
export const FLAT = 8;
const CELLS = 8;

function atlas(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size * CELLS;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g !== null) {
    const c = size / 2;
    const radial = (cell: number, stops: [number, number][]) => {
      const gradient = g.createRadialGradient(cell * size + c, c, 0, cell * size + c, c, c);
      for (const [at, a] of stops) gradient.addColorStop(at, "rgba(255,255,255," + a + ")");
      g.fillStyle = gradient;
      g.fillRect(cell * size, 0, size, size);
    };
    const rays = (cell: number, count: number, width: number) => {
      g.save();
      g.translate(cell * size + c, c);
      g.globalCompositeOperation = "lighter";
      for (let k = 0; k < count; k += 1) {
        g.rotate((Math.PI * 2) / count);
        const long = k % 2 === 0 ? 1 : 0.62;
        const gradient = g.createLinearGradient(0, 0, c * long, 0);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gradient;
        g.beginPath();
        g.moveTo(0, -width);
        g.lineTo(c * long, 0);
        g.lineTo(0, width);
        g.fill();
      }
      g.restore();
      radial(cell, [[0, 1], [0.12, 0.7], [0.3, 0.08], [1, 0]]);
    };
    radial(CELL.soft, [[0, 1], [0.2, 0.75], [0.5, 0.2], [1, 0]]);
    rays(CELL.star4, 4, 5);
    rays(CELL.star8, 8, 4);
    rays(CELL.star12, 12, 3);
    radial(CELL.ring, [[0, 0], [0.62, 0], [0.8, 1], [0.9, 0.35], [1, 0]]);
    g.save();
    g.translate(CELL.flare * size, 0);
    const flare = g.createLinearGradient(0, 0, size, 0);
    flare.addColorStop(0, "rgba(255,255,255,0)");
    flare.addColorStop(0.5, "rgba(255,255,255,1)");
    flare.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = flare;
    g.fillRect(0, c - 3, size, 6);
    g.restore();
    radial(CELL.flare, [[0, 0.9], [0.15, 0.3], [0.4, 0], [1, 0]]);
    radial(CELL.core, [[0, 1], [0.35, 1], [0.55, 0.5], [1, 0]]);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const GLOW_VERTEX = /* glsl */ `
attribute vec4 iPos;
attribute vec4 iColor;
attribute vec2 iSize;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  // Cells 8 and up lie flat on the floor (shock rings, scorch); the rest face the camera.
  float ground = step(7.5, iPos.w);
  float cell = iPos.w - 8.0 * ground;
  vUv = vec2((uv.x + cell) / ${CELLS.toFixed(1)}, uv.y);
  vColor = iColor;
  float s = sin(iSize.y);
  float c = cos(iSize.y);
  vec2 corner = position.xy * iSize.x;
  corner = vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
  if (ground > 0.5) {
    gl_Position = projectionMatrix * viewMatrix * vec4(iPos.xyz + vec3(corner.x, 0.0, corner.y), 1.0);
  } else {
    vec4 view = modelViewMatrix * vec4(iPos.xyz, 1.0);
    view.xy += corner;
    gl_Position = projectionMatrix * view;
  }
}`;
const ADD_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  float a = texture2D(uMap, vUv).a;
  gl_FragColor = vec4(vColor.rgb * a * vColor.a, 1.0);
}`;

/** Billboards that live a while (bursts) and one-frame stamps (scout shots, muzzle glows). */
export class Glows {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  limit: number;
  private readonly pos: Float32Array;
  private readonly color: Float32Array;
  private readonly size: Float32Array;
  // Live bursts: position, velocity, size start/end, rotation, spin, colour, life.
  private readonly b: Float32Array;
  private readonly stride = 16;
  private live = 0;
  private stamps = 0;

  constructor(readonly capacity: number) {
    this.limit = capacity;
    const base = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("uv", base.getAttribute("uv"));
    const total = capacity * 2;
    this.pos = new Float32Array(total * 4);
    this.color = new Float32Array(total * 4);
    this.size = new Float32Array(total * 2);
    geometry.setAttribute("iPos", new THREE.InstancedBufferAttribute(this.pos, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iColor", new THREE.InstancedBufferAttribute(this.color, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iSize", new THREE.InstancedBufferAttribute(this.size, 2).setUsage(THREE.DynamicDrawUsage));
    geometry.instanceCount = 0;
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms: { uMap: { value: atlas() } }, vertexShader: GLOW_VERTEX, fragmentShader: ADD_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.b = new Float32Array(capacity * this.stride);
  }

  /**
   * A burst at (x, y, z) of `cell`, growing from `from` to `to` m over
   * `life` s, colour × `intensity` (above 1 blooms), drifting (vx, vy, vz).
   */
  burst(cell: number, x: number, y: number, z: number, from: number, to: number, life: number, color: THREE.Color, intensity: number, vx = 0, vy = 0, vz = 0, spin = 0): void {
    if (this.live >= this.limit) return;
    const o = this.live * this.stride;
    const b = this.b;
    b[o] = x; b[o + 1] = y; b[o + 2] = z; b[o + 3] = vx; b[o + 4] = vy; b[o + 5] = vz;
    b[o + 6] = from; b[o + 7] = to; b[o + 8] = Math.random() * 6.283; b[o + 9] = spin;
    b[o + 10] = color.r * intensity; b[o + 11] = color.g * intensity; b[o + 12] = color.b * intensity;
    b[o + 13] = 0; b[o + 14] = life; b[o + 15] = cell;
    this.live += 1;
  }

  /** A one-frame billboard (call every frame it should show, after step()). */
  stamp(cell: number, x: number, y: number, z: number, size: number, rot: number, color: THREE.Color, intensity: number): void {
    if (this.stamps >= this.capacity) return;
    this.write(this.live + this.stamps, x, y, z, cell, color.r * intensity, color.g * intensity, color.b * intensity, 1, size, rot);
    this.stamps += 1;
  }

  private write(i: number, x: number, y: number, z: number, cell: number, r: number, g: number, bl: number, a: number, size: number, rot: number): void {
    const p = i * 4;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z; this.pos[p + 3] = cell;
    this.color[p] = r; this.color[p + 1] = g; this.color[p + 2] = bl; this.color[p + 3] = a;
    this.size[i * 2] = size;
    this.size[i * 2 + 1] = rot;
  }

  /** Ages the bursts and writes them; stamps of the last frame are dropped. Call before stamping. */
  step(dt: number): void {
    const b = this.b;
    let n = 0;
    for (let i = 0; i < this.live; i += 1) {
      const o = i * this.stride;
      const age = b[o + 13]! + dt;
      if (age >= b[o + 14]!) continue;
      if (n !== i) b.copyWithin(n * this.stride, o, o + this.stride);
      const q = n * this.stride;
      b[q + 13] = age;
      b[q] = b[q]! + b[q + 3]! * dt;
      b[q + 1] = b[q + 1]! + b[q + 4]! * dt;
      b[q + 2] = b[q + 2]! + b[q + 5]! * dt;
      b[q + 8] = b[q + 8]! + b[q + 9]! * dt;
      const k = age / b[q + 14]!;
      const ease = 1 - (1 - k) * (1 - k);
      const fade = (1 - k) * (1 - k);
      this.write(n, b[q]!, b[q + 1]!, b[q + 2]!, b[q + 15]!, b[q + 10]!, b[q + 11]!, b[q + 12]!, fade, b[q + 6]! + (b[q + 7]! - b[q + 6]!) * ease, b[q + 8]!);
      n += 1;
    }
    this.live = n;
    this.stamps = 0;
  }

  /** Uploads this frame's bursts and stamps. */
  flush(): void {
    const geometry = this.mesh.geometry;
    geometry.instanceCount = this.live + this.stamps;
    geometry.getAttribute("iPos").needsUpdate = true;
    geometry.getAttribute("iColor").needsUpdate = true;
    geometry.getAttribute("iSize").needsUpdate = true;
  }

  get count(): number {
    return this.live;
  }
}

const STRIP_VERTEX = /* glsl */ `
attribute vec3 iFrom;
attribute vec3 iTo;
attribute vec4 iColor;
attribute float iWidth;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vUv = uv;
  vColor = iColor;
  vec3 along = iTo - iFrom;
  vec3 mid = iFrom + along * uv.y;
  vec3 toEye = normalize(cameraPosition - mid);
  vec3 side = normalize(cross(along, toEye) + vec3(1e-5, 0.0, 0.0));
  vec3 world = mid + side * (uv.x - 0.5) * iWidth;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;
const STRIP_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float core = smoothstep(0.42, 0.0, across);
  float glow = pow(1.0 - across, 2.2);
  // Tail fades (rounds fade toward their tail, the column toward its far end).
  float along = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
  vec3 color = vColor.rgb * glow + vec3(1.0) * core * vColor.a;
  gl_FragColor = vec4(color * along, 1.0);
}`;

/** Camera-facing streaks between two points; set every frame. */
export class Strips {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly from: Float32Array;
  private readonly to: Float32Array;
  private readonly color: Float32Array;
  private readonly width: Float32Array;
  private n = 0;

  constructor(readonly capacity: number) {
    const base = new THREE.PlaneGeometry(1, 1);
    base.translate(0.5, 0.5, 0);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("uv", base.getAttribute("uv"));
    this.from = new Float32Array(capacity * 3);
    this.to = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 4);
    this.width = new Float32Array(capacity);
    geometry.setAttribute("iFrom", new THREE.InstancedBufferAttribute(this.from, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iTo", new THREE.InstancedBufferAttribute(this.to, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iColor", new THREE.InstancedBufferAttribute(this.color, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iWidth", new THREE.InstancedBufferAttribute(this.width, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.instanceCount = 0;
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: STRIP_VERTEX, fragmentShader: STRIP_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
  }

  begin(): void {
    this.n = 0;
  }

  /** A streak from (x0, y0, z0) to (x1, y1, z1) (the head), `width` m, colour × intensity, white core `core` (0 … 1). */
  add(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, width: number, color: THREE.Color, intensity: number, core: number): void {
    if (this.n >= this.capacity) return;
    const i = this.n;
    this.from[i * 3] = x0; this.from[i * 3 + 1] = y0; this.from[i * 3 + 2] = z0;
    this.to[i * 3] = x1; this.to[i * 3 + 1] = y1; this.to[i * 3 + 2] = z1;
    this.color[i * 4] = color.r * intensity; this.color[i * 4 + 1] = color.g * intensity; this.color[i * 4 + 2] = color.b * intensity; this.color[i * 4 + 3] = core;
    this.width[i] = width;
    this.n += 1;
  }

  end(): void {
    const geometry = this.mesh.geometry;
    geometry.instanceCount = this.n;
    for (const name of ["iFrom", "iTo", "iColor", "iWidth"]) geometry.getAttribute(name).needsUpdate = true;
  }
}

const COLUMN_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform vec3 uColor;
varying vec2 vUv;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float flow = 0.65 + 0.35 * sin(vUv.y * 60.0 - uTime * 38.0) * sin(vUv.y * 13.0 + uTime * 9.0);
  float core = smoothstep(0.3, 0.0, across) * flow;
  float glow = pow(1.0 - across, 3.0);
  float far = smoothstep(1.0, 0.82, vUv.y) * smoothstep(0.0, 0.04, vUv.y);
  vec3 color = (uColor * glow * 0.5 + vec3(1.0, 0.95, 0.85) * core * 1.0) * far * uPower;
  gl_FragColor = vec4(color, 1.0);
}`;

/** The Tia column on the floor: a burning strip `length` m from the ship, its glow `width` m wide. */
export class Column {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly uniforms = { uTime: { value: 0 }, uPower: { value: 0 }, uColor: { value: new THREE.Color() } };

  constructor(color: THREE.Color, readonly length: number, width: number, readonly start: number) {
    const geometry = new THREE.PlaneGeometry(width, length).rotateX(-Math.PI / 2);
    geometry.translate(0, 0.06, -length / 2);
    this.uniforms.uColor.value.copy(color);
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: "varying vec2 vUv; void main() { vUv = vec2(uv.x, 1.0 - uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: COLUMN_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.visible = false;
  }

  update(on: boolean, x: number, power: number, time: number): void {
    this.mesh.visible = on || this.uniforms.uPower.value > 0.02;
    this.uniforms.uPower.value += ((on ? power : 0) - this.uniforms.uPower.value) * (on ? 0.5 : 0.25);
    this.uniforms.uTime.value = time;
    this.mesh.position.set(x, 0, -this.start);
  }

  get power(): number {
    return this.uniforms.uPower.value;
  }
}

/** Glow left on the floor (where the column burned): one InstancedMesh of soft quads, a ring pool. */
export class Marks {
  readonly mesh: THREE.InstancedMesh;
  private readonly age: Float32Array;
  private readonly x: Float32Array;
  private readonly z: Float32Array;
  private readonly w: Float32Array;
  private cursor = 0;
  private readonly matrix = new THREE.Matrix4();
  private readonly tint = new THREE.Color();

  constructor(readonly capacity: number, map: THREE.Texture, private readonly color: THREE.Color, private readonly life = 2.4) {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), capacity);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.age = new Float32Array(capacity).fill(life);
    this.x = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.w = new Float32Array(capacity);
  }

  add(x: number, z: number, width: number): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.age[i] = 0;
    this.x[i] = x;
    this.z[i] = z;
    this.w[i] = width;
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i += 1) {
      const age = Math.min(this.life, this.age[i]! + dt);
      this.age[i] = age;
      const k = 1 - age / this.life;
      this.matrix.makeScale(this.w[i]! * (k > 0 ? 1 : 0), 1, this.w[i]! * 2.4 * (k > 0 ? 1 : 0));
      this.matrix.setPosition(this.x[i]!, 0.05, -this.z[i]!);
      this.mesh.setMatrixAt(i, this.matrix);
      this.mesh.setColorAt(i, this.tint.copy(this.color).multiplyScalar(k * k * 0.9));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
  }
}
