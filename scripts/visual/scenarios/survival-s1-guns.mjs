// Tuyến Cuối S1 (docs/BUILD_S1.md §12, §16 "survival-s1-guns"): for each new
// gun and foe, a small scene set up with logged `place` commands on a chapter
// stage, a magazine typed for real, then frames 50 ms apart on the page's held
// clock around it: Tán's blast and knock-back into a pack at the line; Ray's
// charge and its line through a row; Pháo Sao's shell arc, landing ring and
// burst on a cluster; a Khiên's wall stopping Xung, then broken by Ray;
// Tách splitting under Tia; Đầu Đàn's beacon and a Trâu's stomp. Checks: the
// events happened (volley, rail, launch/burst, shield hit/break, split), no
// console error.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-guns.mjs --width=1280 --height=720
import { KIND, frames, openStage, out, sv, typeBay, until } from "./survival-s1-lib.mjs";

const EV = { hit: 2, kill: 3, volley: 20, charge: 21, rail: 22, launch: 23, burst: 24, shieldHit: 25, shieldBreak: 26, split: 27 };

async function place(page, list) {
  for (const [kind, x, z] of list) await page.eval(sv("t.place(" + kind + ", " + x + ", " + z + "); return true;"));
  await page.sleep(80);
}

const events = (page) => page.eval(sv("return t.events();"));

export default async function (page) {
  const result = {};
  const size = page.width + "x" + page.height;

  // Tán: a pack of 14 mines at the line, one magazine.
  result.tan = { ready: await openStage(page, "c1-s1", ["tan", "xung"], "&director=0") };
  await place(page, Array.from({ length: 14 }, (_, i) => [KIND.mine, -4 + (i % 7) * 1.3, 6.5 + Math.floor(i / 7) * 1.3]));
  await typeBay(page, 0, 40);
  await until(page, "t.events()[" + EV.volley + "] > 0", 3000);
  result.tan.frames = await frames(page, "survival-s1-guns-tan");
  result.tan.events = await events(page);

  // Ray: a row of scouts and mines straight down the corridor, a Trâu behind them.
  result.ray = { ready: await openStage(page, "c1-s1", ["ray", "xung"], "&director=0") };
  await place(page, [[KIND.scout, 0.4, 8], [KIND.mine, 0.2, 11], [KIND.mine, -0.2, 14], [KIND.brute, 0, 18], [KIND.mine, 0.3, 22]]);
  await typeBay(page, 0, 40);
  await until(page, "t.events()[" + EV.charge + "] > 0", 3000);
  result.ray.frames = await frames(page, "survival-s1-guns-ray");
  result.ray.events = await events(page);

  // Pháo Sao: a cluster of 12 mines 15 m out; 16 frames cover the 0.7 s flight and the burst.
  result.phao = { ready: await openStage(page, "c1-s1", ["phao", "xung"], "&director=0") };
  await place(page, Array.from({ length: 12 }, (_, i) => [KIND.mine, 3 + (i % 4) * 1.1, 15 + Math.floor(i / 4) * 1.1]));
  await typeBay(page, 0, 40);
  await until(page, "t.events()[" + EV.launch + "] > 0", 3000);
  result.phao.frames = await frames(page, "survival-s1-guns-phao", 16);
  result.phao.events = await events(page);

  // Khiên: Xung's rounds stop on the wall, then Ray breaks it.
  result.shield = { ready: await openStage(page, "c1-s4", ["xung", "ray"], "&director=0") };
  await place(page, [[KIND.shield, 0, 9.5], [KIND.mine, -1, 11], [KIND.mine, 0, 11.2], [KIND.mine, 1, 11]]);
  await page.sleep(400);
  await typeBay(page, 0, 40);
  await page.sleep(600);
  result.shield.wall = await page.shot(out("survival-s1-guns-shield-wall-" + size + ".png"));
  await typeBay(page, 1, 40);
  await until(page, "t.events()[" + EV.charge + "] > 0", 3000);
  result.shield.frames = await frames(page, "survival-s1-guns-shield");
  result.shield.events = await events(page);

  // Tách under Tia: they split into three shards each.
  result.split = { ready: await openStage(page, "c1-s1", ["tia", "xung"], "&director=0") };
  await place(page, [[KIND.splitter, -3, 8], [KIND.splitter, 0, 9], [KIND.splitter, 3, 8], [KIND.splitter, 0, 6.5]]);
  await typeBay(page, 0, 40);
  await until(page, "t.state().beam !== null", 3000);
  result.split.frames = await frames(page, "survival-s1-guns-split");
  result.split.events = await events(page);

  // Đầu Đàn's beacon and Trâu stomping close.
  result.leader = { ready: await openStage(page, "c1-s2", ["ray", "xung"], "&director=0") };
  await place(page, [[KIND.leader, -2, 18], [KIND.brute, 4, 12], [KIND.brute, -5, 13]]);
  await page.sleep(1500);
  result.leader.shot = await page.shot(out("survival-s1-guns-leader-" + size + ".png"));
  result.leader.frames = await frames(page, "survival-s1-guns-leader", 8, 100);

  const checks = {
    ready: Object.values(result).every((r) => r.ready),
    tanVolleys: result.tan.events[EV.volley] > 0 && result.tan.events[EV.kill] > 0,
    rayFires: result.ray.events[EV.charge] > 0 && result.ray.events[EV.rail] > 0 && result.ray.events[EV.hit] >= 3,
    phaoBursts: result.phao.events[EV.launch] > 0 && result.phao.events[EV.burst] > 0,
    shieldStopsThenBreaks: result.shield.events[EV.shieldHit] > 0 && result.shield.events[EV.shieldBreak] > 0,
    splits: result.split.events[EV.split] > 0,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, result };
}
