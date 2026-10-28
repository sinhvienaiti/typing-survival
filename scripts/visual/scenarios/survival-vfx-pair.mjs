// Tuyến Cuối VFX (parent docs/games/VFX_STANDARD.md §4.5, §5.6; MAP1_PRODUCTION
// TS-M1-05): the first gun pair a new player meets, Pulse Gun (xung) and Heat
// Beam (tia), and the ship when hit, captured by phase on the held clock
// (chapter stage 1, seed 3, director off, a pack placed by logged commands):
//   A  each key of the word but the last, 83 ms after it (the key's own marks
//      are gone by then, the charge stays);
//   R, I  the last key's frame and the 23 after it, 16.7 ms apart;
//   T  ten frames 33 ms apart;
//   F  every 250 ms to the end of the aftermath.
// Each frame twice, as shown and with the HUD hidden (the measures read that
// one), with what the page knew. `hurt`: a mine breaching the bottom line (the
// ship is hit; no gun loaded), its frames from the hit. VARIANT=lit types a Heat Beam word first,
// so Pulse Gun fires over a deck lit by the beam (the game's light ground).
// Writes rows-<action>-<size>.json for scripts that measure and lay out the
// sheets (parent tools/vfx-sheet); grades nothing itself.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… ACTIONS=xung,tia,hurt VARIANT=dark node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-vfx-pair.mjs --width=1280 --height=720
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR } from "./common.mjs";
import { press, sv } from "./survival-s0-lib.mjs";
import { KIND, openStage } from "./survival-s1-lib.mjs";
import { advance, hold, STEP } from "./survival-feel-lib.mjs";

const EV = { shot: 1, breach: 4, playerHit: 7, beamStart: 12 };
const ACTIONS = {
  xung: { kit: ["xung", "tia"], first: EV.shot, muzzle: [1, 2], flash: 0.08, after: 3.5, pack: (i) => [KIND.mine, -3 + (i % 6) * 1.2, 8 + Math.floor(i / 6) * 1.4] },
  tia: { kit: ["tia", "xung"], first: EV.beamStart, muzzle: [0], flash: 0.07, after: 5.5, pack: (i) => [KIND.mine, -4 + (i % 6) * 1.6, 7 + Math.floor(i / 6) * 1.6] },
};
const hud = (page, on) => page.eval("document.querySelector('.sv-hud').style.visibility = '" + (on ? "" : "hidden") + "'; true");
const READ = sv("return { tick: t.state().tick, info: t.info(), events: t.events(), foes: t.foes() };");

async function frame(page, dir, name, extra) {
  const file = name + ".png";
  const bare = name + "-bare.png";
  await page.shot(join(dir, file));
  await hud(page, false);
  await page.shot(join(dir, bare));
  await hud(page, true);
  return { file, bare, ...extra, ...(await page.eval(READ)) };
}

async function bayOf(page, gun) {
  const slots = await page.eval(sv("return t.slots();"));
  return slots.findIndex((slot) => slot.gun === gun);
}

/** Types `bay`'s word on the held clock, 100 ms a key; `frames` (a dir) takes an A frame 83 ms after each key but the last. Returns the last letter, unpressed. */
async function typeWord(page, bay, rows, dir, tag) {
  const slots = await page.eval(sv("return t.slots();"));
  const word = slots[bay].text;
  for (let k = 0; k < word.length - 1; k += 1) {
    await press(page, word[k]);
    await advance(page, 5 * STEP);
    if (rows !== null) rows.push(await frame(page, dir, tag + "-a" + k, { phase: "A", key: k + 1, of: word.length, ms: 83 }));
    await advance(page, STEP);
  }
  return word;
}

async function gun(page, dir, name, spec, lit) {
  const ready = await openStage(page, "c1-s1", spec.kit, "&director=0");
  await page.key("Shift", { code: "ShiftLeft" });
  await page.sleep(300);
  await hold(page, true);
  for (let i = 0; i < 12; i += 1) await page.eval(sv("t.place(" + spec.pack(i).join(", ") + "); return true;"));
  await advance(page, 50);
  if (lit) {
    const tia = await bayOf(page, "tia");
    const word = await typeWord(page, tia, null, dir, name);
    await press(page, word.at(-1));
    await advance(page, 200);
  }
  const rows = [await frame(page, dir, name + "-base", { phase: "base" })];
  const bay = await bayOf(page, name.split("-")[0]);
  const word = await typeWord(page, bay, rows, dir, name);
  await advance(page, 300 - 6 * STEP);
  rows.push(await frame(page, dir, name + "-pre", { phase: "pre", f: -1, ms: -17 }));
  await press(page, word.at(-1));
  await advance(page, STEP);
  for (let f = 0; f < 24; f += 1) {
    rows.push(await frame(page, dir, name + "-r" + String(f).padStart(2, "0"), { phase: f < 3 ? "R" : "I", f, ms: Math.round(f * STEP) }));
    await advance(page, STEP);
  }
  for (let k = 1; k <= 10; k += 1) {
    await advance(page, STEP);
    rows.push(await frame(page, dir, name + "-t" + String(k).padStart(2, "0"), { phase: "T", f: 23 + 2 * k, ms: Math.round((23 + 2 * k) * STEP) }));
  }
  let ms = (43 * 1000) / 60;
  for (let at = 750; at <= spec.after * 1000; at += 250) {
    await advance(page, at - ms);
    ms = at;
    rows.push(await frame(page, dir, name + "-f" + String(at).padStart(4, "0"), { phase: "F", ms: at }));
  }
  await hold(page, false);
  return { ready, word, bay, first: spec.first, muzzle: spec.muzzle, flash: spec.flash, rows };
}

/** A mine placed just past the bottom line walks into it (a breach: the ship is hit, ship.hurt()); step until it lands, keeping the frame before. */
async function hurt(page, dir) {
  const ready = await openStage(page, "c1-s1", ACTIONS.xung.kit, "&director=0");
  await page.key("Shift", { code: "ShiftLeft" });
  await page.sleep(300);
  await hold(page, true);
  await page.eval(sv("t.place(" + KIND.mine + ", 0.6, 3.6); return true;"));
  await advance(page, STEP);
  const rows = [await frame(page, dir, "hurt-base", { phase: "base" })];
  const count = async () => { const e = await page.eval(sv("return t.events();")); return (e[EV.breach] ?? 0) + (e[EV.playerHit] ?? 0); };
  let pre = null;
  for (let k = 0; k < 300 && (await count()) === 0; k += 1) {
    pre = await frame(page, dir, "hurt-pre", { phase: "pre", f: -1, ms: -17 });
    await advance(page, STEP);
  }
  if (pre !== null) rows.push(pre);
  for (let f = 0; f < 24; f += 1) {
    rows.push(await frame(page, dir, "hurt-r" + String(f).padStart(2, "0"), { phase: "I", f, ms: Math.round(f * STEP) }));
    await advance(page, STEP);
  }
  let ms = (24 * 1000) / 60;
  for (let at = 500; at <= 3000; at += 250) {
    await advance(page, at - ms);
    ms = at;
    rows.push(await frame(page, dir, "hurt-f" + String(at).padStart(4, "0"), { phase: "F", ms: at }));
  }
  await hold(page, false);
  return { ready, rows };
}

export default async function run(page) {
  const size = page.width + "x" + page.height;
  const variant = process.env.VARIANT ?? "dark";
  const dir = join(OUT_DIR, size);
  mkdirSync(dir, { recursive: true });
  const view = { width: page.width, height: page.height, variant };
  const summary = {};
  for (const action of (process.env.ACTIONS ?? "xung,tia,hurt").split(",")) {
    const name = variant === "lit" ? action + "-lit" : action;
    if (action !== "hurt" && variant === "lit" && action !== "xung") continue;
    const result = action === "hurt" ? await hurt(page, dir) : await gun(page, dir, name, ACTIONS[action], variant === "lit");
    const rects = await page.eval(sv("return t.rects();"));
    const lineAlpha = await page.eval("Number(getComputedStyle(document.querySelector('.sv-strip')).backgroundColor.match(/[\\d.]+/g)[3] ?? 1)");
    writeFileSync(join(dir, "rows-" + name + "-" + size + ".json"), JSON.stringify({ action, name, view, line: rects[0], lineAlpha, ...result }, null, 1));
    summary[name] = { ready: result.ready, word: result.word, frames: result.rows.length };
  }
  return summary;
}
