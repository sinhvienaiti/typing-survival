/**
 * The parts every screen over the fight is drawn from (split from screens.ts
 * by ALIVE_PLAN AL-00; it goes with screens.ts): a menu of items (src/app/
 * menu.ts) with their icons, LED meters, value arrows and stars; the key
 * hints on their key caps; the advice line, note lists and stat tiles. A
 * pointer can hover (select) and click (take) the items too.
 */
import type { Menu, MenuItem } from "../app/menu";
import { artHtml, type ArtPlace } from "./ui-art";

/** `icon`: a role (ui-art.ts) drawn beside the number. */
export type Stat = { value: string; label: string; note?: string; icon?: string };
/** `fresh`: finished for the first time ever in this run (the new badge, LL-52); others get the check. */
export type Learned = { en: string; vi: string; fresh?: boolean };

export const escapeHtml = (text: string): string => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);

/** An LED bar of ten segments, `level` 0 … 1 lit. */
function led(level: number): string {
  const lit = Math.round(Math.max(0, Math.min(1, level)) * 10);
  let cells = "";
  for (let k = 0; k < 10; k += 1) cells += k < lit ? '<i class="is-lit"></i>' : "<i></i>";
  return '<span class="sv-ledbar" aria-hidden="true">' + cells + "</span>";
}

/** A stage's stars after its label (lit, then dark), or the lock of a stage not open yet. */
function stars(entry: MenuItem): string {
  if (entry.locked) return '<span class="sv-stars">' + artHtml("icon-lock", "icon") + "</span>";
  if (entry.stars === undefined) return "";
  let html = "";
  for (let k = 0; k < 3; k += 1) html += k < entry.stars ? artHtml("icon-star-lit", "icon", { cls: "is-lit" }) : artHtml("icon-star-unlit", "icon");
  return '<span class="sv-stars" role="img" aria-label="' + entry.stars + ' of 3 stars">' + html + "</span>";
}

/** `place`: the icons' size; `gap`: an item without an icon keeps the column (its menu has icons). */
function item(entry: MenuItem, index: number, on: boolean, place: ArtPlace, gap: boolean): string {
  const classes = ["sv-item", on ? "is-on" : "", entry.enabled ? "" : "is-off", entry.value !== undefined ? "is-setting" : ""].filter(Boolean).join(" ");
  const value =
    entry.value === undefined
      ? ""
      : '<span class="sv-value">' + (entry.level !== undefined ? led(entry.level) : "") + artHtml("part-arrow", "arrow", { cls: "is-left" }) + "<b>" + escapeHtml(entry.value) + "</b>" + artHtml("part-arrow", "arrow") + "</span>";
  const icon = entry.icon ? artHtml(entry.icon, place) : gap && !entry.art ? '<i class="sv-icon-gap sv-gap-' + place + '" aria-hidden="true"></i>' : "";
  return (
    '<div class="' + classes + '" data-index="' + index + '" data-id="' + escapeHtml(entry.id) + '" role="menuitem" aria-disabled="' + !entry.enabled + '"' + (on ? ' aria-current="true"' : "") + ">" +
    artHtml(on ? "part-led-on" : "part-led-off", "led") + icon + (entry.art ? artHtml(entry.art, "menu") : "") +
    '<span class="sv-item-text"><b>' + escapeHtml(entry.label) + "</b>" + (entry.note ? "<small>" + escapeHtml(entry.note) + "</small>" : "") + "</span>" +
    stars(entry) + value +
    "</div>"
  );
}

/** `place`: the size of the items' icons (32 px on the title, 28 px elsewhere: UI pass 2, 31/10; were 24 and 20, UI_IMAGERY LL-09, LL-48). */
export function menu(m: Menu, extra = "", place: ArtPlace = "icon"): string {
  const gap = m.items.some((entry) => entry.icon !== undefined);
  return '<nav class="sv-menu' + extra + '" role="menu">' + m.items.map((entry, index) => item(entry, index, index === m.index, place, gap)).join("") + "</nav>";
}

/** The key hints; each key is drawn on a key cap (screens.css, part-keycap). */
export const hints = (text: string): string => '<footer class="sv-hints">' + text + "</footer>";

/** The advice line on its word plate, led by the learning-rule icon (UI pass 3: was a CSS rule on a flat block). */
export const advice = (text: string): string => '<p class="sv-advice">' + artHtml("icon-learning-rule", "icon") + "<span>" + escapeHtml(text) + "</span></p>";

/** Notes as a list; each bullet is the panel lamp's art (screens.css), not the browser's disc. */
export const learningList = (lines: readonly string[]): string => '<ul class="sv-learning">' + lines.map((line) => "<li>" + escapeHtml(line) + "</li>").join("") + "</ul>";

/** A stat tile: its icon beside the number. */
export const statTile = (stat: Stat, note = false): string =>
  "<div><b>" + (stat.icon ? artHtml(stat.icon, "item") : "") + escapeHtml(stat.value) + "</b><small>" + escapeHtml(stat.label) + "</small>" + (note && stat.note ? "<em>" + escapeHtml(stat.note) + "</em>" : "") + "</div>";
