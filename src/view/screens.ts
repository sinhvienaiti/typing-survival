/**
 * The screens over the fight (DOM in the HUD's overlay, styled by
 * survival.css with theme.css's variables): the title "Tuyến Cuối", settings,
 * the armory and learning placeholder, pause and the results. Each is drawn
 * whole from its menu (src/app/menu.ts) whenever something changes; a pointer
 * can hover (select) and click (take) the items too.
 */
import type { Menu, MenuItem } from "../app/menu";

export type Stat = { value: string; label: string };
export type Learned = { en: string; vi: string };
export type GunCard = { name: string; title: string; text: string; kind: "xung" | "tia" };

export type ScreenView =
  | { kind: "title"; menu: Menu; status: string; lead: string }
  | { kind: "settings"; menu: Menu; note: string }
  | { kind: "armory"; menu: Menu; guns: readonly GunCard[]; learning: readonly string[] }
  | { kind: "pause"; menu: Menu }
  | { kind: "end"; menu: Menu; won: boolean; stats: readonly Stat[]; words: readonly Learned[] };

const escapeHtml = (text: string): string => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);

/** An LED bar of ten segments, `level` 0 … 1 lit. */
function led(level: number): string {
  const lit = Math.round(Math.max(0, Math.min(1, level)) * 10);
  let cells = "";
  for (let k = 0; k < 10; k += 1) cells += k < lit ? '<i class="is-lit"></i>' : "<i></i>";
  return '<span class="sv-ledbar" aria-hidden="true">' + cells + "</span>";
}

function item(entry: MenuItem, index: number, on: boolean): string {
  const classes = ["sv-item", on ? "is-on" : "", entry.enabled ? "" : "is-off", entry.value !== undefined ? "is-setting" : ""].filter(Boolean).join(" ");
  const value =
    entry.value === undefined
      ? ""
      : '<span class="sv-value">' + (entry.level !== undefined ? led(entry.level) : "") + '<span class="sv-arrow">◀</span><b>' + escapeHtml(entry.value) + '</b><span class="sv-arrow">▶</span></span>';
  return (
    '<div class="' + classes + '" data-index="' + index + '" role="menuitem" aria-disabled="' + !entry.enabled + '"' + (on ? ' aria-current="true"' : "") + ">" +
    '<span class="sv-led" aria-hidden="true"></span>' +
    '<span class="sv-item-text"><b>' + escapeHtml(entry.label) + "</b>" + (entry.note ? "<small>" + escapeHtml(entry.note) + "</small>" : "") + "</span>" +
    value +
    "</div>"
  );
}

function menu(m: Menu, extra = ""): string {
  return '<nav class="sv-menu' + extra + '" role="menu">' + m.items.map((entry, index) => item(entry, index, index === m.index)).join("") + "</nav>";
}

const hints = (text: string): string => '<footer class="sv-hints">' + text + "</footer>";

export function renderScreen(view: ScreenView): string {
  switch (view.kind) {
    case "title":
      return (
        '<div class="sv-title">' +
        '<div class="sv-card sv-panel sv-title-card">' +
        '<div class="sv-title-tag"><span class="sv-dot"></span>TRẠM VC-7 · VÀNH CHÂN TRỜI</div>' +
        '<h1 class="sv-title-name">TUYẾN CUỐI</h1>' +
        '<div class="sv-title-en">LAST LINE</div>' +
        '<div class="sv-hazard" aria-hidden="true"></div>' +
        '<p class="sv-lead">' + escapeHtml(view.lead) + "</p>" +
        menu(view.menu) +
        '<div class="sv-status">' + escapeHtml(view.status) + "</div>" +
        hints("<kbd>↑</kbd><kbd>↓</kbd> chọn · <kbd>Enter</kbd> vào · <kbd>Esc</kbd> quay lại") +
        "</div></div>"
      );
    case "settings":
      return (
        '<div class="sv-card sv-panel sv-sheet">' +
        '<h1>CÀI ĐẶT</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        menu(view.menu, " sv-settings") +
        (view.note ? '<p class="sv-note">' + escapeHtml(view.note) + "</p>" : "") +
        hints("<kbd>↑</kbd><kbd>↓</kbd> chọn · <kbd>←</kbd><kbd>→</kbd> đổi · <kbd>Esc</kbd> xong") +
        "</div>"
      );
    case "armory":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-armory">' +
        '<h1>KHO SÚNG · HỌC TỪ</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        '<div class="sv-guns">' +
        view.guns.map((gun) => '<section class="sv-gun-card sv-' + gun.kind + '"><header><b>' + escapeHtml(gun.name) + "</b><small>" + escapeHtml(gun.title) + "</small></header><p>" + escapeHtml(gun.text) + "</p></section>").join("") +
        "</div>" +
        '<ul class="sv-learning">' + view.learning.map((line) => "<li>" + escapeHtml(line) + "</li>").join("") + "</ul>" +
        menu(view.menu) +
        hints("<kbd>Enter</kbd> hoặc <kbd>Esc</kbd> quay lại") +
        "</div>"
      );
    case "pause":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-pause">' +
        '<h1>TẠM DỪNG</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        menu(view.menu) +
        hints("<kbd>Esc</kbd> chơi tiếp · <kbd>↑</kbd><kbd>↓</kbd> chọn · <kbd>Enter</kbd> vào") +
        "</div>"
      );
    case "end":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-end ' + (view.won ? "is-won" : "is-lost") + '">' +
        "<h1>" + (view.won ? "TRỤ VỮNG!" : "TUYẾN ĐÃ VỠ") + '</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        '<div class="sv-stats">' + view.stats.map((stat) => "<div><b>" + escapeHtml(stat.value) + "</b><small>" + escapeHtml(stat.label) + "</small></div>").join("") + "</div>" +
        '<ul class="sv-words">' + view.words.map((word) => "<li><b>" + escapeHtml(word.en) + "</b>" + escapeHtml(word.vi) + "</li>").join("") + "</ul>" +
        menu(view.menu, " sv-row") +
        hints("<kbd>Enter</kbd> chơi lại · <kbd>Esc</kbd> màn chính") +
        "</div>"
      );
  }
}
