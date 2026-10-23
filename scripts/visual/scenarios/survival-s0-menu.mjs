// Tuyến Cuối menus (docs/changelog/2026-10-23-theme.md, -balance.md), keyboard only:
// Enter starts; Esc pauses; "Về màn chính" shows the title with "Chơi tiếp"
// selected while the run holds still; the settings screen (opened from the
// title during a run) locks the ship and quality, ← → change the volumes and
// they are stored in survival.settings; Esc from settings or the armory
// comes back to the item that opened it; "Chơi tiếp" resumes the same run.
// Pictures: pause, settings, armory. No console error.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s0-menu.mjs --width=1280 --height=720
import { DEV_URL, out } from "./common.mjs";
import { sv } from "./survival-s0-lib.mjs";
const key = (page, code) => page.key(code, { code });
export default async function (page) {
  const size = page.width + "x" + page.height;
  const shots = [];
  await page.goto(DEV_URL.replace(/\/$/, "") + "/index.html?seed=1", { settle: 300 });
  for (let w = 0; w < 80; w += 1) { if ((await page.eval(sv("return t.ready();"))) === true) break; await page.sleep(250); }
  await page.eval("localStorage.removeItem('survival.settings'); true");
  const read = () => page.eval(sv("return { mode: t.mode(), screen: t.screen(), tick: t.state().tick, sel: document.querySelector('.sv-item.is-on b')?.textContent ?? null, items: [...document.querySelectorAll('.sv-item')].map((n) => n.querySelector('b').textContent + (n.classList.contains('is-off') ? '(off)' : '') + (n.querySelector('.sv-value b') ? '=' + n.querySelector('.sv-value b').textContent : '')) };"));
  const log = [];
  // Trận thử is the second item (S1: Hành trình first).
  await key(page, "ArrowDown"); await key(page, "Enter"); await page.sleep(1500); log.push(["started", await read()]);
  await key(page, "Escape"); await page.sleep(200); log.push(["paused", await read()]);
  shots.push(await page.shot(out("survival-s0-menu-pause-" + size + ".png")));
  await key(page, "ArrowDown"); await key(page, "ArrowDown"); await key(page, "Enter"); await page.sleep(300); log.push(["title-from-pause", await read()]);
  const tickAtTitle = (await read()).tick;
  await page.sleep(600);
  const tickLater = (await read()).tick;
  // Chơi tiếp → Chế độ → Hồ sơ gõ → Cài đặt.
  await key(page, "ArrowDown"); await key(page, "ArrowDown"); await key(page, "ArrowDown"); await key(page, "Enter"); await page.sleep(200); log.push(["settings-in-run", await read()]);
  await key(page, "ArrowRight"); await key(page, "ArrowDown"); await key(page, "ArrowLeft"); await key(page, "ArrowLeft"); await page.sleep(200); log.push(["settings-changed", await read()]);
  shots.push(await page.shot(out("survival-s0-menu-settings-" + size + ".png")));
  const stored = await page.eval("localStorage.getItem('survival.settings')");
  await key(page, "Escape"); await page.sleep(200); log.push(["back-to-title", await read()]);
  await key(page, "ArrowDown"); await key(page, "Enter"); await page.sleep(200); log.push(["armory", await read()]);
  shots.push(await page.shot(out("survival-s0-menu-armory-" + size + ".png")));
  await key(page, "Escape"); await page.sleep(200); log.push(["armory-back", await read()]);
  for (let k = 0; k < 4; k += 1) await key(page, "ArrowUp");
  await page.sleep(100); log.push(["on-continue", await read()]);
  await key(page, "Enter"); await page.sleep(800); log.push(["continued", await read()]);
  await page.eval("localStorage.removeItem('survival.settings'); true");
  const checks = {
    pauseThenTitleKeepsRun: log[2][1].mode === "start" && log[2][1].sel === "Chơi tiếp" && tickLater === tickAtTitle,
    settingsInRunLockShipAndQuality: log[3][1].items.some((i) => i.startsWith("Tàu(off)")) && log[3][1].items.some((i) => i.startsWith("Chất lượng hình(off)")),
    settingsChange: /"sfxVolume":0.8/.test(stored ?? "") && /"musicVolume":0.3/.test(stored ?? ""),
    backKeepsFocus: log[5][1].sel === "Cài đặt" && log[7][1].sel === "Kho súng · Học từ",
    continueResumes: log[9][1].mode === "play" && log[9][1].tick > tickAtTitle,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, stored, log, shots };
}
