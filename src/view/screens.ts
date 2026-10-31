/**
 * The screens over the fight (DOM in the HUD's overlay, styled by
 * survival.css with theme.css's variables): the title "Tuyến Cuối" (with the
 * mode), settings (with "Nhịp tự điều"), the armory and learning placeholder,
 * the typing profile "Hồ sơ gõ", pause and the results (with one line of
 * advice). Each is drawn
 * whole from its menu (src/app/menu.ts) whenever something changes; a pointer
 * can hover (select) and click (take) the items too.
 */
import type { Menu, MenuItem } from "../app/menu";
import type { GunKey } from "../content/guns";
import { artHtml, gunRole, stageRole, bgRole, type ArtPlace } from "./ui-art";

/** `icon`: a role (ui-art.ts) drawn beside the number. */
export type Stat = { value: string; label: string; note?: string; icon?: string };
/** `fresh`: finished for the first time ever in this run (the new badge, LL-52); others get the check. */
export type Learned = { en: string; vi: string; fresh?: boolean };
export type GunCard = { name: string; title: string; text: string; kind: GunKey };

export type ScreenView =
  | { kind: "title"; menu: Menu; status: string; lead: string }
  | { kind: "settings"; menu: Menu; note: string }
  | { kind: "armory"; menu: Menu; guns: readonly GunCard[]; learning: readonly string[] }
  | { kind: "profile"; menu: Menu; stats: readonly Stat[]; advice: string; lines: readonly string[] }
  | { kind: "pause"; menu: Menu }
  | { kind: "intro"; title: string; lines: readonly string[]; ready: boolean; stage?: string; guns?: readonly GunKey[] }
  | { kind: "end"; menu: Menu; mode: string; won: boolean; stats: readonly Stat[]; words: readonly Learned[]; advice: string; note: string; stage?: string; stars?: string };

/** Words listed on the end screen (two columns of five). */
const END_WORDS = 10;

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
    '<div class="' + classes + '" data-index="' + index + '" role="menuitem" aria-disabled="' + !entry.enabled + '"' + (on ? ' aria-current="true"' : "") + ">" +
    artHtml(on ? "part-led-on" : "part-led-off", "led") + icon + (entry.art ? artHtml(entry.art, "menu") : "") +
    '<span class="sv-item-text"><b>' + escapeHtml(entry.label) + "</b>" + (entry.note ? "<small>" + escapeHtml(entry.note) + "</small>" : "") + "</span>" +
    stars(entry) + value +
    "</div>"
  );
}

/** `place`: the size of the items' icons (24 px on the title, 20 px elsewhere: UI_IMAGERY LL-09, LL-48). */
export function menu(m: Menu, extra = "", place: ArtPlace = "icon"): string {
  const gap = m.items.some((entry) => entry.icon !== undefined);
  return '<nav class="sv-menu' + extra + '" role="menu">' + m.items.map((entry, index) => item(entry, index, index === m.index, place, gap)).join("") + "</nav>";
}

/** The key hints; each key is drawn on a key cap (survival.css, part-keycap). */
export const hints = (text: string): string => '<footer class="sv-hints">' + text + "</footer>";

/** A stat tile: its icon beside the number. */
const statTile = (stat: Stat, note = false): string =>
  "<div><b>" + (stat.icon ? artHtml(stat.icon, "item") : "") + escapeHtml(stat.value) + "</b><small>" + escapeHtml(stat.label) + "</small>" + (note && stat.note ? "<em>" + escapeHtml(stat.note) + "</em>" : "") + "</div>";

export function renderScreen(view: ScreenView): string {
  switch (view.kind) {
    case "title":
      return (
        artHtml(bgRole("menu"), "bg") + '<div class="sv-title">' +
        '<div class="sv-card sv-panel sv-title-card">' +
        '<div class="sv-title-tag">' + artHtml("icon-station-crest", "icon") + "STATION VC-7 · EVENT HORIZON</div>" +
        '<h1 class="sv-title-name">LAST LINE</h1>' +
        '<div class="sv-title-en">HOLD THE LINE</div>' +
        '<div class="sv-hazard" aria-hidden="true"></div>' +
        '<p class="sv-lead">' + escapeHtml(view.lead) + "</p>" +
        menu(view.menu, "", "item") +
        '<div class="sv-status">' + escapeHtml(view.status) + "</div>" +
        hints("<kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> play · <kbd>Esc</kbd> back") +
        "</div></div>"
      );
    case "settings":
      return (
        '<div class="sv-card sv-panel sv-sheet">' +
        '<h1>OPTIONS</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        menu(view.menu, " sv-settings") +
        (view.note ? '<p class="sv-note">' + escapeHtml(view.note) + "</p>" : "") +
        hints("<kbd>↑</kbd><kbd>↓</kbd> select · <kbd>←</kbd><kbd>→</kbd> change · <kbd>Esc</kbd> done") +
        "</div>"
      );
    case "armory":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-armory">' +
        '<h1>ARMORY · LEARNING</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        '<div class="sv-guns">' +
        view.guns.map((gun) => '<section class="sv-gun-card sv-' + gun.kind + '">' + artHtml(gunRole(gun.kind), "armory") + '<header><b>' + escapeHtml(gun.name) + "</b><small>" + escapeHtml(gun.title) + "</small></header><p>" + escapeHtml(gun.text) + "</p></section>").join("") +
        "</div>" +
        '<ul class="sv-learning">' + view.learning.map((line) => "<li>" + escapeHtml(line) + "</li>").join("") + "</ul>" +
        menu(view.menu) +
        hints("<kbd>Enter</kbd> / <kbd>Esc</kbd> back") +
        "</div>"
      );
    case "profile":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-profile">' +
        '<h1>TYPING PROFILE</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        '<div class="sv-stats">' + view.stats.map((stat) => statTile(stat, true)).join("") + "</div>" +
        '<p class="sv-advice">' + escapeHtml(view.advice) + "</p>" +
        '<ul class="sv-learning">' + view.lines.map((line) => "<li>" + escapeHtml(line) + "</li>").join("") + "</ul>" +
        menu(view.menu) +
        hints("<kbd>Enter</kbd> / <kbd>Esc</kbd> back") +
        "</div>"
      );
    case "pause":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-pause">' +
        '<h1>PAUSED</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        menu(view.menu) +
        hints("<kbd>Esc</kbd> resume · <kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> confirm") +
        "</div>"
      );
    case "intro":
      // The stage's card before its fight (a page from the journey or a replay): the first key goes in and opens the sound.
      return (
        '<div class="sv-card sv-panel sv-sheet sv-intro">' +
        "<h1>" + escapeHtml(view.title) + '</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        (view.stage ? artHtml(stageRole(view.stage), "intro") : "") +
        view.lines.map((line, n) => "<p>" + (n === 1 && view.guns ? line.split(" · ").map((name, i) => (view.guns?.[i] ? artHtml(gunRole(view.guns[i]!), "introGun") : "") + escapeHtml(name)).join(" · ") : escapeHtml(line)) + "</p>").join("") +
        '<div class="sv-start' + (view.ready ? " is-on sv-go" : " is-off") + '">' + (view.ready ? "PRESS ANY KEY TO PLAY" : "LOADING…") + "</div>" +
        hints("In battle: <kbd>Esc</kbd> pause") +
        "</div>"
      );
    case "end":
      return (
        artHtml(bgRole(view.won ? "results-win" : "results-lose"), "bg") + '<div class="sv-card sv-panel sv-sheet sv-end ' + (view.won ? "is-won" : "is-lost") + '">' +
        "<h1>" + (view.stage ? (view.won ? "STAGE CLEAR!" : "STAGE LOST") : view.won ? "LINE HELD!" : "LINE LOST") + '</h1><div class="sv-end-mode">' + escapeHtml(((view.stage ? view.stage + " · " : "") + view.mode).toUpperCase()) + '</div><div class="sv-hazard" aria-hidden="true"></div>' +
        (view.stars ?? "") +
        '<div class="sv-stats">' + view.stats.map((stat) => statTile(stat)).join("") + "</div>" +
        (view.advice ? '<p class="sv-advice">' + escapeHtml(view.advice) + "</p>" : "") +
        (view.note ? '<p class="sv-note">' + escapeHtml(view.note) + "</p>" : "") +
        // The last words typed, as many as the card holds without scrolling (the keys cannot scroll it), and how many more.
        '<ul class="sv-words">' + view.words.slice(-END_WORDS).map((word) => "<li>" + (word.fresh ? artHtml("icon-new-badge", "small", { label: true }) : artHtml("icon-check", "small")) + "<b>" + escapeHtml(word.en) + "</b>" + escapeHtml(word.vi) + "</li>").join("") + "</ul>" +
        (view.words.length > END_WORDS ? '<p class="sv-note sv-more">' + "Last " + END_WORDS + " words · " + (view.words.length - END_WORDS) + " more in your learning log</p>" : "") +
        menu(view.menu, " sv-row") +
        hints("<kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> confirm · <kbd>Esc</kbd> menu") +
        "</div>"
      );
  }
}
