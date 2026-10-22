// Sinh Tồn S0 (docs/BUILD_S0.md §8): frame cost at a surge and under
// the load test, typed for real at 70 WPM so both guns fire throughout.
// A: ~160 foes (the second surge's count, held by topping up with the dev
// flood) with rounds, the column, numbers, debris and sparks: the page's own
// frame cost (steps + events + HUD, and the draw) mean ≤ 6 ms, p95 ≤ 10 ms.
// B: __survival.flood(700): p95 ≤ 14 ms. Also Chrome's main-thread time a
// frame (CDP Performance.getMetrics), the frame rate, draw calls (≤ 160),
// and the GPU the browser used.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s0-perf.mjs --width=1280 --height=720
import { out } from "./common.mjs";
import { nextLetter, open, press, stats, sv } from "./survival-s0-lib.mjs";

const WPM = 70;
const WINDOW_MS = 10000;

async function measure(page, label, size, target) {
  const metrics = async () => Object.fromEntries((await page.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await page.eval(sv("t.flood(" + target + "); return true;"));
  await page.sleep(700);
  const startCosts = (await page.eval(sv("return t.costs().draw.length;"))) ?? 0;
  const first = { frames: await page.eval("window.__perfFrames"), ...(await metrics()) };
  const keyMs = 60000 / (WPM * 5);
  const started = Date.now();
  let calls = 0;
  let foes = [];
  let keys = 0;
  while (Date.now() - started < WINDOW_MS) {
    const at = Date.now();
    const look = await page.eval(sv("return { slots: t.slots(), foes: t.state().foes, calls: t.info().calls };"));
    calls = Math.max(calls, look.calls);
    foes.push(look.foes);
    if (look.foes < target * 0.92) await page.eval(sv("t.flood(" + (target - look.foes) + "); return true;"));
    await press(page, nextLetter(look.slots));
    keys += 1;
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  const last = { frames: await page.eval("window.__perfFrames"), ...(await metrics()) };
  const costs = await page.eval(sv("return t.costs();"));
  const info = await page.eval(sv("return t.info();"));
  const shot = await page.shot(out("survival-s0-perf-" + label + "-" + size + ".png"));
  const n = costs.draw.length;
  const take = (list) => list.slice(Math.max(0, n - (last.frames - first.frames)));
  const frame = take(costs.draw).map((draw, k) => draw + take(costs.update)[k]);
  const frames = last.frames - first.frames;
  const seconds = (Date.now() - started) / 1000;
  foes.sort((a, b) => a - b);
  return {
    frameMs: stats(frame),
    drawMs: stats(take(costs.draw)),
    updateMs: stats(take(costs.update)),
    intervalMs: stats(take(costs.interval)),
    fps: +(frames / seconds).toFixed(1),
    chromeMainThreadMsPerFrame: +(((last.TaskDuration - first.TaskDuration) * 1000) / Math.max(1, frames)).toFixed(3),
    chromeScriptMsPerFrame: +(((last.ScriptDuration - first.ScriptDuration) * 1000) / Math.max(1, frames)).toFixed(3),
    maxDrawCalls: calls,
    foes: { min: foes[0], median: foes[foes.length >> 1], max: foes.at(-1) },
    info,
    keys,
    startCosts,
    shot,
  };
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const ready = await open(page);
  await page.send("Performance.enable", { timeDomain: "timeTicks" });
  await page.eval(`window.__perfFrames = 0; (function count() { window.__perfFrames += 1; requestAnimationFrame(count); })(); true`);
  const gpu = await page.eval(`(() => { const gl = document.createElement("canvas").getContext("webgl2"); const ext = gl && gl.getExtension("WEBGL_debug_renderer_info"); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown"; })()`);
  const surge = await measure(page, "surge", size, 160);
  const flood = await measure(page, "flood", size, 700);
  const checks = {
    ready,
    surgeHeld: surge.foes.median >= 140,
    surgeMeanWithin6ms: surge.frameMs.mean <= 6,
    surgeP95Within10ms: surge.frameMs.p95 <= 10,
    floodHeld: flood.foes.median >= 600,
    floodP95Within14ms: flood.frameMs.p95 <= 14,
    drawCallsWithin160: surge.maxDrawCalls <= 160 && flood.maxDrawCalls <= 160,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, gpu, surge, flood };
}
