// Shared steps of the S1 browser scenarios (survival-s1-*.mjs,
// docs/BUILD_S1.md §16): open a chapter stage with chosen guns
// (?stage=&guns=, the page's own way into a fight), type a bay's word with
// real keys, capture frame sequences on the page's held clock.
import { DEV_URL, out } from "./common.mjs";
import { press, sv } from "./survival-s0-lib.mjs";

export { press, sv, out };

/** Foe kinds (content/foes.ts KIND). */
export const KIND = { mine: 0, scout: 1, brute: 2, shield: 3, splitter: 4, shard: 5, leader: 6 };

export async function openStage(page, stage, guns, query = "") {
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/index.html?seed=3&autostart=1&stage=" + stage + "&guns=" + guns.join(",") + query, { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 120 && !ready; wait += 1) {
    ready = (await page.eval(sv("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  return ready;
}

/** Types bay `bay`'s word (its letters as shown; a hidden letter is typed as the word has it). */
export async function typeBay(page, bay, gapMs = 50) {
  const slots = await page.eval(sv("return t.slots();"));
  const word = slots[bay].text;
  for (const letter of word) {
    await press(page, letter);
    await page.sleep(gapMs);
  }
  return word;
}

/** `count` frames `stepMs` apart on the held clock: out/<name>-<size>-NN.png. */
export async function frames(page, name, count = 12, stepMs = 50) {
  const size = page.width + "x" + page.height;
  await page.eval(sv("t.hold(true); return true;"));
  const files = [];
  for (let k = 0; k < count; k += 1) {
    files.push(await page.shot(out(name + "-" + size + "-" + String(k).padStart(2, "0") + ".png")));
    await page.eval(sv("t.advance(" + stepMs + "); return true;"));
  }
  await page.eval(sv("t.hold(false); return true;"));
  return files;
}

/** Waits until `code` (a __survival expression returning true) or `ms`. */
export async function until(page, code, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if ((await page.eval(sv("return " + code + ";"))) === true) return true;
    await page.sleep(40);
  }
  return false;
}
