// The quick panels after the kit's skin pass and the 243/244 art (31/10, docs/changelog/2026-10-31-panels-art.md).
// Claude runs it at 1280×720 and 1920×1080, on the dev server or the play host:
//   URL=https://survival.typing-game.local/ OUT_DIR=tmp/panels-art node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-quick-panels.mjs --width=1280 --height=720
// Settings (F1) and Sound (F2) on the title and in a fight: every image loaded, no failed request, no exception;
// Resume and Quit to title only in a fight; every row's icon drawn and loaded; every groove one length; the fill's
// right edge at the knob's centre at 0, 50 and 100 (pixels, knob hidden); the fill's ends on the groove's (pixels,
// clip off); the keyboard rows on the button plates, the chosen one on the lit plate; Tab stays in the panel with a
// glow on the art, arrows move a slider, Esc closes; a Typing Feel set picked in the panel sounds once for one key.
import { spawnSync } from "node:child_process";
import { DEV_URL, out } from "./common.mjs";
import { press, sv } from "./survival-s0-lib.mjs";

const base = DEV_URL.replace(/\/$/, "");
const magick = process.env.ART_MAGICK || "magick";
const key = (page, code) => page.key(code, { code });

/** A shot's pixels: [width, height, rgb bytes]. */
function pixels(file) {
  const [w, h] = spawnSync(magick, ["identify", "-format", "%w %h", file], { encoding: "utf8" }).stdout.trim().split(" ").map(Number);
  return [w, h, spawnSync(magick, [file, "-depth", "8", "rgb:-"], { maxBuffer: 64 << 20 }).stdout];
}
/** Per column, the largest channel difference between two shots of the same clip over rows [y0, y1). */
function columnDiff(a, b, y0, y1) {
  const [w, h, pa] = pixels(a), [, , pb] = pixels(b), cols = new Array(w).fill(0);
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    cols[x] = Math.max(cols[x], Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
  }
  return cols;
}
/** First and last column whose difference passes `min` (null: none). */
const extent = (cols, min = 24) => { const on = cols.map((v, x) => (v >= min ? x : -1)).filter((x) => x >= 0); return on.length ? [on[0], on[on.length - 1]] : null; };

/** The open panel as drawn: rows, icons, buttons, sliders, list plates, fonts, focus. */
const PROBE = `(() => {
  const qs = document.querySelector('.kit-qs'); if (!qs) return null;
  const visible = (n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden' && !n.closest('[hidden]');
  const dialog = [...qs.querySelectorAll('.kit-qs__dialog')].find((d) => d.getAttribute('aria-hidden') !== 'true' && visible(d));
  const role = (src) => (/\\/([\\w-]+)\\.\\d+\\.webp/.exec(src || '') || [])[1] || null;
  const r = (n) => { const b = n.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 100) / 100); };
  const px = (value) => { const s = document.createElement('span'); s.style.cssText = 'position:absolute;visibility:hidden;width:' + value; qs.append(s); const w = s.getBoundingClientRect().width; s.remove(); return w; };
  const images = [...qs.querySelectorAll('img')].filter(visible).map((i) => ({ role: role(i.currentSrc || i.src), loaded: i.complete && i.naturalWidth > 0 }));
  const art = performance.getEntriesByType('resource').filter((e) => /\\/assets\\/|typing-feel|feel\\./.test(e.name)).map((e) => [e.name.replace(/^https?:\\/\\/[^/]+/, ''), e.responseStatus ?? 0]);
  if (!dialog) return { open: null, context: qs.dataset.context, images, art, active: document.activeElement?.className || document.activeElement?.tagName };
  const panel = dialog.querySelector('.kit-qs__panel');
  const rows = [...dialog.querySelectorAll('.kit-qs__row')].filter(visible).map((row) => {
    const cell = row.querySelector('.kit-qs__icon-cell'), img = cell?.querySelector('img');
    const bg = cell ? getComputedStyle(cell).backgroundImage : 'none';
    return { id: row.dataset.row, icon: cell?.dataset.icon ?? null, art: img ? role(img.currentSrc || img.src) : bg !== 'none' ? role(bg) : null, loaded: img ? img.complete && img.naturalWidth > 0 : bg !== 'none', cell: cell ? r(cell).slice(2) : null };
  });
  const sliders = [...dialog.querySelectorAll('.kit-qs__slider')].filter(visible).map((s) => {
    const input = s.querySelector('.kit-qs__range'), fill = getComputedStyle(s.querySelector('.kit-qs__fill')), groove = getComputedStyle(s.querySelector('.kit-qs__groove'));
    return { id: s.closest('.kit-qs__row').dataset.row, box: r(s), value: Number(input.value), v: Number(s.style.getPropertyValue('--kit-qs-v')), fill: { src: role(fill.borderImageSource), slice: fill.borderImageSlice, width: fill.borderImageWidth, outset: fill.borderImageOutset, display: fill.display, filter: fill.filter }, groove: { src: role(groove.borderImageSource), slice: groove.borderImageSlice, width: groove.borderImageWidth, h: parseFloat(groove.height) } };
  });
  const list = dialog.querySelector('.kit-keyboards');
  const options = list ? [...list.querySelectorAll('button.kit-keyboards__option')] : [];
  const plate = (b) => { const s = getComputedStyle(b, '::before'); return { src: role(s.borderImageSource), slice: s.borderImageSlice, width: s.borderImageWidth }; };
  const chosen = options.find((b) => b.getAttribute('aria-selected') === 'true');
  const plain = options.find((b) => b.getAttribute('aria-selected') !== 'true' && !b.disabled);
  const buttons = [...dialog.querySelectorAll('button')].filter(visible).filter((b) => !b.closest('.kit-keyboards')).map((b) => b.getAttribute('aria-label') || b.textContent.trim());
  const active = document.activeElement;
  return {
    open: dialog.dataset.panel, context: qs.dataset.context, images, art, rows, sliders, buttons,
    knob: px('var(--kit-qs-knob)'), grooveH: px('var(--kit-qs-groove-h)'), scale: Number(qs.style.getPropertyValue('--kit-qs-s')),
    fonts: { title: getComputedStyle(dialog.querySelector('.kit-qs__title')).fontFamily, label: getComputedStyle(dialog.querySelector('.kit-qs__label')).fontFamily },
    panel: { box: r(panel), noScroll: panel.scrollHeight <= panel.clientHeight + 1, inside: (() => { const b = panel.getBoundingClientRect(); return b.left >= -1 && b.top >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1; })() },
    list: list ? { rows: options.length, rowH: options[0] ? r(options[0])[3] : 0, plain: plain ? plate(plain) : null, chosen: chosen ? { ...plate(chosen), color: getComputedStyle(chosen).color, value: chosen.dataset.value } : null, listBox: getComputedStyle(list).borderTopStyle + ' ' + getComputedStyle(list).backgroundColor } : null,
    // The glow: on a chip (a radio's label), a list row's plate (::before) or the element; a knob's is on its thumb (not readable here).
    focus: { inside: !!active && dialog.contains(active), cls: active?.className || active?.tagName, row: active?.closest?.('.kit-qs__row')?.dataset.row ?? null, filter: !active ? '' : active.matches('input[type=radio]') ? getComputedStyle(active.nextElementSibling).filter : active.matches('.kit-keyboards__option') ? getComputedStyle(active, '::before').filter : getComputedStyle(active).filter, outline: active ? getComputedStyle(active).outlineStyle : '' },
  };
})()`;

export default async function (page) {
  const size = page.width + "x" + page.height, report = { size }, shots = [];
  const ready = async () => {
    for (let n = 0; n < 160; n++) { if (await page.eval(sv("return t.ready();"))) return; await page.sleep(250); }
    throw new Error("Game did not become ready");
  };
  const open = async (query) => { await page.goto(base + "/index.html?" + query + "&debug=1", { settle: 300 }); await ready(); };
  const probe = () => page.eval(PROBE);
  const shot = async (name, opts) => { const file = await page.shot(out("qp-" + name + "-" + size + ".png"), opts); shots.push(file); return file; };
  const panel = async (code, name) => {
    await page.key(code, { code }); await page.sleep(600);
    for (let n = 0; n < 40; n++) { if (await page.eval("[...document.querySelectorAll('.kit-qs img')].every((i) => i.complete)")) break; await page.sleep(100); }
    const state = await probe();
    await shot(name);
    return state;
  };
  const style = (id, css) => page.eval("(() => { document.getElementById(" + JSON.stringify(id) + ")?.remove(); const s = document.createElement('style'); s.id = " + JSON.stringify(id) + "; s.textContent = " + JSON.stringify(css) + "; document.head.append(s); return true; })()");
  const unstyle = (id) => page.eval("(document.getElementById(" + JSON.stringify(id) + ")?.remove(), true)");

  // 1. The title (a fresh profile), both panels.
  await open("seed=2");
  await page.eval("localStorage.removeItem('survival.settings'); localStorage.setItem('survival.guide', JSON.stringify({started:true,hint:true})); true");
  await open("seed=2");
  report.titleSettings = await panel("F1", "title-settings");
  await key(page, "Escape"); await page.sleep(400);
  report.titleSound = await panel("F2", "title-sound");

  // 2. Keyboard: focus starts in the panel; Tab never leaves it and lights the art; an arrow moves a slider; Esc closes.
  const tabs = [];
  // Read after the plates' 0.1 s filter transition.
  for (let n = 0; n < 14; n++) { await key(page, "Tab"); await page.sleep(250); const f = (await probe()).focus; tabs.push(f); }
  report.tabs = tabs;
  const focusSlider = await page.eval("(() => { const r = document.querySelector('.kit-qs__dialog[data-panel=\"sound\"] .kit-qs__row[data-row=\"music\"] .kit-qs__range'); r.focus(); return Number(r.value); })()");
  await key(page, "ArrowLeft"); await page.sleep(100);
  report.arrow = { before: focusSlider, after: await page.eval("Number(document.querySelector('.kit-qs__dialog[data-panel=\"sound\"] .kit-qs__row[data-row=\"music\"] .kit-qs__range').value)") };
  await page.eval("(() => { const b = [...document.querySelectorAll('.kit-qs__dialog[data-panel=\"sound\"] .kit-qs__btn')].find((b) => b.offsetParent); b.focus(); return true; })()");
  await page.sleep(250);
  report.focusGlow = await page.eval("(() => { const cs = getComputedStyle(document.activeElement); return { filter: cs.filter, outline: cs.outlineStyle, cls: document.activeElement.className }; })()");
  await shot("title-sound-focus");

  // 3. The fill against the value (music row), knob hidden: its right edge at the knob's centre.
  await style("qp-knob", ".kit-qs__range::-webkit-slider-thumb{background:none!important;filter:none!important;box-shadow:none!important}");
  const setValue = (v) => page.eval("(() => { const r = document.querySelector('.kit-qs__dialog[data-panel=\"sound\"] .kit-qs__row[data-row=\"music\"] .kit-qs__range'); r.value = String(" + v + "); r.dispatchEvent(new Event('input', { bubbles: true })); r.blur(); return true; })()");
  const music = async () => (await probe()).sliders.find((s) => s.id === "music");
  report.fillAt = [];
  for (const v of [0, 50, 100]) {
    await setValue(v); await page.sleep(150);
    const s = await music(), [x, y, w, h] = s.box, pad = 8;
    const clip = { x: Math.floor(x - pad), y: Math.floor(y), width: Math.ceil(w + 2 * pad), height: Math.ceil(h) };
    const lit = await shot("fill-" + v, { clip });
    await style("qp-nofill", ".kit-qs__fill{visibility:hidden!important}"); await page.sleep(80);
    const bare = await shot("fill-" + v + "-bare", { clip });
    await unstyle("qp-nofill");
    const mid = Math.round(h / 2), cols = columnDiff(lit, bare, mid - Math.ceil(report.titleSound.grooveH / 2), mid + Math.ceil(report.titleSound.grooveH / 2));
    const knob = report.titleSound.knob, expected = x + knob / 2 + (v / 100) * (w - knob);
    const seen = extent(cols);
    report.fillAt.push({ value: v, v: s.v, expectedRight: Math.round(expected * 100) / 100, measuredRight: seen ? clip.x + seen[1] + 1 : null, measuredLeft: seen ? clip.x + seen[0] : null, sliderLeft: x });
  }
  // 4. The fill's ends on the groove's: clip off, each layer alone against the panel without either.
  {
    const s = await music(), [x, y, w, h] = s.box, pad = 8, clip = { x: Math.floor(x - pad), y: Math.floor(y), width: Math.ceil(w + 2 * pad), height: Math.ceil(h) };
    const mid = Math.round(h / 2), rows = [mid - Math.ceil(report.titleSound.grooveH / 2) - 1, mid + Math.ceil(report.titleSound.grooveH / 2) + 1];
    await style("qp-layers", ".kit-qs__groove,.kit-qs__fill{visibility:hidden!important}"); await page.sleep(80);
    const none = await shot("ends-none", { clip });
    await style("qp-layers", ".kit-qs__fill{visibility:hidden!important}"); await page.sleep(80);
    const groove = await shot("ends-groove", { clip });
    await style("qp-layers", ".kit-qs__groove{visibility:hidden!important}.kit-qs__fill{clip-path:none!important}"); await page.sleep(80);
    const fill = await shot("ends-fill", { clip });
    await unstyle("qp-layers");
    const g = extent(columnDiff(groove, none, rows[0], rows[1])), f = extent(columnDiff(fill, none, rows[0], rows[1]));
    report.ends = { groove: g && [clip.x + g[0], clip.x + g[1] + 1], fill: f && [clip.x + f[0], clip.x + f[1] + 1], slider: [x, x + w] };
  }
  await unstyle("qp-knob");
  await setValue(50); await page.sleep(100);
  await key(page, "Escape"); await page.sleep(400);
  report.afterEsc = await probe();

  // 5. A fight (the trial): both panels with Resume and Quit to title; a Typing Feel set picked in Sound sounds once for one key.
  await open("seed=2&autostart=1");
  for (let n = 0; n < 40; n++) { if ((await page.eval(sv("return t.state().phase;"))) === "play") break; await page.sleep(250); }
  await page.sleep(1500);
  report.playSettings = await panel("F1", "play-settings");
  await key(page, "Escape"); await page.sleep(3600);
  report.playSound = await panel("F2", "play-sound");
  const catalogue = await page.eval(sv("return t.keyboard();"));
  const pick = await page.eval("(() => { const b = [...document.querySelectorAll('.kit-qs__dialog[data-panel=\"sound\"] button.kit-keyboards__option')].find((b) => !b.disabled && !['off', 'relay'].includes(b.dataset.value) && b.getAttribute('aria-selected') !== 'true'); if (!b) return null; b.scrollIntoView({ block: 'center' }); b.click(); return b.dataset.value; })()");
  for (let n = 0; n < 60; n++) { const k = await page.eval(sv("return t.keyboard();")); if (k.profile === pick) break; await page.sleep(250); }
  await page.sleep(300);
  report.playSoundPicked = await probe();
  await shot("play-sound-picked");
  await key(page, "Escape");
  for (let n = 0; n < 40; n++) { const q = await page.eval(sv("return t.quick();")); if (!q.blocking) break; await page.sleep(200); }
  await page.sleep(300);
  const before = await page.eval(sv("return t.keyboard();"));
  const slots = await page.eval(sv("return t.slots();"));
  const locked = slots.find((s) => s.locked), letter = locked ? locked.text[locked.typed] : slots[0].text[0];
  await press(page, letter); await page.sleep(400);
  const after = await page.eval(sv("return t.keyboard();"));
  report.keySound = { catalogue: { state: catalogue.state, sets: catalogue.sets }, pick, profile: after.profile, standIn: after.standIn, played: [before.stats.played, after.stats.played] };

  const all = [report.titleSettings, report.titleSound, report.playSettings, report.playSound, report.playSoundPicked];
  const iconRows = (state) => state.rows.filter((row) => row.icon !== null || ["shake", "speak"].includes(row.id));
  const grooves = (state) => state.sliders.map((s) => s.box[2]);
  const checks = {
    imagesLoaded: all.every((s) => s.images.every((i) => i.loaded)),
    noFailedRequest: all.every((s) => s.art.every(([, status]) => status === 0 || (status >= 200 && status < 400))),
    titleContext: report.titleSettings.context === "title" && !report.titleSettings.buttons.includes("Resume") && !report.titleSettings.buttons.includes("Quit to title"),
    playContext: report.playSettings.context === "play" && report.playSettings.buttons.includes("Resume") && report.playSettings.buttons.includes("Quit to title"),
    rowIcons: all.every((s) => iconRows(s).every((row) => row.art !== null && row.loaded)),
    settingsIcons: [report.titleSettings, report.playSettings].every((s) => ["fx-style:icon-letter-style", "fx-strength:icon-effect-strength", "fx-size:icon-word-size", "quality:icon-quality", "reducedMotion:icon-reduced-motion", "shake:icon-shake"].every((pair) => s.rows.some((row) => row.id + ":" + row.art === pair.replace(/^fx-style/, "fxStyle").replace(/^fx-strength/, "fxIntensity").replace(/^fx-size/, "fxSize")))),
    soundIcons: [report.titleSound, report.playSound].every((s) => ["master:vol-master", "music:vol-music", "effects:vol-effects", "keyboard:vol-keyboard", "keyboardVolume:vol-keyboard", "voice:vol-voice", "speak:icon-read-aloud", "ui:vol-interface"].every((pair) => s.rows.some((row) => row.id + ":" + row.art === pair))),
    cornerGear: all.every((s) => s.images.some((i) => i.role === "hud-settings")),
    titleFont: all.every((s) => /Chakra Petch/.test(s.fonts.title) && /Chakra Petch/.test(s.fonts.label)),
    fillArt: [report.titleSound, report.playSound].every((s) => s.sliders.length >= 6 && s.sliders.every((x) => x.fill.src === "slider-fill" && x.groove.src === "slider-track" && x.fill.display === "block")),
    groovesEqual: [report.titleSound, report.playSound].every((s) => Math.max(...grooves(s)) - Math.min(...grooves(s)) <= 0.5),
    fillAtValue: report.fillAt.every((f) => f.measuredRight !== null && Math.abs(f.measuredRight - f.expectedRight) <= 1 && Math.abs(f.v * 100 - f.value) < 0.01),
    fillOnGroove: !!report.ends.groove && !!report.ends.fill && Math.abs(report.ends.groove[0] - report.ends.fill[0]) <= 1 && Math.abs(report.ends.groove[1] - report.ends.fill[1]) <= 1,
    listPlates: [report.titleSound, report.playSound, report.playSoundPicked].every((s) => !!s.list && s.list.plain?.src === "frame-button" && s.list.chosen?.src === "frame-button-active"),
    panelsFit: all.every((s) => s.panel.noScroll && s.panel.inside),
    tabStaysIn: report.tabs.every((f) => f.inside),
    // A cyan glow (--volt, rgb(61, 184, 255)) hugging the art, no flat outline: on the focused button, and on every focused button, chip or list row the Tab walk met.
    focusGlow: report.focusGlow.filter.includes("rgb(61, 184, 255)") && report.focusGlow.outline === "none"
      && report.tabs.filter((f) => /kit-qs__btn|kit-keyboards__option|kit-keyboards__listen/.test(f.cls)).every((f) => f.filter.includes("rgb(61, 184, 255)") && f.outline === "none"),
    arrowMoves: report.arrow.after === report.arrow.before - 1,
    escCloses: report.afterEsc.open === null,
    keyOnce: !!pick && report.keySound.profile === pick && report.keySound.standIn === null && report.keySound.played[1] - report.keySound.played[0] === 1,
    noExceptions: page.exceptions.length === 0,
    noConsoleErrors: page.logs.filter((l) => l.startsWith("error")).length === 0,
  };
  const pass = Object.values(checks).every(Boolean); if (!pass) process.exitCode = 1;
  return { pass, checks, report, shots };
}
