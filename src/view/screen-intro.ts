/**
 * The stage's card before its fight (split from screens.ts by ALIVE_PLAN
 * AL-00; AL-11 owns it in wave 4): a page from the journey or a replay opens
 * on it, and the first key goes in and opens the sound. Its stage art is a
 * band inside the frame's rails; the Trial's card has none.
 */
import type { GunKey } from "../content/guns";
import { escapeHtml, hints } from "./screen-parts";
import { artHtml, gunRole, stageRole } from "./ui-art";

export type IntroView = { kind: "intro"; title: string; lines: readonly string[]; ready: boolean; stage?: string; guns?: readonly GunKey[] };

export function renderIntro(view: IntroView): string {
  return (
    '<div class="sv-card sv-panel sv-sheet sv-intro">' +
    "<h1>" + escapeHtml(view.title) + '</h1><div class="sv-hazard" aria-hidden="true"></div>' +
    (view.stage ? artHtml(stageRole(view.stage), "intro") : "") +
    view.lines.map((line, n) => "<p>" + (n === 1 && view.guns ? line.split(" · ").map((name, i) => (view.guns?.[i] ? artHtml(gunRole(view.guns[i]!), "introGun") : "") + escapeHtml(name)).join(" · ") : escapeHtml(line)) + "</p>").join("") +
    '<div class="sv-start' + (view.ready ? " is-on sv-go" : " is-off") + '">' + (view.ready ? "PRESS ANY KEY TO PLAY" : "LOADING…") + "</div>" +
    hints("In battle: <kbd>Esc</kbd> pause") +
    "</div>"
  );
}
