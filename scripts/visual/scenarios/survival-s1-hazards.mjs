// Tuyến Cuối S1 (docs/BUILD_S1.md §16 "survival-s1-hazards"; R1: Vết nứt, R2
// adds Bão ion and Giếng hấp dẫn): stage 3 until its first rift; frames
// 100 ms apart from its warning (the wall's crack glowing hotter, the HUD's
// side warning counting down) through its opening (sparks, smoke, mines
// pouring out at 11–15 m). Checks: one telegraph on screen at a time, the
// warning on the rift's side, the mines poured, no console error. The wait
// for the warning follows the game's clock, not the wall's: on a slow
// renderer (software WebGL) 45 s of wall time were not 22 s of fight (R1 review).
//   URL=http://127.0.0.1:3007/ OUT_DIR=… node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-s1-hazards.mjs --width=1280 --height=720
import { frames, openStage, out, press, sv } from "./survival-s1-lib.mjs";

const EV = { telegraph: 28, rift: 31 };

/** Types (at `wpm`, the bay with fewest magazines first) until `code` holds or `ms` pass: the line stays up meanwhile. */
async function typeUntil(page, code, ms, wpm = 40) {
  const end = Date.now() + ms;
  const keyMs = 60000 / (wpm * 5);
  while (Date.now() < end) {
    const at = Date.now();
    const look = await page.eval(sv("return { done: " + code + ", slots: t.slots() };"));
    if (look.done === true) return true;
    const locked = look.slots.find((slot) => slot.locked);
    let pick = look.slots[0];
    for (const slot of look.slots) if (slot.mags < pick.mags) pick = slot;
    await press(page, locked ? locked.text[locked.typed] : pick.text[0]);
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  return false;
}

export default async function (page) {
  const size = page.width + "x" + page.height;
  const ready = await openStage(page, "c1-s3", ["xung", "tan"], "&director=0");
  // Until the first rift warns, or the fight is 5 s past its time without one (a bug); at most 10 min of wall time.
  await typeUntil(page, "t.state().rifts.state === 1 || t.state().time > t.state().rifts.at[0] + 5", 600000);
  const warned = (await page.eval(sv("return t.state().rifts.state === 1;"))) === true;
  const warning = await page.eval(sv("return { side: document.querySelector('.sv-warn')?.className ?? '', text: document.querySelector('.sv-warn')?.textContent ?? '', banners: document.querySelectorAll('.sv-banner.is-on').length, rift: t.state().rifts };"));
  const shots = await frames(page, "survival-s1-hazards-rift", 30, 100);
  const after = await page.eval(sv("return { events: t.events(), state: t.state() };"));
  const still = await page.shot(out("survival-s1-hazards-rift-after-" + size + ".png"));
  const checks = {
    ready,
    warned,
    warningOnItsSide: /is-(left|right)/.test(warning.side) && /VẾT NỨT/.test(warning.text),
    oneTelegraphAtATime: warning.banners === 0,
    opened: after.events[EV.rift] > 0,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, warning, frames: shots, still };
}
