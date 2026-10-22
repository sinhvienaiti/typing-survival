/**
 * Damage numbers (SURVIVAL_MODE_PLAN.md 5.4), drawn by WebGL from a digit
 * atlas painted on a canvas at load (no DOM per number).
 *
 * NumberField is the rule part, testable without a GPU: blows on one target
 * within 150 ms roll up into one number that pops again; ticks (a beam's
 * pulses) roll up over 0.3 s and show "×N"; a number flies along its blow;
 * over the cap the smallest goes first, never one of T3 or above; and no
 * number may cover a protected rectangle (the learning frame, the gun slots,
 * the health bar, published by the HUD in screen pixels): it is moved above
 * it or dropped, and one that drifts into one is dropped.
 * NumberSprites draws the field in one instanced draw call.
 */
import * as THREE from "three";

export type Rect = { x: number; y: number; w: number; h: number };
export const STYLE = { normal: 0, crit: 1, perfect: 2, tick: 3 } as const;
const MERGE_S = 0.15;
const TICK_MERGE_S = 0.3;
const MAX = 200;
/** Glyph advance and height as shares of the font size. */
const ADVANCE = 0.58;
const LABEL = 0.42;

export class NumberField {
  limit = 160;
  /** Base font size in CSS px (the HUD scales it with the view). */
  fontPx = 20;
  protected: readonly Rect[] = [];
  dropped = 0;
  readonly alive = new Uint8Array(MAX);
  readonly key = new Int32Array(MAX);
  readonly style = new Uint8Array(MAX);
  readonly tier = new Uint8Array(MAX);
  readonly value = new Float64Array(MAX);
  readonly count = new Int32Array(MAX);
  readonly x = new Float32Array(MAX);
  readonly y = new Float32Array(MAX);
  readonly vx = new Float32Array(MAX);
  readonly vy = new Float32Array(MAX);
  readonly born = new Float64Array(MAX);
  readonly age = new Float32Array(MAX);
  readonly life = new Float32Array(MAX);
  readonly size = new Float32Array(MAX);
  readonly pop = new Float32Array(MAX);
  live = 0;

  private readonly labels: string[] = new Array<string>(MAX).fill("");

  /** Text shown for number i (digits, then "×N" for rolled-up ticks), kept until it changes. */
  text(i: number): string {
    return this.labels[i]!;
  }

  private relabel(i: number): void {
    const digits = String(Math.max(1, Math.round(this.value[i]!)));
    this.labels[i] = this.style[i] === STYLE.tick && this.count[i]! > 1 ? digits + "×" + this.count[i] : digits;
  }

  /** The number's box in screen px, centred on (x, y). */
  box(i: number, out: Rect, x = this.x[i]!, y = this.y[i]!): Rect {
    const px = this.fontPx * this.size[i]!;
    const glyphs = this.text(i).length;
    out.w = glyphs * ADVANCE * px;
    out.h = px * (this.style[i] === STYLE.perfect ? 1 + LABEL : 1);
    out.x = x - out.w / 2;
    out.y = y - px / 2 - (this.style[i] === STYLE.perfect ? LABEL * px : 0);
    return out;
  }

  private covers(box: Rect): Rect | null {
    for (const rect of this.protected) {
      if (box.x < rect.x + rect.w && box.x + box.w > rect.x && box.y < rect.y + rect.h && box.y + box.h > rect.y) return rect;
    }
    return null;
  }

  /**
   * A blow worth `value` on target `key` at screen (x, y), flying along
   * (dx, dy); `size` and `life` from the tier. Returns the number's index,
   * or −1 when it was dropped.
   */
  spawn(key: number, x: number, y: number, value: number, style: number, tierId: number, size: number, life: number, dx: number, dy: number, now: number): number {
    const tick = style === STYLE.tick;
    for (let i = 0; i < MAX; i += 1) {
      if (this.alive[i] === 0 || this.key[i] !== key || (this.style[i] === STYLE.tick) !== tick) continue;
      if (now - this.born[i]! > (tick ? TICK_MERGE_S : MERGE_S)) continue;
      this.value[i] = this.value[i]! + value;
      this.count[i] = this.count[i]! + 1;
      this.style[i] = Math.max(this.style[i]!, style);
      this.tier[i] = Math.max(this.tier[i]!, tierId);
      this.size[i] = Math.max(this.size[i]!, size);
      this.life[i] = Math.max(this.life[i]!, this.age[i]! + life * 0.8);
      this.pop[i] = 1;
      this.relabel(i);
      if (this.covers(this.box(i, SCRATCH)) !== null) this.kill(i);
      return this.alive[i] === 1 ? i : -1;
    }
    let slot = -1;
    for (let i = 0; i < MAX && slot < 0; i += 1) if (this.alive[i] === 0) slot = i;
    if (this.live >= this.limit || slot < 0) {
      // Over the cap: the smallest number below T3 goes (or this one, if it is smaller).
      let victim = -1;
      for (let i = 0; i < MAX; i += 1) {
        if (this.alive[i] === 1 && this.tier[i]! < 3 && (victim < 0 || this.value[i]! < this.value[victim]!)) victim = i;
      }
      if (victim < 0 || (tierId < 3 && value <= this.value[victim]!)) {
        this.dropped += 1;
        return -1;
      }
      this.kill(victim);
      slot = victim;
    }
    const length = Math.hypot(dx, dy) || 1;
    this.alive[slot] = 1;
    this.key[slot] = key;
    this.style[slot] = style;
    this.tier[slot] = tierId;
    this.value[slot] = value;
    this.count[slot] = 1;
    this.born[slot] = now;
    this.age[slot] = 0;
    this.life[slot] = life;
    this.size[slot] = size;
    this.pop[slot] = 1;
    this.relabel(slot);
    // Out along the blow, tilted up (≈15°), then floating.
    this.vx[slot] = (dx / length) * 70;
    this.vy[slot] = (dy / length) * 40 - 90;
    this.x[slot] = x + (dx / length) * 10;
    this.y[slot] = y - 16;
    this.live += 1;
    // Never over a protected rectangle (above it, or not at all), and not on top of another number.
    for (let tries = 0; tries < 4; tries += 1) {
      const box = this.box(slot, SCRATCH);
      if (box.y < 0) break;
      const rect = this.covers(box) ?? this.crowding(slot, box);
      if (rect === null) return slot;
      this.y[slot] = this.y[slot]! - (box.y + box.h - rect.y) - 3;
    }
    if (this.covers(this.box(slot, SCRATCH)) === null && SCRATCH.y >= 0) return slot;
    this.kill(slot);
    this.dropped += 1;
    return -1;
  }

  /** Another live number this one's box sits on, as its box (or null). */
  private crowding(slot: number, box: Rect): Rect | null {
    for (let i = 0; i < MAX; i += 1) {
      if (i === slot || this.alive[i] === 0) continue;
      const other = this.box(i, OTHER);
      if (box.x < other.x + other.w && box.x + box.w > other.x && box.y < other.y + other.h && box.y + box.h > other.y) return other;
    }
    return null;
  }

  kill(i: number): void {
    if (this.alive[i] === 0) return;
    this.alive[i] = 0;
    this.live -= 1;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX; i += 1) {
      if (this.alive[i] === 0) continue;
      this.age[i] = this.age[i]! + dt;
      if (this.age[i]! >= this.life[i]!) {
        this.kill(i);
        continue;
      }
      const drag = Math.exp(-4 * dt);
      this.vx[i] = this.vx[i]! * drag;
      this.vy[i] = this.vy[i]! * drag;
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + this.vy[i]! * dt;
      this.pop[i] = Math.max(0, this.pop[i]! - dt * 7);
      if (this.covers(this.box(i, SCRATCH)) !== null) {
        this.kill(i);
        this.dropped += 1;
      }
    }
  }

  /** Live numbers that cover a protected rectangle (must stay 0). */
  overlaps(): number {
    let count = 0;
    for (let i = 0; i < MAX; i += 1) if (this.alive[i] === 1 && this.covers(this.box(i, SCRATCH)) !== null) count += 1;
    return count;
  }

  clear(): void {
    this.alive.fill(0);
    this.live = 0;
  }
}

const SCRATCH: Rect = { x: 0, y: 0, w: 0, h: 0 };
const OTHER: Rect = { x: 0, y: 0, w: 0, h: 0 };

const GLYPHS = "0123456789×";
const CELL_W = 48;
const CELL_H = 64;
const FONT = 52;
const COLORS = [new THREE.Color("#fff4e2"), new THREE.Color("#ffc93a"), new THREE.Color("#d9fffb"), new THREE.Color("#ffd9a8")];
const LABEL_COLOR = new THREE.Color("#5ff5e6");

const VERTEX = /* glsl */ `
attribute vec4 iRect;
attribute vec4 iUv;
attribute vec4 iColor;
uniform vec2 uScreen;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vUv = mix(iUv.xy, iUv.zw, uv);
  vColor = iColor;
  vec2 p = iRect.xy + position.xy * iRect.zw;
  gl_Position = vec4(p.x / uScreen.x * 2.0 - 1.0, 1.0 - p.y / uScreen.y * 2.0, 0.0, 1.0);
}`;
const FRAGMENT = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec4 texel = texture2D(uAtlas, vUv);
  gl_FragColor = vec4(texel.rgb * vColor.rgb, texel.a * vColor.a);
}`;

/** The field's numbers as instanced quads in screen space, over the 3D view. */
export class NumberSprites {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.Camera();
  private readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly rect: Float32Array;
  private readonly uv: Float32Array;
  private readonly color: Float32Array;
  private readonly capacity = MAX * 8;
  private readonly atlasWidth: number;
  private readonly labelWidth: number;

  constructor() {
    const canvas = document.createElement("canvas");
    this.atlasWidth = 1024;
    canvas.width = this.atlasWidth;
    canvas.height = CELL_H * 2;
    const paint = canvas.getContext("2d");
    this.labelWidth = 0;
    if (paint !== null) {
      paint.textAlign = "center";
      paint.textBaseline = "middle";
      paint.lineJoin = "round";
      paint.font = "italic 800 " + FONT + 'px "Exo 2", "Be Vietnam Pro", system-ui, sans-serif';
      [...GLYPHS].forEach((glyph, index) => {
        const x = index * CELL_W + CELL_W / 2;
        paint.lineWidth = 9;
        paint.strokeStyle = "rgba(8,6,20,0.92)";
        paint.strokeText(glyph, x, CELL_H / 2 + 2);
        paint.fillStyle = "#ffffff";
        paint.fillText(glyph, x, CELL_H / 2 + 2);
      });
      paint.font = '800 40px "Be Vietnam Pro", "Exo 2", system-ui, sans-serif';
      const text = "HOÀN HẢO";
      this.labelWidth = Math.min(this.atlasWidth - 8, Math.ceil(paint.measureText(text).width) + 16);
      paint.lineWidth = 8;
      paint.strokeStyle = "rgba(4,16,20,0.95)";
      paint.strokeText(text, this.labelWidth / 2, CELL_H * 1.5);
      paint.fillStyle = "#ffffff";
      paint.fillText(text, this.labelWidth / 2, CELL_H * 1.5);
    }
    const atlas = new THREE.CanvasTexture(canvas);
    atlas.colorSpace = THREE.SRGBColorSpace;
    // Canvas rows top down (v 0 at the top), as the quads are laid out on screen.
    atlas.flipY = false;
    atlas.generateMipmaps = true;
    atlas.minFilter = THREE.LinearMipmapLinearFilter;
    const base = new THREE.PlaneGeometry(1, 1);
    base.translate(0.5, 0.5, 0);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("uv", base.getAttribute("uv"));
    this.rect = new Float32Array(this.capacity * 4);
    this.uv = new Float32Array(this.capacity * 4);
    this.color = new Float32Array(this.capacity * 4);
    geometry.setAttribute("iRect", new THREE.InstancedBufferAttribute(this.rect, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iUv", new THREE.InstancedBufferAttribute(this.uv, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iColor", new THREE.InstancedBufferAttribute(this.color, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.instanceCount = 0;
    const material = new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlas }, uScreen: { value: new THREE.Vector2(1, 1) } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Screen y grows down, which turns the quads round: draw both faces.
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  private quad(n: number, x: number, y: number, w: number, h: number, u0: number, v0: number, u1: number, v1: number, color: THREE.Color, alpha: number): number {
    if (n >= this.capacity) return n;
    const o = n * 4;
    const { rect, uv, color: rgba } = this;
    rect[o] = x;
    rect[o + 1] = y;
    rect[o + 2] = w;
    rect[o + 3] = h;
    uv[o] = u0;
    uv[o + 1] = v0;
    uv[o + 2] = u1;
    uv[o + 3] = v1;
    rgba[o] = color.r;
    rgba[o + 1] = color.g;
    rgba[o + 2] = color.b;
    rgba[o + 3] = alpha;
    return n + 1;
  }

  /** Writes the field's glyphs for a view `width` × `height` CSS px. */
  write(field: NumberField, width: number, height: number): void {
    (this.mesh.material.uniforms.uScreen!.value as THREE.Vector2).set(width, height);
    const W = this.atlasWidth;
    const H = CELL_H * 2;
    let n = 0;
    for (let i = 0; i < field.alive.length; i += 1) {
      if (field.alive[i] === 0) continue;
      const text = field.text(i);
      const style = field.style[i]!;
      const k = field.age[i]! / field.life[i]!;
      const alpha = Math.min(1, (1 - k) * 3.5);
      const pop = 1 + (tierPop(field.tier[i]!) - 1) * field.pop[i]!;
      const px = field.fontPx * field.size[i]! * pop;
      const color = COLORS[style] ?? COLORS[0]!;
      const advance = px * ADVANCE;
      let x = field.x[i]! - (text.length * advance) / 2;
      const y = field.y[i]! - px / 2;
      const times = text.indexOf("×");
      for (let c = 0; c < text.length; c += 1) {
        const g = GLYPHS.indexOf(text[c]!);
        const s = times >= 0 && c >= times ? 0.68 : 1;
        n = this.quad(n, x - advance * 0.2, y + px * (1 - s) * 0.9, advance * 1.4 * s, px * 1.25 * s, (g * CELL_W) / W, 0, ((g + 1) * CELL_W) / W, CELL_H / H, color, alpha);
        x += advance * s;
      }
      if (style === STYLE.perfect) {
        const lh = px * LABEL;
        const lw = lh * (this.labelWidth / (CELL_H * 0.75));
        n = this.quad(n, field.x[i]! - lw / 2, y - lh * 1.05, lw, lh * 1.3, 0, CELL_H / H, this.labelWidth / W, 1, LABEL_COLOR, alpha);
      }
    }
    const geometry = this.mesh.geometry;
    geometry.instanceCount = n;
    geometry.getAttribute("iRect").needsUpdate = true;
    geometry.getAttribute("iUv").needsUpdate = true;
    geometry.getAttribute("iColor").needsUpdate = true;
  }

  render(renderer: THREE.WebGLRenderer): void {
    if (this.mesh.geometry.instanceCount === 0) return;
    const clear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = clear;
  }
}

function tierPop(tierId: number): number {
  return [1, 1.12, 1.25, 1.35, 1.4, 1.5][tierId] ?? 1.2;
}
