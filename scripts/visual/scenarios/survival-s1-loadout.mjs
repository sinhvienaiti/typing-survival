// Tuyến Cuối S1 (docs/BUILD_S1.md §4.2, §16 "survival-s1-loadout"), keyboard
// only: title → Hành trình → stage 1 → its briefing (foes with their counter
// tags) → the loadout: keys 1 and 3 pick Xung and Tán (bay 1, bay 2), the
// threats the pair leaves open get a yellow mark (Trâu: both ✕; every pair
// leaves a row open, §5.2: Ray + Pháo Sao leaves Bầy sát vạch), → → to the
// start button, Enter → the stage's card (the new page waits, its world
// still, until a key: test pass 27/10), a letter → the fight on stage 1 with
// those guns on its bays, the letter typed nowhere and the sound running.
// Then, from a fresh title screen, the armory (↑ to its item, Enter) shows
// the five guns with the trial's Xung magazine named. Checks: the five cards
// on both screens, the warnings, the bays' gun names and words (≥ 26 px,
// nothing in a bay overflows), the armory's cards inside their boxes, no
// console error.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-loadout.mjs --width=1280 --height=720
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
  await page.key("1", { code: "Digit1" });
  await page.key("3", { code: "Digit3" });
  await page.sleep(200);
  const picked = await screen();
  const warnings = await page.eval("[...document.querySelectorAll('.sv-threats span.is-open')].map((n) => n.textContent)");
  // Each card's gun name on one line; a picked card's badge goes beside it or under it (English names, 28/10).
  const cardNames = await page.eval("[...document.querySelectorAll('.sv-cards .sv-gun-card header b')].map((b) => { const r = document.createRange(); r.selectNodeContents(b); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; })");
  shots.push(await page.shot(out("survival-s1-loadout-cards-" + size + ".png")));
  // To the start button (after card 5) and in.
  for (let k = 0; k < 5 - (picked.journey.cursor ?? 0); k += 1) await key(page, "ArrowRight");
  await key(page, "Enter");
  let card = null;
  for (let w = 0; w < 80; w += 1) {
    await page.sleep(250);
    card = await page.eval(sv("return t.ready() ? { mode: t.mode(), tick: t.state().tick, text: document.querySelector('.sv-overlay.is-on .sv-card')?.innerText ?? '' } : null;"));
    if (card !== null && card.mode === "intro" && /PHÍM BẤT KỲ/.test(card.text)) break;
  }
  await page.sleep(600);
  const still = await page.eval(sv("return t.state().tick;"));
  shots.push(await page.shot(out("survival-s1-loadout-card-" + size + ".png")));
  await page.key("q", { code: "KeyQ", text: "q" });
  let started = null;
  for (let w = 0; w < 40; w += 1) {
    await page.sleep(100);
    started = await page.eval(sv("return { mode: t.mode(), state: t.state(), sound: t.sounds().ready };"));
    if (started.mode === "play") break;
  }
  await page.sleep(1200);
  const hud = await page.eval(`(() => [...document.querySelectorAll('.sv-slot')].map((slot) => {
    const word = slot.querySelector('.sv-word');
    const overflow = [...slot.querySelectorAll('*')].filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'hidden').map((n) => n.className);
    return { gun: slot.querySelector('.sv-gun').textContent, word: word.textContent, px: parseFloat(getComputedStyle(word).fontSize), mags: slot.querySelectorAll('.sv-mags i').length, overflow, width: Math.round(slot.getBoundingClientRect().width) };
  }))()`);
  // The word line above the ship (FEEL_PASS_S1 §2.1) hugs its word up to 420 px at 1280×720, scaled with --ui (630 px at 1920×1080).
  const learnWidth = await page.eval("Math.round(parseFloat(getComputedStyle(document.querySelector('.sv-strip')).maxWidth))");
  const ui = await page.eval("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1");
  shots.push(await page.shot(out("survival-s1-loadout-fight-" + size + ".png")));
  // The armory from the title screen (its item is the menu's last: ↑ wraps to it).
  await page.goto(DEV_URL.replace(/\/$/, "") + "/index.html?seed=2", { settle: 300 });
  for (let w = 0; w < 80; w += 1) {
    if ((await page.eval(sv("return t.ready();"))) === true) break;
    await page.sleep(250);
  }
  await key(page, "ArrowUp");
  await key(page, "Enter");
  await page.sleep(400);
  const armory = await page.eval(sv(`return { screen: t.screen(), cards: [...document.querySelectorAll('.sv-guns .sv-gun-card')].map((card) => {
    const box = card.getBoundingClientRect();
    const all = [card, ...card.querySelectorAll('*')];
    const out = all.filter((n) => { const b = n.getBoundingClientRect(); return b.width > 0 && (b.right > box.right + 1 || b.bottom > box.bottom + 1); }).length;
    return { text: card.innerText.replace(/\\n+/g, ' | '), out, overflow: all.filter((n) => n.scrollWidth > n.clientWidth + 1 && n.clientWidth > 0).length };
  }) };`));
  shots.push(await page.shot(out("survival-s1-loadout-armory-" + size + ".png")));
  const checks = {
    titleHasJourney: log[0][1].items[0] === "Hành trình" && log[0][1].items[1] === "Trận thử",
    stageList: log[1][1].screen === "journey-stages" && log[1][1].items.length === 5,
    briefingShowsCounters: log[2][1].screen === "journey-briefing" && briefing.some((line) => /Brute/.test(line) && /khắc: Rail Gun/.test(line)),
    fiveCards: log[3][1].screen === "journey-loadout" && cards === 5,
    keysPick: JSON.stringify(picked.journey.picked) === "[0,2]" && picked.journey.ready === true,
    cardNamesOneLine: cardNames.length === 5 && cardNames.every((lines) => lines === 1),
    warnsOpenRows: warnings.length > 0 && warnings.some((text) => /Brute/.test(text)),
    stageCardWaits: card?.mode === "intro" && /ẢI 1/.test(card.text) && still === 0,
    fightOnStage: started?.mode === "play" && started.state.stage === "c1-s1" && JSON.stringify(started.state.guns) === '["xung","tan"]',
    cardKeyTypesNothing: started?.state.stats.keysOk + started?.state.stats.keysBad === 0 && started?.sound === true,
    baysShowGuns: hud.length === 2 && hud[0].gun === "Pulse Gun" && hud[1].gun === "Scatter Gun",
    wordsAtLeast26px: hud.every((bay) => bay.px >= 26),
    noBayOverflow: hud.every((bay) => bay.overflow.length === 0),
    wordLineAt420: Math.abs(learnWidth - 420 * ui) <= 2,
    armoryFiveGuns: armory.screen === "armory" && armory.cards.length === 5 && armory.cards.some((card) => /Trận thử: 24 viên/.test(card.text)),
    armoryFits: armory.cards.every((card) => card.out === 0 && card.overflow === 0),
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, log, briefing, warnings, cardNames, card, still, hud, learnWidth, ui, armory, shots };
}
