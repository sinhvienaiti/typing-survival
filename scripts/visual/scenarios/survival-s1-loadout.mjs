// Tuyến Cuối S1 (docs/BUILD_S1.md §4.2, §16 "survival-s1-loadout"), keyboard
// only: title → Hành trình → stage 1 → its briefing (foes with their counter
// tags) → the loadout: keys 4 and 5 pick Ray and Pháo Sao (bay 1, bay 2), the
// threats the pair leaves open get a yellow mark, → → to the start button,
// Enter → the fight on stage 1 with those guns on its bays. Then the armory
// shows the five guns. Checks: the five cards, the warnings, the bays' gun
// names and words (≥ 26 px, nothing in a bay overflows), no console error.
//   URL=http://127.0.0.1:3047/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-loadout.mjs --width=1280 --height=720
import { DEV_URL, out } from "./common.mjs";
import { sv } from "./survival-s0-lib.mjs";

const key = (page, code) => page.key(code, { code });

export default async function (page) {
  const size = page.width + "x" + page.height;
  const shots = [];
  await page.goto(DEV_URL.replace(/\/$/, "") + "/index.html?seed=2", { settle: 300 });
  for (let w = 0; w < 80; w += 1) {
    if ((await page.eval(sv("return t.ready();"))) === true) break;
    await page.sleep(250);
  }
  await page.eval("localStorage.removeItem('survival.stages'); true");
  const screen = () => page.eval(sv("return { mode: t.mode(), screen: document.querySelector('.sv-overlay').dataset.screen, journey: t.journey(), title: document.querySelector('.sv-overlay h1')?.textContent ?? '', items: [...document.querySelectorAll('.sv-overlay .sv-item b')].map((n) => n.textContent) };"));
  const log = [];
  log.push(["title", await screen()]);
  await key(page, "Enter");
  await page.sleep(250);
  log.push(["stages", await screen()]);
  shots.push(await page.shot(out("survival-s1-loadout-stages-" + size + ".png")));
  await key(page, "Enter");
  await page.sleep(250);
  log.push(["briefing", await screen()]);
  const briefing = await page.eval("[...document.querySelectorAll('.sv-foes li')].map((li) => li.textContent)");
  shots.push(await page.shot(out("survival-s1-loadout-briefing-" + size + ".png")));
  await key(page, "Enter");
  await page.sleep(250);
  log.push(["loadout", await screen()]);
  const cards = await page.eval("document.querySelectorAll('.sv-cards .sv-gun-card').length");
  await page.key("4", { code: "Digit4" });
  await page.key("5", { code: "Digit5" });
  await page.sleep(200);
  const picked = await screen();
  const warnings = await page.eval("[...document.querySelectorAll('.sv-threats span.is-open')].map((n) => n.textContent)");
  shots.push(await page.shot(out("survival-s1-loadout-cards-" + size + ".png")));
  // To the start button (after card 5) and in.
  for (let k = 0; k < 5 - (picked.journey.cursor ?? 0); k += 1) await key(page, "ArrowRight");
  await key(page, "Enter");
  let started = null;
  for (let w = 0; w < 80; w += 1) {
    await page.sleep(250);
    started = await page.eval(sv("return t.ready() ? { mode: t.mode(), state: t.state() } : null;"));
    if (started !== null && started.mode === "play") break;
  }
  await page.sleep(1200);
  const hud = await page.eval(`(() => [...document.querySelectorAll('.sv-slot')].map((slot) => {
    const word = slot.querySelector('.sv-word');
    const overflow = [...slot.querySelectorAll('*')].filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'hidden').map((n) => n.className);
    return { gun: slot.querySelector('.sv-gun').textContent, word: word.textContent, px: parseFloat(getComputedStyle(word).fontSize), mags: slot.querySelectorAll('.sv-mags i').length, overflow, width: Math.round(slot.getBoundingClientRect().width) };
  }))()`);
  const learnWidth = await page.eval("Math.round(document.querySelector('.sv-learn').getBoundingClientRect().width)");
  // The frame is 420 px at 1280×720 and scales with --ui (630 px at 1920×1080; R1 review: the check read 420 at every size).
  const ui = await page.eval("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1");
  shots.push(await page.shot(out("survival-s1-loadout-fight-" + size + ".png")));
  const checks = {
    titleHasJourney: log[0][1].items[0] === "Hành trình" && log[0][1].items[1] === "Trận thử",
    stageList: log[1][1].screen === "journey-stages" && log[1][1].items.length === 5,
    briefingShowsCounters: log[2][1].screen === "journey-briefing" && briefing.some((line) => /Trâu/.test(line) && /khắc: RAY/.test(line)),
    fiveCards: log[3][1].screen === "journey-loadout" && cards === 5,
    keysPick: JSON.stringify(picked.journey.picked) === "[3,4]" && picked.journey.ready === true,
    warnsOpenRows: warnings.length > 0 && warnings.some((text) => /sát vạch/.test(text)),
    fightOnStage: started?.mode === "play" && started.state.stage === "c1-s1" && JSON.stringify(started.state.guns) === '["ray","phao"]',
    baysShowGuns: hud.length === 2 && hud[0].gun === "RAY" && hud[1].gun === "PHÁO SAO",
    wordsAtLeast26px: hud.every((bay) => bay.px >= 26),
    noBayOverflow: hud.every((bay) => bay.overflow.length === 0),
    learningFrameKept: Math.abs(learnWidth - 420 * ui) <= 2,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, log, briefing, warnings, hud, learnWidth, ui, shots };
}
