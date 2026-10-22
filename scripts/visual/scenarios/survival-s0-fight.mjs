// Sinh Tồn S0 (docs/survival/BUILD_S0.md §9): a whole 180 s stage typed for
// real at 45 WPM through CDP. Pictures: a calm stretch, the first surge, the
// second surge, the end screen. Checks: foes die, damage numbers and debris
// show, no number ever covers the learning frame (the page's own count and
// the DOM rectangle of .sv-learn against every live number's box), no
// console error; and the page's command log replays in Node to its hash.
//   URL=http://127.0.0.1:3120/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/survival-s0-fight.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { out } from "./common.mjs";
import { nextLetter, open, press, sv } from "./survival-s0-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const WPM = Number(process.env.WPM ?? 45);
// The surges end at 68 s and 160 s: the crowd on screen is at its thickest then.
const PICTURES = [
  { name: "normal", at: 44 },
  { name: "peak1", at: 68 },
  { name: "peak2", at: 160 },
];

export default async function (page) {
  const size = page.width + "x" + page.height;
  const ready = await open(page);
  const models = await page.eval(sv("return t.models();"));
  const keyMs = 60000 / (WPM * 5);
  let keys = 0;
  let maxNumbers = 0;
  let maxDebris = 0;
  let overlaps = 0;
  let learnHits = 0;
  let samples = 0;
  let maxFoes = 0;
  let maxOnScreen = 0;
  const onScreenAt = {};
  const foesAt = [];
  const shots = {};
  let state = null;
  for (;;) {
    const at = Date.now();
    const look = await page.eval(sv(`
      const n = t.numbers();
      const learn = document.querySelector(".sv-learn").getBoundingClientRect();
      const hit = n.boxes.filter((b) => b.x < learn.right && b.x + b.w > learn.left && b.y < learn.bottom && b.y + b.h > learn.top).length;
      return { slots: t.slots(), state: t.state(), info: t.info(), overlaps: n.overlaps, live: n.live, hit, mode: t.mode() };`));
    if (look === null) break;
    state = look.state;
    samples += 1;
    overlaps += look.overlaps;
    learnHits += look.hit;
    maxNumbers = Math.max(maxNumbers, look.live);
    maxDebris = Math.max(maxDebris, look.info.debris);
    maxFoes = Math.max(maxFoes, look.state.foes);
    maxOnScreen = Math.max(maxOnScreen, look.state.onScreen);
    if (samples % 20 === 0) foesAt.push([Math.round(look.state.time), look.state.onScreen]);
    if (look.mode === "end" || look.state.phase !== "play") break;
    for (const picture of PICTURES) {
      if (shots[picture.name] === undefined && look.state.time >= picture.at) {
        shots[picture.name] = await page.shot(out("survival-s0-fight-" + picture.name + "-" + size + ".png"));
        onScreenAt[picture.name] = look.state.onScreen;
      }
    }
    await press(page, nextLetter(look.slots));
    keys += 1;
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  await page.sleep(900);
  shots.end = await page.shot(out("survival-s0-fight-end-" + size + ".png"));
  const snapshot = await page.eval(sv("return t.snapshot();"));
  const replayFile = out("survival-s0-fight-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify(snapshot));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/survival/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const checks = {
    ready,
    playedToTheEnd: state?.phase === "won" || state?.phase === "lost",
    foesDied: (state?.stats?.kills ?? 0) > 100,
    numbersShown: maxNumbers > 0,
    debrisShown: maxDebris > 0,
    noNumberOverProtected: overlaps === 0,
    noNumberOverLearningFrame: learnHits === 0,
    nodeReplaysToBrowserHash: replay?.match === true,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, models, keys, wpm: WPM, samples, maxNumbers, maxDebris, maxFoes, maxOnScreen, onScreenAt, foesAt, final: state, replay, shots };
}
