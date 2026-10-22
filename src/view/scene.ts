/**
 * The S0 stage (docs/survival/BUILD_S0.md §3): a 24 m × 60 m corridor of dark
 * glass over deep space, seen from above at a fixed 55° tilt; rows of energy
 * pylons for walls, a portal gate at the far end, the red bottom line before
 * the ship. Everything is made in code (shaders, primitives). The camera only
 * shakes (a pixel offset of the view, never the HUD). Sim (x, z) is three's
 * (x, 0, −z): the ship at the origin, the gate at z = −60.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FIELD, type Tier } from "../content/rules";

/** Per tier: pixel ratio cap, antialias, bloom, and effect budgets (SURVIVAL_MODE_PLAN.md 8.1). */
export const VIEW_TIERS: Record<Tier, { dpr: number; aa: boolean; bloom: boolean; particles: number; numbers: number; debris: number; bursts: number }> = {
  low: { dpr: 1, aa: false, bloom: false, particles: 600, numbers: 50, debris: 150, bursts: 120 },
  medium: { dpr: 1, aa: true, bloom: false, particles: 1500, numbers: 100, debris: 400, bursts: 240 },
  high: { dpr: 1.5, aa: true, bloom: true, particles: 3000, numbers: 160, debris: 900, bursts: 400 },
  ultra: { dpr: 2, aa: true, bloom: true, particles: 4500, numbers: 200, debris: 1400, bursts: 600 },
};

/**
 * "Nhìn từ trên xuống nghiêng 55°": the view is tilted 55° away from straight
 * down, so the camera looks down 35° below the horizon (BUILD_NOTES.md: at
 * 55° below the horizon the whole 60 m corridor fits only as a thin strip
 * with 15 px foes).
 */
const PITCH = THREE.MathUtils.degToRad(35);
const FOV = 56;
/** Where the ship and the gate sit on screen (NDC y): the ship just above the HUD, the gate near the top. */
const SHIP_Y = -0.56;
const GATE_Y = 0.8;

const FLOOR_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const FLOOR_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uThreat;
varying vec3 vWorld;
float line(float v, float width) {
  float d = abs(fract(v) - 0.5);
  return smoothstep(0.5 - width, 0.5, d);
}
void main() {
  float x = vWorld.x;
  float z = -vWorld.z;
  float edge = smoothstep(${(FIELD.halfW - 2.5).toFixed(1)}, ${FIELD.halfW.toFixed(1)}, abs(x));
  float grid = line(x * 0.5, 0.035) * 0.35 + line(z * 0.5, 0.035) * 0.35 + line(x * 0.125, 0.012) * 0.6 + line(z * 0.125, 0.012) * 0.6;
  // Chevrons flowing toward the ship.
  float chevron = line((z + abs(x) * 0.35 + uTime * 3.2) * 0.2, 0.03) * smoothstep(1.0, 0.0, abs(x) / 9.0);
  float far = smoothstep(62.0, 40.0, z);
  vec3 base = mix(vec3(0.016, 0.022, 0.06), vec3(0.03, 0.025, 0.08), smoothstep(0.0, 60.0, z));
  vec3 color = base + vec3(0.12, 0.32, 0.55) * grid * 0.28 * far + vec3(0.25, 0.45, 0.9) * chevron * 0.07 * far;
  color += vec3(0.5, 0.25, 0.95) * edge * 0.55;
  // The bottom line and the danger glow that grows with the threat.
  float bottom = smoothstep(0.35, 0.0, abs(z - ${FIELD.bottomZ.toFixed(1)}));
  float danger = smoothstep(10.0, ${FIELD.bottomZ.toFixed(1)}, z) * uThreat;
  color += vec3(1.0, 0.18, 0.2) * (bottom * (0.9 + 0.6 * uThreat) + danger * 0.1);
  float alpha = mix(0.9, 0.97, edge) * smoothstep(${(FIELD.gateZ + 4).toFixed(1)}, ${(FIELD.gateZ - 2).toFixed(1)}, z);
  gl_FragColor = vec4(color, alpha);
}`;

const SKY_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  vec2 p = vWorld.xz * 0.012;
  float n = fbm(p + vec2(uTime * 0.004, 0.0));
  float m = fbm(p * 1.7 - 4.0);
  vec3 color = vec3(0.006, 0.008, 0.024);
  color += vec3(0.2, 0.07, 0.3) * pow(n, 3.0) * 0.8;
  color += vec3(0.03, 0.13, 0.26) * pow(m, 3.2) * 0.7;
  color += vec3(0.4, 0.1, 0.28) * pow(n * m, 3.4) * 0.9;
  // Stars: sparse hashed points, a few twinkling.
  vec2 cell = floor(vWorld.xz * 0.9);
  float star = hash(cell);
  vec2 inCell = fract(vWorld.xz * 0.9) - 0.5;
  float d = length(inCell - (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.7);
  float twinkle = 0.7 + 0.3 * sin(uTime * (1.0 + star * 4.0) + star * 40.0);
  color += vec3(0.8, 0.88, 1.0) * step(0.985, star) * smoothstep(0.07, 0.0, d) * twinkle * 1.6;
  gl_FragColor = vec4(color, 1.0);
}`;

const RAIL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec3 vWorld;
void main() {
  float z = -vWorld.z;
  float pulse = pow(0.5 + 0.5 * sin(z * 0.45 + uTime * 5.0), 6.0);
  float fade = smoothstep(${(FIELD.gateZ + 3).toFixed(1)}, ${(FIELD.gateZ - 6).toFixed(1)}, z);
  gl_FragColor = vec4(uColor * (0.4 + pulse * 1.1) * fade, 1.0);
}`;

const PORTAL_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p * vec2(1.0, 1.6));
  float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 5.0 - uTime * 2.4 + r * 9.0);
  float glow = smoothstep(1.0, 0.2, r) * (0.35 + 0.35 * swirl);
  vec3 color = mix(vec3(1.0, 0.35, 0.8), vec3(0.4, 0.9, 1.0), swirl) * glow;
  gl_FragColor = vec4(color, 1.0);
}`;

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 2500);
  readonly composer: EffectComposer | null;
  private readonly bloom: UnrealBloomPass | null;
  private readonly uniforms = { uTime: { value: 0 }, uThreat: { value: 0 } };
  private readonly camPos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
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
    this.scene.background = new THREE.Color("#02030a");
    this.scene.add(new THREE.HemisphereLight(0xb8c8ff, 0x1a0f2e, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-6, 20, 8);
    const rim = new THREE.DirectionalLight(0x6fd8ff, 1.6);
    rim.position.set(10, 6, -30);
    const rimPink = new THREE.DirectionalLight(0xff6ad5, 1.1);
    rimPink.position.set(-12, 5, -20);
    this.scene.add(key, rim, rimPink);
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
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: FLOOR_VERTEX, fragmentShader: SKY_FRAGMENT, depthWrite: false }),
    );
    sky.position.set(0, -70, -300);
    sky.renderOrder = -10;
    this.scene.add(sky);
    const length = gateZ + 10;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW * 2, length).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: FLOOR_VERTEX, fragmentShader: FLOOR_FRAGMENT, transparent: true, depthWrite: false }),
    );
    floor.position.set(0, 0, -(length / 2) + 5);
    floor.renderOrder = -5;
    this.scene.add(floor);
    // Under the glass: a dark slab with lit edges, so the corridor floats in space.
    const slab = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.6, 1.2, length), new THREE.MeshStandardMaterial({ color: "#0b0f24", roughness: 0.6, metalness: 0.7 }));
    slab.position.set(0, -0.62, floor.position.z);
    this.scene.add(slab);
    // Walls: energy rails and pylons every 3 m.
    const posts = Math.floor(length / 3);
    const pylon = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 1.5, 0.42), new THREE.MeshStandardMaterial({ color: "#1b2045", roughness: 0.35, metalness: 0.85 }), posts * 2);
    const caps = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.45, 1.75) }), posts * 2);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < posts; i += 1) {
      for (const side of [-1, 1]) {
        const index = i * 2 + (side > 0 ? 1 : 0);
        const z = 4 - i * 3;
        pylon.setMatrixAt(index, matrix.makeTranslation(side * (halfW + 0.15), 0.6, z));
        caps.setMatrixAt(index, matrix.makeTranslation(side * (halfW + 0.15), 1.55, z));
      }
    }
    this.scene.add(pylon, caps);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.16, length),
        new THREE.ShaderMaterial({ uniforms: { ...this.uniforms, uColor: { value: side < 0 ? new THREE.Color(0.9, 0.35, 1.4) : new THREE.Color(0.35, 0.9, 1.5) } }, vertexShader: FLOOR_VERTEX, fragmentShader: RAIL_FRAGMENT }),
      );
      rail.position.set(side * (halfW + 0.15), 0.35, floor.position.z);
      this.scene.add(rail);
    }
    // The gate: an arch of light over the far end, a portal shimmer inside it.
    const arch = new THREE.Mesh(new THREE.TorusGeometry(halfW + 0.4, 0.35, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.8, 2.6) }));
    arch.scale.set(1, 0.55, 1);
    arch.position.set(0, 0, -gateZ);
    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW * 2, halfW * 0.55 * 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: PORTAL_FRAGMENT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    portal.position.set(0, 0, -gateZ - 0.2);
    portal.renderOrder = 6;
    this.scene.add(arch, portal);
  }

  /** The 0 … 1 pressure of foes near the bottom line (floor glow). */
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
    this.camera.updateProjectionMatrix();
  }

  /** Advances the stage's own motion and applies the shake. */
  update(time: number): void {
    this.uniforms.uTime.value = time;
    const camera = this.camera;
    camera.position.copy(this.camPos);
    camera.lookAt(this.look);
    if (this.roll !== 0) camera.rotateZ(this.roll);
    if (this.shakeX !== 0 || this.shakeY !== 0) camera.setViewOffset(this.width, this.height, -this.shakeX, -this.shakeY, this.width, this.height);
    else if (camera.view?.enabled) camera.clearViewOffset();
  }

  render(): void {
    this.renderer.info.reset();
    if (this.composer !== null) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /** Screen position (CSS px) of sim point (x, z) at height y. */
  project(x: number, z: number, y: number, out: THREE.Vector3): THREE.Vector3 {
    out.set(x, y, -z).project(this.camera);
    out.x = (out.x * 0.5 + 0.5) * this.width;
    out.y = (0.5 - out.y * 0.5) * this.height;
    return out;
  }
}
