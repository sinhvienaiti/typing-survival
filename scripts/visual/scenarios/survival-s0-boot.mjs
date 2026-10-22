// Sinh Tồn S0 (docs/survival/BUILD_S0.md §9): the page builds; the start card,
// then Enter, the HUD with its health bar, clock and kill counter, and two gun
// slots that each show a word (≥ 26 px at 1280×720, contrast ≥ 7 : 1 on the
// panel) with its meaning; the learning frame; no console error.
//   URL=http://127.0.0.1:3120/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/survival-s0-boot.mjs --width=1280 --height=720
import { DEV_URL, out } from "./common.mjs";
import { sv } from "./survival-s0-lib.mjs";

export default async function (page) {
  const size = page.width + "x" + page.height;
  await page.goto(DEV_URL.replace(/\/$/, "") + "/survival.html?seed=1", { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 120 && !ready; wait += 1) {
    ready = (await page.eval(sv("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  const startCard = await page.eval(sv("return { mode: t.mode(), card: document.querySelector('.sv-overlay.is-on .sv-card')?.textContent ?? '' };"));
  const start = await page.shot(out("survival-s0-boot-start-" + size + ".png"));
  await page.key("Enter", { code: "Enter" });
  await page.sleep(1200);
  const hud = await page.eval(`(() => {
    const t = window.__survival;
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/[\\d.]+/g).slice(0, 3).map((v) => { const c = Number(v) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // The panel over the darkest the canvas gets behind it (its own colour on black is the worst case for light text: the best contrast; take the canvas's brightest, white at 10 % through the 90 % panel).
    const panel = getComputedStyle(document.querySelector(".sv-slot")).backgroundColor;
    const [pr, pg, pb, pa] = panel.match(/[\\d.]+/g).map(Number);
    const over = (c) => c * pa + 255 * (1 - pa);
    const background = lum("rgb(" + over(pr) + "," + over(pg) + "," + over(pb) + ")");
    const slots = [...document.querySelectorAll(".sv-slot")].map((slot) => {
      const word = slot.querySelector(".sv-word");
      const style = getComputedStyle(word);
      const contrast = (lum(style.color) + 0.05) / (background + 0.05);
      return { word: word.textContent, px: parseFloat(style.fontSize), contrast: Math.round(contrast * 10) / 10, meaning: slot.querySelector(".sv-mean").textContent };
    });
    return {
      mode: t.mode(), slots, sim: t.slots(),
      hp: document.querySelector(".sv-hp b")?.textContent, clock: document.querySelector(".sv-clock b")?.textContent, kills: document.querySelector(".sv-kills b")?.textContent,
      learn: !!document.querySelector(".sv-learn"), rects: t.rects().length, models: t.models(),
    };
  })()`);
  const shot = await page.shot(out("survival-s0-boot-" + size + ".png"));
  const checks = {
    ready,
    startCardShown: startCard?.mode === "start" && /SINH TỒN/.test(startCard.card),
    enterStarts: hud.mode === "play",
    twoSlotsWithWords: hud.slots.length === 2 && hud.slots.every((slot, k) => slot.word === hud.sim[k].text && slot.word.length >= 3 && slot.meaning.length > 0),
    firstLettersDiffer: hud.sim[0].text[0] !== hud.sim[1].text[0],
    wordAtLeast26px: hud.slots.every((slot) => slot.px >= 26),
    contrastAtLeast7: hud.slots.every((slot) => slot.contrast >= 7),
    hudShown: hud.hp === "100" && /^\d:\d\d$/.test(hud.clock ?? "") && /^×\d+$/.test(hud.kills ?? "") && hud.learn && hud.rects === 4,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, hud, shots: [start, shot] };
}
