// Tuyến Cuối S1 (docs/BUILD_S1.md §16–17 "survival-s1-perf"): frame cost on
// chapter stages with the new guns firing (R1 has two bays: stage 4 with
// Pháo Sao + Tia into Khiên packs; stage 3 with Tán + Ray and its rifts), and
// `flood(700)` with both bays firing. Measures the page's own update and draw
// times per frame (window.__survival.costs) and the draw calls.
// Targets (High tier, vsync locked): mean ≤ 6 ms, p95 ≤ 10 ms at a peak of
// ~150 foes; flood p95 ≤ 14 ms; draw calls ≤ 160. §17's "frame" is that JS
// time, as S0 measures it: what the screen showed is reported beside it, not
// checked (the frame intervals' p95 and max, the frames that missed a
// refresh, i.e. came > 1.5 refreshes after the one before, and frames a
// second), since the GPU and a busy machine set those too.
// R1 review: the first version idled 52 s (the ship fell before its window)
// and kept one frame of the cost ring (its length stops at 1200). Now both
// bays are typed throughout (~100 ms a key), the peak is held at ~150 foes
// with the dev flood (§17), and a rAF counter picks exactly the window's frames.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-perf.mjs --width=1280 --height=720
import { openStage, out, press, sv } from "./survival-s1-lib.mjs";
import { stats } from "./survival-s0-lib.mjs";

/** The locked bay's next letter, else the first letter of the bay holding the fewest magazines (none when both are full). */
function nextLetter(slots) {
  const locked = slots.find((slot) => slot.locked);
  if (locked) return locked.text[locked.typed];
  let pick = null;
  for (const slot of slots) if (slot.mags < 2 && (pick === null || slot.mags < pick.mags)) pick = slot;
  return pick === null ? null : pick.text[0];
}

const countFrames = (page) => page.eval("window.__perfFrames = 0; (function count() { window.__perfFrames += 1; requestAnimationFrame(count); })(); true");

/**
 * Plays `seconds` with real keys, topping the field up to `hold` foes when
 * given. With `measure`: the costs of exactly the frames drawn in the window,
 * the most draw calls and the foes seen, and the phase (it must stay "play").
 */
async function play(page, seconds, { measure = false, hold = 0 } = {}) {
  const first = await page.eval("window.__perfFrames");
  const end = Date.now() + seconds * 1000;
  let calls = 0;
  let phase = "play";
  const foes = [];
  while (Date.now() < end) {
    const look = await page.eval(sv("return { slots: t.slots(), state: t.state(), info: t.info() };"));
    if (look === null) break;
    phase = look.state.phase;
    if (phase !== "play") break;
    calls = Math.max(calls, look.info.calls);
    foes.push(look.state.foes);
    if (hold > 0 && look.state.foes < hold * 0.92) await page.eval(sv("t.flood(" + (hold - look.state.foes) + "); return true;"));
    const ch = nextLetter(look.slots);
    if (ch) await press(page, ch);
    await page.sleep(100);
  }
  foes.sort((a, b) => a - b);
  const seen = { min: foes[0] ?? 0, median: foes[foes.length >> 1] ?? 0, max: foes.at(-1) ?? 0 };
  if (!measure) return { phase, foes: seen };
  const frames = (await page.eval("window.__perfFrames")) - first;
  const costs = await page.eval(sv("return t.costs();"));
  const n = costs.update.length;
  const keep = Math.min(n, frames);
  const frame = costs.update.map((u, k) => u + costs.draw[k]).slice(n - keep);
  const intervals = costs.interval.slice(n - keep);
  const refresh = stats(intervals).median;
  const shown = { missed: intervals.filter((v) => v > refresh * 1.5).length, perSecond: Math.round((frames / seconds) * 10) / 10 };
  return { phase, frames, frame: stats(frame), interval: stats(intervals), shown, calls, foes: seen };
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const gpu = await page.eval(`(() => { const gl = document.createElement("canvas").getContext("webgl2"); const ext = gl && gl.getExtension("WEBGL_debug_renderer_info"); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown"; })()`);
  const result = {};
  result.shields = { ready: await openStage(page, "c1-s4", ["phao", "tia"], "&director=0") };
  await countFrames(page);
  result.shields.warm = await play(page, 45);
  result.shields.peak = await play(page, 10, { measure: true, hold: 150 });
  result.shields.shot = await page.shot(out("survival-s1-perf-shields-" + size + ".png"));
  result.rifts = { ready: await openStage(page, "c1-s3", ["tan", "ray"], "&director=0") };
  await countFrames(page);
  result.rifts.warm = await play(page, 20);
  result.rifts.peak = await play(page, 10, { measure: true, hold: 150 });
  await page.eval(sv("t.flood(700); return true;"));
  await page.sleep(400);
  result.rifts.flood = await play(page, 6, { measure: true });
  result.rifts.shot = await page.shot(out("survival-s1-perf-flood-" + size + ".png"));
  const windows = [result.shields.peak, result.rifts.peak, result.rifts.flood];
  const checks = {
    ready: result.shields.ready && result.rifts.ready,
    playedThrough: windows.every((w) => w.phase === "play"),
    wholeWindows: windows.every((w) => w.frame.frames >= 200),
    peakHeld: result.shields.peak.foes.median >= 135 && result.rifts.peak.foes.median >= 135,
    floodHeld: result.rifts.flood.foes.median >= 600,
    peakMean: result.shields.peak.frame.mean <= 6 && result.rifts.peak.frame.mean <= 6,
    peakP95: result.shields.peak.frame.p95 <= 10 && result.rifts.peak.frame.p95 <= 10,
    floodP95: result.rifts.flood.frame.p95 <= 14,
    drawCalls: Math.max(...windows.map((w) => w.calls)) <= 160,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, gpu, result };
}
