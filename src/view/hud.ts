/**
 * The HUD (docs/BUILD_S0.md §7, docs/BUILD_S1.md §10, docs/FEEL_PASS_S1.md
 * §2), DOM outside the shaking canvas, dressed as the station's steel
 * consoles (theme.css, survival.css). The word being typed sits on a line
 * just above the ship's nose (strip.ts), placed from the still camera's view
 * of the bottom line; the bays are cards beside the corridor, outside its
 * walls, at the horde's height (parent docs/games/QUALITY_RESCUE_2026-11-01.md
 * L4, variant A: bays 1 and 3 on the left, 2 and 4 on the right; bays 1–2
 * from 30 % of the view's height, 3–4 from 47 %; 230 × 100 px at 1280×720;
 * placeBays()). A live bay shows
 * its gun (name, colour, magazine LEDs: 2, or 3 at Rèn 3; a top stripe that
 * fills as its word is typed), its word (32 px, long words shrink to no less
 * than 26 px; Thiếu chữ's hidden letters as "_" until typed or shown) and
 * meaning (one line, shrinking to 12 px before it is cut). The bay being
 * typed hands its big word to the line above the ship and reads as a
 * dictionary entry: the word at 22 px with its IPA, the meaning on up to two
 * lines (test pass 27/10: "IPA · meaning" on one line was cut). A finished
 * word's meaning stays with the word on the line (strip.ts), never under the
 * bay's next word. A bay without a gun
 * is a small dark chip with a lock (bays 3–4 in R1).
 * Top: armour, clock, kills, the objective's plate (Săn: "PACK LEADER 1/3"),
 * a 2 s card when something new first appears; an input notice just above
 * the word line; a rift's warning (one chip, strip.ts) on its wall's side
 * between the word line and the red line's glow. It publishes the rectangles damage numbers must not cover.
 * The word itself is drawn by the kit's focus strip (type-fx.ts) in `fxRoot`,
 * which sits where the old plate stood in the HUD's order (under the menus).
 */
import * as THREE from "three";
import type { Rect } from "../kit/feedback";
import { FOES, KIND } from "../content/foes";
import { GUN_SPECS, type GunId } from "../content/guns";
import { FIELD } from "../content/rules";
import { STAGE_S0 } from "../content/stage-s0";
import { peakAt } from "../sim/plan";
import { magazineUnits } from "../sim/weapons";
import type { World } from "../sim/world";
import type { Word } from "../app/vocab";
import type { Stage } from "./scene";
import { firstBounce, WordStrip } from "./strip";
import { fullBlink } from "./type-rules";
import { artAttrs, gunRole, foeRole, watchArt, type ArtPlace } from "./ui-art";

function appendArt(parent: HTMLElement, attrs: ReturnType<typeof artAttrs>): void {
  if (!attrs) return;
  const img = document.createElement("img");
  for (const [key, value] of Object.entries(attrs)) img.setAttribute(key, String(value));
  parent.append(img);
}
/** `parent`'s content becomes an icon (if it has art) and `text`. */
function iconText(parent: HTMLElement, role: string, place: ArtPlace, text: string): void {
  parent.replaceChildren();
  appendArt(parent, artAttrs(role, place));
  parent.append(text);
}

const NEW_MS = 2000;
/**
 * The word line's bottom stands over the deck 1.8 m past the bottom line
 * (4 px above its projection): build 1 put it on the stripes' far edge
 * (1.05 m), where the plate hid every muzzle flash, Tán's flame tongues and
 * the first metres of Ray and Tia (test pass 27/10); 16 px higher at 720p
 * they show between the ship's nose and the plate.
 */
const LINE_LIFT = 1.8;
/** A bay's meaning shrinks to this share of 15 px (12 px) before it is cut. */
const MIN_MEAN = 0.8;
/**
 * The cards (QUALITY_RESCUE_2026-11-01 L4, variant A; the owner, 01/11: the
 * bays sat too low, the eye jumped 47 % of the view between a word and the
 * horde): each band's top as a share of the view's height (bays 1–2, 3–4)
 * and the most of it a card may take (30–44 %, 47–58 %); 2.5 % of the width
 * in from the screen's edge; a card 230 × 100 px and a sealed bay's chip
 * 132 × 34 px at 1280×720 (× --ui); kept `gap` px off the corridor's wall. A
 * view too narrow for that (4:3) shrinks the card (its own --ui, never under
 * `least`) to keep it off the lane at least.
 */
const CARDS = { bands: [0.3, 0.47], spans: [0.14, 0.11], edge: 0.025, width: 230, height: 100, chipWidth: 132, chipHeight: 34, gap: 10, least: 0.72 } as const;
/** The corridor's wall as the camera sees it: the outer face of its posts (m from the centre line) and the top of their lamps (m). */
const WALL = { x: FIELD.halfW + 0.73, top: 1.82 } as const;
/** Long words shrink down to this share of 32 px (26 px). */
const MIN_FIT = 26 / 32;
/** A rift's chip (survival.css): its height and how far it keeps inside the walls and off a bay's gun tab (CSS px × --ui). */
const RIFT_CHIP = { h: 36, wall: 12, tab: 10 } as const;
/** The "new" card per kind a stage teaches. */
const NEW_CARD: Readonly<Record<number, string>> = {
  [KIND.brute]: "NEW · BRUTE · HEAVY FOE · ARMOR " + FOES[KIND.brute]!.armour,
  [KIND.leader]: "NEW · PACK LEADER · ARMOR " + FOES[KIND.leader]!.armour,
  [KIND.shield]: "NEW · SHIELD GUARD · BLOCKS FRONTAL SHOTS",
  [KIND.splitter]: "NEW · SPLITTER · SPLITS INTO 3 SHARDS",
};
const TEACH_KIND: Readonly<Record<string, number>> = { brute: KIND.brute, leader: KIND.leader, shield: KIND.shield, splitter: KIND.splitter };

/** Sets `node`'s text when it changed (most frames change nothing). */
const text = (node: HTMLElement, value: string): void => {
  if (node.textContent !== value) node.textContent = value;
};
/** Restarts a class's CSS animation on `node`. */
const replay = (node: HTMLElement, name: string): void => {
  node.classList.remove(name);
  void node.offsetWidth;
  node.classList.add(name);
};

function el<T extends HTMLElement>(tag: string, className: string, parent: HTMLElement, text = ""): T {
  const node = document.createElement(tag) as T;
  node.className = className;
  if (text !== "") node.textContent = text;
  parent.append(node);
  return node;
}

type Slot = { root: HTMLElement; line: HTMLElement; typed: HTMLElement; head: HTMLElement; rest: HTMLElement; ipa: HTMLElement; mean: HTMLElement; mags: HTMLElement[]; gun: number; key: string; fullAt: number; loadAt: number; bounced: boolean; blink: boolean };

/** A word as shown: the typed part, then the rest with hidden letters as "_" (shown ones as letters). */
function masked(word: string, from: number, hidden: number, shown: number): string {
  if (hidden === 0) return word.slice(from);
  let out = "";
  for (let i = from; i < word.length; i += 1) out += (hidden & (1 << i)) !== 0 && (shown & (1 << i)) === 0 ? "_" : word[i]!;
  return out;
}

export class Hud {
  readonly root: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly time: HTMLElement;
  private readonly kills: HTMLElement;
  private readonly total: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly goal: HTMLElement;
  private readonly goalText: HTMLElement;
  private readonly fresh: HTMLElement;
  private readonly bottom: HTMLElement;
  readonly strip: WordStrip;
  /** The focus strip's layer (type-fx.ts): after the bays' row, before the old line's parts and the menus. */
  readonly fxRoot: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly slots: Slot[] = [];
  readonly overlay: HTMLElement;
  readonly vignette: HTMLElement;
  private last = { hp: -1, kills: -1, peak: 0, goal: "", warn: "" };
  private bounceAt = -1e9;
  private streakHot = false;
  private readonly at = new THREE.Vector3();
  loads = 0;
  reduced = false;
  /** Where layout() put things (CSS px): the stripes' far edge, the red line's glow edge, Xung's reach (z 11.7 m), the word line's bottom; per bay its card's top, scale, and the wall's and the lane's edge (left side) at its lowest row. */
  readonly placed = { stripes: 0, glow: 0, reach: 0, line: 0, bays: [] as { bay: number; top: number; scale: number; wall: number; lane: number }[] };
  /** Every bay's card or chip, by bay. */
  private readonly cards: HTMLElement[] = [];
  private bannerUntil = 0;
  private lastNow = 0;
  private freshUntil = 0;
  private readonly met = new Set<number>();
  private readonly teach: Set<number>;
  /** The still camera's view (layout()), for the rift's chip inside the corridor. */
  private stage: Stage | null = null;
  private ui = 1;

  constructor(root: HTMLElement, private readonly words: (index: number) => Word, w: World) {
    this.root = root;
    watchArt(root);
    root.replaceChildren();
    this.vignette = el("div", "sv-vignette", root);
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
    this.banner = el("div", "sv-banner", root);
    this.fresh = el("div", "sv-fresh", root);
    this.notice = el("div", "sv-notice", root);
    this.bottom = el("div", "sv-bottom", root);
    this.fxRoot = el("div", "sv-tfx", root);
    this.fxRoot.setAttribute("aria-hidden", "true");
    this.strip = new WordStrip(root);
    const kit = w.header.kit;
    // Columns: bay 3, bay 1, the ship's gap, bay 2, bay 4.
    for (let bay = 0; bay < 4; bay += 1) {
      const gun = bay < kit.bays ? (w.guns.gun[bay] ?? -1) : -1;
      if (gun < 0) {
        const plate = el("section", "sv-bay-lock sv-panel", this.bottom);
        plate.dataset.bay = String(bay + 1);
        // A sealed bay: a chip, its lock beside "LOCKED" (UI pass 2: a large empty plate read as missing content; L4: beside the corridor it is only a chip).
        appendArt(plate, artAttrs("icon-lock", "lock"));
        el("span", "", plate, "LOCKED");
        this.cards[bay] = plate;
        continue;
      }
      const spec = GUN_SPECS[gun]!;
      const root = el("section", "sv-slot sv-panel sv-" + spec.key, this.bottom);
      root.dataset.bay = String(bay + 1);
      this.cards[bay] = root;
      appendArt(root, artAttrs(gunRole(spec.key), "bay"));
      const head = el("header", "", root);
      el("span", "sv-gun", head, spec.name);
      // Shown while the bay is full (survival.css), beside its magazine cells; 28 px (UI pass 3 fixes: at 20 px its three rounds read as a blob at 720p).
      appendArt(head, artAttrs("icon-bay-full", "icon"));
      const mags = el("div", "sv-mags", head);
      const line = el("div", "sv-word", root);
      const slot: Slot = { root, line, typed: el("span", "sv-typed", line), head: el("span", "sv-head", line), rest: el("span", "", line), ipa: el("span", "sv-ipa", line), mean: el("div", "sv-mean", root), mags: [], gun, key: "", fullAt: -1e9, loadAt: -1e9, bounced: false, blink: false };
      for (let m = 0; m < w.guns.cap[bay]!; m += 1) slot.mags.push(el("i", "", mags));
      this.slots[bay] = slot;
    }
    this.overlay = el("div", "sv-overlay", root);
    this.teach = new Set(w.stage.teach.map((thing) => TEACH_KIND[thing]).filter((kind): kind is number => kind !== undefined));
  }

  /**
   * Places the word line from the still camera (FEEL_PASS_S1 §2.1): its
   * bottom 4 px above the deck LINE_LIFT m past the bottom line (456 px at
   * 720p: the line sits at 400–456, the stripes' far edge at 476 below it,
   * 74 px under Xung's reach); the red line's glow edge (the rift chip's row
   * sits between the two); the bays beside the corridor (placeBays()). Call
   * on resize.
   */
  layout(stage: Stage, ui: number): void {
    this.stage = stage;
    this.ui = ui;
    this.last.warn = "";
    this.placed.stripes = stage.project(0, FIELD.bottomZ + 1.05, 0, this.at, true).y;
    const line = (this.placed.line = stage.project(0, FIELD.bottomZ + LINE_LIFT, 0, this.at, true).y - 4 * ui);
    this.placed.glow = stage.project(0, FIELD.bottomZ - 0.32, 0, this.at, true).y;
    this.placed.reach = stage.project(0, 11.7, 0, this.at, true).y;
    this.placeBays(stage, ui);
    this.strip.layout(stage, line, ui);
    // The input notice sits just above the word line (at its widest), where the eyes are while typing.
    this.notice.style.top = this.strip.rect().y - 52 * ui + "px";
  }

  /**
   * Each bay's card (a sealed bay's chip) at its band's top, CARDS.edge in
   * from its side of the screen, its inner edge CARDS.gap off the corridor's
   * wall at the card's lowest row (where the wall reaches furthest out). Where
   * the view is too narrow for that, the card shrinks (its own --ui) to keep
   * off the lane's edge instead, never under CARDS.least; a card also shrinks
   * to keep inside its band's span.
   */
  private placeBays(stage: Stage, ui: number): void {
    const { width, height } = stage;
    const edge = CARDS.edge * width;
    this.placed.bays.length = 0;
    this.cards.forEach((card, bay) => {
      const band = bay < 2 ? 0 : 1;
      const sealed = this.slots[bay] === undefined;
      const w = (sealed ? CARDS.chipWidth : CARDS.width) * ui;
      const h = (sealed ? CARDS.chipHeight : CARDS.height) * ui;
      const top = CARDS.bands[band]! * height;
      let scale = Math.min(1, (CARDS.spans[band]! * height) / h);
      let wall = 0;
      let lane = 0;
      // Twice: a smaller card ends higher, where the wall stands further out.
      for (let pass = 0; pass < 2; pass += 1) {
        const row = top + h * scale;
        wall = this.edgeAt(stage, row, WALL.x, WALL.top);
        lane = this.edgeAt(stage, row, FIELD.halfW - FIELD.wall, 0);
        const room = (limit: number) => limit - CARDS.gap * ui * scale - edge;
        if (room(wall) < w * scale) scale = Math.max(CARDS.least, Math.min(scale, room(lane) / w));
      }
      const left = bay % 2 === 0;
      card.style.top = top.toFixed(1) + "px";
      card.style.left = left ? edge.toFixed(1) + "px" : "";
      card.style.right = left ? "" : edge.toFixed(1) + "px";
      card.style.setProperty("--ui", (ui * scale).toFixed(3));
      this.placed.bays.push({ bay: bay + 1, top: Math.round(top), scale: Math.round(scale * 1000) / 1000, wall: Math.round(wall), lane: Math.round(lane) });
    });
  }

  /** The screen x (CSS px, left half; the right is its mirror) of the point at −`x` m and `y` m up whose depth puts it on screen row `row`, through the still camera. */
  private edgeAt(stage: Stage, row: number, x: number, y: number): number {
    let near: number = FIELD.minZ;
    let far: number = FIELD.gateZ + 20;
    for (let i = 0; i < 20; i += 1) {
      const z = (near + far) / 2;
      if (stage.project(-x, z, y, this.at, true).y > row) near = z;
      else far = z;
    }
    return stage.project(-x, (near + far) / 2, y, this.at, true).x;
  }

  /** The rectangles no damage number may cover (CSS px), with a small margin: the word line (at its widest), the armour, the clock, the kills, the bays with their gun tabs, the sealed bays' chips, the objective's plate. */
  protectedRects(): Rect[] {
    const nodes = [this.hp, this.time.parentElement!, this.kills.parentElement!, ...this.cards.filter(Boolean)];
    if (!this.goal.hidden) nodes.push(this.goal);
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
      this.bounceAt = now;
    }
  }

  /** A word finished on `slot` (`full`: its bay took no magazine): the line shows it with its meaning, the bay flashes (or its LEDs blink when full). */
  wordDone(slot: number, index: number, perfect: boolean, full: boolean, now: number): void {
    if (!full) this.loads += 1;
    const word = this.words(index);
    this.strip.finished(word.en, word.vi, this.slots[slot]?.gun ?? 0, full, now);
    const bay = this.slots[slot];
    if (bay === undefined) return;
    if (full) {
      bay.fullAt = now;
      return;
    }
    bay.loadAt = now;
    bay.root.classList.toggle("is-perfect", perfect);
    replay(bay.root, "is-loaded");
  }

  /** The clean streak (n words), the streak a wrong key broke, its tier (3: the line's edge takes the gun's colour). */
  streak(n: number, broke: number, tier: number, now: number): void {
    this.strip.streak(n, broke, now);
    this.streakHot = tier >= 3;
  }

  /** `icon`: a role drawn before the text (a surge, a repair pod). */
  showBanner(text: string, now: number, icon?: string): void {
    if (icon === undefined) this.banner.textContent = text;
    else iconText(this.banner, icon, "banner", text);
    replay(this.banner, "is-on");
    this.bannerUntil = now + 2200;
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
    if (w.hp !== this.last.hp) {
      this.last.hp = w.hp;
      this.hpFill.style.transform = "scaleX(" + Math.max(0, w.hp / w.armourMax).toFixed(3) + ")";
      this.hpText.textContent = String(Math.ceil(w.hp));
      this.hp.classList.toggle("is-low", w.hp <= w.armourMax * 0.3);
    }
    const left = Math.max(0, Math.ceil(w.seconds - w.time));
    text(this.time, Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"));
    const peak = peakAt(w);
    if (peak !== this.last.peak) {
      this.last.peak = peak;
      // A storm surge says so: the horde is far thicker this time.
      if (peak > 0) this.showBanner("SURGE " + peak + (w.plan.storm[peak - 1] === 1 || w.plan.strength[peak - 1]! >= STAGE_S0.storm.spread[0] ? " · FIERCE" : ""), now, "icon-surge");
    }
    if (now > this.bannerUntil) this.banner.classList.remove("is-on");
    if (killsRecent !== this.last.kills) {
      this.kills.textContent = String(killsRecent);
      if (killsRecent > this.last.kills) replay(this.kills, "is-bump");
      this.kills.parentElement!.classList.toggle("is-hot", killsRecent >= 15);
      this.last.kills = killsRecent;
    }
    text(this.total, "Total " + w.stats.kills);
    this.updateGoal(w);
    this.updateWarn(w);
    this.updateFresh(w, now);
    for (let s = 0; s < this.slots.length; s += 1) if (this.slots[s] !== undefined) this.updateSlot(w, s, now);
    this.strip.reduced = this.reduced;
    this.strip.update(w, now, this.streakHot);
  }

  private updateSlot(w: World, s: number, now: number): void {
    const slot = this.slots[s]!;
    const T = w.typing;
    const index = T.word[s]!;
    const word = index >= 0 ? w.deck[index]! : "";
    const locked = T.lock === s;
    const typed = locked ? T.typed[s]! : 0;
    const key = index + ":" + typed + ":" + T.shown[s] + ":" + (locked ? 1 : 0);
    if (key !== slot.key) {
      const was = slot.key;
      slot.key = key;
      const info = index >= 0 ? this.words(index) : null;
      // The bay being typed: the word small with its IPA, the meaning under it (the line above the ship shows the word big).
      slot.root.classList.toggle("is-active", locked);
      slot.ipa.textContent = locked && info !== null ? info.ipa : "";
      slot.typed.textContent = word.slice(0, typed);
      const rest = masked(word, typed, T.hidden[s]!, T.shown[s]!);
      slot.head.textContent = typed === 0 ? rest.slice(0, 1) : "";
      slot.rest.textContent = typed === 0 ? rest.slice(1) : rest;
      if (typed === 0) this.fit(slot.line, slot.root);
      // A new word or a lock taken or let go: the meaning again, shrunk to fit one line when free.
      if (was.split(":")[0] !== String(index) || was.endsWith(":1") !== locked) {
        slot.mean.textContent = info === null ? "" : info.vi;
        this.fitMean(slot.mean, locked);
      }
      // The top stripe fills as the word is typed.
      slot.root.style.setProperty("--load", word.length > 0 ? (typed / word.length).toFixed(3) : "0");
    }
    slot.root.classList.toggle("is-dim", T.lock >= 0 && !locked);
    slot.root.classList.toggle("is-charged", now - slot.loadAt < 350);
    // A stray key: every bay's first letter bounces (200 ms).
    const k = firstBounce(now - this.bounceAt, this.reduced);
    if (k !== 1 || slot.bounced) {
      slot.head.style.transform = k === 1 ? "" : "scale(" + k.toFixed(3) + ")";
      slot.bounced = k !== 1;
    }
    const mags = w.guns.mags[s]!;
    const first = w.guns.left[s]! / magazineUnits(w.stage, slot.gun as GunId);
    for (let m = 0; m < slot.mags.length; m += 1) {
      const fill = m < mags - 1 ? 1 : m === mags - 1 ? Math.max(0, Math.min(1, first)) : 0;
      const cell = slot.mags[m]!;
      cell.style.setProperty("--fill", fill.toFixed(3));
      // An empty cell steps back, a loaded one glows (survival.css).
      if (cell.classList.contains("is-empty") !== (fill === 0)) cell.classList.toggle("is-empty", fill === 0);
    }
    slot.root.classList.toggle("is-firing", mags > 0);
    slot.root.classList.toggle("is-full", mags >= w.guns.cap[s]!);
    // A word into a full bay: its magazine LEDs blink urgent twice.
    const blink = fullBlink(now - slot.fullAt);
    if (blink !== slot.blink) {
      slot.blink = blink;
      slot.root.classList.toggle("is-overfull", blink);
    }
  }

  /** A free bay's meaning shrinks to one line (never under 12 px, then it is cut); the bay being typed wraps it to two lines. */
  private fitMean(mean: HTMLElement, locked: boolean): void {
    mean.style.setProperty("--mfit", "1");
    if (locked) return;
    const need = mean.scrollWidth;
    const room = mean.clientWidth;
    if (room > 0 && need > room) mean.style.setProperty("--mfit", Math.max(MIN_MEAN, room / need).toFixed(3));
  }

  /** A long word shrinks to fit its bay (never under 26 px). */
  private fit(line: HTMLElement, box: HTMLElement): void {
    line.style.setProperty("--fit", "1");
    const style = getComputedStyle(box);
    const room = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const need = line.scrollWidth;
    if (room > 0 && need > room) line.style.setProperty("--fit", Math.max(MIN_FIT, room / need).toFixed(3));
  }

  /** The objective's plate: Săn counts leaders down and through. */
  private updateGoal(w: World): void {
    const O = w.objective;
    const text = O.need > 0 ? (O.retreat >= 0 ? "SWARM RETREATS" : "PACK LEADER " + O.done + "/" + O.need + " · ESCAPED " + O.leaked + "/" + (O.of - O.need)) : "";
    if (text === this.last.goal) return;
    // The hunt won: said in the middle of the view too, not only on the plate up top.
    if (O.retreat >= 0 && this.last.goal !== "") this.showBanner("SWARM RETREATS!", this.lastNow);
    this.last.goal = text;
    this.goalText.textContent = text;
    this.goal.hidden = text === "";
    this.goal.classList.toggle("is-done", O.retreat >= 0);
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
    if (key === this.last.warn) return;
    // Measured as a warning starts (and after a resize, which clears last.warn): the bays' tabs are laid out by then.
    const fresh = text !== "" && !this.last.warn.startsWith("Rift");
    this.last.warn = key;
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
    for (const slot of this.slots) {
      const tab = slot?.root.querySelector?.(".sv-art-bay:not([hidden])")?.getBoundingClientRect();
      if (tab === undefined || tab.width === 0 || tab.bottom < top || tab.top > bottom) continue;
      if (tab.left > mid) right = Math.min(right, tab.left - RIFT_CHIP.tab * ui);
      else left = Math.max(left, tab.right + RIFT_CHIP.tab * ui);
    }
    this.strip.hazardSpot(y, left, right);
  }

  /** A taught foe's first appearance: a small card for 2 s. */
  private updateFresh(w: World, now: number): void {
    if (this.teach.size > 0) {
      const F = w.foes;
      for (let s = 0; s < F.top; s += 1) {
        const kind = F.kind[s]!;
        if (F.alive[s] === 1 && this.teach.has(kind) && !this.met.has(kind) && F.z[s]! < 42) {
          this.met.add(kind);
          this.fresh.replaceChildren();
          appendArt(this.fresh, artAttrs(foeRole(kind), "fresh"));
          appendArt(this.fresh, artAttrs("icon-new-badge", "small"));
          this.fresh.append(NEW_CARD[kind] ?? "");
          this.fresh.classList.add("is-on");
          this.freshUntil = now + NEW_MS;
        }
      }
    }
    if (now > this.freshUntil) this.fresh.classList.remove("is-on");
  }
}
