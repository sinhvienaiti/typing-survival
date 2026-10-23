// Tuyến Cuối S1 (docs/BUILD_S1.md §16–17 "survival-s1-perf"): frame cost on
// chapter stages with the new guns firing (R1 has two bays: stage 4 with
// Pháo Sao + Tia into Khiên packs; stage 3 with Tán + Ray and its rifts), and
// `flood(700)` with both bays firing. Measures the page's own update and draw
// times per frame (window.__survival.costs) and the draw calls.
// Targets (High tier, vsync locked): mean ≤ 6 ms, p95 ≤ 10 ms at a peak;
// flood p95 ≤ 14 ms; draw calls ≤ 160.
//   URL=http://127.0.0.1:3047/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-perf.mjs --width=1280 --height=720
import { openStage, out, sv, typeBay } from "./survival-s1-lib.mjs";
import { stats } from "./survival-s0-lib.mjs";

async function measure(page, seconds, feed) {
  await page.eval(sv("t.costs(); return true;"));
  const before = await page.eval(sv("return t.costs().update.length;"));
  const end = Date.now() + seconds * 1000;
  let calls = 0;
  let foes = 0;
  while (Date.now() < end) {
    if (feed) for (const bay of [0, 1]) await typeBay(page, bay, 25);
    const info = await page.eval(sv("return { info: t.info(), foes: t.state().foes };"));
    calls = Math.max(calls, info.info.calls);
    foes = Math.max(foes, info.foes);
    await page.sleep(200);
  }
  const costs = await page.eval(sv("return t.costs();"));
  const frame = costs.update.map((u, k) => u + costs.draw[k]).slice(Math.max(0, before - 1));
  return { frame: stats(frame), interval: stats(costs.interval.slice(Math.max(0, before - 1))), calls, foes };
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const result = {};
  result.shields = { ready: await openStage(page, "c1-s4", ["phao", "tia"], "&director=0") };
  await page.sleep(52000);
  result.shields.peak = await measure(page, 10, true);
  result.shields.shot = await page.shot(out("survival-s1-perf-shields-" + size + ".png"));
  result.rifts = { ready: await openStage(page, "c1-s3", ["tan", "ray"], "&director=0") };
  await page.sleep(20000);
  result.rifts.peak = await measure(page, 10, true);
  await page.eval(sv("t.flood(700); return true;"));
  await page.sleep(400);
  result.rifts.flood = await measure(page, 6, true);
  result.rifts.shot = await page.shot(out("survival-s1-perf-flood-" + size + ".png"));
  const checks = {
    ready: result.shields.ready && result.rifts.ready,
    peakMean: result.shields.peak.frame.mean <= 6 && result.rifts.peak.frame.mean <= 6,
    peakP95: result.shields.peak.frame.p95 <= 10 && result.rifts.peak.frame.p95 <= 10,
    floodP95: result.rifts.flood.frame.p95 <= 14,
    drawCalls: Math.max(result.shields.peak.calls, result.rifts.flood.calls) <= 160,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, result };
}
