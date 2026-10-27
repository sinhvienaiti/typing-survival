// Tuyến Cuối feel pass (docs/FEEL_PASS_S1.md §7.2–§7.3), the typing build
// (F1 layout, F2 typing): frame sequences on the page's held clock
// (__survival.hold/advance), each with what the page knew (tick, the feel
// probe, the word line's boxes), cut into contact sheets labelled with the
// frame, its ms and its key; the measures that grade them.
//   f1   each letter: the trial (?seed=1), a Xung word into the free bay at
//        150 ms a key; every frame (16.7 ms); sheets of keys 2–4 (12 frames
//        each) and of the word's end (f3, 24 frames). Grades: the frame after
//        a key changes ≥ 2× the median frame between keys (word line ± 80 px
//        and the ship's box) at ≥ 9 keys in 10; the letter just typed ≥ 1.2×
//        its height at f0–f1 and back within 1 px by f7; the core ≥ 0.95
//        bright at the word's f0–f2.
//   f2   a wrong key at letter 3 (red underline, core dip, red sparks) and a
//        stray key with no lock (red ghost, the bays' first letters bounce).
//   f4   a word into a full bay (no load flash, LEDs blink urgent, "ĐẦY").
//   f9   real time: a screenshot loop while a word is typed at 120 ms a key
//        (pictures every 50–65 ms: cdp-run has no screencast) and, in the
//        page, each real frame's letter transforms: every letter pops within
//        2 frames of its key and stands by ~100 ms (the frame clock, not CSS).
//   f8   chapter stages 1 and 4 typed at 40 WPM on the held clock: the eye
//        (the word line's centre) to each new damage number, numbers over
//        protected boxes, ticks for near foes behind the line, frames with the
//        HUD hidden every 2 s for the contrast under the line and the bays,
//        and how much the effects wash out (the balance pass of the ship
//        build): foes ≤ 25 m whose body and its ring of 1–2 body radii are
//        both bright (body p50 ≥ 0.8, ring mean ≥ 0.6) sit inside a cloud of
//        light, not a hit flash on a dark deck; those still alive 0.5 s later
//        are threats the light hid (≤ 10 % of foe samples; the raw share,
//        dying foes in their own blast included, is printed too), and the
//        share of the field above the word line brighter than 0.9.
//   layout  the line's bottom ≤ the stripes − 4 px with the muzzles below it
//        (test pass 27/10: the line now stands 1.8 m past the bottom line),
//        its top ≥ 70 px under Xung's reach (90 before the lift), the bays
//        under the red line, nothing in a bay overflowing with 3 magazine LEDs.
//   marks  near foes behind the word line (§2.4): placed mines, a word locked,
//        red ticks under the plate at their x, blinking at 4 Hz, at most 6.
//   rate   10 keys a second on the held clock: at most 8 live shards.
//   audio  each typing sound built offline in Chrome (OfflineAudioContext):
//        the 1–4 kHz band ≤ −20 dB of the sound's peak outside 30 ms after
//        each attack (§7.5, Q6).
//   URL=http://127.0.0.1:3007/ OUT_DIR=… SCENES=f1,f2,f4,f9,f8,layout,marks,rate,audio node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-feel.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR } from "./common.mjs";
import { open, press, sv } from "./survival-s0-lib.mjs";
import { openStage } from "./survival-s1-lib.mjs";
import { advance, contrastOver, crop, frame, hold, luma, mae, READ, save, sheet, STEP } from "./survival-feel-lib.mjs";

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};
const grow = (r, by) => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/** The trial on seed 1 with the audio started (a key the sim ignores, as on the title screen). */
async function trial(page) {
  const ready = await open(page);
  await page.key("Shift", { code: "ShiftLeft" });
  await page.sleep(700);
  return ready;
}

async function xungBay(page) {
  const slots = await page.eval(sv("return t.slots();"));
  const bay = slots.findIndex((slot) => slot.gun === "xung");
  return { bay, slots, word: slots[bay].text };
}

/** The view's boxes at this size: the word line at its widest, the ship around its core (CSS px). */
async function boxes(page) {
  const state = await page.eval(READ);
  const line = (await page.eval(sv("return t.rects()[0];")));
  const ui = page.height / 720;
  const core = state.info.feel;
  return { line: { x: line.x + 6, y: line.y + 6, w: line.w - 12, h: line.h - 12 }, ship: { x: core.x - 90 * ui, y: core.y - 70 * ui, w: 180 * ui, h: 150 * ui }, core, ui };
}

async function f1(page, dir) {
  const ready = await trial(page);
  const view = await boxes(page);
  await hold(page, true);
  const rows = [];
  let n = 0;
  const shot = async (extra) => rows.push(await frame(page, dir, "f1-" + String(n++).padStart(3, "0"), STEP, extra));
  for (let f = 0; f < 4; f += 1) await shot({ key: null, w: 0, k: -1, f: f - 4 });
  // Three Xung words in a row, 150 ms a key; after each word's last key, 24 frames (the first word's are F3's sheet).
  const words = [];
  for (let w = 0; w < 3; w += 1) {
    const { word } = await xungBay(page);
    words.push(word);
    for (let k = 0; k < word.length; k += 1) {
      await press(page, word[k]);
      const last = k === word.length - 1;
      for (let f = 0; f < (last ? 24 : 9); f += 1) await shot({ key: f === 0 ? word[k] : null, w, k, f, last });
    }
  }
  await hold(page, false);
  // Image change: each frame against the one before, in the word line ± 80 px and the ship's box.
  const lineCrop = crop(grow(view.line, 80));
  const shipCrop = crop(view.ship);
  for (let i = 1; i < rows.length; i += 1) {
    rows[i].maeLine = mae(rows[i - 1].file, rows[i].file, lineCrop);
    rows[i].maeShip = mae(rows[i - 1].file, rows[i].file, shipCrop);
  }
  // Keys that are not a word's last (the last one's frame is the word's end, F3) against the frames between keys.
  const keyRows = rows.filter((row) => row.key !== null && !row.last);
  const between = rows.filter((row) => row.k >= 0 && !row.last && row.f >= 1);
  const betweenLine = median(between.map((row) => row.maeLine));
  const betweenShip = median(between.map((row) => row.maeShip));
  const keys = keyRows.map((row) => ({ key: row.key, w: row.w, k: row.k, line: row.maeLine, ship: row.maeShip, lineX: +(row.maeLine / Math.max(0.01, betweenLine)).toFixed(2), shipX: +(row.maeShip / Math.max(0.01, betweenShip)).toFixed(2) }));
  // The letter just typed: its box height at f0, f1 and f7 against its height standing (f8).
  const sizes = keyRows.map((row) => {
    const at = (f) => rows.find((r) => r.w === row.w && r.k === row.k && r.f === f)?.letters[row.k]?.box?.h ?? 0;
    const stand = at(8);
    return { w: row.w, k: row.k, letter: row.key, f0: at(0), f1: at(1), f7: at(7), stand, f0x: +(at(0) / stand).toFixed(3), f1x: +(at(1) / stand).toFixed(3) };
  });
  // Each word's end: the core's brightest pixels (p99) in a 40 px box at f0–f2.
  const coreMax = rows.filter((row) => row.last && row.f <= 2).map((row) => luma([row.file], { x: row.info.feel.x - 20 * view.ui, y: row.info.feel.y - 20 * view.ui, w: 40 * view.ui, h: 40 * view.ui }).p99);
  // Contact sheets: keys 2–4 of the first word (2 frames before to 9 after), its end.
  const clip = { x: 380 * view.ui, y: 370 * view.ui, w: 520 * view.ui, h: 270 * view.ui };
  const size = page.width + "x" + page.height;
  const label = (row, i) => "#" + i + " " + Math.round((i - 4) * STEP) + " ms" + (row.key ? " key '" + row.key + "'" : " k" + row.k + " f" + row.f);
  const sheets = [];
  const first = words[0];
  for (const k of [1, 2, 3]) {
    if (k >= first.length - 1) continue;
    const start = rows.findIndex((row) => row.w === 0 && row.k === k && row.f === 0) - 2;
    sheets.push(sheet(rows.slice(start, start + 12).map((row, j) => ({ file: row.file, label: label(row, start + j) })), join(dir, "sheet-f1-key" + (k + 1) + "-" + size + ".jpg"), clip, 6));
  }
  const endStart = rows.findIndex((row) => row.w === 0 && row.last && row.f === 0);
  sheets.push(sheet(rows.slice(endStart, endStart + 24).map((row, j) => ({ file: row.file, label: label(row, endStart + j) })), join(dir, "sheet-f3-word-" + size + ".jpg"), clip, 6));
  save(dir, "meta-f1-" + size + ".json", { words, view, rows: rows.map(({ file, ...row }) => ({ file: file.split("/").pop(), ...row })) });
  const share = keys.filter((key) => key.lineX >= 2 || key.shipX >= 2).length / Math.max(1, keys.length);
  const shareLine = +(keys.filter((key) => key.lineX >= 2).length / Math.max(1, keys.length)).toFixed(2);
  const shareShip = +(keys.filter((key) => key.shipX >= 2).length / Math.max(1, keys.length)).toFixed(2);
  return {
    ready, words, keys, share, shareLine, shareShip, betweenLine, betweenShip, sizes, coreMax, sheets,
    checks: {
      keyFrameChangesTwice: share >= 0.9,
      letterPops: sizes.every((s) => s.f0x >= 1.2 && s.f1x >= 1.1),
      letterStandsByF7: sizes.every((s) => Math.abs(s.f7 - s.stand) <= 1),
      coreFlash: coreMax.length >= 3 && Math.max(...coreMax) >= 0.95,
    },
  };
}

async function f2(page, dir) {
  const ready = await trial(page);
  const { word, slots } = await xungBay(page);
  await hold(page, true);
  const rows = [];
  for (let k = 0; k < 2; k += 1) {
    await press(page, word[k]);
    await advance(page, 150);
  }
  // A wrong key at letter 3 (one that is not the letter due).
  const wrong = "zqxjv".split("").find((c) => c !== word[2]);
  await press(page, wrong);
  for (let f = 0; f < 15; f += 1) rows.push(await frame(page, dir, "f2-bad-" + String(f).padStart(2, "0"), STEP, { key: f === 0 ? wrong : null, f }));
  // Let go (Backspace to 0), then a stray key no bay starts with.
  for (let k = 0; k < 2; k += 1) {
    await page.key("Backspace", { code: "Backspace" });
    await advance(page, 60);
  }
  await advance(page, 400);
  const firsts = slots.map((slot) => slot.text[0]);
  const stray = "zqxjvkwy".split("").find((c) => !firsts.includes(c));
  await press(page, stray);
  for (let f = 0; f < 10; f += 1) rows.push(await frame(page, dir, "f2-stray-" + String(f).padStart(2, "0"), STEP, { key: f === 0 ? stray : null, f }));
  await hold(page, false);
  const ui = page.height / 720;
  const size = page.width + "x" + page.height;
  const clip = { x: 200 * ui, y: 370 * ui, w: 880 * ui, h: 270 * ui };
  const sheets = [
    sheet(rows.slice(0, 15).map((row) => ({ file: row.file, label: "bad f" + row.f + " " + Math.round(row.f * STEP) + " ms" + (row.key ? " '" + row.key + "'" : "") })), join(dir, "sheet-f2-bad-" + size + ".jpg"), clip, 5, 520),
    sheet(rows.slice(15).map((row) => ({ file: row.file, label: "stray f" + row.f + " " + Math.round(row.f * STEP) + " ms" + (row.key ? " '" + row.key + "'" : "") })), join(dir, "sheet-f2-stray-" + size + ".jpg"), clip, 5, 520),
  ];
  save(dir, "meta-f2-" + size + ".json", rows.map(({ file, ...row }) => ({ file: file.split("/").pop(), ...row })));
  const bad = rows.slice(0, 15);
  const strayRows = rows.slice(15);
  const miss = bad.map((row) => row.letters[2]?.cls.includes("is-miss") === true);
  return {
    ready, word, wrong, stray, sheets, miss, glow: bad.map((row) => row.info.feel.glow), ghost: strayRows.map((row) => row.ghost), heads: strayRows.map((row) => row.heads),
    checks: {
      dueLetterMarked220: miss[0] && miss[13] && !miss[14],
      plateEdgeFlashes120: bad[0].strip.cls.includes("is-bad") && bad[7].strip.cls.includes("is-bad") && !bad[8].strip.cls.includes("is-bad"),
      coreDips: bad[0].info.feel.glow < bad[13].info.feel.glow,
      strayGhosts: !strayRows[0].strip.cls.includes("is-on") && Number(strayRows[0].ghost) > 0.4 && Number(strayRows[9].ghost) < Number(strayRows[0].ghost) / 2,
      firstLettersBounce: strayRows[0].heads.every((h) => /scale\(1\.1/.test(h)) && strayRows[0].heads.length >= 2,
    },
  };
}

async function f4(page, dir) {
  const ready = await trial(page);
  await hold(page, true);
  // Two Xung words while nothing is in reach: the bay holds 2 magazines (full); a third finds it full.
  for (let w = 0; w < 2; w += 1) {
    const { word } = await xungBay(page);
    for (const letter of word) {
      await press(page, letter);
      await advance(page, STEP);
    }
    await advance(page, 120);
  }
  const before = await page.eval(sv("return t.slots();"));
  const { word, bay } = await xungBay(page);
  for (let k = 0; k < word.length - 1; k += 1) {
    await press(page, word[k]);
    await advance(page, 100);
  }
  await press(page, word.at(-1));
  const rows = [];
  for (let f = 0; f < 20; f += 1) rows.push(await frame(page, dir, "f4-" + String(f).padStart(2, "0"), STEP, { f }));
  await hold(page, false);
  const ui = page.height / 720;
  const size = page.width + "x" + page.height;
  const sheets = [sheet(rows.map((row) => ({ file: row.file, label: "full f" + row.f + " " + Math.round(row.f * STEP) + " ms" })), join(dir, "sheet-f4-full-" + size + ".jpg"), { x: 200 * ui, y: 370 * ui, w: 880 * ui, h: 270 * ui }, 5, 520)];
  save(dir, "meta-f4-" + size + ".json", rows.map(({ file, ...row }) => ({ file: file.split("/").pop(), ...row })));
  const blink = rows.map((row) => row.bays[bay].cls.includes("is-overfull"));
  return {
    ready, word, magsBefore: before[bay].mags, blink, sheets,
    checks: {
      bayWasFull: before[bay].mags === 2,
      saysFull: /ĐẦY/.test(rows[5].strip.text),
      noLoadFlash: rows.every((row) => !row.bays[bay].cls.includes("is-charged")),
      ledsBlinkTwice: blink[0] && blink[7] && !blink[8] && !blink[14] && blink[15],
    },
  };
}

async function f9(page, dir) {
  const ready = await trial(page);
  const { word } = await xungBay(page);
  const ui = page.height / 720;
  const clip = { x: 380 * ui, y: 370 * ui, width: 520 * ui, height: 270 * ui, scale: 1 };
  const shots = [];
  const keys = [];
  let typing = true;
  const t0 = Date.now();
  const loop = (async () => {
    let n = 0;
    while (typing || Date.now() - t0 < 2600) {
      const at = Date.now() - t0;
      const file = join(dir, "f9-" + String(n++).padStart(3, "0") + ".jpg");
      await page.shot(file, { clip, format: "jpeg" });
      shots.push({ file, at });
      if (Date.now() - t0 > 2600) break;
    }
  })();
  // In the page, every real frame: each letter's transform on the line, and the keys' own times (screenshots
  // come only every 50–65 ms; this shows the DOM effects run frame by frame on the page's clock, §3.1).
  await page.eval(`(() => {
    const rec = (window.__feelRec = { frames: [], keys: [] });
    addEventListener('keydown', (e) => rec.keys.push({ t: performance.now(), key: e.key }), true);
    const start = performance.now();
    const loop = (now) => {
      rec.frames.push({ t: now, s: [...document.querySelectorAll('.sv-strip-word i')].map((n) => n.style.transform) });
      if (now - start < 3500) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return true;
  })()`);
  await page.sleep(200);
  for (const letter of word) {
    keys.push({ letter, at: Date.now() - t0 });
    await press(page, letter);
    await page.sleep(120);
  }
  typing = false;
  await loop;
  const rec = await page.eval("window.__feelRec");
  const scale = (text) => Number(/scale\(([\d.]+)\)/.exec(text ?? "")?.[1] ?? 1);
  // Per key: frames from the key to its letter's pop, the pop's peak, how long until it stands (scale 1), frames popping.
  // (The last key finishes the word: the whole word goes white-hot instead, F3.)
  const pops = rec.keys.slice(0, word.length - 1).map((key, i) => {
    const after = rec.frames.filter((f) => f.t >= key.t - 1);
    const first = after.findIndex((f) => scale(f.s[i]) > 1);
    if (first < 0) return { key: key.key, popped: false };
    const settle = after.findIndex((f, j) => j > first && scale(f.s[i]) === 1);
    return { key: key.key, popped: true, toPopMs: Math.round(after[first].t - key.t), peak: scale(after[first].s[i]), standsMs: settle < 0 ? null : Math.round(after[settle].t - after[first].t), frames: settle < 0 ? null : settle - first };
  });
  const gapsRaf = rec.frames.slice(1).map((f, i) => f.t - rec.frames[i].t);
  const gaps = shots.slice(1).map((s, i) => s.at - shots[i].at);
  const size = page.width + "x" + page.height;
  const labelled = shots.map((s) => {
    const key = [...keys].reverse().find((k) => k.at <= s.at);
    return { file: s.file, label: s.at + " ms" + (key ? " · '" + key.letter + "' +" + (s.at - key.at) : "") };
  });
  const sheets = [sheet(labelled.filter((_, i) => i % Math.max(1, Math.ceil(labelled.length / 36)) === 0).slice(0, 36), join(dir, "sheet-f9-realtime-" + size + ".jpg"), { x: 0, y: 0, w: 520 * ui, h: 270 * ui }, 6)];
  save(dir, "meta-f9-" + size + ".json", { keys, shots: shots.map((s) => ({ file: s.file.split("/").pop(), at: s.at })) });
  save(dir, "meta-f9-raf-" + size + ".json", { pops, frames: rec.frames.length, keys: rec.keys });
  return {
    ready, word, frames: shots.length, gapMedian: median(gaps), rafFrames: rec.frames.length, rafGapMedian: +median(gapsRaf).toFixed(1), pops, sheets,
    checks: {
      realtimeFrames: shots.length >= 20,
      // Real time, every frame: each letter pops ≥ 1.2× within 2 frames of its key and stands within 100–135 ms.
      realtimePops: pops.length === word.length - 1 && pops.every((p) => p.popped && p.peak >= 1.2 && p.toPopMs <= 34 && p.standsMs !== null && p.standsMs <= 135),
    },
  };
}

/** A chapter stage typed at 40 WPM on the held clock (the bay with fewer magazines first), sampled every 100 ms. */
async function fight(page, dir, stage, guns, seconds) {
  const ready = await openStage(page, stage, guns);
  await page.key("Shift", { code: "ShiftLeft" });
  await page.sleep(500);
  const size = page.width + "x" + page.height;
  const keyMs = 60000 / (40 * 5);
  const eye = await page.eval(sv("const r = t.rects()[0]; return { x: r.x + r.w / 2, y: r.y + r.h / 2, top: r.y };"));
  const washes = [];
  // Drowned foes to look for again 0.5 s on: alive then, the light hid a threat; gone, it was its own death.
  const later = [];
  const seen = new Set();
  const spawns = [];
  let overlaps = 0;
  let marks = 0;
  let markFrames = 0;
  let lineShown = 0;
  let samples = 0;
  const clean = [];
  const burst = [];
  let keyDue = 0;
  let nextClean = 4;
  let burstAt = stage === "c1-s4" ? 40 : 30;
  await hold(page, true);
  for (;;) {
    const look = await page.eval(sv("return { slots: t.slots(), state: t.state(), numbers: t.numbers(), mode: t.mode() };"));
    if (look === null || look.mode !== "play" || look.state.phase !== "play" || look.state.time > seconds) break;
    const time = look.state.time;
    samples += 1;
    for (const due of later.filter((d) => d.w.alive === undefined && time >= d.due)) {
      const ids = new Set(((await page.eval(sv("return t.foes ? t.foes() : [];"))) ?? []).map((f) => f[5]));
      due.w.alive = due.w.ids.filter((id) => ids.has(id)).length;
    }
    overlaps += look.numbers.overlaps;
    const alive = new Set();
    for (const box of look.numbers.boxes) {
      alive.add(box.i);
      if (!seen.has(box.i)) spawns.push(Math.hypot(box.x + box.w / 2 - eye.x, box.y + box.h / 2 - eye.y));
    }
    seen.clear();
    for (const i of alive) seen.add(i);
    const dom = await page.eval(sv("return { on: document.querySelector('.sv-strip').classList.contains('is-on'), marks: document.querySelectorAll('.sv-marks i.is-on').length };"));
    if (dom.on) lineShown += 1;
    if (dom.marks > 0) {
      marks = Math.max(marks, dom.marks);
      markFrames += 1;
    }
    if (time >= nextClean) {
      nextClean += 2;
      const file = join(dir, stage + "-" + size + "-clean-" + String(Math.round(time)).padStart(3, "0") + ".png");
      await page.eval("document.querySelector('.sv-hud').style.visibility = 'hidden'; true");
      await page.shot(file);
      await page.eval("document.querySelector('.sv-hud').style.visibility = ''; true");
      clean.push(file);
      const washed = wash(file, (await page.eval(sv("return t.foes ? t.foes() : [];"))) ?? [], page, eye.top);
      washes.push(washed);
      if (washed.ids.length > 0) later.push({ due: time + 0.5, w: washed });
    }
    if (time >= burstAt && burst.length < 30) {
      const file = join(dir, stage + "-" + size + "-burst-" + String(burst.length).padStart(2, "0") + ".png");
      await page.shot(file);
      burst.push({ file, label: stage + " " + time.toFixed(2) + " s" });
    }
    if (time * 1000 >= keyDue) {
      const locked = look.slots.find((slot) => slot.locked);
      const pick = locked ?? look.slots.reduce((a, b) => (b.mags < a.mags ? b : a));
      await press(page, locked ? locked.text[locked.typed] : pick.text[0]);
      keyDue = time * 1000 + keyMs;
    }
    await advance(page, burst.length > 0 && burst.length < 30 ? 40 : 100);
  }
  await hold(page, false);
  const final = await page.eval(sv("return t.state();"));
  const sorted = [...spawns].sort((a, b) => a - b);
  const ui = page.height / 720;
  const sheets = burst.length > 0 ? [sheet(burst, join(dir, "sheet-f8-" + stage + "-" + size + ".jpg"), { x: 0, y: 0, w: page.width, h: page.height }, 6, 420)] : [];
  const foeSamples = washes.reduce((n, w) => n + w.foes, 0);
  const drowned = washes.reduce((n, w) => n + w.drowned, 0);
  const hidden = washes.reduce((n, w) => n + (w.alive ?? w.drowned), 0);
  const near = washes.reduce((n, w) => n + w.near, 0);
  const nearDrowned = washes.reduce((n, w) => n + w.nearDrowned, 0);
  const field = washes.map((w) => w.field).sort((a, b) => a - b);
  const washed = { frames: washes.length, foeSamples, drowned, share: +(drowned / Math.max(1, foeSamples)).toFixed(3), hidden, hiddenShare: +(hidden / Math.max(1, foeSamples)).toFixed(3), near, nearShare: +(nearDrowned / Math.max(1, near)).toFixed(3), fieldBright: { p50: field[field.length >> 1] ?? 0, p95: field[Math.floor(field.length * 0.95)] ?? 0, max: field.at(-1) ?? 0 }, worst: [...washes].sort((a, b) => b.drowned - a.drowned).slice(0, 3).map((w) => ({ file: w.file, drowned: w.drowned, alive: w.alive ?? null, foes: w.foes })) };
  return {
    stage, guns, ready, time: final?.time, phase: final?.phase, hp: final?.hp, samples, overlaps, lineShown: +(lineShown / Math.max(1, samples)).toFixed(3), maxMarks: marks, markFrames, washed,
    eyeToHit: { n: sorted.length, median: Math.round(median(sorted)), median720: Math.round(median(sorted) / ui), within10deg1080: +(sorted.filter((d) => d / ui * 1.5 <= 10 * 37.9).length / Math.max(1, sorted.length)).toFixed(3) },
    at720: sorted.map((d) => d / ui), clean, sheets,
  };
}

/**
 * How much light covers the horde on one frame with the HUD hidden: each foe
 * (≤ 25 m, on screen, above the word line's top) is drowned when its body
 * (a disc of 0.6 body radius, ≥ 3 px) has a median ≥ 0.8 and the ring round
 * it (1–2 body radii) a mean ≥ 0.6: a cloud of light, not a hit's own white
 * flash on a dark deck. `near`: within 9 m. The field: the share of pixels
 * above the word line brighter than 0.9.
 */
function wash(file, foes, page, top) {
  const W = page.width;
  const H = page.height;
  const raw = execFileSync("magick", [file, "-resize", W + "x" + H + "!", "-grayscale", "Rec709Luma", "-depth", "8", "gray:-"], { maxBuffer: 1 << 27 });
  const at = (x, y) => raw[y * W + x] / 255;
  let bright = 0;
  let all = 0;
  for (let y = 0; y < Math.min(H, Math.floor(top)); y += 2) for (let x = 0; x < W; x += 2) {
    all += 1;
    if (at(x, y) > 0.9) bright += 1;
  }
  let n = 0;
  let drowned = 0;
  let near = 0;
  let nearDrowned = 0;
  const ids = [];
  for (const [cx, cy, rpx, z, , id] of foes) {
    if (z > 25 || cx < 4 || cy < 4 || cx >= W - 4 || cy >= top) continue;
    const r = Math.max(3, rpx);
    const inner = [];
    let ring = 0;
    let ringN = 0;
    const R = Math.ceil(2 * r);
    for (let y = Math.max(0, cy - R); y <= Math.min(H - 1, cy + R); y += 1) for (let x = Math.max(0, cx - R); x <= Math.min(W - 1, cx + R); x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= Math.max(3, 0.6 * r)) inner.push(at(x, y));
      else if (d >= r && d <= 2 * r) {
        ring += at(x, y);
        ringN += 1;
      }
    }
    inner.sort((a, b) => a - b);
    const wet = (inner[inner.length >> 1] ?? 0) >= 0.8 && ring / Math.max(1, ringN) >= 0.6;
    n += 1;
    if (wet) {
      drowned += 1;
      ids.push(id);
    }
    if (z <= 9) {
      near += 1;
      if (wet) nearDrowned += 1;
    }
  }
  return { file: file.split("/").pop(), foes: n, drowned, near, nearDrowned, ids, field: +(bright / Math.max(1, all)).toFixed(4) };
}

async function f8(page, dir) {
  const runs = [await fight(page, dir, "c1-s1", ["xung", "tia"], 70), await fight(page, dir, "c1-s4", ["phao", "xung"], 70)];
  // Contrast: the brightest 1 % behind the word line (at its widest) and behind each bay, on the frames with the HUD hidden.
  const view = await page.eval(sv("const rects = t.rects(); return rects;"));
  const line = { x: view[0].x + 6, y: view[0].y + 6, w: view[0].w - 12, h: view[0].h - 12 };
  const alpha = (sel) => `Number(getComputedStyle(${sel}).backgroundColor.match(/[\\d.]+/g)[3] ?? 1)`;
  const bays = await page.eval("[...document.querySelectorAll('.sv-slot')].map((n) => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, alpha: " + alpha("n") + " }; })");
  const lineAlpha = await page.eval(alpha("document.querySelector('.sv-strip')"));
  const files = runs.flatMap((run) => run.clean);
  const lineLuma = luma(files, line);
  const bayLuma = bays.map(({ alpha: _, ...bay }) => luma(files, bay));
  const contrast = {
    frames: files.length,
    line: { ...lineLuma, alpha: lineAlpha, at99: contrastOver(lineLuma.p99, lineAlpha) },
    bays: bayLuma.map((l, k) => ({ ...l, alpha: bays[k].alpha, at99: contrastOver(l.p99, bays[k].alpha, 0.022) })),
  };
  const size = page.width + "x" + page.height;
  save(dir, "f8-" + size + ".json", { runs: runs.map(({ at720, ...run }) => run), contrast });
  // The eye to each new number, both stages pooled (study C's 200 px is a median over every stage), and per stage.
  const all = runs.flatMap((run) => run.at720).sort((a, b) => a - b);
  const pooled = { n: all.length, median720: Math.round(median(all)), within10deg1080: +(all.filter((d) => d * 1.5 <= 10 * 37.9).length / Math.max(1, all.length)).toFixed(3) };
  return {
    runs: runs.map(({ clean, at720, ...run }) => ({ ...run, cleanFrames: clean.length })), contrast, pooled,
    checks: {
      foesNotDrowned: runs.every((run) => run.washed.hiddenShare <= 0.1),
      noNumberOnProtected: runs.every((run) => run.overlaps === 0),
      eyeToHitMedian210: pooled.median720 <= 210,
      contrastLine7: contrast.line.at99 >= 7,
      contrastBays7: contrast.bays.every((bay) => bay.at99 >= 7),
    },
  };
}

async function layout(page, dir) {
  const ready = await trial(page);
  await page.sleep(600);
  const read = await page.eval(sv(`
    const box = (n) => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom }; };
    // A third magazine LED in every bay (Rèn 3): nothing may overflow.
    for (const mags of document.querySelectorAll('.sv-slot .sv-mags')) if (mags.children.length < 3) mags.append(mags.children[0].cloneNode(true));
    const overflow = [...document.querySelectorAll('.sv-slot, .sv-slot *')].filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'hidden').map((n) => n.className);
    const strip = document.querySelector('.sv-strip');
    return { feel: t.info().feel, muzzles: t.info().muzzles, strip: box(strip), maxWidth: parseFloat(getComputedStyle(strip).maxWidth), bays: [...document.querySelectorAll('.sv-bottom > *')].map(box), overflow, ui: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) };`));
  const size = page.width + "x" + page.height;
  const shot = await page.shot(join(dir, "layout-" + size + ".png"));
  const L = read.feel.layout;
  const lineBottom = read.strip.b;
  const lineTop = read.strip.y;
  return {
    ready, read, shot,
    checks: {
      lineAboveStripes: lineBottom <= L.stripes - 4,
      lineUnderXungReach: lineTop - L.reach >= 70 * read.ui,
      // Every muzzle (centre, Xung's two, the core) below the plate: their flashes start in sight.
      muzzlesBelowLine: read.muzzles.every((m) => m[1] >= lineBottom + 20 * read.ui),
      baysUnderRedLine: read.bays.every((bay) => bay.y >= L.glow - 0.5),
      lineMaxWidth420: Math.abs(read.maxWidth - 420 * read.ui) <= 1,
      noOverflowWith3Leds: read.overflow.length === 0,
    },
  };
}

/** Each typing sound rendered offline; the 1–4 kHz band outside 30 ms after each attack, against the sound's loudest 10 ms. */
async function audio(page) {
  await open(page);
  const result = await page.eval(`(async () => {
    const synth = await import('/src/audio/synth.ts');
    const type = await import('/src/audio/type-audio.ts');
    const kit = await import('/src/kit/audio/index.ts');
    const rate = 48000;
    const fft = (re, im) => {
      const n = re.length;
      for (let i = 1, j = 0; i < n; i += 1) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
      for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k += 1) { const c = Math.cos(a * k), s = Math.sin(a * k); const xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s; const xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c; re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } }
    };
    const SOUNDS = {
      'key.ok': { play: (v) => type.keyOk(v, 4, 0, false), attacks: [0] },
      'key.ok (octave)': { play: (v) => type.keyOk(v, 9, 3, true), attacks: [0] },
      'key.bad': { play: (v) => type.keyBad(v, 3, false), attacks: [0] },
      'key.bad (stray)': { play: (v) => type.keyBad(v, 0, true), attacks: [0] },
      'word.load': { play: (v) => type.wordLoad(v, 6, false), attacks: [0, 0.09] },
      'word.perfect': { play: (v) => type.wordLoad(v, 6, true), attacks: [0, 0.09] },
      'word.full': { play: (v) => type.wordFull(v), attacks: [0] },
      'streak.up': { play: (v) => type.streakUp(v), attacks: [0, 0.06] },
    };
    const out = {};
    for (const [id, spec] of Object.entries(SOUNDS)) {
      const ctx = new OfflineAudioContext(1, Math.round(rate * 0.8), rate);
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
        const centre = (start + N / 2) / rate - 0.02;
        frames.push({ t: centre, all, band });
        peak = Math.max(peak, all);
      }
      let worst = -200, worstAt = 0;
      for (const f of frames) {
        if (spec.attacks.some((a) => f.t >= a - 0.012 && f.t <= a + 0.03)) continue;
        const db = 10 * Math.log10(Math.max(1e-20, f.band) / Math.max(1e-20, peak));
        if (db > worst) { worst = db; worstAt = f.t; }
      }
      let max = 0; for (const x of data) max = Math.max(max, Math.abs(x));
      out[id] = { worstBandDb: Math.round(worst * 10) / 10, at: Math.round(worstAt * 1000), peakAmp: Math.round(max * 1000) / 1000 };
    }
    return out;
  })()`);
  return { sounds: result, checks: { speechBandClear: result && !result.evalError && Object.values(result).every((s) => s.worstBandDb <= -20) } };
}

/**
 * Near foes behind the word line (§2.4): mines placed by logged commands in
 * front of the ship (no gun loaded, so none is shot), a bay's word locked,
 * 36 frames on the held clock. Grades: no tick before the lock; ticks while
 * the line shows, at most 6, blinking at 4 Hz (frames with and without);
 * each tick inside the plate's span; none for the control mines (far, or
 * wide of the plate).
 */
async function marks(page, dir) {
  const ready = await openStage(page, "c1-s1", ["ray", "xung"], "&director=0");
  await page.key("Shift", { code: "ShiftLeft" });
  await hold(page, true);
  // Seven mines across the ship's front at 4.5–6 m, a far one (12 m) and two wide ones (x ±6 m).
  const list = [[-1.2, 5], [-0.6, 4.5], [0, 5.5], [0.6, 4.5], [1.2, 5], [-0.3, 6], [0.3, 6], [0, 12], [-6, 5], [6, 5]];
  for (const [x, z] of list) await page.eval(sv("t.place(0, " + x + ", " + z + "); return true;"));
  await advance(page, 50);
  const before = await page.eval(READ);
  const { word } = await xungBay(page);
  await press(page, word[0]);
  const rows = [];
  for (let f = 0; f < 36; f += 1) rows.push(await frame(page, dir, "marks-" + String(f).padStart(2, "0"), STEP, { f }));
  const ticks = await page.eval("[...document.querySelectorAll('.sv-marks i.is-on')].map((n) => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; })");
  await hold(page, false);
  const ui = page.height / 720;
  const size = page.width + "x" + page.height;
  const sheets = [sheet(rows.filter((_, i) => i % 2 === 0).map((row) => ({ file: row.file, label: "marks f" + row.f + " " + Math.round((row.f + 1) * STEP) + " ms · " + row.marks + " ticks" })), join(dir, "sheet-marks-" + size + ".jpg"), { x: 360 * ui, y: 300 * ui, w: 560 * ui, h: 240 * ui }, 6, 420)];
  save(dir, "meta-marks-" + size + ".json", rows.map(({ file, ...row }) => ({ file: file.split("/").pop(), ...row })));
  const counts = rows.map((row) => row.marks);
  const plate = rows.at(-1).strip.box;
  return {
    ready, word, before: before.marks, counts, ticks, plate, sheets,
    checks: {
      noneBeforeLock: before.marks === 0,
      ticksWhileTyping: Math.max(...counts) >= 1 && Math.max(...counts) <= 6,
      ticksBlink: counts.some((n) => n === 0) && counts.some((n) => n > 0),
      ticksUnderPlate: ticks.every((t) => t.x + t.w / 2 >= plate.x - 1 && t.x + t.w / 2 <= plate.x + plate.w + 1),
    },
  };
}

/** 10 keys a second (120 WPM) on the held clock: live shards and floor rings at most 8 and 2 (§3.1), every frame. */
async function rate(page) {
  const ready = await trial(page);
  await hold(page, true);
  let maxShards = 0;
  let frames = 0;
  let typed = 0;
  for (let w = 0; w < 4; w += 1) {
    const slots = await page.eval(sv("return t.slots();"));
    const pick = slots.reduce((a, b) => (b.mags < a.mags ? b : a));
    for (const letter of pick.text) {
      await press(page, letter);
      typed += 1;
      for (let f = 0; f < 6; f += 1) {
        await advance(page, 100 / 6);
        const feel = (await page.eval(sv("return t.info().feel;")));
        maxShards = Math.max(maxShards, feel.shards);
        frames += 1;
      }
    }
  }
  await hold(page, false);
  return { ready, typed, frames, maxShards, checks: { shardsAtMost8: maxShards <= 8 && maxShards > 0 } };
}

const SCENES = { f1, f2, f4, f9, f8, layout, marks, audio, rate };

export default async function (page) {
  const size = page.width + "x" + page.height;
  const dir = join(OUT_DIR, size);
  mkdirSync(dir, { recursive: true });
  const only = (process.env.SCENES ?? "f1,f2,f4,f9,layout").split(",");
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
