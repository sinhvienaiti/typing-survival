/**
 * The screens over the fight (DOM in the HUD's overlay, styled by
 * screens.css with the theme's variables): the title "Tuyến Cuối" (with the
 * mode), settings (with "Nhịp tự điều"), the armory and learning placeholder,
 * the typing profile "Hồ sơ gõ" and pause; the stage card is
 * screen-intro.ts's, the results screen-end.ts's, their shared parts (menu,
 * hints, advice, stat tiles) screen-parts.ts's (split by ALIVE_PLAN AL-00).
 * Each is drawn whole from its menu (src/app/menu.ts) whenever something
 * changes; a pointer can hover (select) and click (take) the items too.
 */
import type { Menu } from "../app/menu";
import type { GunKey } from "../content/guns";
import { renderEnd, type EndView } from "./screen-end";
import { renderIntro, type IntroView } from "./screen-intro";
import { advice, escapeHtml, hints, learningList, menu, statTile, type Stat } from "./screen-parts";
import { artHtml, gunRole, bgRole } from "./ui-art";

export { escapeHtml, hints, menu, type Learned, type Stat } from "./screen-parts";
export type GunCard = { name: string; title: string; text: string; kind: GunKey };

export type ScreenView =
  | { kind: "title"; menu: Menu; status: string; lead: string }
  | { kind: "settings"; menu: Menu; note: string }
  | { kind: "armory"; menu: Menu; guns: readonly GunCard[]; learning: readonly string[] }
  | { kind: "profile"; menu: Menu; stats: readonly Stat[]; advice: string; lines: readonly string[] }
  | { kind: "pause"; menu: Menu }
  | IntroView
  | EndView;

export function renderScreen(view: ScreenView): string {
  switch (view.kind) {
    case "title": {
      // The painted logo (ticket 121) is the page's heading; without its art the name is set in the title font.
      const logo = artHtml("logo", "logo", { label: true });
      return (
        artHtml(bgRole("menu"), "bg") + '<div class="sv-title">' +
        (logo ? '<h1 class="sv-title-logo">' + logo + "</h1>" : "") +
        '<div class="sv-card sv-panel sv-title-card">' +
        '<div class="sv-title-tag">' + artHtml("icon-station-crest", "icon") + "STATION VC-7 · EVENT HORIZON</div>" +
        (logo ? "" : '<h1 class="sv-title-name">LAST LINE</h1>') +
        '<div class="sv-title-en">HOLD THE LINE</div>' +
        '<div class="sv-hazard" aria-hidden="true"></div>' +
        '<p class="sv-lead">' + escapeHtml(view.lead) + "</p>" +
        menu(view.menu, "", "item") +
        '<div class="sv-status">' + escapeHtml(view.status) + "</div>" +
        hints("<kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> play · <kbd>Esc</kbd> back") +
        "</div></div>"
      );
    }
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
        // The learning notes fill the grid's sixth cell as a tile of their own, led by the learning-rule icon (UI pass 3 fixes: an empty cell, then a plain list under the grid).
        (view.learning.length > 0 ? '<section class="sv-gun-card sv-learn-tile"><header>' + artHtml("icon-learning-rule", "icon") + "<b>HOW LEARNING WORKS</b></header>" + learningList(view.learning) + "</section>" : "") +
        "</div>" +
        menu(view.menu) +
        hints("<kbd>Enter</kbd> / <kbd>Esc</kbd> back") +
        "</div>"
      );
    case "profile":
      return (
        '<div class="sv-card sv-panel sv-sheet sv-profile">' +
        '<h1>TYPING PROFILE</h1><div class="sv-hazard" aria-hidden="true"></div>' +
        '<div class="sv-stats">' + view.stats.map((stat) => statTile(stat, true)).join("") + "</div>" +
        advice(view.advice) +
        learningList(view.lines) +
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
      return renderIntro(view);
    case "end":
      return renderEnd(view);
  }
}
