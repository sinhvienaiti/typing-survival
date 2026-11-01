// AL-00's scenes for survival-alive.mjs (docs/ALIVE_PLAN.md AL-00 step 6): the
// baseline the audits of 01/11 measured by hand, so every later package reads
// its gain on the same scales. idle: the title and Options at rest (G1), the
// world's sides at rest in a stage 1 fight (G3); flow: the play path from the
// title to a fight, a loss, Retry and Main menu, counting page loads and hard
// cuts (G2); events: frames from a key or a finished word to the first change
// on screen and the sounds started for it (G4), once by hand and over a bot's
// run of keys.
import { REGIONS, SIDES, STEP, advance, botKey, frames, hud, idleMotion, key, open, random, read, regionDiff, reloaded, settle, shot, transition } from "./lib.mjs";

const round = (v, k = 100) => Math.round(v * k) / k;
const median = (list) => {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const quantile = (list, q) => {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : null;
};
const STAGE_1 = "seed=3&autostart=1&stage=c1-s1&guns=xung,tia";

/**
 * A transition: a frame, the key, then up to `count` frames a 60 Hz step apart
 * on the held clock. A key that loads a new page ends the frames (the page
 * answers nothing between documents); the new page is waited for and held.
 */
async function across(page, dir, name, k, count = 12) {
  const files = [await shot(page, dir, name + "-000")];
  await key(page, k);
  for (let f = 1; f <= count; f += 1) {
    try {
      if (await reloaded(page)) break;
      await advance(page, STEP);
      files.push(await shot(page, dir, name + "-" + String(f).padStart(3, "0")));
    } catch {
      break;
    }
  }
  await page.sleep(300);
  const after = await settle(page);
  if (!after) throw new Error("alive: no page after " + name + ": " + JSON.stringify(await page.eval("(() => ({ href: location.href, handle: !!window.__survival, models: window.__survival?.models?.(), mode: window.__survival?.mode?.(), state: document.readyState, visible: document.visibilityState, frames: window.__survival?.costs?.().update.length, keyboard: window.__survival?.keyboard?.().ready, now: performance.now() }))()").catch((e) => String(e))));
  const t = transition(files);
  return { files, fresh: after.fresh, ...t, cut: after.fresh || t.cut };
}

/** Runs the held clock until `code` (a __survival expression) holds, in `chunk` ms steps, at most `ms`. */
async function until(page, code, ms, chunk = 1000) {
  for (let t = 0; t < ms; t += chunk) {
    if ((await read(page, "return " + code + ";")) === true) return true;
    await advance(page, chunk);
  }
  return (await read(page, "return " + code + ";")) === true;
}

/** A fight lost on purpose: the field flooded, the clock run until the results card shows. */
async function lose(page) {
  await read(page, "t.flood(400); return true;");
  return until(page, 't.screen() === "end"', 180000, 2000);
}

export const SCENES = [
  {
    id: "title-idle",
    mode: "idle",
    note: "G1: the title at rest, 23 frames over 1.47 s (audit: 0 of 22 pairs moved)",
    async run(page, { dir }) {
      await open(page, "seed=1");
      const files = await frames(page, dir, "title", 23, 1000 / 15);
      return { title: idleMotion(files), sheet: files.filter((_, k) => k % 4 === 0).map((file, k) => ({ file, label: "title " + k * 267 + " ms" })) };
    },
  },
  {
    id: "options-idle",
    mode: "idle",
    note: "G1: Options at rest (title → Options)",
    async run(page, { dir }) {
      await open(page, "seed=1");
      for (const k of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "Enter"]) await key(page, k);
      const screen = await read(page, "return t.screen();");
      const files = await frames(page, dir, "options", 23, 1000 / 15);
      return { screen, options: idleMotion(files), sheet: [{ file: files[0], label: "options 0 ms" }, { file: files.at(-1), label: "options 1.47 s" }] };
    },
  },
  {
    id: "world-idle",
    mode: "idle",
    note: "G3: stage 1 fighting, nobody typing: mean |frame(t) − frame(t + 1 s)| per region in four windows from 2.2 s after the stage card (audit: one window at about 2.2 s, JPEG frames: sides 1.4–4.2 grey/s at 720p, 1.0–4.1 at 1080p, deck 0.07–0.11)",
    async run(page, { dir }) {
      // As the audit: in through the stage card, the first window 2.2 s after the key that leaves it.
      await open(page, STAGE_1 + "&card=1");
      await key(page, "a");
      await advance(page, 2200);
      const windows = [];
      const sheet = [];
      for (let w = 0; w < 4; w += 1) {
        const at = 2.2 + w * 1.5;
        const a = await shot(page, dir, "world-" + at + "-a");
        await advance(page, 250);
        const q = await shot(page, dir, "world-" + at + "-q");
        await advance(page, 750);
        const b = await shot(page, dir, "world-" + at + "-b");
        windows.push({ at, regions: Object.fromEntries(Object.entries(REGIONS).map(([name, rect]) => [name, { d025: round(regionDiff(a, q, rect, page.width)), d1: round(regionDiff(a, b, rect, page.width)) }])) });
        if (w === 0) sheet.push({ file: a, label: "fight +2.2 s" }, { file: b, label: "+3.2 s" });
        await advance(page, 500);
      }
      const regions = Object.fromEntries(Object.keys(REGIONS).map((name) => {
        const d1 = windows.map((w) => w.regions[name].d1);
        return [name, { d1: round(median(d1)), min: Math.min(...d1), max: Math.max(...d1), d025: round(median(windows.map((w) => w.regions[name].d025))) }];
      }));
      const sides = SIDES.map((name) => regions[name].d1);
      return { regions, windows, sides: { min: Math.min(...sides), max: Math.max(...sides), pass: Math.min(...sides) >= 3 }, sheet };
    },
  },
  {
    id: "play-path",
    mode: "flow",
    note: "G2: title → Campaign → briefing → loadout → START → card → fight → pause → a loss → Retry → a loss → Main menu (audit: 3 page loads, every change 1 frame)",
    async run(page, { dir }) {
      await open(page, "seed=1");
      const steps = [];
      const sheet = [];
      const step = async (name, k, count) => {
        const t = await across(page, dir, name, k, count);
        const screen = await read(page, "return t.screen() + ':' + t.mode() + (t.journey().screen ? ':' + t.journey().screen : '');");
        steps.push({ name, key: k, reload: t.fresh, frames: t.files.length - 1, changing: t.changing, largest: t.largest, cut: t.cut, screen });
        if (t.files.length > 1) sheet.push({ file: t.files[0], label: name + " f0" }, { file: t.files[1], label: name + " f1" });
        return t;
      };
      let error = null;
      try {
        await step("campaign", "Enter");
        await step("briefing", "Enter");
        await step("loadout", "Enter");
        await step("start", "Enter");
        await step("card-to-fight", "a");
        await step("pause", "Escape");
        await step("resume", "Escape", 4);
        if (!(await lose(page))) throw new Error("alive: the first loss never came");
        sheet.push({ file: await shot(page, dir, "results-1"), label: "results (lost)" });
        await step("retry", "Enter");
        await step("card-to-fight-2", "a", 4);
        if (!(await lose(page))) throw new Error("alive: the second loss never came");
        await key(page, "ArrowDown");
        await key(page, "ArrowDown");
        await step("main-menu", "Enter");
      } catch (e) {
        error = String(e?.message ?? e);
      }
      const loads = steps.filter((s) => s.reload).length;
      const cuts = steps.filter((s) => s.cut).length;
      return { ...(error ? { error } : {}), loads, cuts, of: steps.length, end: steps.at(-1)?.screen, steps, sheet };
    },
  },
  {
    id: "keys",
    mode: "events",
    note: "G4: frames from a right key, a wrong key and a finished word to the first visible change where it shows, and the sounds it started",
    async run(page, { dir }) {
      await open(page, STAGE_1);
      await advance(page, 1500);
      const strip = async () => read(page, "const r = t.typefx().rect; return [r.x - 40, r.y - 40, r.w + 80, r.h + 80];");
      const bay = (n) => read(page, "const r = document.querySelector('.sv-slot[data-bay=\"" + n + "\"]').getBoundingClientRect(); return [r.left - 30, r.top - 60, r.width + 60, r.height + 70];");
      const sounds = () => read(page, "const s = t.sounds(); return { ...s.played, ...Object.fromEntries(Object.entries(s.cued ?? {}).map(([k, v]) => ['cue:' + k, v])) };");
      const scaled = (r) => r.map((v) => (v * 1280) / page.width);
      /** Frames until `rect` changes ≥ 1 grey level after `act` (at most 6), and the sound ids that started meanwhile. */
      const respond = async (name, act, rect) => {
        const before = await shot(page, dir, name + "-b");
        const heard = await sounds();
        await act();
        for (let f = 1; f <= 6; f += 1) {
          await advance(page, STEP);
          const now = await shot(page, dir, name + "-f" + f);
          const delta = regionDiff(before, now, scaled(rect), page.width);
          if (delta >= 1) {
            const after = await sounds();
            return { frames: f, delta: round(delta), started: Object.keys(after).filter((id) => (after[id] ?? 0) > (heard[id] ?? 0)), file: now, before };
          }
        }
        return { frames: null, delta: 0, started: [] };
      };
      const slots = await read(page, "return t.slots();");
      const word = slots[0].text;
      const rect = await strip();
      const right = await respond("key-right", () => key(page, word[0]), rect);
      let wrongLetter = "q";
      for (const c of "qzxjvk") if (c !== word[1]) { wrongLetter = c; break; }
      const wrong = await respond("key-wrong", () => key(page, wrongLetter), rect);
      for (const c of word.slice(1, -1)) { await key(page, c); await advance(page, STEP * 3); }
      const done = await respond("word-done", () => key(page, word.at(-1)), await bay(1));
      return {
        rightKey: { frames: right.frames, delta: right.delta, started: right.started },
        wrongKey: { frames: wrong.frames, delta: wrong.delta, started: wrong.started },
        wordDone: { frames: done.frames, delta: done.delta, started: done.started },
        pass: [right, wrong, done].every((r) => r.frames === 1),
        sheet: [right, wrong, done].flatMap((r, k) => (r.file ? [{ file: r.before, label: ["right key", "wrong key", "word done"][k] + " before" }, { file: r.file, label: "+" + r.frames + " f" }] : [])),
      };
    },
  },
  {
    id: "typing-run",
    mode: "events",
    note: "G4 over a run: the audits' bot reads the bays as shown and types 48 keys at 6 a second (4 % slips) on the held clock, waiting while both bays are full; for each key, frames to the first change ≥ 1 grey round the word line and the sounds started",
    async run(page, { dir }) {
      await open(page, STAGE_1);
      await advance(page, 1500);
      const rand = random(7);
      const rect = (await read(page, "const r = t.typefx().rect; return [r.x - 40, r.y - 40, r.w + 80, r.h + 80];")).map((v) => (v * 1280) / page.width);
      const counts = () => read(page, "const s = t.sounds(); return { ...s.played, ...Object.fromEntries(Object.entries(s.cued ?? {}).map(([k, v]) => ['cue:' + k, v])) };");
      const keys = [];
      const sheet = [];
      for (let n = 0, idle = 0; keys.length < 48 && idle < 200; n += 1) {
        const pick = botKey(await hud(page), rand);
        if (!pick) {
          idle += 1;
          await advance(page, 100);
          continue;
        }
        const before = await shot(page, dir, "run-" + keys.length + "-b");
        const heard = await counts();
        await key(page, pick.key);
        let frames = null;
        let file = null;
        for (let f = 1; f <= 4 && frames === null; f += 1) {
          await advance(page, STEP);
          file = await shot(page, dir, "run-" + keys.length + "-f" + f);
          if (regionDiff(before, file, rect, page.width) >= 1) frames = f;
        }
        const after = await counts();
        keys.push({ key: pick.key, slip: pick.slip, frames, sounds: Object.keys(after).filter((id) => (after[id] ?? 0) > (heard[id] ?? 0)) });
        if (keys.length % 12 === 1) sheet.push({ file: before, label: "key " + keys.length + " before" }, { file, label: "+" + (frames ?? "none") + " f" });
        await advance(page, 1000 / 6 - STEP * Math.min(4, frames ?? 4));
      }
      const shown = keys.map((k) => k.frames ?? 99);
      const silent = keys.filter((k) => k.sounds.length === 0).length;
      return {
        keys: keys.length,
        slips: keys.filter((k) => k.slip).length,
        framesP50: quantile(shown, 0.5),
        framesP95: quantile(shown, 0.95),
        unseen: keys.filter((k) => k.frames === null).length,
        silent,
        pass: keys.length >= 40 && quantile(shown, 0.95) <= 1,
        list: keys,
        sheet,
      };
    },
  },
];
