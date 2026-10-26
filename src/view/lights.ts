/**
 * The guns' light (docs/FEEL_PASS_S1.md §4.1): a fixed pool of PointLights
 * made with the fight (Medium 2, High 4, Ultra 6, Low none), dark until a
 * shot takes one, so every lit material (the walls, the horde, the ship, the
 * chunks) compiles once; a new flash takes the slot with the least priority ×
 * light left. The same lights fall on the deck as pools through the floor
 * shader (its uniforms below, scene.ts): the plates' own shade lit in the
 * gun's colour, so seams and rivets read under a muzzle. 0 draw calls.
 */
import * as THREE from "three";
import { DECK_LIGHTS, lightLevel, pickLight, type LightSpec } from "./gun-rules";

/** Candela of a light of power 1 (the spec's unit), its reach (m), the deck pool's gain. */
const CANDELA = 26;
const RANGE = 7;
const POOL = 1.4;

export function deckLightUniforms() {
  return {
    uLightPos: { value: Array.from({ length: DECK_LIGHTS }, () => new THREE.Vector4(0, 0, 0, 1)) },
    uLightColor: { value: Array.from({ length: DECK_LIGHTS }, () => new THREE.Vector3()) },
  };
}
export type DeckLightUniforms = ReturnType<typeof deckLightUniforms>;

/** For the deck's shader: the uniforms and `deckLight(p)`, the pools' light at deck point p (xz, metres; w is a pool's radius). */
export const DECK_LIGHT_GLSL = /* glsl */ `
uniform vec4 uLightPos[${DECK_LIGHTS}];
uniform vec3 uLightColor[${DECK_LIGHTS}];
vec3 deckLight(vec3 p) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${DECK_LIGHTS}; i++) {
    float f = max(0.0, 1.0 - length(p.xz - uLightPos[i].xz) / max(uLightPos[i].w, 0.01));
    sum += uLightColor[i] * f * f;
  }
  return sum;
}`;

export class GunLights {
  readonly lights: THREE.PointLight[] = [];
  private readonly prio: Float32Array;
  private readonly power: Float32Array;
  private readonly life: Float32Array;
  private readonly age: Float32Array;
  private readonly left: Float32Array;
  private readonly pool: Float32Array;
  /** A held light's key + 1 (Tia's), 0 for a flash; touched this frame. */
  private readonly key: Uint8Array;
  private readonly touched: Uint8Array;
  private readonly colors: THREE.Color[];

  constructor(scene: THREE.Scene, private readonly deck: DeckLightUniforms, readonly count: number) {
    const f = () => new Float32Array(count);
    [this.prio, this.power, this.life, this.age, this.left, this.pool] = [f(), f(), f(), f(), f(), f()];
    this.key = new Uint8Array(count);
    this.touched = new Uint8Array(count);
    this.colors = Array.from({ length: count }, () => new THREE.Color());
    for (let i = 0; i < count; i += 1) {
      const light = new THREE.PointLight(0xffffff, 0, RANGE, 2);
      this.lights.push(light);
      scene.add(light);
    }
  }

  /** A flash of `spec` at three point (x, y, z) in `color`, × `scale`. */
  flash(spec: LightSpec, x: number, y: number, z: number, color: THREE.Color, scale = 1): void {
    const i = pickLight(this.prio, this.left, this.count);
    if (i < 0) return;
    this.set(i, spec, x, y, z, color, scale);
    this.key[i] = 0;
  }

  /** A light held while called every frame (`key` 1 … 255 tells holders apart), × `scale`. */
  hold(key: number, spec: LightSpec, x: number, y: number, z: number, color: THREE.Color, scale = 1): void {
    let i = -1;
    for (let k = 0; k < this.count && i < 0; k += 1) if (this.key[k] === key) i = k;
    if (i < 0) i = pickLight(this.prio, this.left, this.count);
    if (i < 0) return;
    this.set(i, spec, x, y, z, color, scale);
    this.key[i] = key;
    this.touched[i] = 1;
  }

  private set(i: number, spec: LightSpec, x: number, y: number, z: number, color: THREE.Color, scale: number): void {
    this.prio[i] = spec.prio;
    this.power[i] = spec.power * scale;
    this.left[i] = this.power[i]!;
    this.life[i] = spec.life;
    this.age[i] = 0;
    this.pool[i] = spec.pool;
    this.lights[i]!.position.set(x, y, z);
    this.colors[i]!.copy(color);
  }

  /** Ages the flashes, drops held lights not held this frame, writes the lights and the deck's pools. */
  update(dt: number): void {
    const pos = this.deck.uLightPos.value;
    const col = this.deck.uLightColor.value;
    for (let i = 0; i < DECK_LIGHTS; i += 1) {
      if (i >= this.count) {
        col[i]!.set(0, 0, 0);
        continue;
      }
      if (this.key[i]! > 0) {
        if (this.touched[i] === 0) this.left[i] = this.key[i] = 0;
        this.touched[i] = 0;
      } else if (this.left[i]! > 0) {
        this.age[i] = this.age[i]! + dt;
        this.left[i] = this.power[i]! * lightLevel(this.age[i]!, this.life[i]!);
      }
      const light = this.lights[i]!;
      const c = this.colors[i]!;
      const left = this.left[i]!;
      light.intensity = left * CANDELA;
      light.color.copy(c);
      pos[i]!.set(light.position.x, light.position.y, light.position.z, this.pool[i]!);
      col[i]!.set(c.r * left * POOL, c.g * left * POOL, c.b * left * POOL);
    }
  }

  /** Lights lit now (the scenarios' probe). */
  get lit(): number {
    let n = 0;
    for (let i = 0; i < this.count; i += 1) if (this.left[i]! > 0.01) n += 1;
    return n;
  }
}
