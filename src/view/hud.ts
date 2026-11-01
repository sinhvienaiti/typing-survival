/**
 * The HUD (docs/BUILD_S0.md §7, docs/BUILD_S1.md §10, docs/FEEL_PASS_S1.md
 * §2), DOM outside the shaking canvas, dressed as the station's steel
 * consoles (theme.css, hud.css). This file is the frame (split by ALIVE_PLAN
 * AL-00): the root's layers in their order, the layout, the protected
 * rectangles, the input notice, the hurt vignette and a rift's chip; its
 * parts are the top row (hud-panels.ts: armour, clock, kills, the
 * objective's plate), the banners and the new foe's card (hud-banners.ts) and
 * the bays (hud-bays.ts: cards beside the corridor). The word being typed
 * sits on a line just above the ship's nose (strip.ts), placed from the still
 * camera's view of the bottom line; an input notice just above the word
 * line; a rift's warning (one chip, strip.ts) on its wall's side between the
 * word line and the red line's glow. It publishes the rectangles damage
 * numbers must not cover. The word itself is drawn by the kit's focus strip
 * (type-fx.ts) in `fxRoot`, which sits where the old plate stood in the
 * HUD's order (under the menus).
 */
import * as THREE from "three";
import type { Rect } from "../kit/feedback";
import { FIELD } from "../content/rules";
import type { World } from "../sim/world";
import type { Word } from "../app/vocab";
import type { Stage } from "./scene";
import { WordStrip } from "./strip";
import { HudBanners } from "./hud-banners";
import { HudBays, type BayPlace } from "./hud-bays";
import { el, iconText, replay } from "./hud-dom";
import { HudPanels } from "./hud-panels";
import { watchArt } from "./ui-art";

/**
 * The word line's bottom stands over the deck 1.8 m past the bottom line
 * (4 px above its projection): build 1 put it on the stripes' far edge
 * (1.05 m), where the plate hid every muzzle flash, Tán's flame tongues and
 * the first metres of Ray and Tia (test pass 27/10); 16 px higher at 720p
 * they show between the ship's nose and the plate.
 */
const LINE_LIFT = 1.8;
/** A rift's chip (strip.css): its height and how far it keeps inside the walls and off a bay's gun tab (CSS px × --ui). */
const RIFT_CHIP = { h: 36, wall: 12, tab: 10 } as const;

export class Hud {
  readonly root: HTMLElement;
  private readonly panels: HudPanels;
  private readonly banners: HudBanners;
  private readonly bays: HudBays;
  private readonly notice: HTMLElement;
  readonly strip: WordStrip;
  /** The focus strip's layer (type-fx.ts): after the bays' row, before the old line's parts and the menus. */
  readonly fxRoot: HTMLElement;
  readonly overlay: HTMLElement;
  readonly vignette: HTMLElement;
  private lastWarn = "";
  private streakHot = false;
  private readonly at = new THREE.Vector3();
  loads = 0;
  reduced = false;
  /** Where layout() put things (CSS px): the stripes' far edge, the red line's glow edge, Xung's reach (z 11.7 m), the word line's bottom; per bay its card's top, scale, and the wall's and the lane's edge (left side) at its lowest row. */
  readonly placed = { stripes: 0, glow: 0, reach: 0, line: 0, bays: [] as BayPlace[] };
  private lastNow = 0;
  /** The still camera's view (layout()), for the rift's chip inside the corridor. */
  private stage: Stage | null = null;
  private ui = 1;

  constructor(root: HTMLElement, private readonly words: (index: number) => Word, w: World) {
    this.root = root;
    watchArt(root);
    root.replaceChildren();
    this.vignette = el("div", "sv-vignette", root);
    this.panels = new HudPanels(root);
    this.banners = new HudBanners(root, w);
    this.notice = el("div", "sv-notice", root);
    const bottom = el("div", "sv-bottom", root);
    this.fxRoot = el("div", "sv-tfx", root);
    this.fxRoot.setAttribute("aria-hidden", "true");
    this.strip = new WordStrip(root);
    this.bays = new HudBays(bottom, words, w);
    this.overlay = el("div", "sv-overlay", root);
  }

  /**
   * Places the word line from the still camera (FEEL_PASS_S1 §2.1): its
   * bottom 4 px above the deck LINE_LIFT m past the bottom line (456 px at
   * 720p: the line sits at 400–456, the stripes' far edge at 476 below it,
   * 74 px under Xung's reach); the red line's glow edge (the rift chip's row
   * sits between the two); the bays beside the corridor (HudBays.place()).
   * Call on resize.
   */
  layout(stage: Stage, ui: number): void {
    this.stage = stage;
    this.ui = ui;
    this.lastWarn = "";
    this.placed.stripes = stage.project(0, FIELD.bottomZ + 1.05, 0, this.at, true).y;
    const line = (this.placed.line = stage.project(0, FIELD.bottomZ + LINE_LIFT, 0, this.at, true).y - 4 * ui);
    this.placed.glow = stage.project(0, FIELD.bottomZ - 0.32, 0, this.at, true).y;
    this.placed.reach = stage.project(0, 11.7, 0, this.at, true).y;
    this.bays.place(stage, ui, this.panels.plates(), this.placed.bays);
    this.strip.layout(stage, line, ui);
    // The input notice sits just above the word line (at its widest), where the eyes are while typing.
    this.notice.style.top = this.strip.rect().y - 52 * ui + "px";
  }

  /** The rectangles no damage number may cover (CSS px), with a small margin: the word line (at its widest), the armour, the clock, the kills, the bays with their gun tabs, the sealed bays' chips, the objective's plate. */
  protectedRects(): Rect[] {
    const nodes = [...this.panels.plates(), ...this.bays.cards.filter(Boolean)];
    if (!this.panels.goal.hidden) nodes.push(this.panels.goal);
    const line = this.strip.rect();
    return [{ x: line.x - 6, y: line.y - 6, w: line.w + 12, h: line.h + 12 }, ...nodes.map((node) => {
      const box = node.getBoundingClientRect();
      // A bay's gun tab stands on its top edge, outside its box.
      const tab = node.querySelector?.(".sv-art-bay:not([hidden])")?.getBoundingClientRect();
      const x = Math.min(box.left, tab?.width ? tab.left : box.left);
      const y = Math.min(box.top, tab?.height ? tab.top : box.top);
      return { x: x - 6, y: y - 6, w: Math.max(box.right, tab?.width ? tab.right : box.right) - x + 12, h: box.bottom - y + 12 };
    })];
  }

  /** A wrong key: in the locked word (`slot` ≥ 0) the letter due is marked; a stray key ghosts and every bay's first letter bounces. */
  keyBad(slot: number, due: number, letter: string, now: number): void {
    if (slot >= 0) this.strip.miss(due, now);
    else {
      this.strip.stray(letter, now);
      this.bays.bounce(now);
    }
  }

  /** A word finished on `slot` (`full`: its bay took no magazine): the line shows it with its meaning, the bay flashes (or its LEDs blink when full). */
  wordDone(slot: number, index: number, perfect: boolean, full: boolean, now: number): void {
    if (!full) this.loads += 1;
    const word = this.words(index);
    this.strip.finished(word.en, word.vi, this.bays.gun(slot), full, now);
    this.bays.wordDone(slot, perfect, full, now);
  }

  /** The clean streak (n words), the streak a wrong key broke, its tier (3: the line's edge takes the gun's colour). */
  streak(n: number, broke: number, tier: number, now: number): void {
    this.strip.streak(n, broke, now);
    this.streakHot = tier >= 3;
  }

  /** `icon`: a role drawn before the text (a surge, a repair pod). */
  showBanner(text: string, now: number, icon?: string): void {
    this.banners.show(text, now, icon);
  }

  setNotice(value: string, kind: "warn" | "hint" = "warn"): void {
    const hint = kind === "hint";
    if (this.notice.textContent !== value || this.notice.classList.contains("is-hint") !== hint) {
      // A warning leads with the keyboard icon (ticket 149), at the 24 px box beside the notice's 20 px text (review 31/10); a hint is text only.
      if (hint) this.notice.textContent = value;
      else iconText(this.notice, "icon-keyboard", "item", value);
    }
    this.notice.classList.toggle("is-hint", hint);
    this.notice.hidden = value === "";
  }

  /** A hurt: the screen edges flash red for a moment. */
  hurt(): void {
    replay(this.vignette, "is-hurt");
  }

  update(w: World, killsRecent: number, now: number): void {
    this.lastNow = now;
    this.panels.armour(w);
    this.banners.surge(w, now);
    this.panels.count(w, killsRecent);
    this.panels.objective(w, () => this.banners.show("SWARM RETREATS!", this.lastNow));
    this.updateWarn(w);
    this.banners.fresh(w, now);
    this.bays.update(w, now, this.reduced);
    this.strip.reduced = this.reduced;
    this.strip.update(w, now, this.streakHot);
  }

  /**
   * A rift's warning: one chip on the word plate (strip.ts) with an arrow to
   * the wall where the rift opens, the Rift icon and the countdown (UI pass 3:
   * the wall's mark and the countdown were two, the countdown out past the
   * corridor at the screen's edge). It sits on the wall's side between the
   * word line and the red line's glow, inside the corridor and off any gun tab.
   */
  private updateWarn(w: World): void {
    const H = w.hazards;
    let text = "";
    let side = 0;
    if (H.state === 1 && H.next < H.count) {
      side = H.side[H.next]!;
      text = "Rift · " + Math.max(0, H.at[H.next]! - w.time).toFixed(1) + " s";
    } else if (H.state === 2) {
      side = H.side[H.next]!;
      text = "Rift";
    }
    const key = text + side;
    if (key === this.lastWarn) return;
    // Measured as a warning starts (and after a resize, which clears lastWarn): the bays' tabs are laid out by then.
    const fresh = text !== "" && !this.lastWarn.startsWith("Rift");
    this.lastWarn = key;
    if (fresh) this.placeRift();
    this.strip.warn(text, side);
  }

  /** The rift chip's row (between the word line and the red line's glow) and its outer edges: the corridor's inner walls at the chip's top on the still camera, and clear of any gun tab on that row. */
  private placeRift(): void {
    const stage = this.stage;
    if (stage === null) return;
    const ui = this.ui;
    const y = (this.placed.line + this.placed.glow) / 2;
    const top = y - (RIFT_CHIP.h / 2) * ui;
    const bottom = y + (RIFT_CHIP.h / 2) * ui;
    // The depth whose floor is at the chip's top: the narrowest part of the corridor it covers.
    let near = FIELD.bottomZ - 2;
    let far = FIELD.bottomZ + LINE_LIFT + 2;
    for (let i = 0; i < 14; i += 1) {
      const z = (near + far) / 2;
      if (stage.project(0, z, 0, this.at, true).y > top) near = z;
      else far = z;
    }
    const z = (near + far) / 2;
    const inner = FIELD.halfW - FIELD.wall;
    let left = stage.project(-inner, z, 0, this.at, true).x + RIFT_CHIP.wall * ui;
    let right = stage.project(inner, z, 0, this.at, true).x - RIFT_CHIP.wall * ui;
    const mid = stage.width / 2;
    // The bays' gun tabs (".sv-art-bay:not([hidden])", hud-bays.ts tabs()).
    for (const tab of this.bays.tabs()) {
      if (tab === undefined || tab.width === 0 || tab.bottom < top || tab.top > bottom) continue;
      if (tab.left > mid) right = Math.min(right, tab.left - RIFT_CHIP.tab * ui);
      else left = Math.max(left, tab.right + RIFT_CHIP.tab * ui);
    }
    this.strip.hazardSpot(y, left, right);
  }
}
