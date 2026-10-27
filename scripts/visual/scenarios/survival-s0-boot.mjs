// Tuyến Cuối S0 (docs/BUILD_S0.md §9; S1 title: Hành trình first): the page
// builds; the title screen "Tuyến Cuối" (keyboard menu: Hành trình, Trận thử,
// Chơi tiếp, Chế độ, Hồ sơ gõ, Cài đặt, Kho súng; ↓ ↓ skips the disabled
// "Chơi tiếp", ↑ comes back; the title font has every Vietnamese letter; a key
// starts the audio and the music), then Trận thử (↓ Enter), the HUD with its health bar, clock and kill counter, and two gun
// slots that each show a word (≥ 26 px at 1280×720) with its meaning, the
// word line above the ship (hidden until a key locks a bay; FEEL_PASS_S1
// §2.6: 6 protected boxes: the line, armour, clock, kills, two bays), contrast ≥ 7 : 1 measured on the real frame: the
// brightest 1 % of the view behind each bay and the line (the HUD hidden for
// one picture) through the plate's own alpha; no console error. S0 review:
// a window that loses focus pauses the fight (Esc goes on); with the screen
// shake off (?shake=0) or reduced motion (survival.motion) the
// camera never shakes, however hard the hits.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s0-boot.mjs --width=1280 --height=720
import { DEV_URL, out } from "./common.mjs";
import { open, sv, typeSlot } from "./survival-s0-lib.mjs";
import { contrastOver, luma } from "./survival-feel-lib.mjs";

export default async function (page) {
  const size = page.width + "x" + page.height;
  await page.goto(DEV_URL.replace(/\/$/, "") + "/index.html?seed=1", { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 120 && !ready; wait += 1) {
    ready = (await page.eval(sv("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  const startCard = await page.eval(sv("return { mode: t.mode(), card: document.querySelector('.sv-overlay.is-on .sv-card')?.textContent ?? '' };"));
  await page.sleep(600);
  const start = await page.shot(out("survival-s0-boot-start-" + size + ".png"));
  // Every Vietnamese letter (both cases) in the title font: each glyph is Chakra Petch's when two different fallbacks measure the same.
  const font = await page.eval(`(async () => {
    const base = "aàáảãạăằắẳẵặâầấẩẫậbcdđeèéẻẽẹêềếểễệghiìíỉĩịklmnoòóỏõọôồốổỗộơờớởỡợpqrstuùúủũụưừứửữựvxyỳýỷỹỵ";
    const letters = [...new Set([...base, ...base.toUpperCase()])].join("") + "0123456789×·↑↓";
    await document.fonts.load('700 40px "Chakra Petch"', letters);
    const g = document.createElement("canvas").getContext("2d");
    const width = (char, fallback) => { g.font = '700 40px "Chakra Petch", ' + fallback; return g.measureText(char).width; };
    const missing = [...letters].filter((char) => Math.abs(width(char, "monospace") - width(char, "serif")) > 0.01);
    const title = document.querySelector(".sv-title-name");
    return { letters: letters.length, missing, family: title ? getComputedStyle(title).fontFamily : "", loaded: document.fonts.check('700 40px "Chakra Petch"', "TUYẾN CUỐI") };
  })()`);
  const menu = async () => page.eval("[...document.querySelectorAll('.sv-overlay.is-on .sv-item')].map((n) => ({ text: n.querySelector('b').textContent, on: n.classList.contains('is-on'), off: n.classList.contains('is-off') }))");
  const menuAtStart = await menu();
  await page.key("ArrowDown", { code: "ArrowDown" });
  await page.key("ArrowDown", { code: "ArrowDown" });
  const menuDown = await menu();
  await page.key("ArrowUp", { code: "ArrowUp" });
  const menuUp = await menu();
  const soundsBefore = await page.eval(sv("return t.sounds();"));
  await page.key("Enter", { code: "Enter" });
  await page.sleep(1200);
  const hud = await page.eval(`(() => {
    const t = window.__survival;
    const alpha = (node) => Number(getComputedStyle(node).backgroundColor.match(/[\\d.]+/g)[3] ?? 1);
    const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const slots = [...document.querySelectorAll(".sv-slot")].map((slot) => {
      const word = slot.querySelector(".sv-word");
      const style = getComputedStyle(word);
      return { word: word.textContent, px: parseFloat(style.fontSize), alpha: alpha(slot), box: box(slot), color: style.color, meaning: slot.querySelector(".sv-mean").textContent };
    });
    const strip = document.querySelector(".sv-strip");
    const line = t.rects()[0];
    return {
      mode: t.mode(), slots, sim: t.slots(),
      hp: document.querySelector(".sv-hp b")?.textContent, clock: document.querySelector(".sv-clock b")?.textContent, kills: document.querySelector(".sv-kills b")?.textContent,
      learn: strip !== null && getComputedStyle(strip).opacity === "0", line: { x: line.x + 6, y: line.y + 6, w: line.w - 12, h: line.h - 12, alpha: alpha(strip) }, rects: t.rects().length, models: t.models(),
    };
  })()`);
  const shot = await page.shot(out("survival-s0-boot-" + size + ".png"));
  // The same instant without the HUD: the brightest 1 % behind each plate, through the plate's alpha (+2.2 % white of its brushing).
  await page.eval(sv("t.hold(true); document.querySelector('.sv-hud').style.visibility = 'hidden'; return true;"));
  const bare = await page.shot(out("survival-s0-boot-bare-" + size + ".png"));
  await page.eval(sv("document.querySelector('.sv-hud').style.visibility = ''; t.hold(false); return true;"));
  for (const slot of hud.slots) slot.contrast = contrastOver(luma([bare], slot.box).p99, slot.alpha, 0.022);
  hud.line.contrast = contrastOver(luma([bare], hud.line).p99, hud.line.alpha);
  const sounds = await page.eval(sv("return t.sounds();"));
  // Focus lost: paused; Esc: on again.
  await page.eval("window.dispatchEvent(new Event('blur')); true");
  await page.sleep(100);
  const blurred = await page.eval(sv("return t.mode();"));
  await page.key("Escape", { code: "Escape" });
  await page.sleep(100);
  const resumed = await page.eval(sv("return t.mode();"));
  // Screen shake off, then reduced motion: a crowd, two Xung magazines and the hits that follow; the camera stays still.
  const still = async (query, setup) => {
    await page.eval(setup + "; true");
    const ready = await open(page, query);
    await page.eval(sv("t.flood(120); return true;"));
    await page.sleep(1200);
    let worst = 0;
    for (let word = 0; word < 2; word += 1) {
      await typeSlot(page, 0, 40);
      for (let k = 0; k < 10; k += 1) {
        await page.sleep(80);
        worst = Math.max(worst, (await page.eval(sv("return t.motion().offset;"))) ?? 1);
      }
    }
    const motion = await page.eval(sv("return t.motion();"));
    const hits = await page.eval(sv("return t.state().stats.kills;"));
    return { ready, worst, hits, ...motion };
  };
  // The control: the same fight with the defaults does shake.
  const shaking = await still("", "localStorage.removeItem('survival.motion')");
  const shakeOff = await still("&shake=0", "localStorage.removeItem('survival.motion')");
  const reduced = await still("", "localStorage.setItem('survival.motion', 'reduced')");
  await page.eval("localStorage.removeItem('survival.motion'); true");
  const checks = {
    ready,
    startCardShown: startCard?.mode === "start" && /TUYẾN CUỐI/.test(startCard.card),
    titleFontHasEveryLetter: font.loaded && font.missing.length === 0 && /Chakra Petch/.test(font.family),
    titleMenu: menuAtStart.length === 7 && menuAtStart[0].on && menuAtStart[0].text === "Hành trình" && menuAtStart[1].text === "Trận thử" && menuAtStart[2].off && menuAtStart[3].text === "Chế độ" && menuAtStart[4].text === "Hồ sơ gõ" && menuDown[3].on && menuUp[1].on,
    audioStartsOnAKey: soundsBefore.played["ui.move"] >= 1 && sounds.ready && sounds.played["ui.select"] >= 1 && sounds.played["music.calm"] === 1,
    enterStarts: hud.mode === "play",
    twoSlotsWithWords: hud.slots.length === 2 && hud.slots.every((slot, k) => slot.word === hud.sim[k].text && slot.word.length >= 3 && slot.meaning.length > 0),
    firstLettersDiffer: hud.sim[0].text[0] !== hud.sim[1].text[0],
    wordAtLeast26px: hud.slots.every((slot) => slot.px >= 26),
    contrastAtLeast7: hud.slots.every((slot) => slot.contrast >= 7) && hud.line.contrast >= 7 && hud.slots.every((slot) => /244, 241, 235/.test(slot.color)),
    hudShown: hud.hp === "100" && /^\d:\d\d$/.test(hud.clock ?? "") && /^×\d+$/.test(hud.kills ?? "") && hud.learn && hud.rects === 6,
    blurPauses: blurred === "paused" && resumed === "play",
    controlShakes: shaking.ready && shaking.worst > 0,
    shakeOffHonoured: shakeOff.ready && shakeOff.scale === 0 && shakeOff.worst === 0 && shakeOff.trauma === 0 && shakeOff.hits > 0,
    reducedMotionHonoured: reduced.ready && reduced.reduced === true && reduced.worst === 0 && reduced.trauma === 0 && reduced.hits > 0,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, hud, font, menu: { menuAtStart, menuDown, menuUp }, sounds, focus: { blurred, resumed }, shaking, shakeOff, reduced, shots: [start, shot] };
}
