// Fresh profile: recommended loadout, START note, then the first loading hint.
// Claude checks two real loads and the subsequent reload manually.
// Run from the game root; captures default to tmp/visual via common.mjs.
import { DEV_URL, out } from "./common.mjs";
import { sv } from "./survival-s0-lib.mjs";

const key = (page, code) => page.key(code, { code });
const HINT = "Type a word on a bay to load its gun";
const NOTE = "Press Enter to start. Guns fire on their own; type words to load them.";

export default async function (page) {
  const size = page.width + "x" + page.height;
  const url = DEV_URL.replace(/\/$/, "") + "/index.html?seed=2";
  const shots = [];
  const ready = async () => {
    for (let w = 0; w < 80; w += 1) {
      if ((await page.eval(sv("return t.ready();"))) === true) return;
      await page.sleep(250);
    }
    throw new Error("Last Line assets did not become ready");
  };
  await page.goto(url, { settle: 300 });
  await page.eval("localStorage.removeItem('survival.stages'); localStorage.removeItem('survival.guide'); sessionStorage.removeItem('survival.next'); true");
  // Recreate the page's hint state after clearing the record.
  await page.goto(url, { settle: 300 });
  await ready();
  for (let n = 0; n < 3; n += 1) {
    await key(page, "Enter");
    await page.sleep(250);
  }
  const loadout = await page.eval(sv(`return { ...t.journey(), labels: document.querySelectorAll('.sv-rec').length, note: document.querySelector('.sv-start-note')?.textContent ?? '' };`));
  shots.push(await page.shot(out("survival-s1-first-run-loadout-" + size + ".png")));
  await key(page, "Enter");
  await ready();
  let card;
  for (let w = 0; w < 80; w += 1) {
    card = await page.eval(sv("return { mode: t.mode(), tick: t.state().tick };"));
    if (card?.mode === "intro") break;
    await page.sleep(250);
  }
  if (card?.mode !== "intro") throw new Error("First-run stage card did not open");
  await page.key("q", { code: "KeyQ", text: "q" });
  await page.sleep(300);
  const fight = await page.eval(sv("const notice = document.querySelector('.sv-notice'); return { mode: t.mode(), text: notice.textContent, className: notice.className, hidden: notice.hidden };"));
  shots.push(await page.shot(out("survival-s1-first-run-hint-" + size + ".png")));
  const checks = {
    recommendedPair: JSON.stringify(loadout.picked) === "[0,1]" && loadout.ready === true,
    startFocused: loadout.cursor === 5,
    twoLabels: loadout.labels === 2,
    startNote: loadout.note === NOTE,
    stageCard: card.mode === "intro" && card.tick === 0,
    loadingHint: fight.mode === "play" && fight.text === HINT && fight.className.split(/\s+/).includes("is-hint") && !fight.hidden,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  // Leave the fight open; do not finish words automatically.
  return { pass, checks, loadout, card, fight, shots, manual: "Load two words, verify the hint hides, then reload and verify it stays hidden. Also check Escape from the stage card preserves both guns in order." };
}
