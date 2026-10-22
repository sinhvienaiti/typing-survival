// Sinh Tồn S0 (docs/survival/BUILD_S0.md §9): 12 frames 50 ms apart round one
// Tia magazine fired into a dense crowd pressing on the ship, to read the
// rhythm of the effects.
// The page's frame clock is held and stepped (window.__survival.hold/advance),
// so the frames are exactly 50 ms apart however long a capture takes.
//   URL=http://127.0.0.1:3120/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/survival-s0-frames.mjs --width=1280 --height=720
import { out } from "./common.mjs";
import { open, sv, typeSlot } from "./survival-s0-lib.mjs";

export default async function (page) {
  const size = page.width + "x" + page.height;
  const ready = await open(page);
  // A dense crowd walking into the ray's reach (it is flooded beyond it).
  await page.eval(sv("t.flood(220); return true;"));
  await page.sleep(3600);
  const word = await typeSlot(page, 1, 70);
  let beam = null;
  for (let wait = 0; wait < 40 && beam === null; wait += 1) {
    beam = (await page.eval(sv("return t.state().beam;"))) ?? null;
    if (beam === null) await page.sleep(25);
  }
  await page.eval(sv("t.hold(true); return true;"));
  const frames = [];
  const kills = [];
  for (let k = 0; k < 12; k += 1) {
    frames.push(await page.shot(out("survival-s0-frames-" + size + "-" + String(k).padStart(2, "0") + ".png")));
    kills.push(await page.eval(sv("return t.state().stats.kills;")));
    await page.eval(sv("t.advance(50); return true;"));
  }
  await page.eval(sv("t.hold(false); return true;"));
  const checks = {
    ready,
    beamFired: beam !== null,
    killsDuringSequence: kills.at(-1) > kills[0],
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, word, beam, kills, frames };
}
