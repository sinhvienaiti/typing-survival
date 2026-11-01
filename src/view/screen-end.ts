/**
 * The results card after a run (split from screens.ts by ALIVE_PLAN AL-00;
 * AL-13 owns it in wave 4): won or lost over its painted background, the
 * stage and mode, the stars, the stat tiles, one line of advice, the last
 * words typed and the menu (next stage, retry, stages, main menu).
 */
import type { Menu } from "../app/menu";
import { advice, escapeHtml, hints, menu, statTile, type Learned, type Stat } from "./screen-parts";
import { artHtml, bgRole } from "./ui-art";

export type EndView = { kind: "end"; menu: Menu; mode: string; won: boolean; stats: readonly Stat[]; words: readonly Learned[]; advice: string; note: string; stage?: string; stars?: string };

/** Words listed on the end screen (two columns of four: UI pass 3 gave the fifth row to the 80 px stars, so the card still fits 720p). */
const END_WORDS = 8;

export function renderEnd(view: EndView): string {
  return (
    artHtml(bgRole(view.won ? "results-win" : "results-lose"), "bg") + '<div class="sv-card sv-panel sv-sheet sv-end ' + (view.won ? "is-won" : "is-lost") + '">' +
    "<h1>" + (view.stage ? (view.won ? "STAGE CLEAR!" : "STAGE LOST") : view.won ? "LINE HELD!" : "LINE LOST") + '</h1><div class="sv-end-mode">' + escapeHtml(((view.stage ? view.stage + " · " : "") + view.mode).toUpperCase()) + '</div><div class="sv-hazard" aria-hidden="true"></div>' +
    (view.stars ?? "") +
    '<div class="sv-stats">' + view.stats.map((stat) => statTile(stat)).join("") + "</div>" +
    (view.advice ? advice(view.advice) : "") +
    (view.note ? '<p class="sv-note">' + escapeHtml(view.note) + "</p>" : "") +
    // The last words typed, as many as the card holds without scrolling (the keys cannot scroll it), and how many more.
    '<ul class="sv-words">' + view.words.slice(-END_WORDS).map((word) => "<li>" + (word.fresh ? artHtml("icon-new-badge", "small", { label: true }) : artHtml("icon-check", "small")) + "<b>" + escapeHtml(word.en) + "</b>" + escapeHtml(word.vi) + "</li>").join("") + "</ul>" +
    (view.words.length > END_WORDS ? '<p class="sv-note sv-more">' + "Last " + END_WORDS + " words · " + (view.words.length - END_WORDS) + " more in your learning log</p>" : "") +
    menu(view.menu, " sv-row") +
    hints("<kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> confirm · <kbd>Esc</kbd> menu") +
    "</div>"
  );
}
