// Source: new for the kit: draws typing-fx particles on one small 2D canvas behind the strip's letters
/**
 * One canvas the size of the strip (not the screen), behind the glyphs, so
 * no effect ever covers a letter or the meaning line. Colours are resolved
 * once per palette; soft discs are pre-rendered sprites (no gradient made
 * per frame); a frame with no particle is not drawn, one clear after the last.
 */
import { FRAME_MS, TONE } from "./styles";
import { PK, type ParticlePool } from "./pool";

export type TypingFxPalette = {
  /** The game's typing colour (hex #rrggbb): typed letters, glows. */
  accent: string;
  /** White-hot flash. */
  hot: string;
  /** The dark tone of the two-tone effects (T2, T12). */
  ink: string;
  warn: string;
  /** Perfect words and milestones. */
  gold: string;
  /** Letters not typed yet, and the meaning line. */
  pending: string;
  meaning: string;
};

export const DEFAULT_PALETTE: Readonly<TypingFxPalette> = {
  accent: "#5ff5e6",
  hot: "#fff6e8",
  ink: "#140c1c",
  warn: "#ff5a6e",
  gold: "#ffd36a",
  pending: "#f4eee2",
  meaning: "#f2e9da",
};

const hex = (value: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  const n = m ? parseInt(m[1]!, 16) : 0xffffff;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** `a` mixed toward `b` by `t` (0 … 1), as #rrggbb. */
export function mixHex(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  const c = (i: number): string => Math.round(x[i]! + (y[i]! - x[i]!) * t).toString(16).padStart(2, "0");
  return "#" + c(0) + c(1) + c(2);
}

/** Tone index → colour, in TONE order. */
export function toneColors(p: TypingFxPalette): string[] {
  return [p.hot, p.accent, mixHex(p.accent, "#ffffff", 0.55), p.ink, p.warn, p.gold, mixHex(p.warn, p.ink, 0.55)];
}

/**
 * A painted sprite sheet a game theme gives (Codex's packs, tickets 173–175): `cols` × `rows` cells,
 * drawn additive (glows, sparks) or normal (ink, seals). Missing: the procedural shape draws instead.
 */
export type TypingFxAtlas = { readonly image: CanvasImageSource; readonly cols: number; readonly rows: number; readonly additive?: boolean };

/** Which texture each effect reads: glyph-spark (glints), ink-splash (splats, droplets), seal-stamp (the word seal), ember. */
export type TypingFxTextures = Partial<Record<"spark" | "ink" | "seal" | "ember", TypingFxAtlas>>;

const TAU = Math.PI * 2;
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

export class FxCanvas {
  private readonly ctx: CanvasRenderingContext2D;
  private tones: string[] = toneColors(DEFAULT_PALETTE);
  private sprites: HTMLCanvasElement[] = [];
  private readonly pos = new Float32Array(2);
  private readonly dash = [0, 1e5];
  private readonly noDash: number[] = [];
  /** Two glyph sets (the strip's two word layers): a trace keeps its own word while the next one shows. */
  private readonly chars: string[][] = [[], []];
  private readonly glyphX = [new Float32Array(64), new Float32Array(64)];
  private readonly baseline = [0, 0];
  private font = "800 52px sans-serif";
  private painted = false;
  private textures: TypingFxTextures = {};
  width = 0;
  height = 0;
  dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx === null) throw new Error("typing-fx: no 2D canvas");
    this.ctx = ctx;
    this.setPalette(DEFAULT_PALETTE);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.dpr = Math.max(1, Math.min(2, dpr));
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.painted = true;
  }

  setPalette(p: TypingFxPalette): void {
    this.tones = toneColors(p);
    this.sprites = this.tones.map((color) => softDisc(color));
  }

  /** A game theme's painted sprites; {} goes back to the procedural shapes. */
  setTextures(textures: TypingFxTextures): void {
    this.textures = { ...textures };
  }

  /** Cell `variant` of `atlas`, centred on (x, y), w × h, turned `rot`. */
  private cell(atlas: TypingFxAtlas, variant: number, x: number, y: number, w: number, h: number, rot: number, alpha: number): void {
    const ctx = this.ctx;
    const image = atlas.image as HTMLImageElement & { width: number; height: number };
    const n = Math.max(1, atlas.cols * atlas.rows);
    const k = variant % n;
    const cw = image.width / atlas.cols;
    const ch = image.height / atlas.rows;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (atlas.additive) ctx.globalCompositeOperation = "lighter";
    ctx.translate(x, y);
    if (rot !== 0) ctx.rotate(rot);
    ctx.drawImage(image, (k % atlas.cols) * cw, Math.floor(k / atlas.cols) * ch, cw, ch, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /** Word layer `set`'s letters (canvas x of each centre, the baseline y, the CSS font) for the rune trace. */
  setGlyphs(set: number, text: string, xs: Float32Array, baseline: number, font: string): void {
    const s = set & 1;
    this.chars[s] = [...text].slice(0, 64);
    this.glyphX[s]!.set(xs.subarray(0, Math.min(64, xs.length)));
    this.baseline[s] = baseline;
    this.font = font;
  }

  /** Draws every live particle at `now`; `still` (reduced motion) keeps rings and arcs from growing. */
  draw(pool: ParticlePool, now: number, still: boolean): void {
    const ctx = this.ctx;
    if (pool.count === 0) {
      if (this.painted) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.painted = false;
      }
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.painted = true;
    for (let i = 0; i < pool.count; i += 1) {
      const age = pool.age(i, now);
      if (age >= 1) continue;
      ctx.globalAlpha = 1;
      switch (pool.kind[i]) {
        case PK.spark:
          this.spark(pool, i, now, age, still);
          break;
        case PK.shard:
          this.shard(pool, i, now, age);
          break;
        case PK.ring:
          this.ring(pool, i, age);
          break;
        case PK.disc:
          this.disc(pool, i, age);
          break;
        case PK.smash:
          this.smash(pool, i, now);
          break;
        case PK.ink:
          this.ink(pool, i, now, age);
          break;
        case PK.rune:
          this.rune(pool, i, now, age);
          break;
        case PK.trace:
          this.trace(pool, i, now, age);
          break;
        case PK.crack:
          this.crack(pool, i, age);
          break;
        case PK.shock:
          this.shock(pool, i, age, still);
          break;
        case PK.star:
          this.star(pool, i, now, age);
          break;
        case PK.splat:
          this.splat(pool, i, now, age);
          break;
        case PK.contact:
          this.contact(pool, i, age);
          break;
        case PK.seal:
          this.seal(pool, i, now, age);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  private color(pool: ParticlePool, i: number): string {
    return this.tones[pool.tone[i]!] ?? this.tones[0]!;
  }

  private spark(pool: ParticlePool, i: number, now: number, age: number, still: boolean): void {
    const ctx = this.ctx;
    const p = pool.position(i, now, this.pos);
    const t = Math.max(0, now - pool.born[i]!) / 1000;
    const fade = Math.exp(-pool.drag[i]! * t);
    let dx = pool.vx[i]! * fade;
    let dy = pool.vy[i]! * fade;
    const speed = Math.hypot(dx, dy);
    if (still || speed < 1e-3) {
      dx = Math.cos(pool.rot[i]!);
      dy = Math.sin(pool.rot[i]!);
    } else {
      dx /= speed;
      dy /= speed;
    }
    const length = pool.aux[i]! * (1 - age * 0.7);
    const width = pool.size[i]! * (1 - age * 0.6);
    const x0 = p[0]!;
    const y0 = p[1]!;
    ctx.strokeStyle = this.color(pool, i);
    ctx.globalAlpha = 0.35 * (1 - age);
    ctx.lineWidth = width * 2.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 - dx * length, y0 - dy * length);
    ctx.stroke();
    ctx.globalAlpha = 1 - age * age;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  private shard(pool: ParticlePool, i: number, now: number, age: number): void {
    const ctx = this.ctx;
    const p = pool.position(i, now, this.pos);
    const t = Math.max(0, now - pool.born[i]!) / 1000;
    const a = pool.rot[i]! + pool.spin[i]! * t;
    const s = pool.size[i]! * (1 - 0.45 * age);
    const c = Math.cos(a);
    const n = Math.sin(a);
    ctx.fillStyle = this.color(pool, i);
    ctx.globalAlpha = 1 - age * Math.sqrt(age);
    ctx.beginPath();
    ctx.moveTo(p[0]! + c * s * 1.4, p[1]! + n * s * 1.4);
    ctx.lineTo(p[0]! - c * s * 0.7 - n * s * 0.6, p[1]! - n * s * 0.7 + c * s * 0.6);
    ctx.lineTo(p[0]! - c * s * 0.5 + n * s * 0.5, p[1]! - n * s * 0.5 - c * s * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private ring(pool: ParticlePool, i: number, age: number): void {
    const ctx = this.ctx;
    const r = pool.size[i]! + (pool.size2[i]! - pool.size[i]!) * easeOut(age);
    const gap = pool.spin[i]!;
    const alpha = (1 - age) * Math.sqrt(1 - age);
    const width = Math.max(0.5, pool.aux[i]! * (1 - age * 0.7));
    ctx.beginPath();
    if (gap > 0) ctx.arc(pool.x[i]!, pool.y[i]!, r, pool.rot[i]! + gap, pool.rot[i]! + TAU);
    else ctx.arc(pool.x[i]!, pool.y[i]!, r, 0, TAU);
    ctx.strokeStyle = this.tones[TONE.ink]!;
    ctx.globalAlpha = 0.45 * alpha;
    ctx.lineWidth = width + 3;
    ctx.stroke();
    ctx.strokeStyle = this.color(pool, i);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  private disc(pool: ParticlePool, i: number, age: number): void {
    const sprite = this.sprites[pool.tone[i]!];
    if (sprite === undefined) return;
    const r = pool.size[i]! * (1 + 0.15 * age);
    this.ctx.globalAlpha = 1 - age;
    this.ctx.drawImage(sprite, pool.x[i]! - r, pool.y[i]! - r, r * 2, r * 2);
  }

  /**
   * T2 on a dark plate: white disc (2 frames), thick white ring, thick accent ring with a dark
   * edge (2), thin white arc, accent arc turning 40° a frame (3). Typing Break's black ring sits
   * on a mid-tone bar; here the dark tone is the edge, so both tones still read.
   */
  private smash(pool: ParticlePool, i: number, now: number): void {
    const ctx = this.ctx;
    const h = pool.size[i]!;
    const x = pool.x[i]!;
    const y = pool.y[i]!;
    const f = Math.floor((now - pool.born[i]!) / FRAME_MS);
    const hot = this.tones[TONE.hot]!;
    const ink = this.tones[TONE.ink]!;
    if (f <= 1) {
      const glow = this.sprites[TONE.hot]!;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(glow, x - 1.5 * h, y - 1.5 * h, 3 * h, 3 * h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = hot;
      ctx.beginPath();
      ctx.arc(x, y, 0.95 * h, 0, TAU);
      ctx.fill();
      return;
    }
    if (f === 2) {
      ctx.strokeStyle = hot;
      ctx.lineWidth = 0.19 * h;
      ctx.beginPath();
      ctx.arc(x, y, 0.95 * h, 0, TAU);
      ctx.stroke();
      return;
    }
    if (f <= 4) {
      ctx.beginPath();
      ctx.arc(x, y, 1.05 * h, 0, TAU);
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 0.33 * h;
      ctx.stroke();
      ctx.strokeStyle = this.color(pool, i);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.2 * h;
      ctx.stroke();
      return;
    }
    const from = pool.rot[i]! + (f - 5) * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, (f === 5 ? 1.15 : 1.2) * h, from, from + 5.2);
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.5 * (f === 5 ? 1 : 1 - (f - 5) / 4);
    ctx.lineWidth = (f === 5 ? 0.07 : 0.055) * h + 3;
    ctx.stroke();
    ctx.strokeStyle = f === 5 ? hot : this.color(pool, i);
    ctx.globalAlpha = f === 5 ? 1 : 1 - (f - 5) / 4;
    ctx.lineWidth = (f === 5 ? 0.07 : 0.055) * h;
    ctx.stroke();
  }

  private ink(pool: ParticlePool, i: number, now: number, age: number): void {
    const ctx = this.ctx;
    const p = pool.position(i, now, this.pos);
    const floor = pool.aux[i]!;
    if (floor > 0 && p[1]! >= floor && pool.vy[i]! + pool.grav[i]! > 0) {
      // Landed: a flat drop on the line, fading.
      const r = pool.size[i]!;
      ctx.fillStyle = this.tones[TONE.ink]!;
      ctx.globalAlpha = 0.5 * (1 - age);
      ctx.beginPath();
      ctx.ellipse(p[0]!, floor + r * 0.25, r * 2.1, r * 0.75, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = this.color(pool, i);
      ctx.globalAlpha = 1 - age;
      ctx.beginPath();
      ctx.ellipse(p[0]!, floor, r * 1.9, r * 0.55, 0, 0, TAU);
      ctx.fill();
      return;
    }
    const tex = this.textures.ink;
    if (tex !== undefined) {
      const s = pool.size[i]! * 3.2 * (1 - 0.3 * age);
      this.cell(tex, pool.variant[i]!, p[0]!, p[1]!, s, s, pool.rot[i]!, 1 - age * age);
      return;
    }
    const r = pool.size[i]! * (1 - 0.35 * age);
    const t = Math.max(0, now - pool.born[i]!) / 1000;
    const vy = pool.vy[i]! * Math.exp(-pool.drag[i]! * t) + pool.grav[i]! * t;
    const vx = pool.vx[i]! * Math.exp(-pool.drag[i]! * t);
    ctx.fillStyle = this.color(pool, i);
    ctx.globalAlpha = 1 - age * age * age;
    ctx.beginPath();
    ctx.ellipse(p[0]!, p[1]!, r * 1.5, r, Math.atan2(vy, vx), 0, TAU);
    ctx.fill();
  }

  private rune(pool: ParticlePool, i: number, now: number, age: number): void {
    const ctx = this.ctx;
    const r = pool.size[i]!;
    const x = pool.x[i]!;
    const y = pool.y[i]!;
    const t = Math.max(0, now - pool.born[i]!) / 1000;
    const turn = pool.rot[i]! + pool.spin[i]! * t;
    const broken = pool.aux[i]! > 0;
    const alpha = age < 0.12 ? 0.55 + (0.45 * age) / 0.12 : age > 0.5 ? (1 - age) / 0.5 : 1;
    ctx.strokeStyle = this.color(pool, i);
    ctx.globalAlpha = 0.9 * alpha;
    ctx.lineWidth = 0.035 * r * 1.6;
    ctx.beginPath();
    if (broken) {
      for (let k = 0; k < 3; k += 1) {
        const a = turn + (k * TAU) / 3;
        ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.arc(x, y, r, a, a + 1.2);
      }
    } else ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    if (broken) return;
    ctx.globalAlpha = 0.65 * alpha;
    ctx.lineWidth = 0.022 * r * 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, TAU);
    for (let k = 0; k < 12; k += 1) {
      const a = turn + (k * TAU) / 12;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const inner = k % 3 === 0 ? 0.62 : 0.8;
      ctx.moveTo(x + c * r * inner, y + s * r * inner);
      ctx.lineTo(x + c * r * 0.97, y + s * r * 0.97);
    }
    ctx.stroke();
    // Three small diamonds on the ring, turning against it.
    ctx.fillStyle = this.tones[TONE.hot]!;
    for (let k = 0; k < 3; k += 1) {
      const a = -turn * 0.6 + (k * TAU) / 3;
      const cx = x + Math.cos(a) * r;
      const cy = y + Math.sin(a) * r;
      const d = 0.07 * r;
      ctx.beginPath();
      ctx.moveTo(cx, cy - d * 1.6);
      ctx.lineTo(cx + d, cy);
      ctx.lineTo(cx, cy + d * 1.6);
      ctx.lineTo(cx - d, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** The glyph's outline drawn by a growing dash, a wide soft pass under a thin bright one. */
  private trace(pool: ParticlePool, i: number, now: number, age: number): void {
    const ctx = this.ctx;
    const code = pool.aux[i]! | 0;
    const set = (code >> 6) & 1;
    const index = code & 63;
    const ch = this.chars[set]![index];
    if (ch === undefined) return;
    const h = pool.size[i]!;
    const ms = now - pool.born[i]!;
    const grow = Math.min(1, ms / 120);
    ctx.font = this.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    this.dash[0] = 4.6 * h * grow;
    ctx.setLineDash(this.dash);
    const alpha = age < 0.55 ? 1 : (1 - age) / 0.45;
    const x = this.glyphX[set]![index]!;
    ctx.strokeStyle = this.tones[TONE.accent]!;
    ctx.globalAlpha = 0.32 * alpha;
    ctx.lineWidth = 0.13 * h;
    ctx.strokeText(ch, x, this.baseline[set]!);
    ctx.strokeStyle = this.color(pool, i);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 0.035 * h;
    ctx.strokeText(ch, x, this.baseline[set]!);
    ctx.setLineDash(this.noDash);
  }

  private crack(pool: ParticlePool, i: number, age: number): void {
    const ctx = this.ctx;
    const len = pool.size[i]!;
    const a = pool.rot[i]!;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const x = pool.x[i]!;
    const y = pool.y[i]!;
    ctx.beginPath();
    for (let k = 0; k <= 5; k += 1) {
      const u = (k / 5 - 0.5) * len;
      const off = (k % 2 === 0 ? 1 : -1) * (k === 0 || k === 5 ? 0 : 0.06 * len);
      const px = x + c * u - s * off;
      const py = y + s * u + c * off;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    const width = 0.045 * len * (1 - 0.5 * age);
    ctx.strokeStyle = this.tones[TONE.accent]!;
    ctx.globalAlpha = 0.4 * (1 - age);
    ctx.lineWidth = width * 3;
    ctx.stroke();
    ctx.strokeStyle = this.color(pool, i);
    ctx.globalAlpha = 1 - age;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  /** An ellipse around the whole word (the word's release), growing by `aux`. */
  private shock(pool: ParticlePool, i: number, age: number, still: boolean): void {
    const ctx = this.ctx;
    const g = still ? 0 : pool.aux[i]! * easeOut(age);
    ctx.strokeStyle = this.color(pool, i);
    ctx.globalAlpha = Math.pow(1 - age, 1.3);
    ctx.lineWidth = Math.max(0.5, pool.rot[i]! * (1 - age * 0.8));
    ctx.beginPath();
    ctx.ellipse(pool.x[i]!, pool.y[i]!, pool.size[i]! * (1 + g), pool.size2[i]! * (1 + g * 0.6), 0, 0, TAU);
    ctx.stroke();
  }

  private star(pool: ParticlePool, i: number, now: number, age: number): void {
    const ctx = this.ctx;
    const p = pool.position(i, now, this.pos);
    const s = pool.size[i]! * (age < 0.25 ? 0.5 + age * 2 : 1 - (age - 0.25) / 0.75);
    const tex = this.textures.spark;
    if (tex !== undefined) {
      this.cell(tex, pool.variant[i]!, p[0]!, p[1]!, s * 2.4, s * 2.4, pool.rot[i]!, 1);
      return;
    }
    const w = s * 0.16;
    ctx.fillStyle = this.color(pool, i);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(p[0]!, p[1]! - s);
    ctx.lineTo(p[0]! + w, p[1]! - w);
    ctx.lineTo(p[0]! + s, p[1]!);
    ctx.lineTo(p[0]! + w, p[1]! + w);
    ctx.lineTo(p[0]!, p[1]! + s);
    ctx.lineTo(p[0]! - w, p[1]! + w);
    ctx.lineTo(p[0]! - s, p[1]!);
    ctx.lineTo(p[0]! - w, p[1]! - w);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * A paint splat: a dark under-edge offset down-right, then the colour, a lumpy round blot with
   * satellite drops (or an ink texture cell). Lands at 70 % of its size, opens fully in 40 ms.
   */
  private splat(pool: ParticlePool, i: number, now: number, age: number): void {
    const ctx = this.ctx;
    const ms = now - pool.born[i]!;
    const grow = ms < 40 ? 0.7 + 0.3 * (ms / 40) : 1;
    const r = pool.size[i]! * grow;
    const alpha = age < 0.45 ? 0.85 : 0.85 * (1 - (age - 0.45) / 0.55);
    const x = pool.x[i]!;
    const y = pool.y[i]!;
    const tex = this.textures.ink;
    if (tex !== undefined) {
      this.cell(tex, pool.variant[i]!, x, y, r * 2.6, r * 2.6, pool.rot[i]!, alpha);
      return;
    }
    const seed = pool.aux[i]!;
    const off = r * 0.09;
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.fillStyle = pass === 0 ? this.tones[TONE.ink]! : this.color(pool, i);
      ctx.globalAlpha = pass === 0 ? alpha * 0.7 : alpha * 0.62;
      const dx = pass === 0 ? off : 0;
      ctx.beginPath();
      for (let k = 0; k <= 18; k += 1) {
        const a = (k / 18) * TAU + pool.rot[i]!;
        const rr = r * (1 + 0.15 * Math.sin(5 * a + seed) + 0.09 * Math.sin(9 * a + seed * 1.7));
        const px = x + dx + Math.cos(a) * rr;
        const py = y + dx * 1.4 + Math.sin(a) * rr * 0.86;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      for (let k = 0; k < 4; k += 1) {
        const a = seed * 0.37 + k * 1.9 + pool.rot[i]!;
        const d = r * (1.22 + 0.18 * Math.sin(seed + k * 3.1));
        const dr = r * (0.09 + 0.05 * Math.sin(seed * 0.5 + k));
        ctx.beginPath();
        ctx.arc(x + dx + Math.cos(a) * d, y + dx * 1.4 + Math.sin(a) * d * 0.86, dr, 0, TAU);
        ctx.fill();
      }
    }
  }

  /** A flat ring where the stamp meets the line: an ellipse three times wider than tall, growing and thinning. */
  private contact(pool: ParticlePool, i: number, age: number): void {
    const ctx = this.ctx;
    const rx = pool.size[i]! + (pool.size2[i]! - pool.size[i]!) * easeOut(age);
    ctx.beginPath();
    ctx.ellipse(pool.x[i]!, pool.y[i]!, rx, rx * 0.26, 0, 0, TAU);
    ctx.strokeStyle = this.tones[TONE.ink]!;
    ctx.globalAlpha = 0.45 * (1 - age);
    ctx.lineWidth = pool.aux[i]! * (1 - 0.6 * age) + 3;
    ctx.stroke();
    ctx.strokeStyle = this.color(pool, i);
    ctx.globalAlpha = 1 - age;
    ctx.lineWidth = pool.aux[i]! * (1 - 0.6 * age);
    ctx.stroke();
  }

  /**
   * The word's seal (Stamp's release): a double-ruled frame around the word slams down in three
   * frames (1.45 → 1.2 → 1, turning −5° → 0), holds, fades; a seal texture when the game gives one.
   */
  private seal(pool: ParticlePool, i: number, now: number, age: number): void {
    const ctx = this.ctx;
    const f = Math.floor((now - pool.born[i]!) / FRAME_MS);
    const s = f <= 0 ? 1.45 : f === 1 ? 1.2 : 1;
    const turn = (f <= 0 ? -5 : f === 1 ? -2.5 : 0) * (Math.PI / 180);
    const w = pool.size[i]! * s;
    const h = pool.size2[i]! * s;
    const alpha = age < 0.4 ? 1 : 1 - (age - 0.4) / 0.6;
    const x = pool.x[i]!;
    const y = pool.y[i]!;
    const tex = this.textures.seal;
    if (tex !== undefined) {
      this.cell(tex, pool.variant[i]!, x, y, w * 2.2, h * 2.2, turn, alpha * 0.9);
      return;
    }
    const line = pool.aux[i]!;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.strokeStyle = pass === 0 ? this.tones[TONE.ink]! : this.color(pool, i);
      ctx.globalAlpha = (pass === 0 ? 0.55 : 1) * alpha;
      const grow = pass === 0 ? 3 : 0;
      ctx.lineWidth = line + grow;
      roundRect(ctx, -w, -h, w * 2, h * 2, h * 0.35);
      ctx.stroke();
      ctx.lineWidth = line * 0.45 + grow;
      roundRect(ctx, -w + line * 1.8, -h + line * 1.8, w * 2 - line * 3.6, h * 2 - line * 3.6, h * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export {};

/** A soft round sprite of `color` (opaque centre, clear edge), made once per palette. */
function softDisc(color: string): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return canvas;
  const [r, g, b] = hex(color);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gradient.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
