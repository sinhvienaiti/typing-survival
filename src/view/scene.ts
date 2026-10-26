/**
 * The stage of Tuyến Cuối, "Vành Chân Trời" (docs/BUILD_S0.md §3, theme
 * docs/changelog/2026-10-23-theme.md): an old steel station's corridor, 24 m
 * wide and 40 m long, running out to the rim of a black hole. A deck of
 * riveted steel plates with lane markings and hazard stripes, a gun bay deck
 * behind the red bottom line, steel parapets with amber warning lamps and
 * electric conduits, a heavy arch at the far end, and beyond it the black
 * hole with its accretion disk on a backdrop that faces the camera. All of it
 * is shaders and primitives made in code (no models); the shaders end in
 * three's tone mapping and colour space, so Low and Medium (drawn straight to
 * the screen) look like High (drawn through the bloom). The camera only shakes
 * (a pixel offset of the view, never the HUD). Sim (x, z) is three's
 * (x, 0, −z): the ship at the origin, the gate at z = −40.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FIELD, type Tier } from "../content/rules";
import { PALETTE } from "./theme";

/** Per tier: pixel ratio cap, antialias, bloom, and effect budgets (SURVIVAL_MODE_PLAN.md 8.1). */
export const VIEW_TIERS: Record<Tier, { dpr: number; aa: boolean; bloom: boolean; particles: number; numbers: number; debris: number; bursts: number }> = {
  low: { dpr: 1, aa: false, bloom: false, particles: 600, numbers: 50, debris: 150, bursts: 120 },
  medium: { dpr: 1, aa: true, bloom: false, particles: 1500, numbers: 100, debris: 400, bursts: 240 },
  high: { dpr: 1.5, aa: true, bloom: true, particles: 3000, numbers: 160, debris: 900, bursts: 400 },
  ultra: { dpr: 2, aa: true, bloom: true, particles: 4500, numbers: 200, debris: 1400, bursts: 600 },
};

/**
 * "Nhìn từ trên xuống nghiêng 55°": the view is tilted 55° away from straight
 * down, so the camera looks down ~35° below the horizon (BUILD_NOTES.md: at
 * 55° below the horizon the whole corridor fits only as a thin strip with
 * 15 px foes). The S0 review shortened the corridor to 40 m and narrowed the
 * lens (56° → 42°), so the camera sits closer to the far end: a foe at the
 * gate is ~25 px tall at 720p (was 15), one at the bottom line as before.
 */
const PITCH = THREE.MathUtils.degToRad(36);
const FOV = 42;
/** Where the ship and the gate sit on screen (NDC y): the ship just above the HUD, the gate near the top. */
const SHIP_Y = -0.56;
const GATE_Y = 0.8;
/** The backdrop: how far out it hangs and how much it overshoots the view (for the shake). */
const SKY_DISTANCE = 2000;
const SKY_OVER = 1.2;
/** The black hole on the backdrop: centre (NDC), shadow radius (half view heights), the disk's tilt (its height / width). */
const HOLE = new THREE.Vector4(0, 0.86, 0.16, 0.13);
/**
 * The title's view: low behind the ship and turned a little left, looking
 * down the corridor at the black hole on the horizon (the title card sits on
 * the left). Starting a fight swings the camera down into the fight's view.
 */
const TITLE_EYE = new THREE.Vector3(-3.5, 5.5, 16);
const TITLE_AT = new THREE.Vector3(-10, 1.5, -60);
const TITLE_HOLE = new THREE.Vector4(0.36, 0.3, 0.34, 0.13);
/** How fast the view swings between the title and the fight (1/s). */
const TITLE_RATE = 2.4;
/** The deck dissolves into the black hole's glow over its last metres. */
const DECK_FADE = { from: FIELD.gateZ - 4, to: FIELD.gateZ + 2 } as const;

const f = (value: number): string => value.toFixed(2);
const vec3 = (hex: string, k = 1): string => {
  const c = new THREE.Color(hex);
  return "vec3(" + f(c.r * k) + ", " + f(c.g * k) + ", " + f(c.b * k) + ")";
};

const WORLD_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const UV_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const HASH = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 g = fract(p);
  vec2 u = g * g * (3.0 - 2.0 * g);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

/**
 * The deck. Plates 4 × 3 m (every other row shifted 2 m), each its own shade
 * with brushed streaks, dark seams with a lit bevel, four rivets; worn amber
 * lane dashes at x = ±4, white edge lines, hazard stripes along the walls and
 * before the bottom line; the gun bay deck behind it (heavier plates, the
 * ship's painted bay ring). Light: a warm wash from the black hole at the far
 * end, blue pools under the wall conduits, a work light on the ship. The red
 * line and its glow grow with the threat; the hazard stripes then blink.
 */
const FLOOR_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uThreat;
varying vec3 vWorld;
${HASH}
float band(float v, float a, float b, float soft) { return smoothstep(a - soft, a, v) * (1.0 - smoothstep(b, b + soft, v)); }
void main() {
  float x = vWorld.x;
  float z = -vWorld.z;
  float ax = abs(x);
  bool bay = z < ${f(FIELD.bottomZ)};
  // Plates: in the bay 6 × 4 m, on the deck 4 × 3 m in shifted rows.
  vec2 size = bay ? vec2(6.0, 4.0) : vec2(4.0, 3.0);
  float row = floor(z / size.y);
  vec2 q = vec2((x + 12.0 + mod(row, 2.0) * size.x * 0.5) / size.x, z / size.y);
  vec2 id = floor(q);
  vec2 m = fract(q) * size;
  float shade = 0.78 + 0.34 * hash(id + 3.7);
  float brush = 0.92 + 0.08 * hash(vec2(floor(z * 26.0), id.x));
  float wear = 0.86 + 0.14 * hash(id + 9.1) * (0.6 + 0.4 * sin(x * 0.9 + z * 0.4));
  vec2 edge = min(m, size - m);
  float e = min(edge.x, edge.y);
  float seam = 1.0 - smoothstep(0.025, 0.06, e);
  float bevel = band(e, 0.07, 0.11, 0.03) * step(m.y, size.y * 0.5);
  vec2 corner = vec2(m.x < size.x * 0.5 ? 0.22 : size.x - 0.22, m.y < size.y * 0.5 ? 0.22 : size.y - 0.22);
  float rd = length(m - corner);
  float rivet = 1.0 - smoothstep(0.05, 0.075, rd);
  float rivetShadow = band(rd, 0.07, 0.12, 0.03);
  vec3 steel = ${vec3("#1d2329")} * shade * brush * wear * (bay ? 0.75 : 1.0);
  vec3 color = steel;
  color *= 1.0 - seam * 0.75 - rivetShadow * 0.35;
  color += vec3(0.05) * bevel + vec3(0.11, 0.12, 0.13) * rivet;
  // Paint (lane dashes, edge lines, chevrons pointing at the line, hazard stripes, the ship's bay ring), worn by noise where there is paint.
  float dash = step(fract(z / 2.4), 0.55) * band(abs(ax - 4.0), 0.0, 0.07, 0.02) * (bay ? 0.0 : 1.0);
  float edgeLine = band(abs(ax - 10.35), 0.0, 0.06, 0.02);
  float zz = mod(z - 6.0, 9.0);
  float chevron = band(zz - ax * 0.55, 1.0, 1.32, 0.03) * step(ax, 1.5) * step(8.0, z);
  float wall = band(ax, 10.6, 12.2, 0.02);
  float line = band(z, ${f(FIELD.bottomZ + 0.15)}, ${f(FIELD.bottomZ + 1.05)}, 0.02) * step(ax, 10.5);
  float ring = band(abs(length(vec2(x, z)) - 2.6), 0.0, 0.08, 0.02) * step(z, ${f(FIELD.bottomZ)});
  if (dash + edgeLine + chevron + wall + line + ring > 0.0) {
    float paint = smoothstep(0.25, 0.55, noise(vec2(x * 2.3, z * 1.1)));
    color = mix(color, ${vec3(PALETTE.hot, 0.55)}, dash * paint * 0.85);
    color = mix(color, vec3(0.42, 0.43, 0.42), edgeLine * paint * 0.8);
    color = mix(color, ${vec3(PALETTE.hot, 0.38)}, chevron * paint * 0.8);
    // Hazard stripes blink with the threat.
    float blink = 1.0 + uThreat * 0.7 * (0.5 + 0.5 * sin(uTime * 9.0));
    float stripes = step(0.5, fract((z + ax) * 0.55));
    vec3 hazard = mix(vec3(0.012), ${vec3(PALETTE.hot, 0.6)} * blink, stripes);
    color = mix(color, hazard, max(wall, line) * mix(0.55, 0.95, paint));
    color = mix(color, ${vec3(PALETTE.hot, 0.45)}, ring * 0.8);
  }
  // Light: the black hole's warm wash far off, blue pools under the conduits, the work light on the ship.
  float far = smoothstep(8.0, ${f(FIELD.gateZ)}, z);
  color += ${vec3(PALETTE.hot, 0.085)} * far * far;
  float lz = mod(z + 1.0, 6.0) - 3.0;
  float lamp = exp(-((ax - 11.6) * (ax - 11.6) * 0.18 + lz * lz * 0.3));
  color += ${vec3(PALETTE.volt, 0.05)} * lamp;
  color += vec3(0.05, 0.048, 0.045) * exp(-(x * x + z * z) * 0.02);
  color *= mix(1.0, 0.55, smoothstep(${f(FIELD.gateZ - 14)}, ${f(FIELD.gateZ)}, z));
  // The bottom line, red, and the danger glow growing with the threat.
  float bottom = smoothstep(0.32, 0.0, abs(z - ${f(FIELD.bottomZ)}));
  float danger = smoothstep(10.0, ${f(FIELD.bottomZ)}, z) * uThreat;
  color += ${vec3(PALETTE.danger)} * (bottom * (0.85 + 0.6 * uThreat) + danger * 0.12);
  float alpha = smoothstep(${f(DECK_FADE.to)}, ${f(DECK_FADE.from)}, z);
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * The black hole on the backdrop (a plane facing the camera, so it holds its
 * place on screen): the shadow, a thin photon ring, the far side of the
 * accretion disk lensed into an arc round it, the near side crossing in front
 * of it; the disk hotter inside, brighter and bluer on its approaching (left)
 * side. Round it the void: matter spiralling in, a warm glow, a few stars.
 */
const SKY_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform vec4 uHole;
varying vec2 vUv;
${HASH}
void main() {
  vec2 ndc = (vUv * 2.0 - 1.0) * ${f(SKY_OVER)};
  vec2 q = vec2(ndc.x * uAspect, ndc.y);
  vec2 d = q - vec2(uHole.x * uAspect, uHole.y);
  float R = uHole.z;
  float r = max(length(d), 1e-4);
  float rr = r / R;
  vec3 color = vec3(0.004, 0.005, 0.007);
  // Matter spiralling in: noise on the direction, turned by log(r) and time (no seam round the hole).
  float lr = log(r);
  float turn = 2.6 * lr - uTime * 0.05;
  vec2 dir = d / r;
  vec2 sp = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * dir;
  float streams = noise(sp * 4.2 + lr * 0.7);
  streams = streams * streams * streams;
  vec3 streamColor = mix(${vec3(PALETTE.hot)}, ${vec3(PALETTE.volt)}, smoothstep(0.25, 1.6, r));
  color += streamColor * streams * 0.42 * exp(-r * 1.1);
  color += ${vec3(PALETTE.hot)} * 0.2 * exp(-r * 2.2);
  color += ${vec3(PALETTE.volt)} * 0.035 * smoothstep(0.3, 1.3, -q.y) * smoothstep(0.4, 1.6, abs(q.x));
  // Stars, few and faint, dimmed near the glow.
  vec2 cell = floor(q * 55.0);
  float star = hash(cell);
  float sd = length(fract(q * 55.0) - 0.5 - (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.6);
  color += vec3(0.75, 0.82, 1.0) * step(0.988, star) * smoothstep(0.09, 0.0, sd) * (0.6 + 0.4 * sin(uTime * (1.0 + star * 3.0) + star * 30.0)) * smoothstep(0.25, 0.9, r);
  // Doppler: the side turning toward us (left) is brighter and bluer.
  float toward = clamp(-d.x / r, -1.0, 1.0);
  float beam = 1.0 + 0.65 * toward;
  // The lensed far side: an arc round the shadow, strongest over the top.
  float arc = smoothstep(1.03, 1.1, rr) * (1.0 - smoothstep(1.16, 1.75, rr)) * mix(0.3, 1.0, smoothstep(-0.4, 0.7, d.y / r));
  float photon = smoothstep(0.985, 1.005, rr) * (1.0 - smoothstep(1.005, 1.04, rr));
  vec3 hot = mix(${vec3(PALETTE.hot)}, vec3(1.0, 0.86, 0.68), smoothstep(1.6, 1.05, rr));
  hot = mix(hot, ${vec3(PALETTE.voltHi)}, max(0.0, toward) * 0.45);
  color += hot * (arc * 1.0 + photon * 1.5) * beam;
  color += ${vec3(PALETTE.hot)} * 0.5 * exp(-max(rr - 1.0, 0.0) * 2.4) * step(1.0, rr);
  // The shadow takes everything behind it.
  color *= smoothstep(0.985, 1.0, rr);
  // The near side of the disk: a tilted ring, its orbits rippled and turning (faster inside).
  vec2 e = vec2(d.x, d.y / uHole.w) / R;
  float re = length(e);
  float disk = smoothstep(1.35, 1.75, re) * (1.0 - smoothstep(2.4, 6.2, re));
  if (disk > 0.001) {
    float spin = uTime * 0.9 / (re * re);
    vec2 ro = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * (e / re);
    float rings = 0.35 + 0.85 * noise(vec2(re * 13.0, re * 2.0) + ro * 1.7);
    float front = rr < 1.0 ? step(d.y, 0.0) : 1.0;
    vec3 heat = mix(vec3(1.0, 0.9, 0.74), ${vec3(PALETTE.hot)}, smoothstep(1.8, 3.0, re));
    heat = mix(heat, ${vec3(PALETTE.ember, 0.6)}, smoothstep(3.0, 5.5, re));
    heat = mix(heat, ${vec3(PALETTE.voltHi)}, max(0.0, toward) * 0.4 * (1.0 - smoothstep(1.8, 3.5, re)));
    color += heat * disk * rings * front * beam * mix(1.15, 0.4, smoothstep(1.8, 5.0, re));
  }
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Conduits on the parapets: electric blue, pulses running toward the ship. */
const CONDUIT_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec3 vWorld;
void main() {
  float z = -vWorld.z;
  float pulse = pow(0.5 + 0.5 * sin(z * 0.5 + uTime * 4.0), 8.0);
  float fade = smoothstep(${f(DECK_FADE.to + 2)}, ${f(DECK_FADE.from)}, z);
  gl_FragColor = vec4(uColor * (0.35 + pulse * 1.2) * fade, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** The rift in the arch: a faint heat haze turning toward the black hole, hot at its rim. */
const RIFT_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p * vec2(1.0, 1.7));
  float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 4.0 + uTime * 0.8 - r * 7.0);
  float rim = smoothstep(0.55, 0.95, r) * smoothstep(1.05, 0.9, r);
  float haze = smoothstep(1.0, 0.0, r) * swirl * 0.18;
  vec3 color = ${vec3(PALETTE.hot)} * (rim * 0.55 + haze) + ${vec3(PALETTE.volt)} * haze * 0.25;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 2500);
  readonly composer: EffectComposer | null;
  private readonly bloom: UnrealBloomPass | null;
  private readonly uniforms = { uTime: { value: 0 }, uThreat: { value: 0 } };
  private readonly sky: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly skyUniforms = { uTime: this.uniforms.uTime, uAspect: { value: 16 / 9 }, uHole: { value: HOLE.clone() } };
  private readonly camPos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly camQuat = new THREE.Quaternion();
  private readonly titleQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(TITLE_EYE, TITLE_AT, new THREE.Vector3(0, 1, 0)));
  /** The fight's view held still (no shake, roll or title swing): the HUD lays out against it. */
  private readonly still = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 2500);
  private readonly ahead = new THREE.Vector3();
  /** 1 in the title's view, 0 in the fight's; eases toward `titleTarget`. */
  private titleBlend = 0;
  private titleTarget = 0;
  private lastTime = -1;
  width = 1;
  height = 1;
  /** Shake in CSS px and roll (radians), set before render. */
  shakeX = 0;
  shakeY = 0;
  roll = 0;

  constructor(canvas: HTMLCanvasElement, readonly tier: Tier) {
    const spec = VIEW_TIERS[tier];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: spec.aa, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.info.autoReset = false;
    this.scene.background = new THREE.Color(PALETTE.void);
    // Cold station light from above, a warm key from behind the ship, the black hole's orange from the far end, a blue rim from the conduits.
    this.scene.add(new THREE.HemisphereLight(0xaab8c8, 0x2a160c, 0.75));
    const key = new THREE.DirectionalLight(0xfff1e0, 1.7);
    key.position.set(-6, 20, 8);
    const hole = new THREE.DirectionalLight(PALETTE.hot, 1.4);
    hole.position.set(0, 6, -40);
    const volt = new THREE.DirectionalLight(PALETTE.volt, 1.1);
    volt.position.set(14, 4, -10);
    this.scene.add(key, hole, volt);
    this.sky = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ uniforms: this.skyUniforms, vertexShader: UV_VERTEX, fragmentShader: SKY_FRAGMENT, depthWrite: false, depthTest: false }),
    );
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.build();
    if (spec.bloom) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.3, 1.0);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    } else {
      this.composer = null;
      this.bloom = null;
    }
  }

  private build(): void {
    const { halfW, gateZ } = FIELD;
    const length = gateZ + 10;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW * 2 + 0.6, length).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WORLD_VERTEX, fragmentShader: FLOOR_FRAGMENT, transparent: true, depthWrite: false }),
    );
    floor.position.set(0, 0, -(length / 2) + 5);
    floor.renderOrder = -5;
    this.scene.add(floor);
    const steel = new THREE.MeshStandardMaterial({ color: "#1c2228", roughness: 0.5, metalness: 0.82 });
    const steelLight = new THREE.MeshStandardMaterial({ color: "#3a434c", roughness: 0.42, metalness: 0.85 });
    // Under the deck: a heavy slab, so the corridor juts out over the void.
    const deckLength = FIELD.gateZ + 6;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 1.2, 1.6, deckLength), steel);
    slab.position.set(0, -0.82, 5 - deckLength / 2);
    this.scene.add(slab);
    // Walls: a steel parapet each side, bulkhead posts every 3 m with an amber lamp, an electric conduit on top.
    const posts = Math.floor(deckLength / 3);
    const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 1.9, 0.62), steelLight, posts * 2);
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.12, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.48, 0.1) }), posts * 2);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < posts; i += 1) {
      for (const side of [-1, 1]) {
        const index = i * 2 + (side > 0 ? 1 : 0);
        const z = 4 - i * 3;
        post.setMatrixAt(index, matrix.makeTranslation(side * (halfW + 0.45), 0.75, z));
        lamps.setMatrixAt(index, matrix.makeTranslation(side * (halfW + 0.45), 1.76, z));
      }
    }
    this.scene.add(post, lamps);
    for (const side of [-1, 1]) {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.95, deckLength), steel);
      parapet.position.set(side * (halfW + 0.42), 0.47, 5 - deckLength / 2);
      const conduit = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, deckLength),
        new THREE.ShaderMaterial({ uniforms: { ...this.uniforms, uColor: { value: new THREE.Color(PALETTE.volt).multiplyScalar(1.5) } }, vertexShader: WORLD_VERTEX, fragmentShader: CONDUIT_FRAGMENT }),
      );
      conduit.position.set(side * (halfW + 0.2), 1.0, 5 - deckLength / 2);
      this.scene.add(parapet, conduit);
    }
    // The far end: a heavy steel arch with a hot inner edge, a faint rift turning toward the black hole.
    const arch = new THREE.Mesh(new THREE.TorusGeometry(halfW + 0.9, 0.7, 6, 40, Math.PI), steelLight);
    arch.scale.set(1, 0.55, 1);
    arch.position.set(0, 0, -gateZ);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(halfW + 0.15, 0.09, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.hot).multiplyScalar(2.2) }));
    edge.scale.set(1, 0.55, 1);
    edge.position.set(0, 0, -gateZ + 0.3);
    const rift = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW * 2, halfW * 0.55 * 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: UV_VERTEX, fragmentShader: RIFT_FRAGMENT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    rift.position.set(0, 0, -gateZ - 0.2);
    rift.renderOrder = 6;
    this.scene.add(arch, edge, rift);
  }

  /** The title's view (true) or the fight's; `snap` jumps there at once. */
  setTitle(on: boolean, snap = false): void {
    this.titleTarget = on ? 1 : 0;
    if (snap) this.titleBlend = this.titleTarget;
  }

  /** 0 in the fight's view, 1 in the title's (the scenarios wait for 0 before measuring). */
  get titleView(): number {
    return this.titleBlend;
  }

  /** The 0 … 1 pressure of foes near the bottom line (floor glow, blinking stripes). */
  set threat(value: number) {
    this.uniforms.uThreat.value += (value - this.uniforms.uThreat.value) * 0.08;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const dpr = Math.min(VIEW_TIERS[this.tier].dpr, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.composer?.setPixelRatio(dpr);
    this.composer?.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    // Ship at SHIP_Y and the gate at GATE_Y on screen, looking down at PITCH.
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const a = Math.tan(PITCH + Math.atan(-SHIP_Y * tanHalf));
    const b = Math.tan(PITCH + Math.atan(-GATE_Y * tanHalf));
    const back = (b * FIELD.gateZ) / (a - b);
    this.camPos.set(0, a * back, back);
    this.look.set(0, -Math.sin(PITCH), -Math.cos(PITCH)).add(this.camPos);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.look);
    this.camQuat.copy(this.camera.quaternion);
    this.still.copy(this.camera);
    this.still.clearViewOffset();
    this.still.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    // The backdrop faces the camera and fills its view (with room for the shake).
    const tall = 2 * SKY_DISTANCE * tanHalf * SKY_OVER;
    this.sky.scale.set(tall * this.camera.aspect, tall, 1);
    this.skyUniforms.uAspect.value = this.camera.aspect;
    this.update(Math.max(0, this.lastTime));
  }

  /** Advances the stage's own motion and applies the shake. */
  update(time: number): void {
    this.uniforms.uTime.value = time;
    const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    this.titleBlend += (this.titleTarget - this.titleBlend) * (1 - Math.exp(-dt * TITLE_RATE));
    if (Math.abs(this.titleTarget - this.titleBlend) < 0.002) this.titleBlend = this.titleTarget;
    const k = this.titleBlend * this.titleBlend * (3 - 2 * this.titleBlend);
    const camera = this.camera;
    camera.position.lerpVectors(this.camPos, TITLE_EYE, k);
    camera.quaternion.slerpQuaternions(this.camQuat, this.titleQuat, k);
    // The backdrop follows the view (before the roll), the black hole moves on it with the swing.
    this.ahead.set(0, 0, -SKY_DISTANCE).applyQuaternion(camera.quaternion);
    this.sky.position.copy(camera.position).add(this.ahead);
    this.sky.quaternion.copy(camera.quaternion);
    this.skyUniforms.uHole.value.lerpVectors(HOLE, TITLE_HOLE, k);
    if (this.roll !== 0) camera.rotateZ(this.roll);
    if (this.shakeX !== 0 || this.shakeY !== 0) camera.setViewOffset(this.width, this.height, -this.shakeX, -this.shakeY, this.width, this.height);
    else if (camera.view?.enabled) camera.clearViewOffset();
  }

  render(): void {
    this.renderer.info.reset();
    if (this.composer !== null) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /** Screen position (CSS px) of sim point (x, z) at height y; `still`: through the fight's view held still. */
  project(x: number, z: number, y: number, out: THREE.Vector3, still = false): THREE.Vector3 {
    out.set(x, y, -z).project(still ? this.still : this.camera);
    out.x = (out.x * 0.5 + 0.5) * this.width;
    out.y = (0.5 - out.y * 0.5) * this.height;
    return out;
  }

  /** The world point at height `y` under screen point (sx, sy) (CSS px), in the fight's view held still. */
  unproject(sx: number, sy: number, y: number, out: THREE.Vector3): THREE.Vector3 {
    const eye = this.still.position;
    out.set((sx / this.width) * 2 - 1, 1 - (sy / this.height) * 2, 0.5).unproject(this.still);
    const k = (y - eye.y) / (out.y - eye.y || 1e-6);
    return out.set(eye.x + (out.x - eye.x) * k, y, eye.z + (out.z - eye.z) * k);
  }
}
