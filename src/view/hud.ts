/**
 * The HUD (docs/BUILD_S0.md §7, docs/BUILD_S1.md §10, docs/FEEL_PASS_S1.md
 * §2), DOM outside the shaking canvas, dressed as the station's steel
 * consoles (theme.css, survival.css). The word being typed sits on a line
 * just above the ship's nose (strip.ts); the bays sit on the floor beside
 * the ship, under the bottom line: `[bay 3][bay 1] ship [bay 2][bay 4]`
 * (bays 1–2 230 px, 3–4 208 px, 100 px tall at 1280×720), both placed from
 * the still camera's view of the bottom line (layout()). A live bay shows
 * its gun (name, colour, magazine LEDs: 2, or 3 at Rèn 3; a top stripe that
 * fills as its word is typed), its word (32 px, long words shrink to no less
 * than 26 px; Thiếu chữ's hidden letters as "_" until typed or shown) and
 * meaning (one line, shrinking to 12 px before it is cut). The bay being
 * typed hands its big word to the line above the ship and reads as a
 * dictionary entry: the word at 22 px with its IPA, the meaning on up to two
 * lines (test pass 27/10: "IPA · meaning" on one line was cut). A finished
 * word's meaning stays with the word on the line (strip.ts), never under the
 * bay's next word. A bay without a gun
 * is a dark plate ("MỞ Ở MỐC" for bay 3 in the chapter, a lock for bay 4).
 * Top: armour, clock, kills, the objective's plate (Săn: "ĐẦU ĐÀN 1/3"), a
 * rift's warning on its wall's side (and its countdown beside the word line),
 * a 2 s card when something new first appears; an input notice just above
 * the word line. It publishes the rectangles damage numbers must not cover.
 */
import * as THREE from "three";
import type { Rect } from "../kit/feedback";
import { FOES, KIND } from "../content/foes";
import { GUN_SPECS, type GunId } from "../content/guns";
import { FIELD } from "../content/rules";
import { RIFT } from "../content/stage-rules";
import { STAGE_S0 } from "../content/stage-s0";
import { peakAt } from "../sim/plan";
import { magazineUnits } from "../sim/weapons";
import type { World } from "../sim/world";
import type { Word } from "../app/vocab";
import type { Stage } from "./scene";
import { firstBounce, WordStrip } from "./strip";
import { fullBlink } from "./type-rules";

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
/** Bay columns at 1280×720: bay 3, bay 1, the ship's gap, bay 2, bay 4 (gaps of 12). */
const COLUMNS = [208, 230, 324, 230, 208] as const;
const BAY_COLUMN = [2, 4, 1, 5] as const;
/** Long words shrink down to this share of 32 px (26 px). */
const MIN_FIT = 26 / 32;
/** The "new" card per kind a stage teaches. */
const NEW_CARD: Readonly<Record<number, string>> = {
  [KIND.brute]: "MỚI · Brute · (quái lực lưỡng) Vỏ " + FOES[KIND.brute]!.armour,
  [KIND.leader]: "MỚI · Pack Leader · (thủ lĩnh bầy) Vỏ " + FOES[KIND.leader]!.armour,
  [KIND.shield]: "MỚI · Shield Guard · (lính mang khiên) chắn đạn phía trước",
  [KIND.splitter]: "MỚI · Splitter · (quái tách mảnh) vỡ 3 Shard",
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
  private readonly fresh: HTMLElement;
  private readonly warn: HTMLElement;
  private readonly bottom: HTMLElement;
  readonly strip: WordStrip;
  private readonly hp: HTMLElement;
  private readonly slots: Slot[] = [];
  readonly overlay: HTMLElement;
  readonly vignette: HTMLElement;
  private last = { hp: -1, kills: -1, peak: 0, goal: "", warn: "" };
  private bounceAt = -1e9;
  private streakHot = false;
  private readonly at = new THREE.Vector3();
  reduced = false;
  /** Where layout() put things (CSS px): the stripes' far edge, the red line's glow edge, Xung's reach (z 11.7 m). */
  readonly placed = { stripes: 0, glow: 0, reach: 0 };
  private bannerUntil = 0;
  private lastNow = 0;
  private freshUntil = 0;
  private readonly met = new Set<number>();
  private readonly teach: Set<number>;

  constructor(root: HTMLElement, private readonly words: (index: number) => Word, w: World) {
    this.root = root;
    root.replaceChildren();
    this.vignette = el("div", "sv-vignette", root);
    const top = el("div", "sv-top", root);
    const left = el("div", "sv-left", top);
    this.hp = el("div", "sv-hp sv-panel", left);
    el("span", "sv-label", this.hp, "GIÁP");
    const bar = el("div", "sv-hp-bar", this.hp);
    this.hpFill = el("i", "", bar);
    this.hpText = el("b", "", this.hp);
    const clock = el("div", "sv-clock sv-panel", left);
    this.time = el("b", "", clock);
    // Unlit LED segments behind the digits (CSS draws them from the attribute; the text stays the time).
    this.time.dataset.ghost = "8:88";
    el("small", "", clock, "còn lại");
    this.goal = el("div", "sv-goal sv-panel", top);
    this.goal.hidden = true;
    const kills = el("div", "sv-kills sv-panel", top);
    this.kills = el("b", "", kills);
    el("small", "", kills, "hạ / 3 s");
    this.total = el("em", "", kills);
    this.banner = el("div", "sv-banner", root);
    this.fresh = el("div", "sv-fresh", root);
    this.warn = el("div", "sv-warn", root);
    this.notice = el("div", "sv-notice", root);
    this.bottom = el("div", "sv-bottom", root);
    this.strip = new WordStrip(root);
    const kit = w.header.kit;
    const chapter = w.stage.id !== "s0";
    // Columns: bay 3, bay 1, the ship's gap, bay 2, bay 4.
    for (let bay = 0; bay < 4; bay += 1) {
      const gun = bay < kit.bays ? (w.guns.gun[bay] ?? -1) : -1;
      if (gun < 0) {
        const plate = el("section", "sv-bay-lock sv-panel", this.bottom);
        plate.dataset.bay = String(bay + 1);
        plate.style.gridArea = "1 / " + BAY_COLUMN[bay];
        if (bay === 2 && chapter) el("span", "", plate, "MỞ Ở MỐC");
        else el("i", "sv-lock", plate);
        continue;
      }
      const spec = GUN_SPECS[gun]!;
      const root = el("section", "sv-slot sv-panel sv-" + spec.key, this.bottom);
      root.dataset.bay = String(bay + 1);
      root.style.gridArea = "1 / " + BAY_COLUMN[bay];
      const head = el("header", "", root);
      el("span", "sv-gun", head, spec.name);
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
   * Places the word line and the bays from the still camera (FEEL_PASS_S1
   * §2.1): the line's bottom 4 px above the deck LINE_LIFT m past the bottom
   * line (456 px at 720p: the line sits at 400–456, the stripes' far edge at
   * 476 below it, 74 px under Xung's reach), the bays' top where the red
   * line's glow ends. Call on resize.
   */
  layout(stage: Stage, ui: number): void {
    this.placed.stripes = stage.project(0, FIELD.bottomZ + 1.05, 0, this.at, true).y;
    const line = stage.project(0, FIELD.bottomZ + LINE_LIFT, 0, this.at, true).y - 4 * ui;
    const glow = (this.placed.glow = stage.project(0, FIELD.bottomZ - 0.32, 0, this.at, true).y);
    this.placed.reach = stage.project(0, 11.7, 0, this.at, true).y;
    this.bottom.style.top = glow + "px";
    this.bottom.style.gridTemplateColumns = COLUMNS.map((px) => px * ui + "px").join(" ");
    this.strip.layout(stage, line, ui);
    // The input notice sits just above the word line, where the eyes are while typing.
    this.notice.style.top = line - 56 * ui - 52 * ui + "px";
  }

  /** The rectangles no damage number may cover (CSS px), with a small margin: the word line (at its widest), the armour, the clock, the kills, the bays, the objective's plate. */
  protectedRects(): Rect[] {
    const nodes = [this.hp, this.time.parentElement!, this.kills.parentElement!, ...this.slots.filter(Boolean).map((slot) => slot.root)];
    if (!this.goal.hidden) nodes.push(this.goal);
    const line = this.strip.rect();
    return [{ x: line.x - 6, y: line.y - 6, w: line.w + 12, h: line.h + 12 }, ...nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.left - 6, y: box.top - 6, w: box.width + 12, h: box.height + 12 };
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

  showBanner(text: string, now: number): void {
    this.banner.textContent = text;
    replay(this.banner, "is-on");
    this.bannerUntil = now + 2200;
  }

  setNotice(value: string): void {
    text(this.notice, value);
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
      if (peak > 0) this.showBanner("ĐỈNH TRÀN " + peak + (w.plan.storm[peak - 1] === 1 || w.plan.strength[peak - 1]! >= STAGE_S0.storm.spread[0] ? " · DỮ DỘI" : ""), now);
    }
    if (now > this.bannerUntil) this.banner.classList.remove("is-on");
    if (killsRecent !== this.last.kills) {
      this.kills.textContent = "×" + killsRecent;
      if (killsRecent > this.last.kills) replay(this.kills, "is-bump");
      this.kills.parentElement!.classList.toggle("is-hot", killsRecent >= 15);
      this.last.kills = killsRecent;
    }
    text(this.total, "Tổng " + w.stats.kills);
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
      slot.mags[m]!.style.setProperty("--fill", fill.toFixed(3));
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
    const text = O.need > 0 ? (O.retreat >= 0 ? "Swarm RÚT LUI" : "Pack Leader " + O.done + "/" + O.need + " · LỌT " + O.leaked + "/" + (O.of - O.need)) : "";
    if (text === this.last.goal) return;
    // The hunt won: said in the middle of the view too, not only on the plate up top.
    if (O.retreat >= 0 && this.last.goal !== "") this.showBanner("Swarm RÚT LUI!", this.lastNow);
    this.last.goal = text;
    this.goal.textContent = text;
    this.goal.hidden = text === "";
    this.goal.classList.toggle("is-done", O.retreat >= 0);
  }

  /** A rift's warning on its wall's side, counting down. */
  private updateWarn(w: World): void {
    const H = w.hazards;
    let text = "";
    let side = 0;
    if (H.state === 1 && H.next < H.count) {
      side = H.side[H.next]!;
      text = "⚠ Rift · " + Math.max(0, H.at[H.next]! - w.time).toFixed(1).replace(".", ",") + " s";
    } else if (H.state === 2) {
      side = H.side[H.next]!;
      text = "⚠ Rift";
    }
    const key = text + side;
    if (key === this.last.warn) return;
    this.last.warn = key;
    // Its countdown also beside the word line, pointing at the wall (the eyes are there while typing).
    this.strip.warn(text === "" ? "" : side < 0 ? "◀ " + text.replace("⚠ ", "") : text.replace("⚠ ", "") + " ▶", side);
    this.warn.textContent = text;
    this.warn.classList.toggle("is-on", text !== "");
    this.warn.classList.toggle("is-left", side < 0);
    this.warn.classList.toggle("is-right", side > 0);
    this.warn.style.setProperty("--warn", String(RIFT.warn));
  }

  /** A taught foe's first appearance: a small card for 2 s. */
  private updateFresh(w: World, now: number): void {
    if (this.teach.size > 0) {
      const F = w.foes;
      for (let s = 0; s < F.top; s += 1) {
        const kind = F.kind[s]!;
        if (F.alive[s] === 1 && this.teach.has(kind) && !this.met.has(kind) && F.z[s]! < 42) {
          this.met.add(kind);
          this.fresh.textContent = NEW_CARD[kind] ?? "";
          this.fresh.classList.add("is-on");
          this.freshUntil = now + NEW_MS;
        }
      }
    }
    if (now > this.freshUntil) this.fresh.classList.remove("is-on");
  }
}
