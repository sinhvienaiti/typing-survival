// Tuyến Cuối balance (docs/changelog/2026-10-23-balance.md): the mode on the
// title (← → Thư giãn / Cân bằng / Thử thách, stored in survival.settings,
// default Cân bằng), the "Hồ sơ gõ" panel (speed, accuracy, new-word
// recognition, consistency, one line of advice) from a stored profile
// (survival.skill), the settings line "Nhịp tự điều theo cách bạn gõ"
// (Bật by default, stored), and a fight typed for real at 35 WPM in Thư giãn
// and in Thử thách: the header (mode, pace k, E, director) is in the
// snapshot and the page's log replays in Node to its hash and pace steps.
// Pictures: the mode choice, the panel, the settings line, both fights at
// the first surge. No console error.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s0-balance.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_URL, out } from "./common.mjs";
import { nextLetter, press, sv } from "./survival-s0-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const key = (page, code) => page.key(code, { code });
const FIGHT_S = Number(process.env.FIGHT_S ?? 64);
const WPM = 35;

/** A profile as the page stores it after some runs: 42 WPM, 93 %, slow on new words. */
const PROFILE = {
  version: 1,
  audience: "adult",
  mode: "balanced",
  measures: {
    e: { value: 42, n: 240 }, speedBy: { new: { value: 34, n: 40 }, learning: { value: 40, n: 60 }, known: { value: 45, n: 140 } },
    a: { value: 0.93, n: 1400 }, cleanWords: { value: 0.7, n: 240 }, backspace: { value: 0.04, n: 1400 }, sloppy: { value: 0.05, n: 0 }, abandon: { value: 0.02, n: 240 },
    cv: { value: 0.28, n: 240 }, recognize: { new: { value: 1.7, n: 40 }, learning: { value: 0.8, n: 60 }, known: { value: 0.5, n: 140 } },
    vocab: { value: 0.5, n: 0 }, crowdDrop: { value: 0.2, n: 0 }, tactics: { value: 0.5, n: 0 }, telegraph: { value: 0.75, n: 0 }, fatigue: { value: 0, n: 1 },
  },
  vocabLevel: 1,
  sessionWpm: 42,
  trend: { stages: 6, streak: 2, easyWins: 0, quits: 0, safety: { value: 0.48, n: 6 }, nearMisses: { value: 0.3, n: 6 } },
  input: { ime: false, weakKeys: [] },
};

async function ready(page) {
  for (let w = 0; w < 120; w += 1) {
    if ((await page.eval(sv("return t.ready();"))) === true) return true;
    await page.sleep(250);
  }
  return false;
}

const menuState = (page) =>
  page.eval(
    sv(
      "return { screen: t.screen(), mode: t.mode(), sel: document.querySelector('.sv-overlay.is-on .sv-item.is-on b')?.textContent ?? null, items: [...document.querySelectorAll('.sv-overlay.is-on .sv-item')].map((n) => n.querySelector('b').textContent + (n.querySelector('.sv-value b') ? '=' + n.querySelector('.sv-value b').textContent : '')), status: document.querySelector('.sv-status')?.textContent ?? '' };",
    ),
  );

async function fight(page, mode, size) {
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/index.html?seed=3&autostart=1&mode=" + mode, { settle: 300 });
  const ok = await ready(page);
  const header = await page.eval(sv("return t.header();"));
  const keyMs = 60000 / (WPM * 5);
  let shot = null;
  let onScreen = 0;
  let maxOnScreen = 0;
  let state = null;
  for (;;) {
    const at = Date.now();
    const look = await page.eval(sv("return { slots: t.slots(), state: t.state(), mode: t.mode() };"));
    if (look === null) break;
    state = look.state;
    maxOnScreen = Math.max(maxOnScreen, look.state.onScreen);
    if (look.mode !== "play" || look.state.phase !== "play") break;
    if (shot === null && look.state.time >= FIGHT_S - 2) {
      shot = await page.shot(out("survival-s0-balance-fight-" + mode + "-" + size + ".png"));
      onScreen = look.state.onScreen;
    }
    if (look.state.time >= FIGHT_S) break;
    await press(page, nextLetter(look.slots));
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  const snapshot = await page.eval(sv("return t.snapshot();"));
  const pace = await page.eval(sv("return t.pace();"));
  const file = out("survival-s0-balance-replay-" + mode + "-" + size + ".json");
  writeFileSync(file, JSON.stringify(snapshot));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/replay.ts"), file], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  return { ok, header, shot, onScreen, maxOnScreen, hp: state?.hp, kills: state?.stats?.kills, time: state?.time, paceSteps: pace?.log?.length ?? null, window: pace?.window ?? null, replay };
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const base = DEV_URL.replace(/\/$/, "");
  const shots = [];
  await page.goto(base + "/index.html?seed=1", { settle: 300 });
  await ready(page);
  await page.eval("localStorage.removeItem('survival.settings'); localStorage.removeItem('survival.skill'); localStorage.removeItem('survival.seen'); true");
  await page.goto(base + "/index.html?seed=1", { settle: 300 });
  const titleReady = await ready(page);
  const fresh = await menuState(page);
  // The mode: ↓ ↓ to "Chế độ" (S1: Hành trình, Trận thử first), → twice: Thử thách, then back to Cân bằng… we leave it on Thử thách for the picture.
  await key(page, "ArrowDown");
  await key(page, "ArrowDown");
  await key(page, "ArrowRight");
  await page.sleep(150);
  const challenge = await menuState(page);
  shots.push(await page.shot(out("survival-s0-balance-mode-" + size + ".png")));
  const storedMode = await page.eval("JSON.parse(localStorage.getItem('survival.settings') ?? '{}').mode ?? null");
  await key(page, "ArrowLeft");
  await page.sleep(100);
  const balanced = await menuState(page);
  // The profile panel from a stored profile.
  await page.eval("localStorage.setItem('survival.skill', " + JSON.stringify(JSON.stringify(PROFILE)) + "); true");
  await page.goto(base + "/index.html?seed=1", { settle: 300 });
  await ready(page);
  await key(page, "ArrowDown");
  await key(page, "ArrowDown");
  await key(page, "ArrowDown");
  await key(page, "Enter");
  await page.sleep(250);
  const panel = await page.eval(sv("return { screen: t.screen(), stats: [...document.querySelectorAll('.sv-profile .sv-stats div')].map((n) => n.querySelector('b').textContent + ' ' + n.querySelector('small').textContent + ' (' + (n.querySelector('em')?.textContent ?? '') + ')'), advice: document.querySelector('.sv-profile .sv-advice')?.textContent ?? '', lines: [...document.querySelectorAll('.sv-profile .sv-learning li')].map((n) => n.textContent) };"));
  shots.push(await page.shot(out("survival-s0-balance-profile-" + size + ".png")));
  await key(page, "Escape");
  await page.sleep(150);
  const backOnProfile = await menuState(page);
  // Settings: the "Nhịp tự điều" line, Bật by default; Enter turns it off (stored), again on.
  await key(page, "ArrowDown");
  await key(page, "Enter");
  await page.sleep(200);
  for (let k = 0; k < 4; k += 1) await key(page, "ArrowDown");
  await page.sleep(150);
  const settings = await menuState(page);
  shots.push(await page.shot(out("survival-s0-balance-settings-" + size + ".png")));
  await key(page, "Enter");
  await page.sleep(150);
  const adaptOff = await menuState(page);
  const storedOff = await page.eval("JSON.parse(localStorage.getItem('survival.settings') ?? '{}').paceAdapt");
  await key(page, "Enter");
  await page.sleep(150);
  const storedOn = await page.eval("JSON.parse(localStorage.getItem('survival.settings') ?? '{}').paceAdapt");
  // Two fights: Thư giãn, then Thử thách.
  const relax = await fight(page, "relax", size);
  const hard = await fight(page, "challenge", size);
  if (relax.shot) shots.push(relax.shot);
  if (hard.shot) shots.push(hard.shot);
  await page.eval("localStorage.removeItem('survival.settings'); localStorage.removeItem('survival.skill'); localStorage.removeItem('survival.seen'); true");
  const adaptLine = settings.items.find((item) => item.startsWith("Nhịp tự điều theo cách bạn gõ"));
  const checks = {
    titleReady,
    defaultModeBalanced: fresh.items.includes("Chế độ=Cân bằng") && /CÂN BẰNG/.test(fresh.status),
    modeChoice: challenge.sel === "Chế độ" && challenge.items.includes("Chế độ=Thử thách") && storedMode === "challenge" && balanced.items.includes("Chế độ=Cân bằng"),
    profilePanel: panel.screen === "profile" && panel.stats.length === 4 && /^42 Tốc độ/.test(panel.stats[0] ?? "") && /^93% Độ chính xác/.test(panel.stats[1] ?? "") && /^1,7 s Nhận từ mới/.test(panel.stats[2] ?? "") && /Độ đều/.test(panel.stats[3] ?? "") && panel.advice.length > 20 && panel.lines.length >= 2,
    profileBack: backOnProfile.screen === "title" && backOnProfile.sel === "Hồ sơ gõ",
    settingsLine: adaptLine === "Nhịp tự điều theo cách bạn gõ=Bật" && adaptOff.items.includes("Nhịp tự điều theo cách bạn gõ=Tắt") && storedOff === false && storedOn === true,
    relaxHeader: relax.ok && relax.header?.mode === "relax" && relax.header?.director === true,
    challengeHeader: hard.ok && hard.header?.mode === "challenge" && hard.header?.director === true,
    relaxThinner: relax.maxOnScreen < hard.maxOnScreen,
    nodeReplaysBoth: relax.replay?.match === true && hard.replay?.match === true,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, fresh, challenge, panel, settings: settings.items, relax, challengeFight: hard, shots };
}
