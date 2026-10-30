// Last Line's word line as the kit's focus strip, and the quick panels
// (parent docs/games/TYPING_FEEDBACK_REVIEW.md §20 item 5, IN_GAME_SETTINGS.md):
// frames on the page's held clock (__survival.hold/advance), each with the
// DOM boxes (the strip's plate and widest box, the streak LED, the rift's
// countdown, the bays, the top panels, the notice, the quick buttons) and
// the overlaps between them.
//   key       the trial (?seed=1): the second key of a Pulse Gun word, f0 and f2;
//   wrong     a wrong key at its third letter (the typed letter bounces off): f0, f3, f8;
//   done      the rest of the word, then its release: f0, f3, f9, f20;
//   combo     nine more clean words, then the tenth (the "10 COMBO" milestone): f0, f4, f12;
//   settings  F1 over the fight (the preview types on its own clock); the panel's box and scroll;
//   sound     F2 (switches panels);
//   freeze    a letter under the open panel types nothing and the world stands; Esc counts
//             3-2-1 (a picture), then the fight runs and the word is as it was;
//   pause     Esc with a word locked: the pause menu covers the word line;
//   keys      the game starts on its default Firefly set (Bright Clack), which never plays key.ok,
//             so "Relay" is chosen in the Sound panel first; then Relay's key sound plays (key.ok
//             counted); "Off" silences it and is saved; "Relay" brings it back;
//   title     the title screen with the two buttons;
//   rift      stage 3 at its first rift's warning with a word locked: the countdown beside the strip.
//   URL=http://127.0.0.1:4193/ OUT_DIR=tmp/typefx/raw-1280 SCENES=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-typefx.mjs --width=1280 --height=720
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEV_URL, OUT_DIR } from "./common.mjs";
import { open, press, sv } from "./survival-s0-lib.mjs";
import { openStage } from "./survival-s1-lib.mjs";

const STEP = 1000 / 60;
const SCENES = (process.env.SCENES ?? "key,wrong,done,combo,settings,sound,freeze,pause,keys,title,rift").split(",");
const want = (name) => SCENES.includes(name);

const hold = (page, on) => page.eval(sv("t.hold(" + on + "); return true;"));
const advance = (page, ms) => page.eval(sv("t.advance(" + ms + "); return true;"));
const slots = (page) => page.eval(sv("return t.slots();"));

const BOXES = sv(`
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; };
  const shown = (n) => n !== null && getComputedStyle(n).visibility !== 'hidden' && getComputedStyle(n).display !== 'none' && Number(getComputedStyle(n).opacity) > 0.01;
  const fx = t.typefx();
  const led = document.querySelector('.sv-streak');
  const rift = document.querySelector('.sv-strip-warn');
  const notice = document.querySelector('.sv-notice');
  const plate = document.querySelector('.tfx-plate');
  const badge = document.querySelector('.tfx-badge');
  return {
    tick: t.state().tick, mode: t.mode(), screen: t.screen(), quick: t.quick(), feel: t.info().feel.streak,
    fx: { word: fx.word, typed: fx.typed, rect: fx.rect, widest: fx.widest, font: fx.font, stats: fx.stats, settings: fx.settings, flying: fx.readout.flying, particles: fx.readout.particles },
    plate: shown(plate) ? box(plate) : null,
    led: shown(led) ? box(led) : null, ledText: led.textContent,
    rift: shown(rift) ? box(rift) : null, riftText: rift.textContent,
    bays: [...document.querySelectorAll('.sv-slot, .sv-bay-lock')].map(box).filter(Boolean),
    top: [...document.querySelectorAll('.sv-top .sv-panel')].filter(shown).map(box).filter(Boolean),
    notice: notice.hidden ? null : box(notice),
    bar: box(document.querySelector('.kit-qs__bar')),
    corners: [...document.querySelectorAll('.kit-qs__corner')].map((n) => ({ text: n.textContent, box: box(n) })),
    oldPlate: getComputedStyle(document.querySelector('.sv-strip')).display,
    badge: shown(badge) ? badge.textContent : '',
  };`);

const hit = (a, b) => a !== null && b !== null && a !== undefined && b !== undefined && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Boxes that must not meet. */
function overlaps(s) {
  const list = [];
  const pairs = [["plate", s.plate], ["led", s.led], ["rift", s.rift], ["notice", s.notice], ["bar", s.bar]];
  for (let i = 0; i < pairs.length; i += 1) {
    for (let j = i + 1; j < pairs.length; j += 1) if (hit(pairs[i][1], pairs[j][1])) list.push(pairs[i][0] + "×" + pairs[j][0]);
    for (const b of s.bays) if (hit(pairs[i][1], b)) list.push(pairs[i][0] + "×bay");
    for (const b of s.top) if (hit(pairs[i][1], b)) list.push(pairs[i][0] + "×top");
  }
  return [...new Set(list)];
}

export default async function (page) {
  mkdirSync(OUT_DIR, { recursive: true });
  const frames = [];
  const checks = {};
  const shot = async (name, ms = 0, extra = {}) => {
    if (ms > 0) await advance(page, ms);
    const file = join(OUT_DIR, name + ".png");
    await page.shot(file);
    const state = await page.eval(BOXES);
    const row = { name, file, overlaps: state && !state.evalError ? overlaps(state) : ["no state"], ...extra, ...state };
    frames.push(row);
    return row;
  };

  if (["key", "wrong", "done", "combo", "settings", "sound", "freeze", "pause"].some(want)) {
    checks.ready = await open(page);
    // A key the sim ignores starts the audio (as on the title screen), then the clock is held.
    await page.key("Shift", { code: "ShiftLeft" });
    await page.sleep(600);
    await hold(page, true);
    await advance(page, 10 * STEP);
    const bays = await slots(page);
    const bay = Math.max(0, bays.findIndex((slot) => slot.gun === "xung"));
    const word = bays[bay].text;
    checks.word = word;
    await press(page, word[0]);
    await advance(page, 3 * STEP);
    await press(page, word[1]);
    const key0 = await shot("key-f0", STEP);
    await shot("key-f2", 2 * STEP);
    checks.key = { shown: key0.fx.word >= 0 && key0.fx.typed === 2, oldPlateHidden: key0.oldPlate === "none" };

    const wrong = word[2] === "q" ? "z" : "q";
    await press(page, wrong);
    const w0 = await shot("wrong-f0", STEP, { key: wrong });
    await shot("wrong-f3", 3 * STEP);
    await shot("wrong-f8", 5 * STEP);
    checks.wrong = { counted: w0.fx.stats.wrongs >= 1, typedStays: w0.fx.typed === 2 };

    for (let i = 2; i < word.length - 1; i += 1) {
      await press(page, word[i]);
      await advance(page, 4 * STEP);
    }
    await press(page, word[word.length - 1]);
    const d0 = await shot("done-f0", STEP);
    await shot("done-f3", 3 * STEP);
    const d9 = await shot("done-f9", 6 * STEP);
    await shot("done-f20", 11 * STEP);
    checks.done = { words: d0.fx.stats.words, flying: d9.fx.flying };

    if (want("combo")) {
      // Nine clean words (fast keys: perfect), then the tenth: the streak's milestone.
      let streak = 0;
      for (let n = 0; n < 40 && streak < 9; n += 1) {
        const now = await slots(page);
        const pick = now.reduce((a, b) => (b.mags < a.mags ? b : a));
        for (const letter of pick.text) {
          await press(page, letter);
          await advance(page, 2 * STEP);
        }
        await advance(page, 6 * STEP);
        streak = (await page.eval(sv("return t.info().feel.streak;"))) ?? 0;
      }
      const now = await slots(page);
      const pick = now.reduce((a, b) => (b.mags < a.mags ? b : a));
      for (const letter of pick.text.slice(0, -1)) {
        await press(page, letter);
        await advance(page, 2 * STEP);
      }
      await press(page, pick.text[pick.text.length - 1]);
      const c0 = await shot("combo-f0", STEP, { streakBefore: streak });
      const c4 = await shot("combo-f4", 4 * STEP);
      await shot("combo-f12", 8 * STEP);
      checks.combo = { streak: c0.feel, badge: c4.badge };
    }

    if (want("settings") || want("sound") || want("freeze") || want("pause")) {
      // A word locked under the panels: typing must not move it.
      const now = await slots(page);
      const pick = now.reduce((a, b) => (b.mags < a.mags ? b : a));
      await press(page, pick.text[0]);
      await press(page, pick.text[1]);
      await advance(page, 4 * STEP);
      const before = await slots(page);
      await page.key("F1", { code: "F1" });
      // The preview types on its own clock: the picture when its word is half typed.
      const LIVE = "(() => { const b = document.querySelector('.sv-tfx-preview'); return !!b && b.querySelectorAll('.tfx-layer.is-on .tfx-g.is-typed').length >= 2 && getComputedStyle(b.querySelector('.tfx-plate')).opacity === '1'; })()";
      for (let wait = 0; wait < 60 && (await page.eval(LIVE)) !== true; wait += 1) await page.sleep(30);
      const settings = await shot("settings");
      const panel = await page.eval("(() => { const p = document.querySelector('.kit-qs__dialog[data-panel=settings] .kit-qs__panel'); const r = p.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), scroll: p.scrollHeight - p.clientHeight, preview: !!document.querySelector('.sv-tfx-preview .tfx-layer.is-on') }; })()");
      checks.settings = { open: settings.quick.panel === "settings", frozen: settings.quick.frozen, panel };
      await page.key("F2", { code: "F2" });
      await page.sleep(300);
      const sound = await shot("sound");
      const soundPanel = await page.eval("(() => { const p = document.querySelector('.kit-qs__dialog[data-panel=sound] .kit-qs__panel'); const r = p.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), scroll: p.scrollHeight - p.clientHeight, keyboard: [...document.querySelectorAll('[data-row=keyboard] .kit-keyboards__list .kit-keyboards__family, [data-row=keyboard] .kit-keyboards__option')].map((o) => o.classList.contains('kit-keyboards__family') ? '[' + o.textContent + ']' : o.textContent + (o.disabled ? ' (disabled)' : '') + (o.getAttribute('aria-selected') === 'true' ? ' (checked)' : '')) }; })()");
      checks.sound = { open: sound.quick.panel === "sound", panel: soundPanel };
      // Freeze: a letter (the locked word's next) under the open panel, ten frames.
      const tick = sound.tick;
      await press(page, before.find((slot) => slot.locked)?.text[2] ?? "a");
      await advance(page, 10 * STEP);
      const held = await page.eval(sv("return { tick: t.state().tick, slots: t.slots() };"));
      await page.key("Escape", { code: "Escape" });
      await page.sleep(150);
      const count = await shot("countdown");
      await page.sleep(1700);
      const after = await page.eval(sv("return t.quick();"));
      await advance(page, 3 * STEP);
      const resumed = await page.eval(sv("return { tick: t.state().tick, slots: t.slots() };"));
      checks.freeze = {
        worldStood: held.tick === tick,
        letterDropped: JSON.stringify(held.slots) === JSON.stringify(before),
        countdown: count.quick.blocking && count.quick.panel === null,
        resumed: after.blocking === false && after.frozen === false && resumed.tick > held.tick,
        wordKept: JSON.stringify(resumed.slots.map((s) => [s.text, s.typed, s.locked])) === JSON.stringify(before.map((s) => [s.text, s.typed, s.locked])),
      };
      // The pause menu over a locked word: the menu covers the word line.
      await page.key("Escape", { code: "Escape" });
      await advance(page, 2 * STEP);
      const paused = await shot("pause");
      const menu = await page.eval("(() => { const o = document.querySelector('.sv-overlay'); const p = document.querySelector('.sv-tfx'); return { overlay: getComputedStyle(o).display, overlayAbove: o.compareDocumentPosition(p) === Node.DOCUMENT_POSITION_PRECEDING && getComputedStyle(p).zIndex === '0' }; })()");
      checks.pause = { mode: paused.mode, screen: paused.screen, wordShown: paused.fx.word >= 0, ...menu };
      await page.key("Escape", { code: "Escape" });
      await advance(page, 2 * STEP);
    }

    if (want("keys")) {
      const played = () => page.eval(sv("return t.sounds().played['key.ok'] ?? 0;"));
      const typeNext = async () => {
        const look = await slots(page);
        const locked = look.find((slot) => slot.locked);
        const pick = look.reduce((a, b) => (b.mags < a.mags ? b : a));
        await press(page, locked ? locked.text[locked.typed] : pick.text[0]);
        await advance(page, 2 * STEP);
      };
      const choose = async (value) => {
        await page.key("F2", { code: "F2" });
        await page.sleep(100);
        await page.eval("document.querySelector('.kit-qs__dialog[data-panel=sound] [data-row=keyboard] .kit-keyboards__option[data-value=" + value + "]').click()");
        await page.key("Escape", { code: "Escape" });
        // The 3-2-1, and the choice's own sample (four keys, 270 ms).
        await page.sleep(1800);
      };
      // The default is a Firefly set (no key.ok): count from Relay.
      await choose("relay");
      const n0 = await played();
      await typeNext();
      const n1 = await played();
      await choose("off");
      await typeNext();
      const n2 = await played();
      const saved = await page.eval("JSON.parse(localStorage.getItem('survival.settings') ?? '{}').typingFx ?? null");
      await choose("relay");
      const n3 = await played();
      await typeNext();
      const n4 = await played();
      checks.keys = { relayPlays: n1 > n0, offSilent: n2 === n1, offSaved: saved?.soundProfile === "off", relayBack: n4 > n3, counts: [n0, n1, n2, n3, n4] };
    }
    await hold(page, false);
  }

  if (want("title")) {
    const base = DEV_URL.replace(/\/$/, "");
    await page.goto(base + "/index.html?seed=1", { settle: 300 });
    for (let wait = 0; wait < 120 && (await page.eval(sv("return t.ready();"))) !== true; wait += 1) await page.sleep(250);
    await page.sleep(800);
    const title = await shot("title");
    checks.title = { corners: title.corners.map((c) => c.text) };
  }

  if (want("rift")) {
    checks.riftReady = await openStage(page, "c1-s3", ["xung", "tan"], "&director=0");
    await page.key("Shift", { code: "ShiftLeft" });
    await page.sleep(300);
    await hold(page, true);
    // Typed at ~4 keys a game second (the line holds) until the first rift warns.
    let state = await page.eval(sv("return t.state();"));
    for (let n = 0; n < 2000 && state.rifts.state !== 1 && state.time < (state.rifts.at[0] ?? 0) + 5; n += 1) {
      const look = await slots(page);
      const locked = look.find((slot) => slot.locked);
      const pick = look.reduce((a, b) => (b.mags < a.mags ? b : a));
      await press(page, locked ? locked.text[locked.typed] : pick.text[0]);
      await advance(page, 250);
      state = await page.eval(sv("return t.state();"));
    }
    const look = await slots(page);
    const locked = look.find((slot) => slot.locked);
    if (locked === undefined) {
      const pick = look.reduce((a, b) => (b.mags < a.mags ? b : a));
      await press(page, pick.text[0]);
    }
    const rift = await shot("rift", 2 * STEP);
    checks.rift = { warned: state.rifts.state === 1, text: rift.riftText, box: rift.rift, plate: rift.plate, overlaps: rift.overlaps };
    await hold(page, false);
  }

  const summary = { size: page.width + "x" + page.height, checks, frames: frames.map(({ name, file, overlaps, fx, plate, led, rift, bar, top, bays, notice, badge, quick, ledText, key }) => ({ name, file, overlaps, word: fx?.word, typed: fx?.typed, rect: fx?.rect, widest: fx?.widest, font: fx?.font, plate, led, ledText, rift, bar, top, bays, notice, badge, quick, key })) };
  writeFileSync(join(OUT_DIR, "result.json"), JSON.stringify(summary, null, 1));
  return { checks, overlaps: frames.map((f) => f.name + ": " + (f.overlaps.join(", ") || "none")) };
}
