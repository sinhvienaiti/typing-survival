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
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-latency.mjs --width=1280 --height=720
import { KIND, openStage, out, press, sv, until } from "./survival-s1-lib.mjs";
import { stats } from "./survival-s0-lib.mjs";

const SHOTS = 20;
const KEY_MS = 110;
const STEP_MS = 1000 / 60;
const LIMIT_MS = 150000;

const INSTALL = `(() => {
  const t = window.__survival;
  const L = (window.__lat = { keys: [], frames: [] });
  addEventListener("keydown", (e) => { if (e.key.length === 1) L.keys.push(performance.now()); }, true);
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

export default async function (page) {
  const size = page.width + "x" + page.height;
  const ready = await openStage(page, "c1-s1", ["xung", "ray"], "&director=0");
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
  const shot = await page.shot(out("survival-s1-latency-" + size + ".png"));
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
  const interval = stats(intervals);
  const key = stats(keyToFrame);
  const shotStats = stats(keyToShot);
  const checks = {
    ready,
    stayedInPlay: final.phase === "play",
    allShots: shotWords.length === SHOTS && keyToShot.length === SHOTS,
    everyKeyTaken: missed.length === 0 && data.keys.length >= SHOTS * 6,
    keyToFrameP95: key.p95 <= STEP_MS + interval.median + 2,
    keyToShotP95: shotStats.p95 <= 50,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, keys: data.keys.length, shotWords: shotWords.length, skipped, missed, final, keyToFrame: key, keyToShot: shotStats, interval, longFrames: intervals.filter((v) => v > 50).length, shot };
}
