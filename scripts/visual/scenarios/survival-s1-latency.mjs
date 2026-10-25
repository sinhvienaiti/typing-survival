// Tuyến Cuối S1 (docs/BUILD_S1.md §17 "Phím tới hình / phím tới đạn"):
// stage 1 with Xung + Ray, director off. Words are typed for real (~110 ms
// a key), Xung's and Ray's in turn. Before a Xung word the Xung bay is empty
// and no round is in the air (the horde draws out what is left), then a pack
// of 6 mines is placed at 10 m (a logged command) so Xung has a target the
// moment its word is in. Ray fires no rounds, so the first round after a
// Xung word's last key is that word's.
// A page-side keydown listener (capture) stamps every key; a rAF loop
// registered after the page's own stamps every frame after its update and
// draw, with the keys the sim has taken and the rounds in the air. Key to
// frame: a key's stamp to the first frame that drew it taken (every key);
// key to shot: a Xung word's last key to the first frame with its round. The
// screen shows a frame one refresh later at most (not counted). The sim
// steps at 60 Hz whatever the display, so a key waits up to one step
// (16.7 ms) plus the frame that runs it: §17's "≤ 1 khung" (vsync 60 Hz)
// is read here as ≤ one step + one measured frame interval + 2 ms of the
// frame's own update and draw.
// Review of the R1 report: with 20 words p95 was the slowest word, and the
// one long frame of a run (83–383 ms) failed it 2 times in 11. A
// long-animation-frame probe named that frame: the first keydown starts the
// audio (AudioContext, bus inserts, the noise bed), ~107 ms on the Apple M4.
// In play the first key falls on the title screen; here the page opens
// straight into the fight, so a key the sim ignores (Shift) starts the audio
// first, as the menus would. Two fights of 20 Xung words each (stage 1 lasts
// 150 s; a word takes ~3.7 s) give 40 words, so p95 is no longer the slowest
// one. Long frames are kept with the scripts that ran in them.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-latency.mjs --width=1280 --height=720
import { KIND, openStage, out, press, sv, until } from "./survival-s1-lib.mjs";
import { stats } from "./survival-s0-lib.mjs";

const RUNS = 2;
const SHOTS = 20;
const KEY_MS = 110;
const STEP_MS = 1000 / 60;
const LIMIT_MS = 140000;

const INSTALL = `(() => {
  const t = window.__survival;
  const L = (window.__lat = { keys: [], frames: [], loaf: [] });
  addEventListener("keydown", (e) => { if (e.key.length === 1) L.keys.push(performance.now()); }, true);
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) L.loaf.push({ at: Math.round(e.startTime), ms: Math.round(e.duration), scripts: (e.scripts || []).map((x) => x.invoker + " " + Math.round(x.duration) + " ms") });
    }).observe({ type: "long-animation-frame" });
  } catch (error) { L.loafError = String(error); }
  const loop = (raf) => {
    const s = t.state();
    L.frames.push({ at: performance.now(), raf, taken: s.stats.keysOk + s.stats.keysBad, bullets: s.bullets });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return true;
})()`;

async function typeWord(page, bay) {
  const word = (await page.eval(sv("return t.slots();")))[bay].text;
  const firstKey = await page.eval("window.__lat.keys.length");
  for (const letter of word) {
    const at = Date.now();
    await press(page, letter);
    await page.sleep(Math.max(0, KEY_MS - (Date.now() - at)));
  }
  return { bay, word, firstKey, keys: word.length };
}

/** One fight: 20 Xung words (Ray's between them); its keys' and words' latencies and its long frames. */
async function fight(page, size, run) {
  const ready = await openStage(page, "c1-s1", ["xung", "ray"], "&director=0");
  // The audio starts on the first gesture (in play: on the title screen), before the measured keys.
  await page.key("Shift", { code: "ShiftLeft" });
  const audio = await until(page, "t.sounds().ready", 3000);
  await page.sleep(800);
  await page.eval(INSTALL);
  const shotWords = [];
  let skipped = 0;
  const end = Date.now() + LIMIT_MS;
  while (shotWords.length < SHOTS && Date.now() < end) {
    if ((await page.eval(sv("return t.state().phase;"))) !== "play") break;
    const idle = await until(page, "t.slots()[0].mags === 0 && !t.slots()[0].locked && !t.slots()[1].locked && t.state().bullets === 0", 8000);
    if (idle) {
      await page.eval(sv("for (let k = 0; k < 6; k += 1) t.place(" + KIND.mine + ", -2.5 + (k % 3) * 2.5, 10 + Math.floor(k / 3)); return true;"));
      await page.sleep(60);
      shotWords.push(await typeWord(page, 0));
    } else skipped += 1;
    await page.sleep(300);
    if ((await page.eval(sv("return t.slots()[1].mags;"))) < 2) await typeWord(page, 1);
  }
  await page.sleep(400);
  const data = await page.eval("window.__lat");
  const final = await page.eval(sv("return { phase: t.state().phase, hp: t.state().hp };"));
  const shot = await page.shot(out("survival-s1-latency-" + size + (run > 0 ? "-run" + (run + 1) : "") + ".png"));
  const F = data.frames;
  /** The last frame drawn before `at` (its index; −1 none). */
  const before = (at) => {
    let i = -1;
    for (let k = 0; k < F.length && F[k].at < at; k += 1) i = k;
    return i;
  };
  const keyToFrame = [];
  const missed = [];
  data.keys.forEach((at, k) => {
    const i = before(at);
    const was = i >= 0 ? F[i].taken : 0;
    const f = F.find((frame, j) => j > i && frame.taken > was);
    if (f) keyToFrame.push(f.at - at);
    else missed.push(k);
  });
  const keyToShot = [];
  for (const w of shotWords) {
    const last = data.keys[w.firstKey + w.keys - 1];
    if (last === undefined) continue;
    const i = before(last);
    const f = F.find((frame, j) => j > i && frame.bullets > 0);
    if (f) keyToShot.push(f.at - last);
  }
  const intervals = F.slice(1).map((f, i) => f.raf - F[i].raf);
  const long = F.slice(1).flatMap((f, i) => (f.raf - F[i].raf > 50 ? [{ at: Math.round(f.raf), gap: Math.round(f.raf - F[i].raf), scripts: data.loaf.filter((e) => Math.abs(e.at + e.ms - f.raf) < 120).flatMap((e) => e.scripts) }] : []));
  return { ready, audio, keys: data.keys.length, shotWords: shotWords.length, skipped, missed, final, keyToFrame, keyToShot, intervals, long, loafError: data.loafError, shot };
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const runs = [];
  for (let run = 0; run < RUNS; run += 1) runs.push(await fight(page, size, run));
  const all = (field) => runs.flatMap((r) => r[field]);
  const interval = stats(all("intervals"));
  const key = stats(all("keyToFrame"));
  const shotStats = stats(all("keyToShot"));
  const checks = {
    ready: runs.every((r) => r.ready),
    stayedInPlay: runs.every((r) => r.final.phase === "play"),
    allShots: runs.every((r) => r.shotWords === SHOTS && r.keyToShot.length === SHOTS),
    everyKeyTaken: runs.every((r) => r.missed.length === 0 && r.keys >= SHOTS * 6),
    keyToFrameP95: key.p95 <= STEP_MS + interval.median + 2,
    keyToShotP95: shotStats.p95 <= 50,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  const shots = all("keyToShot");
  return {
    pass, checks, keyToFrame: key, keyToShot: shotStats, slowShots: { over50: shots.filter((v) => v > 50).length, over70: shots.filter((v) => v > 70).length }, interval,
    runs: runs.map(({ keyToFrame, keyToShot, intervals, ...r }) => ({ ...r, keyToFrame: stats(keyToFrame), keyToShot: stats(keyToShot), interval: stats(intervals), longFrames: r.long.length })),
  };
}
