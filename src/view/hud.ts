/**
 * The HUD (docs/BUILD_S0.md §7), DOM outside the shaking canvas, dressed
 * as the station's steel consoles (theme.css, survival.css):
 * the learning frame at the bottom centre (the word being typed, its IPA
 * and meaning; "word · meaning ✓" for 0.6 s when done), the two gun bays
 * either side (gun name, word ≥ 26 px at 1280×720, meaning, two-magazine
 * LED bar), the line's armour, the time left and the kills of the last 3 s.
 * It publishes the rectangles damage numbers must not cover.
 */
import type { Rect } from "../kit/feedback";
import { MAG_MAX, TIA, WEAPON, XUNG } from "../content/rules";
import { peakAt } from "../sim/plan";
import type { World } from "../sim/world";
import type { Word } from "../app/vocab";

const GUNS = [
  { name: "XUNG", kind: "xung", hint: "pháo liên thanh" },
  { name: "TIA", kind: "tia", hint: "tia nhiệt" },
] as const;
const DONE_MS = 600;

function el<T extends HTMLElement>(tag: string, className: string, parent: HTMLElement, text = ""): T {
  const node = document.createElement(tag) as T;
  node.className = className;
  if (text !== "") node.textContent = text;
  parent.append(node);
  return node;
}

type Slot = { root: HTMLElement; typed: HTMLElement; rest: HTMLElement; mean: HTMLElement; mags: HTMLElement[]; word: string; typedCount: number };

export class Hud {
  readonly root: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly time: HTMLElement;
  private readonly kills: HTMLElement;
  private readonly total: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly learn: HTMLElement;
  private readonly learnWord: { line: HTMLElement; typed: HTMLElement; rest: HTMLElement };
  private readonly learnIpa: HTMLElement;
  private readonly learnMean: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly slots: Slot[] = [];
  readonly overlay: HTMLElement;
  readonly vignette: HTMLElement;
  private done: { text: string; until: number } | null = null;
  private last = { hp: -1, time: "", kills: -1, total: -1, lock: -2, learn: "", peak: 0 };
  private bannerUntil = 0;

  constructor(root: HTMLElement, private readonly words: (index: number) => Word) {
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
    const kills = el("div", "sv-kills sv-panel", top);
    this.kills = el("b", "", kills);
    el("small", "", kills, "hạ / 3 s");
    this.total = el("em", "", kills);
    this.banner = el("div", "sv-banner", root);
    this.notice = el("div", "sv-notice", root);
    const bottom = el("div", "sv-bottom", root);
    const slot = (gun: (typeof GUNS)[number]): void => {
      const root = el("section", "sv-slot sv-panel sv-" + gun.kind, bottom);
      const head = el("header", "", root);
      el("span", "sv-gun", head, gun.name);
      el("small", "sv-hint", head, gun.hint);
      const mags = el("div", "sv-mags", head);
      const word = el("div", "sv-word", root);
      this.slots.push({
        root,
        typed: el("span", "sv-typed", word),
        rest: el("span", "", word),
        mean: el("div", "sv-mean", root),
        mags: Array.from({ length: MAG_MAX }, () => el("i", "", mags)),
        word: "",
        typedCount: -1,
      });
    };
    slot(GUNS[0]);
    this.learn = el("section", "sv-learn sv-panel", bottom);
    slot(GUNS[1]);
    const learnWord = el("div", "sv-learn-word", this.learn);
    this.learnWord = { line: learnWord, typed: el("span", "sv-typed", learnWord), rest: el("span", "", learnWord) };
    this.learnIpa = el("div", "sv-learn-ipa", this.learn);
    this.learnMean = el("div", "sv-learn-mean", this.learn);
    this.overlay = el("div", "sv-overlay", root);
  }

  /** The rectangles no damage number may cover (CSS px), with a small margin. */
  protectedRects(): Rect[] {
    return [this.learn, this.hp, ...this.slots.map((slot) => slot.root)].map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.left - 6, y: box.top - 6, w: box.width + 12, h: box.height + 12 };
    });
  }

  /** A word finished on `slot`: the slot flashes, the frame shows "word · meaning ✓". */
  finished(slot: number, index: number, perfect: boolean, now: number): void {
    const word = this.words(index);
    this.done = { text: word.en + " · " + word.vi + " ✓", until: now + DONE_MS };
    this.slots[slot]!.root.classList.toggle("is-perfect", perfect);
    this.slots[slot]!.root.classList.remove("is-loaded");
    void this.slots[slot]!.root.offsetWidth;
    this.slots[slot]!.root.classList.add("is-loaded");
  }

  showBanner(text: string, now: number): void {
    this.banner.textContent = text;
    this.banner.classList.remove("is-on");
    void this.banner.offsetWidth;
    this.banner.classList.add("is-on");
    this.bannerUntil = now + 2200;
  }

  setNotice(text: string): void {
    if (this.notice.textContent !== text) this.notice.textContent = text;
    this.notice.hidden = text === "";
  }

  /** A hurt: the screen edges flash red for a moment. */
  hurt(): void {
    this.vignette.classList.remove("is-hurt");
    void this.vignette.offsetWidth;
    this.vignette.classList.add("is-hurt");
  }

  update(w: World, killsRecent: number, now: number): void {
    const T = w.typing;
    if (w.hp !== this.last.hp) {
      this.last.hp = w.hp;
      this.hpFill.style.transform = "scaleX(" + Math.max(0, w.hp / 100).toFixed(3) + ")";
      this.hpText.textContent = String(Math.ceil(w.hp));
      this.hp.classList.toggle("is-low", w.hp <= 30);
    }
    const left = Math.max(0, Math.ceil(w.seconds - w.time));
    const clock = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    if (clock !== this.last.time) {
      this.last.time = clock;
      this.time.textContent = clock;
    }
    const peak = peakAt(w);
    if (peak !== this.last.peak) {
      this.last.peak = peak;
      if (peak > 0) this.showBanner("ĐỈNH TRÀN " + peak, now);
    }
    if (now > this.bannerUntil) this.banner.classList.remove("is-on");
    if (killsRecent !== this.last.kills) {
      this.kills.textContent = "×" + killsRecent;
      if (killsRecent > this.last.kills) {
        this.kills.classList.remove("is-bump");
        void this.kills.offsetWidth;
        this.kills.classList.add("is-bump");
      }
      this.kills.parentElement!.classList.toggle("is-hot", killsRecent >= 15);
      this.last.kills = killsRecent;
    }
    if (w.stats.kills !== this.last.total) {
      this.last.total = w.stats.kills;
      this.total.textContent = "Tổng " + w.stats.kills;
    }
    for (let s = 0; s < 2; s += 1) {
      const slot = this.slots[s]!;
      const index = T.word[s]!;
      const word = index >= 0 ? w.deck[index]! : "";
      const typed = T.lock === s ? T.typed[s]! : 0;
      if (word !== slot.word || typed !== slot.typedCount) {
        if (word !== slot.word) slot.mean.textContent = index >= 0 ? this.words(index).vi : "";
        slot.word = word;
        slot.typedCount = typed;
        slot.typed.textContent = word.slice(0, typed);
        slot.rest.textContent = word.slice(typed);
      }
      slot.root.classList.toggle("is-active", T.lock === s);
      slot.root.classList.toggle("is-dim", T.lock >= 0 && T.lock !== s);
      const mags = w.guns.mags[s]!;
      const first = s === WEAPON.xung ? w.guns.rounds / XUNG.rounds : w.guns.beamLeft / TIA.seconds;
      for (let m = 0; m < MAG_MAX; m += 1) {
        const fill = m < mags - 1 ? 1 : m === mags - 1 ? Math.max(0, Math.min(1, first)) : 0;
        slot.mags[m]!.style.setProperty("--fill", fill.toFixed(3));
      }
      slot.root.classList.toggle("is-firing", mags > 0);
      slot.root.classList.toggle("is-full", mags >= MAG_MAX);
    }
    this.updateLearn(w, now);
  }

  private updateLearn(w: World, now: number): void {
    const T = w.typing;
    let key: string;
    if (T.lock >= 0) {
      const index = T.word[T.lock]!;
      const word = this.words(index);
      const text = w.deck[index]!;
      const typed = T.typed[T.lock]!;
      key = "w" + index + ":" + typed;
      if (key !== this.last.learn) {
        this.learnWord.typed.textContent = text.slice(0, typed);
        this.learnWord.rest.textContent = text.slice(typed);
        this.learnIpa.textContent = word.ipa;
        this.learnMean.textContent = word.vi;
        this.learn.className = "sv-learn sv-panel is-typing sv-" + (T.lock === 0 ? "xung" : "tia");
      }
    } else if (this.done !== null && now < this.done.until) {
      key = "d" + this.done.text;
      if (key !== this.last.learn) {
        this.learnWord.typed.textContent = "";
        this.learnWord.rest.textContent = this.done.text;
        this.learnIpa.textContent = "";
        this.learnMean.textContent = "";
        this.learn.className = "sv-learn sv-panel is-done";
      }
    } else {
      key = "idle";
      if (key !== this.last.learn) {
        this.learnWord.typed.textContent = "";
        this.learnWord.rest.textContent = "";
        this.learnIpa.textContent = "";
        this.learnMean.textContent = "Gõ chữ đầu của một bến súng để nạp đạn";
        this.learn.className = "sv-learn sv-panel is-idle";
      }
    }
    if (key !== this.last.learn) this.fitLearnWord();
    this.last.learn = key;
  }

  /** The frame's big line shrinks to fit its panel ("word · a long meaning ✓" never spills over the gun slots). */
  private fitLearnWord(): void {
    const line = this.learnWord.line;
    line.style.setProperty("--fit", "1");
    const style = getComputedStyle(this.learn);
    const room = this.learn.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const need = line.scrollWidth;
    if (room > 0 && need > room) line.style.setProperty("--fit", Math.max(0.5, room / need).toFixed(3));
  }
}
