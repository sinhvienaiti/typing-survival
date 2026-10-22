// Sinh Tồn S0 (docs/survival/BUILD_S0.md §9, SURVIVAL_MODE_PLAN.md 5.3): keys
// are never swallowed by a hit stop. A crowd is on the field, the page asks
// for a T3 stop (35 ms) as often as the 150 ms spacing allows, and words are
// typed for real at 120 WPM through CDP for ~15 s. Every key sent must be in
// the run's command log, in order, and reach the typing (one right or wrong
// key each); the stops must really have happened.
//   URL=http://127.0.0.1:3120/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/survival-s0-keys.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { out } from "./common.mjs";
import { nextLetter, open, press, sv } from "./survival-s0-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const WPM = 120;
const WINDOW_MS = 15000;

export default async function (page) {
  const size = page.width + "x" + page.height;
  const ready = await open(page);
  await page.eval(sv("t.flood(160); t.forceStops(true); return true;"));
  await page.sleep(300);
  const before = await page.eval(sv("return { stops: t.info().stops, log: t.snapshot().log.length };"));
  const keyMs = 60000 / (WPM * 5);
  const sent = [];
  // The next letters are planned from the slots, read once per word: typing ahead
  // of the page, as a fast typist does, so keys land inside the stops.
  const started = Date.now();
  let plan = [];
  while (Date.now() - started < WINDOW_MS) {
    const at = Date.now();
    if (plan.length === 0) {
      const slots = await page.eval(sv("return t.slots();"));
      const locked = slots.find((slot) => slot.locked);
      const slot = locked ?? (slots[0].mags < slots[1].mags ? slots[0] : slots[1]);
      plan = [...slot.text.slice(locked ? slot.typed : 0)];
      if (plan.length === 0) plan = [nextLetter(slots)];
    }
    const letter = plan.shift();
    await press(page, letter);
    sent.push(letter);
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  await page.sleep(400);
  await page.eval(sv("t.forceStops(false); return true;"));
  const after = await page.eval(sv("const s = t.snapshot(); return { stops: t.info().stops, log: s.log, stats: t.state().stats };"));
  const shot = await page.shot(out("survival-s0-keys-" + size + ".png"));
  // Node replays the log: the same hash, and how many keys landed inside a stop.
  const replayFile = out("survival-s0-keys-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify(await page.eval(sv("return t.snapshot();"))));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/survival/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const keys = after.log.slice(before.log).filter((command) => command.t === "key").map((command) => String.fromCharCode(97 + command.letter));
  const firstDiff = keys.findIndex((letter, k) => letter !== sent[k]);
  const stops = after.log.slice(before.log).filter((command) => command.t === "stop").length;
  const checks = {
    ready,
    everyKeyLogged: keys.length === sent.length && firstDiff < 0,
    everyKeyReachedTheTyping: after.stats.keysOk + after.stats.keysBad === sent.length,
    noWrongKey: after.stats.keysBad === 0,
    stopsKeptComing: stops >= WINDOW_MS / 400,
    keysLandedInStops: (replay?.keysInStops ?? 0) >= 10,
    nodeReplaysToBrowserHash: replay?.match === true,
    wordsFinished: after.stats.words >= Math.floor(sent.length / 9),
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, sent: sent.length, logged: keys.length, firstDiff, stops, stopsAsked: after.stops - before.stops, words: after.stats.words, keysOk: after.stats.keysOk, keysBad: after.stats.keysBad, replay, shot };
}
