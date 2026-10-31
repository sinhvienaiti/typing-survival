// The quick panels after the kit's skin pass and the 243/244 art (31/10, docs/changelog/2026-10-31-panels-art.md).
// Claude runs it at 1280×720 and 1920×1080, on the dev server or the play host:
//   URL=https://survival.typing-game.local/ OUT_DIR=tmp/panels-art node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-quick-panels.mjs --width=1280 --height=720
// Settings (F1) and Sound (F2) on the title and in a fight: every image loaded, no failed request, no exception;
// Resume and Quit to title only in a fight; every row's icon drawn and loaded; every groove one length; the fill's
// right edge at the knob's centre at 0, 50 and 100 (pixels, knob hidden); the fill's ends on the groove's (pixels,
// clip off); the keyboard rows on the button plates, the chosen one on the lit plate; Tab stays in the panel with a
// glow on the art, arrows move a slider, Esc closes; a Typing Feel set picked in the panel sounds once for one key.
// Judges' items after the art pass (31/10, night): a muted Master reads Unmute with the muted speaker and a struck
// number; the Listen speakers scale, glow under the pointer, shrink while pressed and are lit while their sample sounds;
// the list's scrollbar is thin and cyan; a chosen chip reads cyan; the backdrop blurs; Shift+Tab from the dialog reaches
// the last control; the Settings preview is never empty for long and its impact ring lands inside the frame.
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
  /** Shift+Tab as a real key (the kit takes Tab while a panel is open). */
  const shiftTab = async () => {
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
  };
  /** From the open dialog's container, Shift+Tab: where focus lands, and the panel's last tab stop (shown, enabled, tabIndex ≥ 0, a group's checked radio). */
  const FOCUS_LAST = `(() => {
    const dialog = [...document.querySelectorAll('.kit-qs__dialog')].find((d) => d.getAttribute('aria-hidden') !== 'true');
    const shown = (el) => el.getClientRects().length > 0 && !el.closest('[hidden]');
    const stops = [...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter((el) => el !== dialog && el.tabIndex >= 0 && !el.disabled && shown(el) && (el.type !== 'radio' || el.checked || ![...dialog.querySelectorAll('input[type=radio]')].some((r) => r.name === el.name && r.checked)));
    const a = document.activeElement, name = (el) => el ? (el.dataset.action || el.dataset.toggle || el.getAttribute('aria-label') || el.closest('.kit-qs__row')?.dataset.row || el.className) : null;
    return { panel: dialog.dataset.panel, onDialog: a === dialog, inside: dialog.contains(a) && a !== dialog, active: name(a), last: name(stops[stops.length - 1]), isLast: a === stops[stops.length - 1] };
  })()`;
  const fromDialog = async () => {
    const before = await page.eval(FOCUS_LAST);
    await shiftTab(); await page.sleep(200);
    return { before: before.onDialog, ...(await page.eval(FOCUS_LAST)) };
  };
  /** The Settings preview over `ms`: the share of frames with no word shown, and the impact ring against the frame's bottom band. */
  const PREVIEW = (ms) => `new Promise((done) => {
    const box = document.querySelector('.sv-tfx-preview'); if (!box) return done(null);
    const s = Number(document.querySelector('.kit-qs').style.getPropertyValue('--kit-qs-s')) || 1, band = 12 * s;
    let frames = 0, empty = 0, rings = 0, ringOut = 0, worst = -1e9; const t0 = performance.now();
    const tick = () => {
      const b = box.getBoundingClientRect();
      const word = [...box.querySelectorAll('.tfx-layer.is-on')].some((l) => Number(getComputedStyle(l).opacity) > 0.15);
      frames++; if (!word) empty++;
      for (const hit of box.querySelectorAll('.tfx-hit')) {
        if (getComputedStyle(hit).display === 'none' || Number(hit.style.opacity) < 0.5) continue;
        const r = hit.getBoundingClientRect(); rings++;
        const over = r.bottom - (b.bottom - band); worst = Math.max(worst, over); if (over > 1) ringOut++;
      }
      if (performance.now() - t0 < ${ms}) requestAnimationFrame(tick); else done({ frames, emptyShare: Math.round((empty / frames) * 1000) / 1000, rings, ringOut, worstOverBand: Math.round(worst * 10) / 10, band });
    };
    requestAnimationFrame(tick);
  })`;
  /** Changed pixels (any channel ≥ 24) between two shots of one clip: count and share. */
  const changed = (a, b) => { const [w, h, pa] = pixels(a), [, , pb] = pixels(b); let n = 0; for (let i = 0; i < pa.length; i += 3) if (Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2])) >= 24) n++; return { pixels: n, share: Math.round((n / (w * h)) * 10000) / 10000 }; };

  // 1. The title (a fresh profile), both panels.
  await open("seed=2");
  await page.eval("localStorage.removeItem('survival.settings'); localStorage.setItem('survival.guide', JSON.stringify({started:true,hint:true})); true");
  await open("seed=2");
  report.titleSettings = await panel("F1", "title-settings");
  report.settingsFromDialog = await fromDialog();
  report.chips = await page.eval(`(() => { const d = document.querySelector('.kit-qs__dialog[data-panel="settings"]'); const c = (el) => el ? getComputedStyle(el).color : null;
    return { checked: c(d.querySelector('.kit-qs__opt input:checked + .kit-qs__chip')), plain: c(d.querySelector('.kit-qs__opt input:not(:checked) + .kit-qs__chip')), on: c(d.querySelector('.kit-qs__btn[aria-checked="true"]')), backdrop: getComputedStyle(d.querySelector('.kit-qs__backdrop')).backdropFilter }; })()`);
  report.preview = await page.eval(PREVIEW(4400));
  {
    const box = await page.locate(".sv-tfx-preview");
    if (box) for (let n = 0; n < 8; n++) { await shot("preview-" + n, { clip: { x: Math.floor(box.left), y: Math.floor(box.top), width: Math.ceil(box.w), height: Math.ceil(box.h) } }); await page.sleep(160); }
  }
  await key(page, "Escape"); await page.sleep(400);
  report.titleSound = await panel("F2", "title-sound");
  report.soundFromDialog = await fromDialog();

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

  // 4b. The muted Master (the kit's now): Unmute, the 180 muted speaker on the row, the number struck, the slider dimmed.
  const MUTED = `(() => { const row = document.querySelector('.kit-qs__dialog[data-panel="sound"] .kit-qs__row[data-row="master"]'); const b = row.querySelector('[data-toggle="muted"]');
    const num = getComputedStyle(row.querySelector('.kit-qs__num')), img = row.querySelector('.kit-qs__icon-cell img');
    return { text: b.textContent, pressed: b.getAttribute('aria-pressed'), muted: row.classList.contains('kit-qs__row--muted'), strike: num.textDecorationLine, numOpacity: Number(num.opacity), slider: getComputedStyle(row.querySelector('.kit-qs__slider')).filter,
      icon: (/\\/([\\w-]+)\\.\\d+\\.webp/.exec(img?.currentSrc || img?.src || '') || [])[1] || null, loaded: !!img && img.complete && img.naturalWidth > 0, fits: b.scrollWidth <= b.clientWidth + 1 }; })()`;
  const muteSel = '.kit-qs__dialog[data-panel="sound"] [data-toggle="muted"]';
  await page.click(muteSel); await page.sleep(150);
  for (let n = 0; n < 20; n++) { if ((await page.eval(MUTED)).loaded) break; await page.sleep(100); }
  await page.mouse(5, 5); await page.sleep(200);
  report.muted = await page.eval(MUTED);
  {
    const row = await page.locate('.kit-qs__dialog[data-panel="sound"] .kit-qs__row[data-row="master"]');
    await shot("title-sound-muted", { clip: { x: Math.floor(row.left - 8), y: Math.floor(row.top - 4), width: Math.ceil(row.w + 16), height: Math.ceil(row.h + 8) } });
  }
  await page.click(muteSel); await page.sleep(150);
  for (let n = 0; n < 20; n++) { if ((await page.eval(MUTED)).loaded) break; await page.sleep(100); }
  report.unmuted = await page.eval(MUTED);

  // 4c. A Listen speaker: its size at this scale, at rest, under the pointer, pressed (pixels and styles), lit while its sample sounds; the list's scrollbar.
  {
    const value = await page.eval(`(() => { const d = document.querySelector('.kit-qs__dialog[data-panel="sound"]'); const list = d.querySelector('.kit-keyboards'); const lb = list.getBoundingClientRect();
      const b = [...d.querySelectorAll('.kit-keyboards__listen[data-listen]')].find((x) => { const r = x.getBoundingClientRect(); return r.top >= lb.top + 12 && r.bottom <= lb.bottom - 12; }); return b ? b.dataset.listen : null; })()`);
    const sel = '.kit-qs__dialog[data-panel="sound"] .kit-keyboards__listen[data-listen="' + value + '"]';
    const LISTEN = `(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; const img = b.querySelector('img'); const r = img.getBoundingClientRect(), opt = document.querySelector('.kit-qs__dialog[data-panel="sound"] button.kit-keyboards__option').getBoundingClientRect();
      return { w: Math.round(r.width * 100) / 100, rowH: Math.round(opt.height * 100) / 100, filter: getComputedStyle(b).filter, imgFilter: getComputedStyle(img).filter, transform: getComputedStyle(img).transform, playing: b.classList.contains('is-playing') }; })()`;
    const at = value === null ? null : await page.locate(sel);
    if (at === null) throw new Error("No Listen button in view (Typing Feel catalogue not in?)");
    const clip = { x: Math.floor(at.left - 14), y: Math.floor(at.top - 8), width: Math.ceil(at.w + 28), height: Math.ceil(at.h + 16) };
    await page.mouse(5, 5); await page.sleep(250);
    const rest = await page.eval(LISTEN), restShot = await shot("listen-rest", { clip });
    await page.mouse(at.x, at.y); await page.sleep(250);
    const hover = await page.eval(LISTEN), hoverShot = await shot("listen-hover", { clip });
    await page.mouse(at.x, at.y, "mousePressed"); await page.sleep(200);
    const pressed = await page.eval(LISTEN), pressShot = await shot("listen-press", { clip });
    await page.mouse(at.x, at.y, "mouseReleased");
    const t0 = Date.now(); let litAt = null, offAt = null, litShot = null;
    for (let n = 0; n < 60; n++) {
      const st = await page.eval(LISTEN);
      if (st.playing && litAt === null) { litAt = Date.now() - t0; await page.mouse(5, 5); await page.sleep(60); litShot = await shot("listen-playing", { clip }); }
      if (!st.playing && litAt !== null) { offAt = Date.now() - t0; break; }
      await page.sleep(50);
    }
    report.listen = { value, rest, hover, pressed, litAt, offAt, hoverChange: changed(restShot, hoverShot), pressChange: changed(restShot, pressShot), playChange: litShot ? changed(restShot, litShot) : null };
    report.scrollbar = await page.eval(`(() => { const l = document.querySelector('.kit-qs__dialog[data-panel="sound"] .kit-keyboards'); const cs = getComputedStyle(l); return { width: cs.scrollbarWidth, color: cs.scrollbarColor, scrolls: l.scrollHeight > l.clientHeight }; })()`);
  }
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
    mutedMaster: report.muted.text === "Unmute" && report.muted.pressed === "true" && report.muted.muted && report.muted.strike === "line-through" && report.muted.numOpacity < 0.6
      && /saturate\(0\.3\)/.test(report.muted.slider) && report.muted.icon === "hud-sound-muted" && report.muted.loaded && report.muted.fits
      && report.unmuted.text === "Mute" && !report.unmuted.muted && report.unmuted.icon === "vol-master" && report.unmuted.strike === "none",
    listenScales: Math.abs(report.listen.rest.w - 24 * report.titleSound.scale) <= 0.5,
    listenHover: report.listen.hover.filter.includes("rgb(61, 184, 255)") && report.listen.hoverChange.share >= 0.05,
    listenPress: /matrix\(0\.84/.test(report.listen.pressed.transform),
    listenPlaying: report.listen.litAt !== null && report.listen.offAt !== null && report.listen.offAt - report.listen.litAt >= 700 && report.listen.offAt - report.listen.litAt <= 1600,
    thinScrollbar: report.scrollbar.width === "thin" && report.scrollbar.color.startsWith("rgba(61, 184, 255, 0.38)"),
    chipCyan: report.chips.checked === "rgb(166, 224, 255)" && report.chips.on === "rgb(166, 224, 255)" && report.chips.plain !== report.chips.checked,
    backdropBlur: /^blur\(/.test(report.chips.backdrop),
    shiftTabFromDialog: [report.settingsFromDialog, report.soundFromDialog].every((f) => f.before && f.inside && f.isLast),
    previewBusy: !!report.preview && report.preview.emptyShare <= 0.1,
    ringInside: !!report.preview && report.preview.rings > 0 && report.preview.ringOut === 0,
    noExceptions: page.exceptions.length === 0,
    noConsoleErrors: page.logs.filter((l) => l.startsWith("error")).length === 0,
  };
  const pass = Object.values(checks).every(Boolean); if (!pass) process.exitCode = 1;
  return { pass, checks, report, shots };
}
