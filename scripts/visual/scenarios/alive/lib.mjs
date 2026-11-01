// The "alive" measures (docs/ALIVE_PLAN.md §1.3 G1–G4, AL-00 step 6), shared by
// every package's scenes in scripts/visual/scenarios/alive/<package>.mjs and
// run by survival-alive.mjs. Built from the 01/11 audits' tools
// (tmp/alive-audit-0111/tools/hud-driver.mjs: the DevTools guard and the
// player bot; world/scripts/motion.mjs: the regions and the 1 s difference).
// Frames are PNG screenshots on the page's held clock (t.hold / t.advance),
// so a run is repeatable; the page needs the scenarios' handle (dev server,
// or a production build with PAGE_QUERY="&debug=1"). Pictures go to
// tmp/alive/<size>/; contact sheets and JSON stay, raw frames are pruned
// (tools/capture-prune in the parent repo).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEV_URL } from "../common.mjs";
import { PAGE_QUERY, press, sv } from "../survival-s0-lib.mjs";
import { FONT } from "../survival-feel-lib.mjs";

export { press, sv };
export const STEP = 1000 / 60;
const magick = process.env.ART_MAGICK || "magick";
const run = (args) => execFileSync(magick, args, { encoding: "utf8", maxBuffer: 1 << 26 });

/**
 * The DevTools guard of the audits: this run's own Chrome on a free port and
 * a first page that is about:blank. cdp-run asks Chrome for port 0 and reads
 * the port from this run's profile, so a fixed CDP_PORT is refused here.
 */
export async function guard(page) {
  if (process.env.CDP_PORT) throw new Error("alive: CDP_PORT is set; the guard wants Chrome's own free port (unset it)");
  const href = await page.eval("location.href");
  const { targetInfos } = await page.send("Target.getTargets");
  const pages = targetInfos.filter((t) => t.type === "page");
  if (href !== "about:blank" || pages.length !== 1 || pages[0].url !== "about:blank") throw new Error("alive: first page is not a lone about:blank: " + JSON.stringify({ href, pages: pages.map((p) => p.url) }));
  return { firstPage: href, pages: pages.length };
}

/** The page's own URL (PAGE_QUERY added). */
export const url = (query) => DEV_URL.replace(/\/$/, "") + "/index.html?" + query + PAGE_QUERY;

/** Opens `query` and waits for the page to be ready (models, programs, a frame); the clock is then held. */
export async function open(page, query, { hold = true } = {}) {
  await page.goto(url(query), { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 160 && !ready; wait += 1) {
    ready = (await page.eval(sv("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  if (!ready) throw new Error("alive: page not ready: " + query);
  await mark(page);
  if (hold) await page.eval(sv("t.hold(true); return true;"));
  return ready;
}

export const advance = (page, ms) => page.eval(sv("t.advance(" + ms + "); return true;"));
export const read = (page, code) => page.eval(sv(code));

/** A marker on the window: gone after the page loads again (G2 counts reloads by it). */
export const mark = (page) => page.eval("window.__alive = true; true");
export const reloaded = async (page) => (await page.eval("window.__alive === true")) !== true;

/**
 * Waits up to `ms` (wall clock) until the page is ready (a page that is
 * loading answers nothing); then reads whether it is a new page (the marker is
 * gone), marks it and holds its clock. null when it never got ready. A screen
 * capture in flight while a page loads can leave the new page hidden in
 * headless Chrome (no animation frame, so never ready): it is brought to the
 * front.
 */
export async function settle(page, ms = 40000) {
  for (let waited = 0; waited < ms; waited += 250) {
    let ready = false;
    try {
      ready = (await page.eval(sv("return t.ready();"))) === true;
      if (!ready && (await page.eval("document.visibilityState")) === "hidden") await page.send("Page.bringToFront");
    } catch {
      // the page is between documents
    }
    if (ready) {
      const fresh = await reloaded(page);
      await mark(page);
      await page.eval(sv("t.hold(true); return true;"));
      return { fresh };
    }
    await page.sleep(250);
  }
  return null;
}

/** A real key (letters through press(); the rest by name: Enter, Escape, ArrowDown …). */
const KEYS = { Enter: 13, Escape: 27, Backspace: 8, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Tab: 9, " ": 32 };
export async function key(page, k) {
  if (k.length === 1 && /[a-z]/i.test(k)) return press(page, k.toLowerCase());
  const code = k === " " ? "Space" : /^[0-9]$/.test(k) ? "Digit" + k : k;
  const vk = KEYS[k] ?? (/^[0-9]$/.test(k) ? 48 + Number(k) : 0);
  await page.send("Input.dispatchKeyEvent", { type: k.length === 1 ? "keyDown" : "rawKeyDown", key: k, code, text: k.length === 1 ? k : undefined, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}

/** A frame now (PNG), to `dir/name.png`. */
export const shot = (page, dir, name) => page.shot(join(dir, name + ".png"));

/** `count` frames `stepMs` apart on the held clock (the first before any step). */
export async function frames(page, dir, name, count, stepMs = STEP) {
  const files = [];
  for (let k = 0; k < count; k += 1) {
    if (k > 0) await advance(page, stepMs);
    files.push(await shot(page, dir, name + "-" + String(k).padStart(3, "0")));
  }
  return files;
}

/**
 * The bays as the player sees them (the audits' hud-driver): each bay's word
 * (typed, next letter, rest; a hidden letter is "_"), how much is typed,
 * locked, full, its rounds; the HUD's mode and whether a screen covers it.
 */
const HUD = `(() => { const h = document.getElementById("svHud"); const slots = [...document.querySelectorAll(".sv-slot")].map((e) => { const c = e.querySelector(".sv-word").children; return { bay: +e.dataset.bay, word: c[0].textContent + c[1].textContent + c[2].textContent, typed: c[0].textContent.length, active: e.classList.contains("is-active"), full: e.classList.contains("is-full"), mags: [...e.querySelectorAll(".sv-mags i")].filter((i) => !i.classList.contains("is-empty")).length }; }); return { mode: h?.dataset.mode, slots, overlay: !!document.querySelector(".sv-overlay.is-on") }; })()`;
export const hud = (page) => page.eval(HUD);

/** A small seeded generator (mulberry32), so a bot's slips repeat run to run. */
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The audits' player bot, one key at a time: from the bays as shown, the
 * locked bay's next letter, else the first letter of the emptiest bay that is
 * not full; a slip on `err` of the keys into a locked word. null when no bay
 * takes a key now (another screen, a hidden first letter).
 */
export function botKey(state, rand, { err = 0.04, intoFull = false } = {}) {
  if (!state || state.mode !== "play" || state.overlay) return null;
  const active = state.slots.find((s) => s.active);
  const ch = active ? active.word[active.typed] : state.slots.filter((s) => (intoFull || !s.full) && s.word.length > 0 && s.word[0] !== "_").sort((a, b) => a.mags - b.mags)[0]?.word[0];
  if (ch === undefined || ch === "_") return null;
  const right = ch.toLowerCase();
  if (active && rand() < err) {
    const abc = "abcdefghijklmnopqrstuvwxyz".replace(right, "");
    return { key: abc[Math.floor(rand() * abc.length)], slip: true };
  }
  return { key: right, slip: false };
}

/** The audits' regions at 1280×720 (world/scripts/motion.mjs), scaled to the frame. */
export const REGIONS = {
  upperLeftAbyss: [0, 60, 380, 110], upperRightAbyss: [880, 80, 400, 96], lowerLeftSide: [0, 380, 150, 180], lowerRightSide: [1130, 380, 150, 180],
  blackHoleTop: [560, 0, 160, 50], gateBand: [440, 55, 400, 40], deckNear: [250, 580, 250, 140], leftWall: [190, 430, 80, 120],
};
/** The four side regions G3 reads (the world's own motion at the lane's sides). */
export const SIDES = ["upperLeftAbyss", "upperRightAbyss", "lowerLeftSide", "lowerRightSide"];
const box = ([x, y, w, h], k) => `${Math.round(w * k)}x${Math.round(h * k)}+${Math.round(x * k)}+${Math.round(y * k)}`;

/** Mean |a − b| in grey levels (0–255) inside `rect` ([x, y, w, h] at 1280×720), `width` the frames' CSS width. */
export function regionDiff(a, b, rect, width) {
  return Number(run([a, b, "-crop", box(rect, width / 1280), "+repage", "-compose", "difference", "-composite", "-colorspace", "gray", "-format", "%[fx:mean*255]", "info:"]));
}

/** Mean |a − b| (grey levels) in each cell of a `grid`×`grid` split of the frame (G1: a cell is ≥ 10 % of the screen at 3×3). */
export function cellDiffs(a, b, grid = 3) {
  return run([a, b, "-compose", "difference", "-composite", "-colorspace", "gray", "-crop", grid + "x" + grid + "@", "+repage", "-format", "%[fx:mean*255]\n", "info:"]).trim().split(/\s+/).map(Number);
}

/** Share of the frame's pixels whose grey changed by more than `levels` between a and b (G2's hard cut reads > 0.35). */
export function changedShare(a, b, levels = 8) {
  return Number(run([a, b, "-compose", "difference", "-composite", "-colorspace", "gray", "-threshold", (levels / 255) * 100 + "%", "-format", "%[fx:mean]", "info:"]));
}

/** G1 over a list of frames: pairs where some cell moved ≥ `levels` grey (default 0.5). */
export function idleMotion(files, levels = 0.5) {
  const pairs = [];
  for (let k = 1; k < files.length; k += 1) pairs.push(Math.max(...cellDiffs(files[k - 1], files[k])));
  const moving = pairs.filter((d) => d >= levels).length;
  return { pairs: pairs.length, moving, share: pairs.length ? Math.round((moving / pairs.length) * 1000) / 1000 : 0, maxDelta: Math.round(Math.max(0, ...pairs) * 1000) / 1000, pass: moving * 2 >= pairs.length };
}

/**
 * G2 over a transition's frames (the first before the key): the frames that
 * changed, the largest share of pixels one pair changed, and whether it was a
 * hard cut (one pair over 35 %, or under 8 frames in between).
 */
export function transition(files, levels = 8) {
  const shares = [];
  for (let k = 1; k < files.length; k += 1) shares.push(Math.round(changedShare(files[k - 1], files[k], levels) * 1000) / 1000);
  const changing = shares.filter((s) => s > 0.002).length;
  const largest = Math.max(0, ...shares);
  return { shares, changing, largest, cut: largest > 0.35 || changing < 8 };
}

/** A contact sheet of `rows` ({ file, label }) at `width` px a cell, `cols` across. */
export function sheet(rows, out, cols = 6, width = 320) {
  mkdirSync(join(out, ".."), { recursive: true });
  const cells = rows.flatMap((row) => ["-label", row.label, row.file]);
  run(["montage", "-font", FONT, "-pointsize", "12", "-fill", "#e8e8e8", "-background", "#16181b", ...cells, "-tile", cols + "x", "-geometry", width + "x+3+3", out]);
  return out;
}

export function save(dir, name, data) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name + ".json"), JSON.stringify(data, null, 1));
}
