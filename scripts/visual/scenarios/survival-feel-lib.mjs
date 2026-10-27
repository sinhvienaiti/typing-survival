// Shared steps of the feel pass scenario (survival-feel.mjs,
// docs/FEEL_PASS_S1.md §7.2–§7.3): frames on the page's held clock with what
// the page knew at each (tick, the feel probe, DOM boxes), contact sheets and
// image differences through ImageMagick, contrast over real frames.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sv } from "./survival-s0-lib.mjs";

/** magick needs a font file on macOS for labels (else it drops them). */
export const FONT = process.platform === "darwin" ? "/System/Library/Fonts/Supplemental/Arial.ttf" : "DejaVu-Sans";
export const STEP = 1000 / 60;

export const hold = (page, on) => page.eval(sv("t.hold(" + (on ? "true" : "false") + "); return true;"));
export const advance = (page, ms) => page.eval(sv("t.advance(" + ms + "); return true;"));

/** What the page shows now: tick, the feel probe, the word line's and its letters' boxes, the bays' classes. */
export const READ = sv(`
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
  const strip = document.querySelector('.sv-strip');
  return {
    tick: t.state().tick, info: t.info(),
    strip: { box: box(strip), cls: strip.className, opacity: getComputedStyle(strip).opacity, text: strip.innerText },
    letters: [...document.querySelectorAll('.sv-strip-word i')].filter((n) => n.textContent !== '').map((n) => ({ c: n.textContent, cls: n.className, box: box(n) })),
    led: { text: document.querySelector('.sv-streak').textContent, cls: document.querySelector('.sv-streak').className },
    bays: [...document.querySelectorAll('.sv-slot')].map((n) => ({ cls: n.className, word: n.querySelector('.sv-word').textContent, mean: n.querySelector('.sv-mean').textContent, load: n.style.getPropertyValue('--load') })),
    marks: document.querySelectorAll('.sv-marks i.is-on').length,
    ghost: getComputedStyle(document.querySelector('.sv-strip-ghost')).opacity,
    heads: [...document.querySelectorAll('.sv-head')].map((n) => n.style.transform),
  };`);

/** One frame: the held clock moves `ms`, then a picture and what the page knew. */
export async function frame(page, dir, name, ms = STEP, extra = {}) {
  if (ms > 0) await advance(page, ms);
  const file = join(dir, name + ".png");
  await page.shot(file);
  const state = await page.eval(READ);
  return { file, name, ...extra, ...state };
}

/** Mean absolute difference (0–255) of two pictures inside `crop` ("WxH+X+Y"). */
export function mae(a, b, crop) {
  try {
    execFileSync("magick", ["compare", "-metric", "MAE", a + "[" + crop + "]", b + "[" + crop + "]", "null:"], { stdio: ["ignore", "ignore", "pipe"] });
    return 0;
  } catch (error) {
    const text = String(error.stderr ?? "");
    const value = parseFloat(text.split(/\s+/)[0]);
    return Number.isFinite(value) ? Math.round((value / 257) * 100) / 100 : NaN;
  }
}

export const crop = (r) => Math.round(r.w) + "x" + Math.round(r.h) + "+" + Math.max(0, Math.round(r.x)) + "+" + Math.max(0, Math.round(r.y));

/** A contact sheet of `rows` (each { file, label }), cut to `clip` (CSS px at the frame's scale), `cols` across. */
export function sheet(rows, out, clip, cols = 6, width = 420) {
  const dir = out.replace(/\.[a-z]+$/, "-cells");
  mkdirSync(dir, { recursive: true });
  const cells = rows.map((row, k) => {
    const cell = join(dir, String(k).padStart(3, "0") + ".png");
    execFileSync("magick", [row.file, "-crop", crop(clip), "+repage", "-resize", width + "x", cell]);
    return ["-label", row.label, cell];
  });
  execFileSync("magick", ["montage", "-font", FONT, "-pointsize", "13", "-fill", "#e8e8e8", "-background", "#16181b", ...cells.flat(), "-tile", cols + "x", "-geometry", "+3+3", out]);
  return out;
}

/** Brightness (Rec. 709 luma of the encoded pixel, 0 … 1) at the 50th / 95th / 99th percentile inside `rect` of each file. */
export function luma(files, rect) {
  const values = [];
  for (const file of files) {
    const raw = execFileSync("magick", [file, "-crop", crop(rect), "+repage", "-grayscale", "Rec709Luma", "-depth", "8", "gray:-"], { maxBuffer: 1 << 26 });
    for (let i = 0; i < raw.length; i += 3) values.push(raw[i]);
  }
  values.sort((a, b) => a - b);
  const q = (p) => (values[Math.min(values.length - 1, Math.floor(p * values.length))] ?? 0) / 255;
  return { samples: values.length, p50: +q(0.5).toFixed(3), p95: +q(0.95).toFixed(3), p99: +q(0.99).toFixed(3) };
}

/** `rect` (CSS px) kept inside a `w` × `h` frame, rounded. */
export const inside = (r, w, h) => {
  const x = Math.max(0, Math.round(r.x));
  const y = Math.max(0, Math.round(r.y));
  return { x, y, w: Math.max(1, Math.min(w - x, Math.round(r.x + r.w) - x)), h: Math.max(1, Math.min(h - y, Math.round(r.y + r.h) - y)) };
};

/** The RGB bytes of `rect` in `file` (row by row), with `luma(i)` (Rec. 709 of the encoded pixel, 0 … 1) and `chroma(i)` (max − min, 0 … 1) of pixel i. */
export function pixels(file, rect) {
  const data = execFileSync("magick", [file, "-crop", crop(rect), "+repage", "-depth", "8", "rgb:-"], { maxBuffer: 1 << 27 });
  const at = (i) => i * 3;
  return {
    data, w: rect.w, h: rect.h, n: data.length / 3,
    luma: (i) => (0.2126 * data[at(i)] + 0.7152 * data[at(i) + 1] + 0.0722 * data[at(i) + 2]) / 255,
    chroma: (i) => (Math.max(data[at(i)], data[at(i) + 1], data[at(i) + 2]) - Math.min(data[at(i)], data[at(i) + 1], data[at(i) + 2])) / 255,
    warm: (i) => (data[at(i)] - data[at(i) + 2]) / 255,
  };
}

/** Pixels of `rect` (CSS px) whose luma rose ≥ `rise` from file `a` to file `b`, skipping (x, y) where `skip(x, y)` (CSS px) holds; in 720p px (÷ ui²). */
export function rose(a, b, rect, rise, ui, skip = () => false) {
  const A = pixels(a, rect);
  const B = pixels(b, rect);
  let n = 0;
  for (let i = 0; i < B.n; i += 1) if (B.luma(i) - A.luma(i) >= rise && !skip(rect.x + (i % rect.w), rect.y + Math.floor(i / rect.w))) n += 1;
  return Math.round(n / (ui * ui));
}

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const TEXT_L = 0.2126 * lin(0xf4 / 255) + 0.7152 * lin(0xf1 / 255) + 0.0722 * lin(0xeb / 255);
/**
 * WCAG contrast of the HUD's text (#f4f1eb) over a plate of #07090b at
 * `alpha` over a pixel of brightness `bg` (CSS blends in sRGB), plus a
 * worst-case `lift` of white the plate's own light and brushing add.
 */
export function contrastOver(bg, alpha, lift = 0) {
  const mixed = Math.min(1, alpha * (0x09 / 255) + (1 - alpha) * bg + lift);
  return Math.round(((TEXT_L + 0.05) / (lin(mixed) + 0.05)) * 100) / 100;
}

export function save(dir, name, data) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(data, null, 1));
}
