// Shared steps of the Sinh Tồn S0 browser scenarios (survival-s0-*.mjs): open
// the page on a fixed seed, wait for it (models included), type real keys
// through CDP, read window.__survival.
import { DEV_URL } from "./common.mjs";

export const sv = (code) => "(() => { const t = window.__survival; if (!t) return null; " + code + " })()";

export async function open(page, query = "") {
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/index.html?seed=1&autostart=1" + query, { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 120 && !ready; wait += 1) {
    ready = (await page.eval(sv("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  return ready;
}

/** One real key press (trusted, as a player's). */
export async function press(page, letter) {
  const code = "Key" + letter.toUpperCase();
  const vk = letter.toUpperCase().charCodeAt(0);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: letter, code, text: letter, unmodifiedText: letter, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: letter, code, windowsVirtualKeyCode: vk });
}

/** The next letter a typist would press: the locked slot's, else the first of the gun holding fewer magazines (Tia on a tie, or `prefer`). */
export function nextLetter(slots, prefer = -1) {
  const locked = slots.find((slot) => slot.locked);
  if (locked) return locked.text[locked.typed];
  const pickSlot = prefer >= 0 ? slots[prefer] : slots[0].mags < slots[1].mags ? slots[0] : slots[1];
  return pickSlot.text[0];
}

/** Types every letter of slot `index`'s word. */
export async function typeSlot(page, index, gapMs = 60) {
  const slots = await page.eval(sv("return t.slots();"));
  const word = slots[index].text;
  for (const letter of word) {
    await press(page, letter);
    await page.sleep(gapMs);
  }
  return word;
}

export const stats = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  const round = (v) => Math.round(v * 1000) / 1000;
  return { frames: sorted.length, mean: round(sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length)), median: round(at(0.5)), p95: round(at(0.95)), max: round(sorted.at(-1) ?? 0) };
};
