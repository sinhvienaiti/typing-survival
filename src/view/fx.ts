/**
 * The effects of the fight, all pooled and instanced (no allocation in a
 * run): `Glows`, camera-facing billboards from a small atlas painted in code
 * (soft glow, 4/8/12-ray stars, ring, flare, a puff) for muzzles, impacts,
 * kill bursts and scout shots, added light or (smoke) laid over the scene;
 * `Strips`, camera-facing streaks between two points
 * for Xung rounds, the Tia column's light and its feed from the ship;
 * `Streaks`, ones held a while (muzzle tongues, flashes along a shot);
 * `Column`, the Tia column burning on the floor.
 */
import * as THREE from "three";
import { instancedQuads, uploadQuads } from "../kit/feedback";

export const CELL = { soft: 0, star4: 1, star8: 2, star12: 3, ring: 4, flare: 5, core: 6, puff: 7 } as const;
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
    // A radial gradient filling `cell`, centred off its middle by (ox, oy) × its half-size, `r` × it across.
    const radial = (cell: number, stops: (readonly [number, number])[], ox = 0, oy = 0, r = 1) => {
      const gradient = g.createRadialGradient(cell * size + c * (1 + ox), c * (1 + oy), 0, cell * size + c * (1 + ox), c * (1 + oy), c * r);
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
    // A puff (smoke, flame): soft blobs heaped off the centre.
    for (const [ox, oy, r] of [[0, 0.05, 0.6], [-0.32, 0.18, 0.42], [0.3, 0.14, 0.45], [0.06, -0.3, 0.42], [-0.24, -0.22, 0.34], [0.28, -0.24, 0.3]] as const) radial(CELL.puff, [[0, 0.55], [0.55, 0.32], [1, 0]], ox, oy, r);
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
varying float vY;
void main() {
  // Cells 8 and up lie flat on the floor (shock rings, scorch); the rest face the camera (vY: the corner's height, from the camera's right and up in world y).
  float ground = step(7.5, iPos.w);
  float cell = iPos.w - 8.0 * ground;
  vUv = vec2((uv.x + cell) / ${CELLS.toFixed(1)}, uv.y);
  vColor = iColor;
  float s = sin(iSize.y);
  float c = cos(iSize.y);
  vec2 corner = position.xy * iSize.x;
  corner = vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
  vY = ground > 0.5 ? 9.0 : iPos.y + corner.x * viewMatrix[1][0] + corner.y * viewMatrix[1][1];
  if (ground > 0.5) {
    // Flat on the floor, facing up (−y here would leave the quad's back to the camera: culled).
    gl_Position = projectionMatrix * viewMatrix * vec4(iPos.xyz + vec3(corner.x, 0.0, -corner.y), 1.0);
  } else {
    vec4 view = modelViewMatrix * vec4(iPos.xyz, 1.0);
    view.xy += corner;
    gl_Position = projectionMatrix * view;
  }
}`;
// Added light; SMOKE: the colour laid over the scene (normal blending), its alpha the cell's × the burst's, thick parts darker and thin edges lit (soot with a rim of light), fading into the deck (no straight edge where the floor cuts a puff).
const GLOW_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec4 vColor;
varying float vY;
void main() {
  float a = texture2D(uMap, vUv).a;
#ifdef SMOKE
  gl_FragColor = vec4(vColor.rgb * mix(2.0, 0.65, smoothstep(0.06, 0.45, a)), a * vColor.a * smoothstep(0.1, 1.2, vY));
#else
  gl_FragColor = vec4(vColor.rgb * a * vColor.a, 1.0);
#endif
}`;

function writeGlow(pos: Float32Array, color: Float32Array, sizes: Float32Array, i: number, x: number, y: number, z: number, cell: number, r: number, g: number, bl: number, a: number, size: number, rot: number): void {
  const p = i * 4;
  pos[p] = x; pos[p + 1] = y; pos[p + 2] = z; pos[p + 3] = cell;
  color[p] = r; color[p + 1] = g; color[p + 2] = bl; color[p + 3] = a;
  sizes[i * 2] = size; sizes[i * 2 + 1] = rot;
}

/** Bursts start at age zero on flush, followed by one-frame stamps; `smoke` ones overlay the scene (rising puffs, a scorch on the deck). */
export class Glows {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  limit: number;
  private readonly pos: Float32Array;
  private readonly color: Float32Array;
  private readonly size: Float32Array;
  private readonly stampPos: Float32Array;
  private readonly stampColor: Float32Array;
  private readonly stampSize: Float32Array;
  // Live bursts: position, velocity, size start/end, rotation, spin, colour, age, life, cell, intensity, new.
  private readonly b: Float32Array;
  private readonly stride = 18;
  private live = 0;
  private stamps = 0;

  constructor(readonly capacity: number, readonly smoke = false) {
    this.limit = capacity;
    const total = capacity * 2;
    this.pos = new Float32Array(total * 4);
    this.color = new Float32Array(total * 4);
    this.size = new Float32Array(total * 2);
    this.stampPos = new Float32Array(capacity * 4);
    this.stampColor = new Float32Array(capacity * 4);
    this.stampSize = new Float32Array(capacity * 2);
    const geometry = instancedQuads({ iPos: [this.pos, 4], iColor: [this.color, 4], iSize: [this.size, 2] });
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms: { uMap: { value: atlas() } }, defines: smoke ? { SMOKE: 1 } : {}, vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT, transparent: true, depthWrite: false, blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = smoke ? 7.5 : 8; // smoke over the beams and tracers (a cloud hides them), then fire and flashes add over it
    this.b = new Float32Array(capacity * this.stride);
  }

  /**
   * A burst at (x, y, z) of `cell`, growing from `from` to `to` m over
   * `life` s, colour × `intensity` (above 1 blooms; smoke's alpha), drifting
   * (vx, vy, vz), turning `spin` rad/s from `angle` (random when not given).
   * The first flush shows it at age zero; later steps age and move it.
   */
  burst(cell: number, x: number, y: number, z: number, from: number, to: number, life: number, color: THREE.Color, intensity: number, vx = 0, vy = 0, vz = 0, spin = 0, angle = NaN): void {
    if (this.live >= this.limit) return;
    const o = this.live * this.stride;
    const b = this.b;
    b[o] = x; b[o + 1] = y; b[o + 2] = z; b[o + 3] = vx; b[o + 4] = vy; b[o + 5] = vz;
    // A set angle (a flash along a shot), else a random one.
    b[o + 6] = from; b[o + 7] = to; b[o + 8] = angle === angle ? angle : Math.random() * 6.283; b[o + 9] = spin;
    const k = this.smoke ? 1 : intensity;
    b[o + 10] = color.r * k; b[o + 11] = color.g * k; b[o + 12] = color.b * k;
    b[o + 13] = 0; b[o + 14] = life; b[o + 15] = cell; b[o + 16] = intensity; b[o + 17] = 1;
    this.live += 1;
  }

  /** A one-frame billboard (call every frame it should show, after step()). */
  stamp(cell: number, x: number, y: number, z: number, size: number, rot: number, color: THREE.Color, intensity: number): void {
    if (this.stamps >= this.capacity) return;
    writeGlow(this.stampPos, this.stampColor, this.stampSize, this.stamps, x, y, z, cell, color.r * intensity, color.g * intensity, color.b * intensity, 1, size, rot);
    this.stamps += 1;
  }

  /** Ages and compacts bursts already flushed; drops last frame's stamps. Call before stamping. */
  step(dt: number): void {
    const b = this.b;
    let n = 0;
    for (let i = 0; i < this.live; i += 1) {
      const o = i * this.stride;
      const fresh = b[o + 17] === 1;
      const age = b[o + 13]! + (fresh ? 0 : dt);
      if (!fresh && age >= b[o + 14]!) continue;
      if (n !== i) b.copyWithin(n * this.stride, o, o + this.stride);
      const q = n * this.stride;
      b[q + 13] = age;
      if (!fresh) {
        b[q] = b[q]! + b[q + 3]! * dt; b[q + 1] = b[q + 1]! + b[q + 4]! * dt; b[q + 2] = b[q + 2]! + b[q + 5]! * dt;
        b[q + 8] = b[q + 8]! + b[q + 9]! * dt;
      }
      n += 1;
    }
    this.live = n;
    this.stamps = 0;
  }

  /** Writes bursts at their stored age, then this frame's stamps, and uploads both. */
  flush(): void {
    const b = this.b;
    for (let i = 0; i < this.live; i += 1) {
      const q = i * this.stride;
      const k = Math.max(0, b[q + 13]!) / b[q + 14]!;
      const ease = 1 - (1 - k) * (1 - k);
      // Smoke puffs rise in and hold, a scorch holds longer still; embers (3 s and more) hold then cool, the rest ease out.
      const fade = this.smoke ? (b[q + 15] === CELL.puff ? Math.min(1, k * 20) * (1 - k * k) : 1 - k ** 4) * b[q + 16]! : b[q + 14]! >= 3 ? 1 - k * k : (1 - k) * (1 - k);
      writeGlow(this.pos, this.color, this.size, i, b[q]!, b[q + 1]!, b[q + 2]!, b[q + 15]!, b[q + 10]!, b[q + 11]!, b[q + 12]!, fade, b[q + 6]! + (b[q + 7]! - b[q + 6]!) * ease, b[q + 8]!);
      b[q + 17] = 0;
    }
    for (let i = 0; i < this.stamps * 4; i += 1) {
      this.pos[this.live * 4 + i] = this.stampPos[i]!;
      this.color[this.live * 4 + i] = this.stampColor[i]!;
    }
    for (let i = 0; i < this.stamps * 2; i += 1) this.size[this.live * 2 + i] = this.stampSize[i]!;
    uploadQuads(this.mesh.geometry, this.live + this.stamps);
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

  constructor(readonly capacity: number, readonly smoke = false) {
    this.from = new Float32Array(capacity * 3);
    this.to = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 4);
    this.width = new Float32Array(capacity);
    const geometry = instancedQuads({ iFrom: [this.from, 3], iTo: [this.to, 3], iColor: [this.color, 4], iWidth: [this.width, 1] }, true);
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
    uploadQuads(this.mesh.geometry, this.n);
  }
}

/** Streaks held a while (muzzle tongues and flashes along a shot): full on their first frame, fading over their life, drawn into Strips each frame. */
export class Streaks {
  /** From, to, width, colour × intensity, white core, life, age. */
  private readonly f: Float32Array;
  private n = 0;
  private readonly color = new THREE.Color();

  constructor(readonly capacity: number, readonly smoke = false) {
    this.f = new Float32Array(capacity * 13);
  }

  add(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, width: number, color: THREE.Color, intensity: number, core: number, life: number): void {
    const o = (this.n++ % this.capacity) * 13;
    const f = this.f;
    f[o] = x0; f[o + 1] = y0; f[o + 2] = z0; f[o + 3] = x1; f[o + 4] = y1; f[o + 5] = z1;
    f[o + 6] = width; f[o + 7] = color.r * intensity; f[o + 8] = color.g * intensity; f[o + 9] = color.b * intensity;
    f[o + 10] = core; f[o + 11] = life; f[o + 12] = 0;
  }

  draw(strips: Strips, dt: number): void {
    const f = this.f;
    for (let q = 0; q < Math.min(this.capacity, this.n); q += 1) {
      const o = q * 13;
      const k = 1 - f[o + 12]! / Math.max(1e-3, f[o + 11]!);
      if (k <= 0) continue;
      f[o + 12] = f[o + 12]! + dt;
      strips.add(f[o]!, f[o + 1]!, f[o + 2]!, f[o + 3]!, f[o + 4]!, f[o + 5]!, f[o + 6]! * (0.5 + 0.5 * k), this.color.setRGB(f[o + 7]!, f[o + 8]!, f[o + 9]!), k, f[o + 10]! * k);
    }
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
  // It rises over its first fifth (2.4 m): no orange sheet on the deck round the ship (§12).
  float far = smoothstep(1.0, 0.82, vUv.y) * smoothstep(0.0, 0.2, vUv.y);
  vec3 color = (uColor * glow * 0.5 + vec3(1.0, 0.95, 0.85) * core * 1.0) * far * uPower;
  gl_FragColor = vec4(color, 1.0);
}`;

/** The Tia ray on the floor: a burning strip `length` m from the muzzle along the ray, its glow `width` m wide. */
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

  /** Along the ray's unit direction (ux, uz) in sim axes (x across, z toward the gate). */
  update(on: boolean, ux: number, uz: number, power: number, time: number): void {
    this.mesh.visible = on || this.uniforms.uPower.value > 0.02;
    this.uniforms.uPower.value += ((on ? power : 0) - this.uniforms.uPower.value) * (on ? 0.5 : 0.25);
    this.uniforms.uTime.value = time;
    this.mesh.position.set(0, 0, -this.start);
    this.mesh.rotation.y = Math.atan2(-ux, uz);
  }

  get power(): number {
    return this.uniforms.uPower.value;
  }
}
