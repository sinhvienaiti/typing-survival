/**
 * The bays (split from hud.ts by ALIVE_PLAN AL-00; AL-05 adds a target rect
 * in wave 1, AL-06 owns it in wave 2): cards beside the corridor, outside its
 * walls, at the horde's height (parent docs/games/QUALITY_RESCUE_2026-11-01.md
 * L4, variant A: bays 1 and 3 on the left, 2 and 4 on the right; bays 1–2
 * from 30 % of the view's height, 3–4 from 47 %; 230 × 100 px at 1280×720;
 * place()). A live bay shows its gun (name, colour, magazine LEDs: 2, or 3 at
 * Rèn 3; a top stripe that fills as its word is typed), its word (32 px, long
 * words shrink to no less than 26 px; Thiếu chữ's hidden letters as "_"
 * until typed or shown) and meaning (one line, shrinking to 12 px before it
 * is cut). The bay being typed hands its big word to the line above the ship
 * and reads as a dictionary entry: the word at 22 px with its IPA, the
 * meaning on up to two lines. A bay without a gun is a small dark chip with a
 * lock (bays 3–4 in R1).
 */
import * as THREE from "three";
import { GUN_SPECS, type GunId } from "../content/guns";
import { FIELD } from "../content/rules";
import { magazineUnits } from "../sim/weapons";
import type { World } from "../sim/world";
import type { Word } from "../app/vocab";
import type { Stage } from "./scene";
import { firstBounce } from "./strip";
import { fullBlink } from "./type-rules";
import { appendArt, el, replay } from "./hud-dom";
import { artAttrs, gunRole } from "./ui-art";

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
/**
 * The gun cards beside the corridor (L4, variant A): each band's top (share of the height), its span, the edge in from
 * the screen's side, a card's and a sealed chip's size, the gap off the wall, the least scale; where a narrow view
 * lifts a card (wave 1 fix): its gun tab's height, the gap under the top panels and between stacked cards, the top
 * panels' foot when not laid out (CSS px × --ui).
 */
const CARDS = { bands: [0.3, 0.47], spans: [0.14, 0.11], edge: 0.025, width: 230, height: 100, chipWidth: 132, chipHeight: 34, gap: 10, least: 0.72, tab: 56, stack: 8, ceiling: 76 } as const;
/** The corridor's wall as the camera sees it: the outer face of its posts (m from the centre line) and the top of their lamps (m). */
const WALL = { x: FIELD.halfW + 0.73, top: 1.82 } as const;
/** Long words shrink down to this share of 32 px (26 px). */
const MIN_FIT = 26 / 32;

type Slot = { root: HTMLElement; line: HTMLElement; typed: HTMLElement; head: HTMLElement; rest: HTMLElement; ipa: HTMLElement; mean: HTMLElement; mags: HTMLElement[]; gun: number; key: string; fullAt: number; loadAt: number; bounced: boolean; blink: boolean };
/** Where place() put a bay (CSS px): its card's top, scale, and the wall's and the lane's edge (left side) at its lowest row. */
export type BayPlace = { bay: number; top: number; scale: number; wall: number; lane: number };

/** A word as shown: the typed part, then the rest with hidden letters as "_" (shown ones as letters). */
function masked(word: string, from: number, hidden: number, shown: number): string {
  if (hidden === 0) return word.slice(from);
  let out = "";
  for (let i = from; i < word.length; i += 1) out += (hidden & (1 << i)) !== 0 && (shown & (1 << i)) === 0 ? "_" : word[i]!;
  return out;
}

export class HudBays {
  private readonly slots: Slot[] = [];
  /** Every bay's card or chip, by bay. */
  readonly cards: HTMLElement[] = [];
  private bounceAt = -1e9;
  private readonly at = new THREE.Vector3();

  /** Builds the cards into `bottom`: columns bay 3, bay 1, the ship's gap, bay 2, bay 4. */
  constructor(bottom: HTMLElement, private readonly words: (index: number) => Word, w: World) {
    const kit = w.header.kit;
    for (let bay = 0; bay < 4; bay += 1) {
      const gun = bay < kit.bays ? (w.guns.gun[bay] ?? -1) : -1;
      if (gun < 0) {
        const plate = el("section", "sv-bay-lock sv-panel", bottom);
        plate.dataset.bay = String(bay + 1);
        // A sealed bay: a chip, its lock beside "LOCKED" (UI pass 2: a large empty plate read as missing content; L4: beside the corridor it is only a chip).
        appendArt(plate, artAttrs("icon-lock", "lock"));
        el("span", "", plate, "LOCKED");
        this.cards[bay] = plate;
        continue;
      }
      const spec = GUN_SPECS[gun]!;
      const root = el("section", "sv-slot sv-panel sv-" + spec.key, bottom);
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
  }

  /** The gun in bay `slot` (0 when it has none). */
  gun(slot: number): number {
    return this.slots[slot]?.gun ?? 0;
  }

  /** The live bays' gun tabs as laid out (the rift chip keeps off them). */
  tabs(): (DOMRect | undefined)[] {
    return this.slots.map((slot) => slot?.root.querySelector?.(".sv-art-bay:not([hidden])")?.getBoundingClientRect());
  }

  /** A stray key: every bay's first letter bounces (200 ms). */
  bounce(now: number): void {
    this.bounceAt = now;
  }

  /** A word finished on `slot` (`full`: its bay took no magazine): the bay flashes, or its LEDs blink when full. */
  wordDone(slot: number, perfect: boolean, full: boolean, now: number): void {
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

  /**
   * Each bay's card (a sealed bay's chip) at its band's top, CARDS.edge in
   * from its side of the screen, its inner edge CARDS.gap off the corridor's
   * wall at the card's lowest row (where the wall reaches furthest out). A
   * card also shrinks to keep inside its band's span. Where the view is too
   * narrow for that (4:3, 5:4: wave 1 fix), the card climbs toward the gate,
   * where the corridor narrows, never over the top panels (with its gun tab)
   * nor over the card above it; still too narrow at the top, it shrinks (its
   * own --ui, never under CARDS.least) to keep off the wall, else off the lane.
   * `panels`: the top panels (their foot, laid out by now); `placed` gets each bay's place.
   */
  place(stage: Stage, ui: number, panels: readonly HTMLElement[], placed: BayPlace[]): void {
    const { width, height } = stage;
    const edge = CARDS.edge * width;
    const tab = CARDS.tab * ui;
    // The top panels' foot (armour, clock, kills), laid out by now; a card's gun tab stands over its top.
    const feet = panels.map((node) => node?.getBoundingClientRect().bottom ?? 0);
    const ceiling = Math.max(CARDS.ceiling * ui, ...feet) + CARDS.stack * ui + tab;
    const below = [ceiling, ceiling];
    placed.length = 0;
    this.cards.forEach((card, bay) => {
      const band = bay < 2 ? 0 : 1;
      const side = bay % 2;
      const sealed = this.slots[bay] === undefined;
      const w = (sealed ? CARDS.chipWidth : CARDS.width) * ui;
      const h = (sealed ? CARDS.chipHeight : CARDS.height) * ui;
      const span = Math.min(1, (CARDS.spans[band]! * height) / h);
      const room = (limit: number, scale: number) => limit - CARDS.gap * ui * scale - edge;
      const wallAt = (top: number, scale: number) => this.edgeAt(stage, top + h * scale, WALL.x, WALL.top);
      const fits = (top: number, scale: number) => room(wallAt(top, scale), scale) >= w * scale;
      // Its band's top; past the wall there, up toward the gate in steps of 1 % of the height until it clears it, never over
      // `highest` (under the top panels, or under the card above with this one's gun tab); clearing it nowhere, at the highest.
      const highest = below[side]!;
      const bandTop = CARDS.bands[band]! * height;
      let top = bandTop;
      let scale = span;
      if (!fits(top, scale) && highest < bandTop) {
        while (!fits(top, scale) && top - 0.01 * height >= highest) top -= 0.01 * height;
        if (!fits(top, scale)) top = highest;
      }
      // Twice: a smaller card ends higher, where the wall stands further in.
      let wall = 0;
      let lane = 0;
      for (let pass = 0; pass < 2; pass += 1) {
        wall = wallAt(top, scale);
        lane = this.edgeAt(stage, top + h * scale, FIELD.halfW - FIELD.wall, 0);
        if (room(wall, scale) < w * scale) scale = Math.max(CARDS.least, Math.min(scale, room(wall, scale) / w));
        if (room(lane, scale) < w * scale) scale = Math.max(CARDS.least, Math.min(scale, room(lane, scale) / w));
      }
      below[side] = top + h * scale + CARDS.stack * ui + tab;
      const left = side === 0;
      card.style.top = top.toFixed(1) + "px";
      card.style.left = left ? edge.toFixed(1) + "px" : "";
      card.style.right = left ? "" : edge.toFixed(1) + "px";
      card.style.setProperty("--ui", (ui * scale).toFixed(3));
      placed.push({ bay: bay + 1, top: Math.round(top), scale: Math.round(scale * 1000) / 1000, wall: Math.round(wall), lane: Math.round(lane) });
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

  /** One frame: every live bay's word, lock, magazine cells and states. */
  update(w: World, now: number, reduced: boolean): void {
    for (let s = 0; s < this.slots.length; s += 1) if (this.slots[s] !== undefined) this.updateSlot(w, s, now, reduced);
  }

  private updateSlot(w: World, s: number, now: number, reduced: boolean): void {
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
    const k = firstBounce(now - this.bounceAt, reduced);
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
}
