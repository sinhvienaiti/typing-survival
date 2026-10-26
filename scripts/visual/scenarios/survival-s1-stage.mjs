// Tuyến Cuối S1 (docs/BUILD_S1.md §16 "survival-s1-stage"): stage 2 (Săn) at
// 35 WPM and stage 4 (Thiếu chữ, Khiên) at 45 WPM, typed for real through CDP
// (the guns a good player picks: Ray + Tia on 2, Pháo Sao + Xung on 4).
// Checks: the objective's plate counts leaders (and the horde pulls back once
// enough fall), hidden letters show as "_" and never the first, no damage
// number over a protected rectangle (the word line, the bays, the
// armour, the objective's plate), no console error, and the page's command
// log replays in Node to its hash. Both fights must end (won or lost) on the
// page they started on: a reload mid-fight (the tick going back) fails the
// run, and a replay counts only with commands in it, run to the last tick
// read. Pictures: mid-fight and the end screen.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-stage.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openStage, out, press, sv } from "./survival-s1-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const MAX_SECONDS = Number(process.env.MAX_SECONDS ?? 200);

/** The next letter a typist presses: the locked bay's, else the first of the bay holding fewest magazines. */
function nextLetter(slots) {
  const locked = slots.find((slot) => slot.locked);
  if (locked) return locked.text[locked.typed];
  let pick = slots[0];
  for (const slot of slots) if (slot.mags < pick.mags) pick = slot;
  return pick.text[0];
}

async function play(page, stage, guns, wpm, size) {
  const ready = await openStage(page, stage, guns);
  const keyMs = 60000 / (wpm * 5);
  let overlaps = 0;
  let firstHidden = 0;
  let masked = 0;
  let goal = "";
  let mid = null;
  let state = null;
  let reloaded = false;
  let lastTick = -1;
  for (;;) {
    const at = Date.now();
    const look = await page.eval(sv(`
      const n = t.numbers();
      const words = [...document.querySelectorAll('.sv-slot .sv-word')].map((w) => w.textContent);
      return { slots: t.slots(), state: t.state(), overlaps: n.overlaps, mode: t.mode(), words, goal: document.querySelector('.sv-goal')?.textContent ?? '' };`));
    // The dev handle gone (null) or the tick going back: the page reloaded under the fight.
    if (look === null || look.state.tick < lastTick) {
      reloaded = true;
      break;
    }
    lastTick = look.state.tick;
    state = look.state;
    overlaps += look.overlaps;
    goal = look.goal || goal;
    for (const slot of look.slots) if ((slot.hidden & 1) !== 0) firstHidden += 1;
    for (const word of look.words) if (word.includes("_")) masked += 1;
    for (const word of look.words) if (word.startsWith("_")) firstHidden += 1;
    if (look.mode !== "play" || look.state.phase !== "play" || look.state.time > MAX_SECONDS) break;
    if (mid === null && look.state.time >= 60) mid = await page.shot(out("survival-s1-stage-" + stage + "-mid-" + size + ".png"));
    await press(page, nextLetter(look.slots));
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  await page.sleep(900);
  const end = await page.shot(out("survival-s1-stage-" + stage + "-end-" + size + ".png"));
  const snapshot = await page.eval(sv("return t.snapshot();"));
  const replayFile = out("survival-s1-stage-" + stage + "-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify(snapshot));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const replayed = replay?.match === true && replay.commands > 0 && replay.tick >= lastTick;
  return { ready, final: state, reloaded, lastTick, overlaps, firstHidden, masked, goal, replay, replayed, shots: [mid, end] };
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const hunt = await play(page, "c1-s2", ["ray", "tia"], 35, size);
  const missing = await play(page, "c1-s4", ["phao", "xung"], 45, size);
  const checks = {
    ready: hunt.ready && missing.ready,
    huntEnded: !hunt.reloaded && (hunt.final?.phase === "won" || hunt.final?.phase === "lost"),
    missingEnded: !missing.reloaded && (missing.final?.phase === "won" || missing.final?.phase === "lost"),
    huntPlateCounts: /^ĐẦU ĐÀN \d\/3 · LỌT \d\/2$|^BẦY RÚT LUI$/.test(hunt.goal) && (hunt.final?.objective?.done ?? 0) + (hunt.final?.objective?.leaked ?? 0) > 0,
    huntRetreatsWhenWon: hunt.final?.phase !== "won" || hunt.final?.objective?.retreat >= 0,
    hiddenLettersShown: missing.masked > 0,
    neverFirstHidden: missing.firstHidden === 0 && hunt.firstHidden === 0,
    noNumberOverProtected: hunt.overlaps === 0 && missing.overlaps === 0,
    nodeReplaysToBrowserHash: hunt.replayed && missing.replayed,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, hunt, missing };
}
