/**
 * The HUD's top row (split from hud.ts by ALIVE_PLAN AL-00; AL-07 owns it in
 * wave 3): the hull, the clock, the kills (with the run's total) and the
 * objective's plate (Săn: "PACK LEADER 1/3"), each leading with its icon.
 */
import type { World } from "../sim/world";
import { appendArt, el, replay, text } from "./hud-dom";
import { artAttrs, foeRole } from "./ui-art";

export class HudPanels {
  readonly hp: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly time: HTMLElement;
  private readonly kills: HTMLElement;
  private readonly total: HTMLElement;
  readonly goal: HTMLElement;
  private readonly goalText: HTMLElement;
  private last = { hp: -1, kills: -1, goal: "" };

  constructor(root: HTMLElement) {
    const top = el("div", "sv-top", root);
    const left = el("div", "sv-left", top);
    this.hp = el("div", "sv-hp sv-panel", left);
    // Each top panel leads with its icon (ticket 149: armour, clock, kills; 150: the objective).
    appendArt(this.hp, artAttrs("icon-armour", "icon"));
    el("span", "sv-label", this.hp, "HULL");
    const bar = el("div", "sv-hp-bar", this.hp);
    this.hpFill = el("i", "", bar);
    this.hpText = el("b", "", this.hp);
    const clock = el("div", "sv-clock sv-panel", left);
    appendArt(clock, artAttrs("icon-clock", "icon"));
    this.time = el("b", "", clock);
    // Unlit LED segments behind the digits (CSS draws them from the attribute; the text stays the time).
    this.time.dataset.ghost = "8:88";
    el("small", "", clock, "left");
    this.goal = el("div", "sv-goal sv-panel", top);
    this.goal.hidden = true;
    appendArt(this.goal, artAttrs("icon-objective", "icon"));
    // The hunt's quarry beside it (LL-32): the plate only ever counts Pack Leaders.
    appendArt(this.goal, artAttrs(foeRole("leader"), "icon"));
    this.goalText = el("span", "", this.goal);
    const kills = el("div", "sv-kills sv-panel", top);
    appendArt(kills, artAttrs("icon-kills", "icon"));
    this.kills = el("b", "", kills);
    // "8 kills in 3 s" (UI pass 3 fixes: "×8 kills / 3 s" read as a multiplier).
    el("small", "", kills, "kills in 3 s");
    this.total = el("em", "", kills);
  }

  /** The hull, the clock and the kills' panels (the rectangles the HUD keeps clear; the cards stay under their foot). */
  plates(): HTMLElement[] {
    return [this.hp, this.time.parentElement!, this.kills.parentElement!];
  }

  /** The hull's bar and number (low at 30 %), the time left. */
  armour(w: World): void {
    if (w.hp !== this.last.hp) {
      this.last.hp = w.hp;
      this.hpFill.style.transform = "scaleX(" + Math.max(0, w.hp / w.armourMax).toFixed(3) + ")";
      this.hpText.textContent = String(Math.ceil(w.hp));
      this.hp.classList.toggle("is-low", w.hp <= w.armourMax * 0.3);
    }
    const left = Math.max(0, Math.ceil(w.seconds - w.time));
    text(this.time, Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"));
  }

  /** Kills in the last 3 s (bumped when they rise, hot from 15) and the run's total. */
  count(w: World, killsRecent: number): void {
    if (killsRecent !== this.last.kills) {
      this.kills.textContent = String(killsRecent);
      if (killsRecent > this.last.kills) replay(this.kills, "is-bump");
      this.kills.parentElement!.classList.toggle("is-hot", killsRecent >= 15);
      this.last.kills = killsRecent;
    }
    text(this.total, "Total " + w.stats.kills);
  }

  /** The objective's plate: Săn counts leaders down and through; `retreat` runs when the hunt is won (the HUD says it in the middle too). */
  objective(w: World, retreat: () => void): void {
    const O = w.objective;
    const text = O.need > 0 ? (O.retreat >= 0 ? "SWARM RETREATS" : "PACK LEADER " + O.done + "/" + O.need + " · ESCAPED " + O.leaked + "/" + (O.of - O.need)) : "";
    if (text === this.last.goal) return;
    // The hunt won: said in the middle of the view too, not only on the plate up top.
    if (O.retreat >= 0 && this.last.goal !== "") retreat();
    this.last.goal = text;
    this.goalText.textContent = text;
    this.goal.hidden = text === "";
    this.goal.classList.toggle("is-done", O.retreat >= 0);
  }
}
