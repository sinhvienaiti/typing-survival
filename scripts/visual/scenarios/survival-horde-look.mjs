// Last Line's horde as the player sees it (wave 1 fix of 01/11, the art director's rule in parent
// docs/games/maps/typing-survival-CHATGPT_REVIEW.md: near-black glass and chitin bodies, purple only in
// thin veins and eyes, a warm rim on one side and navy on the other, no purple pools): chapter stage 1
// (seed 3, director off, Pulse Gun + Scatter Gun) on the held clock with no key typed, a frame with the
// HUD hidden at each of TIMES s. Per frame, over the live foes ≤ 30 m (t.foes(): a disc of their body
// radius each) and the deck round them (a ring of 1.6–2.6 radii, off every foe's disc):
//   purpleFoe   the share of foe pixels that are purple (hue 250–310°, saturation ≥ 0.35, value ≥ 0.12);
//   purpleFrame the share of the whole frame that is purple;
//   foeLuma, deckLuma, contrast   the foes' and the deck's median luma (Rec. 709) and (deck + 0.05) / (foe + 0.05);
//   darkFoe     the share of foe pixels darker than the deck's median.
//   URL=… OUT_DIR=… PAGE_QUERY=&debug=1 TIMES=14,22 node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-horde-look.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR } from "./common.mjs";
import { sv } from "./survival-s0-lib.mjs";
import { openStage } from "./survival-s1-lib.mjs";
import { advance, hold, save } from "./survival-feel-lib.mjs";

const TIMES = (process.env.TIMES ?? "14,22").split(",").map(Number);

/** RGB bytes of `file` (w × h). */
function rgb(file, w, h) {
  return execFileSync("magick", [file, "-depth", "8", "rgb:-"], { maxBuffer: w * h * 3 + 1024 });
}

function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max === 0 ? 0 : d / max, max];
}

const median = (list) => {
  const s = [...list].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};

function grade(file, w, h, foes) {
  const data = rgb(file, w, h);
  const foe = new Uint8Array(w * h);
  for (const [x, y, r] of foes) {
    const R = Math.max(2, r);
    for (let py = Math.max(0, Math.floor(y - R)); py <= Math.min(h - 1, Math.ceil(y + R)); py += 1) {
      for (let px = Math.max(0, Math.floor(x - R)); px <= Math.min(w - 1, Math.ceil(x + R)); px += 1) if ((px - x) ** 2 + (py - y) ** 2 <= R * R) foe[py * w + px] = 1;
    }
  }
  const deck = new Uint8Array(w * h);
  for (const [x, y, r] of foes) {
    const a = Math.max(3, 1.6 * r);
    const b = Math.max(5, 2.6 * r);
    for (let py = Math.max(0, Math.floor(y - b)); py <= Math.min(h - 1, Math.ceil(y + b)); py += 1) {
      for (let px = Math.max(0, Math.floor(x - b)); px <= Math.min(w - 1, Math.ceil(x + b)); px += 1) {
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d >= a * a && d <= b * b && foe[py * w + px] === 0) deck[py * w + px] = 1;
      }
    }
  }
  const lumaFoe = [];
  const lumaDeck = [];
  let purpleFoe = 0;
  let purpleAll = 0;
  for (let i = 0; i < w * h; i += 1) {
    const r = data[i * 3] / 255;
    const g = data[i * 3 + 1] / 255;
    const b = data[i * 3 + 2] / 255;
    const [hue, sat, val] = hsv(r, g, b);
    const purple = hue >= 250 && hue <= 310 && sat >= 0.35 && val >= 0.12;
    if (purple) purpleAll += 1;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (foe[i] === 1) {
      lumaFoe.push(l);
      if (purple) purpleFoe += 1;
    } else if (deck[i] === 1) lumaDeck.push(l);
  }
  const foeLuma = median(lumaFoe);
  const deckLuma = median(lumaDeck);
  const round = (v) => Math.round(v * 1000) / 1000;
  return {
    foes: foes.length, foePx: lumaFoe.length, deckPx: lumaDeck.length,
    purpleFoe: round(purpleFoe / Math.max(1, lumaFoe.length)), purpleFrame: round(purpleAll / (w * h)),
    foeLuma: round(foeLuma), deckLuma: round(deckLuma), contrast: round((deckLuma + 0.05) / (foeLuma + 0.05)),
    darkFoe: round(lumaFoe.filter((l) => l < deckLuma).length / Math.max(1, lumaFoe.length)),
  };
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const dir = join(OUT_DIR, size);
  mkdirSync(dir, { recursive: true });
  const ready = await openStage(page, "c1-s1", ["xung", "tan"], "&director=0");
  await hold(page, true);
  const frames = [];
  let at = 0;
  for (const t of TIMES) {
    await advance(page, (t - at) * 1000);
    at = t;
    await page.eval("document.querySelector('.sv-hud').style.visibility = 'hidden'; true");
    await page.sleep(60);
    const file = join(dir, "horde-" + t + "s.png");
    await page.shot(file);
    await page.eval("document.querySelector('.sv-hud').style.visibility = ''; true");
    const foes = (await page.eval(sv("return t.foes();"))) ?? [];
    frames.push({ t, file: file.split("/").pop(), ...grade(file, page.width * page.dpr, page.height * page.dpr, foes.map(([x, y, r]) => [x * page.dpr, y * page.dpr, r * page.dpr])) });
  }
  await hold(page, false);
  const result = { size, ready, frames };
  save(dir, "horde-look-" + size + ".json", result);
  return { pass: ready && page.exceptions.length === 0, ...result };
}
