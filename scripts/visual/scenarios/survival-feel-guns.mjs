// Tuyến Cuối feel pass, the guns build (docs/FEEL_PASS_S1.md §4, §7.2–§7.3:
// F3 guns, F4 chunks): frame sequences on the page's held clock with what the
// page knew at each (events, bolts, lights, muzzles, chunks, shake), contact
// sheets, and the measures that grade them.
//   f5    each gun (Xung, Tia, Tán, Ray, Pháo Sao) on chapter stage 1, seed
//         3, director off, a pack placed by logged commands; a magazine typed
//         on the held clock, then 24 frames 33 ms apart (Pháo Sao 32). Each
//         frame twice: as shown, and with the HUD hidden for the measures.
//         Grades: its bolts drawn (Xung, Tán, Pháo Sao; Ray's armed bolt
//         while it waits); the muzzle flash on the shot's frame (the radius of
//         pixels brighter than 0.8 round the muzzle ≥ 80 % of §4.2's); the
//         deck round the muzzle brighter on the shot's frame than the one
//         before (≥ 0.08); lights lit; damage numbers at the new size.
//   f6    kills: Pháo Sao into a pack and a Trâu, Ray down a row: 40 frames
//         33 ms apart and one 6 s later. Grades: chunks after a kill ≥ §4.5's
//         count; one chunk followed rising ≥ 3 frames, then falling ≥ 3; at
//         +6 s ≥ 50 % still lying.
//   shake chapter stage 1 typed at 40 WPM on the held clock for 60 s: the
//         camera's offset every frame (p95 ≤ 3 px, max ≤ 8 px at 1080p) and the
//         pools at their peak (§6).
//   f9g   real time: each gun's magazine with screenshots as fast as cdp-run
//         takes them (it has no screencast).
//   audio the gun sounds built offline in Chrome (OfflineAudioContext): the
//         1–4 kHz band ≤ −20 dB of the peak outside 30 ms after each attack.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… SCENES=f5,f6,shake,f9g,audio node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-feel-guns.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR } from "./common.mjs";
import { press, stats, sv } from "./survival-s0-lib.mjs";
import { KIND, openStage } from "./survival-s1-lib.mjs";
import { advance, crop, hold, save, sheet, STEP } from "./survival-feel-lib.mjs";

const EV = { shot: 1, hit: 2, kill: 3, beamStart: 12, volley: 20, charge: 21, rail: 22, launch: 23, burst: 24 };
const BOLT = { xung: 0, tan: 1, ray: 2, phao: 3 };
/** Per gun: the kit, its first event, frames, the muzzle (Ship MUZZLE), §4.2's flash radius (share of the view's height), the pack. */
const GUNS = {
  xung: { kit: ["xung", "tan"], first: EV.shot, frames: 24, muzzle: [1, 2], flash: 0.08, pack: (i) => [KIND.mine, -3 + (i % 6) * 1.2, 8 + Math.floor(i / 6) * 1.4] },
  tia: { kit: ["tia", "xung"], first: EV.beamStart, frames: 24, muzzle: [0], flash: 0.07, pack: (i) => [KIND.mine, -4 + (i % 6) * 1.6, 7 + Math.floor(i / 6) * 1.6] },
  tan: { kit: ["tan", "xung"], first: EV.volley, frames: 24, muzzle: [0], flash: 0.1, pack: (i) => [KIND.mine, -3.5 + (i % 6) * 1.3, 6 + Math.floor(i / 6) * 1.3] },
  ray: { kit: ["ray", "xung"], first: EV.rail, frames: 36, muzzle: [0], flash: 0.12, pack: (i) => [i % 4 === 0 ? KIND.scout : KIND.mine, (i % 3) * 0.3 - 0.3, 8 + i * 1.6] },
  phao: { kit: ["phao", "xung"], first: EV.launch, frames: 32, muzzle: [3], flash: 0.06, pack: (i) => [KIND.mine, 3 + (i % 4) * 1.1, 15 + Math.floor(i / 4) * 1.1] },
};

const hud = (page, on) => page.eval("document.querySelector('.sv-hud').style.visibility = '" + (on ? "" : "hidden") + "'; true");
const READ = sv("return { tick: t.state().tick, info: t.info(), events: t.events(), numbers: t.numbers().boxes.map((b) => ({ h: Math.round(b.h), text: b.text })) };");

/** A frame as shown and with the HUD hidden (the measures read that one), with what the page knew. */
async function frame(page, dir, name, extra) {
  const file = join(dir, name + ".png");
  const bare = join(dir, name + "-bare.png");
  await page.shot(file);
  await hud(page, false);
  await page.shot(bare);
  await hud(page, true);
  return { file, bare, name, ...extra, ...(await page.eval(READ)) };
}

/** The gray pixels (0–255) of `rect` in `file`, row by row. */
function gray(file, rect) {
  const raw = execFileSync("magick", [file, "-crop", crop(rect), "+repage", "-grayscale", "Rec709Luma", "-depth", "8", "gray:-"], { maxBuffer: 1 << 26 });
  return { data: raw, w: Math.round(rect.w), h: Math.round(rect.h) };
}

/** How far (CSS px) pixels brighter than `level` reach from (x, y): the median over 16 rays of the last bright pixel walked out from the centre. */
function brightRadius(file, x, y, scale, level = 0.8) {
  const R = Math.round(160 * scale);
  const g = gray(file, { x: x * scale - R, y: y * scale - R, w: 2 * R, h: 2 * R });
  const reach = [];
  for (let a = 0; a < 16; a += 1) {
    const ux = Math.cos((a / 16) * Math.PI * 2);
    const uy = Math.sin((a / 16) * Math.PI * 2);
    let last = 0;
    let dark = 0;
    for (let r = 0; r < R; r += 1) {
      const px = Math.round(R + ux * r);
      const py = Math.round(R + uy * r);
      if (px < 0 || py < 0 || px >= g.w || py >= g.h) break;
      if (g.data[py * g.w + px] / 255 > level) {
        last = r;
        dark = 0;
      } else if (++dark > 3 * scale) break;
    }
    reach.push(last / scale);
  }
  reach.sort((p, q) => p - q);
  return Math.round(reach[8] * 10) / 10;
}

/** Mean brightness (0–1) inside a disc of `r` px round (x, y). */
function discMean(file, x, y, r, scale) {
  const R = Math.round(r * scale);
  const g = gray(file, { x: x * scale - R, y: y * scale - R, w: 2 * R, h: 2 * R });
  let sum = 0;
  let n = 0;
  for (let py = 0; py < g.h; py += 1) for (let px = 0; px < g.w; px += 1) {
    if ((px - R) ** 2 + (py - R) ** 2 > R * R) continue;
    sum += g.data[py * g.w + px];
    n += 1;
  }
  return Math.round((sum / Math.max(1, n) / 255) * 1000) / 1000;
}

async function bayOf(page, gun) {
  const slots = await page.eval(sv("return t.slots();"));
  return { bay: slots.findIndex((slot) => slot.gun === gun), slots };
}

/** Types bay `bay`'s word but its last letter on the held clock, one frame between keys; returns the word. */
async function typeHeld(page, bay) {
  const { slots } = await bayOf(page, "");
  const word = slots[bay].text;
  for (const letter of word.slice(0, -1)) {
    await press(page, letter);
    await advance(page, STEP);
  }
  return word;
}

async function f5(page, dir) {
  const size = page.width + "x" + page.height;
  const scale = 1;
  const ui = page.height / 720;
  const out = {};
  const pick = (process.env.GUNS ?? "xung,tia,tan,ray,phao").split(",");
  for (const [gun, spec] of Object.entries(GUNS)) {
    if (!pick.includes(gun)) continue;
    const ready = await openStage(page, "c1-s1", spec.kit, "&director=0" + (process.env.QUERY ?? ""));
    await page.key("Shift", { code: "ShiftLeft" });
    await page.sleep(300);
    await hold(page, true);
    for (let i = 0; i < 12; i += 1) await page.eval(sv("t.place(" + spec.pack(i).join(", ") + "); return true;"));
    await advance(page, 50);
    const { bay } = await bayOf(page, gun);
    // Ray: its armed bolt shows from the load; the frames start then and run to the line.
    const word = await typeHeld(page, bay);
    // The frame before the last key, then the last key's frame (its magazine loads; Xung, Tán, Pháo Sao, Tia fire on it), then every 33 ms.
    const rows = [await frame(page, dir, gun + "-pre", { f: -1, ms: -17 })];
    await press(page, word.at(-1));
    await advance(page, STEP);
    for (let f = 0; f < spec.frames; f += 1) {
      rows.push(await frame(page, dir, gun + "-" + String(f).padStart(2, "0"), { f, ms: Math.round(f * 33.3) }));
      await advance(page, 2 * STEP);
    }
    await hold(page, false);
    const fired = rows.findIndex((row) => (row.events[spec.first] ?? 0) > 0);
    const shot = rows[fired] ?? null;
    const before = rows[fired - 1] ?? null;
    let flash = null;
    let pool = null;
    if (shot !== null) {
      const radii = spec.muzzle.map((k) => brightRadius(shot.bare, shot.info.muzzles[k][0], shot.info.muzzles[k][1], scale));
      flash = { radius: Math.max(...radii), radii, target: Math.round(spec.flash * page.height), need: Math.round(spec.flash * page.height * 0.8) };
      if (before !== null) {
        // The deck round the muzzle: a disc 1.5 m across at the muzzle's depth (≈ 52 px at 720p).
        const k = spec.muzzle[0];
        const [mx, my] = shot.info.muzzles[k];
        const r = 52 * ui;
        pool = { before: discMean(before.bare, mx, my + r * 0.4, r, scale), shot: discMean(shot.bare, mx, my + r * 0.4, r, scale) };
        pool.rise = Math.round((pool.shot - pool.before) * 1000) / 1000;
      }
    }
    const kind = BOLT[gun];
    const boltsMax = kind === undefined ? 0 : Math.max(...rows.map((row) => row.info.bolts?.[kind] ?? 0));
    const lightsMax = Math.max(...rows.map((row) => row.info.lights ?? 0));
    const numberH = rows.flatMap((row) => row.numbers.map((n) => n.h));
    const clip = gun === "phao" ? { x: 200 * ui, y: 60 * ui, w: 880 * ui, h: 560 * ui } : { x: 280 * ui, y: 200 * ui, w: 720 * ui, h: 420 * ui };
    const label = (row, i) => gun + " f" + row.f + " " + row.ms + " ms" + (i === fired ? " SHOT" : "") + " b" + (row.info.bolts?.[kind] ?? "-") + " L" + row.info.lights;
    const sheets = [sheet(rows.map((row, i) => ({ file: row.file, label: label(row, i) })), join(dir, "sheet-f5-" + gun + "-" + size + ".jpg"), clip, 6, 360)];
    save(dir, "meta-f5-" + gun + "-" + size + ".json", { word, bay, fired, flash, pool, rows: rows.map(({ file, bare, ...row }) => ({ file: file.split("/").pop(), ...row })) });
    out[gun] = {
      ready, word, fired, flash, pool, boltsMax, lightsMax, numbers: numberH.length > 0 ? stats(numberH) : null, sheets,
      checks: {
        fired: fired >= 0,
        bolts: kind === undefined || boltsMax > 0,
        lights: lightsMax > 0,
        muzzleFlash: flash !== null && flash.radius >= flash.need,
        deckPool: pool !== null && pool.rise >= 0.08,
      },
    };
  }
  return { guns: out, checks: Object.fromEntries(Object.entries(out).flatMap(([gun, r]) => Object.entries(r.checks).map(([k, v]) => [gun + "." + k, v]))) };
}

/** A run of frames with one chunk followed: the longest stretch it rose, then fell, frame to frame (33 ms). */
function arc(rows) {
  const ys = [];
  let id = -2;
  let best = { up: 0, down: 0, top: 0, frames: 0 };
  const close = () => {
    let k = 0;
    while (k + 1 < ys.length && ys[k + 1] > ys[k]) k += 1;
    let d = k;
    while (d + 1 < ys.length && ys[d + 1] < ys[d]) d += 1;
    if (k + (d - k) > best.up + best.down) best = { up: k, down: d - k, top: ys[k] ?? 0, frames: ys.length };
  };
  for (const row of rows) {
    const [i, y] = row.info.chunk ?? [-1, -1];
    if (i !== id) {
      close();
      ys.length = 0;
      id = i;
    }
    if (y >= 0) ys.push(y);
  }
  close();
  return best;
}

/**
 * Kills (§4.5, F6): Pháo Sao into a pack of 12 mines, then Ray down a row
 * with a Trâu at its head; 40 frames 33 ms apart for each, then one 6 s on.
 */
async function f6(page, dir) {
  const size = page.width + "x" + page.height;
  const ui = page.height / 720;
  const ready = await openStage(page, "c1-s1", ["phao", "ray"], "&director=0");
  await page.key("Shift", { code: "ShiftLeft" });
  await page.sleep(300);
  await hold(page, true);
  // Pháo Sao's pack first (it aims at the most hit points standing: a Trâu would draw it), then Ray's row behind a Trâu.
  for (let i = 0; i < 12; i += 1) await page.eval(sv("t.place(" + KIND.mine + ", " + (2 + (i % 4) * 1.1) + ", " + (13 + Math.floor(i / 4) * 1.1) + "); return true;"));
  await advance(page, 50);
  const rows = [];
  for (const [gun, frames] of [["phao", 40], ["ray", 40]]) {
    if (gun === "ray") {
      await page.eval(sv("t.place(" + KIND.brute + ", -2.5, 9); return true;"));
      for (let i = 0; i < 4; i += 1) await page.eval(sv("t.place(" + KIND.mine + ", " + (-2.5 - i * 0.15) + ", " + (12 + i * 2) + "); return true;"));
      await advance(page, 50);
    }
    const { bay } = await bayOf(page, gun);
    const word = await typeHeld(page, bay);
    await press(page, word.at(-1));
    for (let f = 0; f < frames; f += 1) {
      await advance(page, 2 * STEP);
      rows.push(await frame(page, dir, "f6-" + gun + "-" + String(f).padStart(2, "0"), { gun, f, ms: Math.round((f + 1) * 33.3) }));
    }
  }
  const peak = Math.max(...rows.map((row) => row.info.chunks));
  await advance(page, 6000);
  const late = await frame(page, dir, "f6-late", { gun: "late", f: 0, ms: 6000 });
  await hold(page, false);
  const kills = rows.at(-1).events[EV.kill] ?? 0;
  const firstKill = rows.findIndex((row) => (row.events[EV.kill] ?? 0) > 0);
  const afterFirst = firstKill >= 0 ? rows[Math.min(rows.length - 1, firstKill + 1)].info.chunks : 0;
  const followed = arc(rows);
  const label = (row) => row.gun + " +" + row.ms + " ms · " + row.info.chunks + " chunks" + (row.info.chunk?.[1] >= 0 ? " y" + row.info.chunk[1].toFixed(2) : "");
  const clip = { x: 160 * ui, y: 80 * ui, w: 960 * ui, h: 520 * ui };
  const sheets = [
    sheet(rows.filter((row) => row.gun === "phao").map((row) => ({ file: row.file, label: label(row) })), join(dir, "sheet-f6-phao-" + size + ".jpg"), clip, 8, 300),
    sheet(rows.filter((row) => row.gun === "ray").map((row) => ({ file: row.file, label: label(row) })), join(dir, "sheet-f6-ray-" + size + ".jpg"), clip, 8, 300),
    sheet([rows.at(-1), late].map((row) => ({ file: row.file, label: label(row) })), join(dir, "sheet-f6-late-" + size + ".jpg"), clip, 2, 600),
  ];
  save(dir, "meta-f6-" + size + ".json", { kills, firstKill, afterFirst, peak, followed, late: late.info, rows: rows.map(({ file, bare, ...row }) => ({ file: file.split("/").pop(), ...row })) });
  return {
    ready, kills, afterFirst, peak, late: late.info.chunks, followed, sheets,
    checks: {
      killed: kills > 0,
      chunksAfterKill: afterFirst >= 7,
      arcUp3Down3: followed.up >= 3 && followed.down >= 3,
      halfLieAt6s: late.info.chunks >= peak * 0.5,
    },
  };
}

/**
 * Shake and pools in a fight (§4.6, §6): chapter stages 1 (Xung + Tia) and 3
 * (Tán + Ray) typed at 40 WPM on the held clock for `seconds`; the camera's
 * offset every frame (px; the 1080p target scales with the view), the pools
 * after every key.
 */
async function shake(page) {
  const seconds = Number(process.env.SHAKE_S ?? 45);
  const runs = [];
  for (const [stage, guns] of [["c1-s1", ["xung", "tia"]], ["c1-s3", ["tan", "ray"]]]) {
    const ready = await openStage(page, stage, guns);
    await page.key("Shift", { code: "ShiftLeft" });
    await page.sleep(400);
    const offsets = [];
    const pools = { glows: 0, sparks: 0, chunks: 0, numbers: 0, lights: 0, debris: 0, bolts: 0 };
    const keyFrames = Math.round((60000 / (40 * 5)) / STEP);
    await hold(page, true);
    for (let time = 0; time < seconds; ) {
      const look = await page.eval(sv("const out = []; for (let k = 0; k < " + keyFrames + "; k += 1) { t.advance(1000 / 60); out.push(t.motion().offset); } const i = t.info(); return { off: out, info: i, state: t.state(), slots: t.slots(), mode: t.mode() };"));
      if (look === null || look.mode !== "play" || look.state.phase !== "play") break;
      time = look.state.time;
      offsets.push(...look.off);
      for (const key of ["glows", "sparks", "chunks", "numbers", "lights", "debris"]) pools[key] = Math.max(pools[key], look.info[key] ?? 0);
      pools.bolts = Math.max(pools.bolts, (look.info.bolts ?? []).reduce((a, b) => a + b, 0));
      const locked = look.slots.find((slot) => slot.locked);
      const pick = locked ?? look.slots.filter((slot) => slot.gun !== "").reduce((a, b) => (b.mags < a.mags ? b : a));
      const letter = locked ? locked.text[locked.typed] : pick.text[0];
      if (letter) await press(page, letter);
    }
    await hold(page, false);
    const at1080 = offsets.map((v) => (v * 1080) / page.height);
    runs.push({ stage, guns, ready, frames: offsets.length, offset: stats(offsets), at1080: stats(at1080), pools });
  }
  return {
    runs,
    checks: {
      shakeP95: runs.every((run) => run.at1080.p95 <= 3),
      shakeMax: runs.every((run) => run.at1080.max <= 8),
      pools: runs.every((run) => run.pools.sparks <= 2000 && run.pools.glows <= 340 && run.pools.chunks <= 800 && run.pools.numbers <= 120 && run.pools.lights <= 4),
    },
  };
}

/**
 * Real time: each gun's magazine typed at 90 ms a key on the running clock;
 * screenshots as fast as cdp-run takes them (it has no screencast) and, in the
 * page, every real frame's bolts, lights and live glows for 2.6 s: the
 * effects run on the frame clock (not only under the held one).
 */
async function f9g(page, dir) {
  const size = page.width + "x" + page.height;
  const ui = page.height / 720;
  const out = {};
  for (const [gun, spec] of Object.entries(GUNS)) {
    await openStage(page, "c1-s1", spec.kit, "&director=0");
    await page.key("Shift", { code: "ShiftLeft" });
    for (let i = 0; i < 12; i += 1) await page.eval(sv("t.place(" + spec.pack(i).join(", ") + "); return true;"));
    await page.sleep(100);
    const { bay, slots } = await bayOf(page, gun);
    await page.eval("window.__rec = []; (function rec(t0) { const go = (t) => { const i = window.__survival.info(); window.__rec.push([Math.round(t - t0), i.bolts.reduce((a, b) => a + b, 0), i.lights, i.glows, i.chunks]); if (t - t0 < 3200) requestAnimationFrame(go); }; requestAnimationFrame(go); })(performance.now()); true");
    for (const letter of slots[bay].text) {
      await press(page, letter);
      await page.sleep(90);
    }
    const shots = [];
    const start = Date.now();
    while (Date.now() - start < 2600) {
      const file = join(dir, "f9g-" + gun + "-" + String(shots.length).padStart(3, "0") + ".png");
      await page.shot(file);
      shots.push({ file, label: gun + " +" + (Date.now() - start) + " ms" });
    }
    await page.sleep(700);
    const rec = await page.eval("window.__rec");
    const gaps = rec.slice(1).map((r, k) => r[0] - rec[k][0]).sort((a, b) => a - b);
    out[gun] = {
      shots: shots.length,
      msPerShot: Math.round(2600 / Math.max(1, shots.length)),
      frames: rec.length,
      frameMs: { median: gaps[gaps.length >> 1] ?? 0, p95: gaps[Math.floor(gaps.length * 0.95)] ?? 0 },
      boltFrames: rec.filter((r) => r[1] > 0).length,
      lightFrames: rec.filter((r) => r[2] > 0).length,
      glowsMax: Math.max(...rec.map((r) => r[3])),
      sheet: sheet(shots.slice(0, 24), join(dir, "sheet-f9g-" + gun + "-" + size + ".jpg"), { x: 240 * ui, y: 120 * ui, w: 800 * ui, h: 500 * ui }, 6, 330),
    };
    save(dir, "f9g-" + gun + "-" + size + ".json", rec);
  }
  return { guns: out, checks: { realFrames: Object.values(out).every((g) => g.frames >= 120), lightsInRealTime: Object.values(out).every((g) => g.lightFrames > 0), boltsInRealTime: ["xung", "tan", "ray", "phao"].every((g) => out[g].boltFrames > 0) } };
}

/** Each gun sound rendered offline; the 1–4 kHz band outside 30 ms after each attack, against the sound's loudest 10 ms (§7.5). */
async function audio(page) {
  await openStage(page, "c1-s1", ["xung", "tia"]);
  const result = await page.eval(`(async () => {
    const gun = await import('/src/audio/gun-audio.ts');
    const kit = await import('/src/kit/audio/index.ts');
    const rate = 48000;
    const fft = (re, im) => {
      const n = re.length;
      for (let i = 1, j = 0; i < n; i += 1) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
      for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k += 1) { const c = Math.cos(a * k), s = Math.sin(a * k); const xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s; const xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c; re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } }
    };
    const SOUNDS = {
      'gun.xung (first)': { play: (v) => gun.xungRound(v, true), attacks: [0, 0.012] },
      'gun.xung': { play: (v) => gun.xungRound(v, false), attacks: [0] },
      'gun.xung.tail': { play: (v) => gun.xungTail(v), attacks: [] },
      'gun.tia.loop': { play: (v) => { const stop = gun.GUN_LOOPS['gun.tia.loop'](v); }, attacks: [] },
      'gun.tia.end': { play: (v) => gun.tiaEnd(v), attacks: [0] },
      'gun.tan.fire': { play: (v) => gun.GUN_SOUNDS['gun.tan.fire'](v, 1), attacks: [0] },
      'gun.ray.armed': { play: (v) => { gun.GUN_LOOPS['gun.ray.armed'](v); }, attacks: [] },
      'gun.ray.fire': { play: (v) => gun.GUN_SOUNDS['gun.ray.fire'](v, 1), attacks: [0] },
      'gun.phao.launch': { play: (v) => gun.GUN_SOUNDS['gun.phao.launch'](v, 1), attacks: [0, 0.02] },
      'gun.phao.burst': { play: (v) => gun.GUN_SOUNDS['gun.phao.burst'](v, 1), attacks: [0] },
      'gun.phao.burst (+4 st)': { play: (v) => gun.GUN_SOUNDS['gun.phao.burst'](v, 2 ** (4 / 12)), attacks: [0] },
    };
    const out = {};
    for (const [id, spec] of Object.entries(SOUNDS)) {
      const ctx = new OfflineAudioContext(1, Math.round(rate * 0.9), rate);
      spec.play({ ctx, out: ctx.destination, at: 0.02, noise: kit.noiseBuffer(ctx) });
      const data = (await ctx.startRendering()).getChannelData(0);
      const N = 1024, hop = 240;
      let peak = 0;
      const frames = [];
      for (let start = 0; start + N <= data.length; start += hop) {
        const re = new Float64Array(N), im = new Float64Array(N);
        for (let i = 0; i < N; i += 1) re[i] = data[start + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
        fft(re, im);
        let all = 0, band = 0;
        for (let k = 1; k < N / 2; k += 1) { const e = re[k] * re[k] + im[k] * im[k]; const hz = k * rate / N; all += e; if (hz >= 1000 && hz <= 4000) band += e; }
        frames.push({ t: (start + N / 2) / rate - 0.02, all, band });
        peak = Math.max(peak, all);
      }
      let worst = -200, worstAt = 0;
      for (const f of frames) {
        if (f.t < 0.06 && spec.attacks.length === 0) continue;
        if (spec.attacks.some((a) => f.t >= a - 0.012 && f.t <= a + 0.03)) continue;
        const db = 10 * Math.log10(Math.max(1e-20, f.band) / Math.max(1e-20, peak));
        if (db > worst) { worst = db; worstAt = f.t; }
      }
      let max = 0; for (const x of data) max = Math.max(max, Math.abs(x));
      out[id] = { worstBandDb: Math.round(worst * 10) / 10, at: Math.round(worstAt * 1000), peakAmp: Math.round(max * 1000) / 1000 };
    }
    return out;
  })()`);
  return { sounds: result, checks: { speechBandClear: result !== null && Object.values(result).every((s) => s.worstBandDb <= -20), noClip: result !== null && Object.values(result).every((s) => s.peakAmp < 1) } };
}

const SCENES = { f5, f6, shake, f9g, audio };

export default async function (page) {
  const size = page.width + "x" + page.height;
  const dir = join(OUT_DIR, size);
  mkdirSync(dir, { recursive: true });
  const only = (process.env.SCENES ?? "f5").split(",");
  const results = {};
  for (const name of only) {
    try {
      results[name] = await SCENES[name](page, dir);
    } catch (error) {
      results[name] = { error: String(error?.stack ?? error).slice(0, 600), checks: { ran: false } };
    }
  }
  const checks = Object.fromEntries(Object.entries(results).flatMap(([scene, r]) => Object.entries(r.checks ?? {}).map(([k, v]) => [scene + "." + k, v])));
  checks.noConsoleErrors = page.logs.filter((line) => line.startsWith("error")).length === 0;
  checks.noExceptions = page.exceptions.length === 0;
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  save(dir, "result-" + size + ".json", { pass, checks, results });
  return { pass, checks, results };
}
