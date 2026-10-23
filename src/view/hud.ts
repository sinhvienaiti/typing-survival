/**
 * The HUD (docs/BUILD_S0.md §7, docs/BUILD_S1.md §10), DOM outside the
 * shaking canvas, dressed as the station's steel consoles (theme.css,
 * survival.css). Bottom: `[bay 3][bay 1] [learning frame 420] [bay 2][bay 4]`
 * (bays 190 px at 1280×720; the frame keeps S0's size and place). A live bay
 * shows its gun (name, colour, magazine LEDs: 2, or 3 at Rèn 3), its word
 * (32 px, long words shrink to no less than 26 px; Thiếu chữ's hidden letters
 * as "_" until typed or shown) and meaning; a bay without a gun is a dark
 * plate ("MỞ Ở MỐC" for bay 3 in the chapter, a lock for bay 4). The frame:
 * the word being typed, its IPA and meaning ("word · meaning ✓" for 0.6 s).
 * Top: armour, clock, kills, the objective's plate (Săn: "ĐẦU ĐÀN 1/3"),
 * a rift's warning on its wall's side, a 2 s card when something new first
 * appears. It publishes the rectangles damage numbers must not cover.
 */
import type { Rect } from "../kit/feedback";
import { FOES, KIND } from "../content/foes";
import { GUN_SPECS, PHAO, RAY, TAN, TIA, XUNG } from "../content/guns";
import { RIFT } from "../content/stage-rules";
import { STAGE_S0 } from "../content/stage-s0";
import { peakAt } from "../sim/plan";
import type { World } from "../sim/world";
import type { Word } from "../app/vocab";

const DONE_MS = 600;
const NEW_MS = 2000;
/** One magazine's units by gun (for the LED's fill): rounds, beam seconds, volleys, shots, shells. */
const UNITS = [XUNG.rounds, TIA.seconds, TAN.volleys, RAY.shots, PHAO.shells] as const;
/** Long words shrink down to this share of 32 px (26 px). */
const MIN_FIT = 26 / 32;
/** The "new" card per kind a stage teaches. */
const NEW_CARD: Readonly<Record<number, string>> = {
  [KIND.brute]: "MỚI · TRÂU · Vỏ " + FOES[KIND.brute]!.armour,
  [KIND.leader]: "MỚI · ĐẦU ĐÀN · Vỏ " + FOES[KIND.leader]!.armour,
  [KIND.shield]: "MỚI · KHIÊN · chắn đạn phía trước",
  [KIND.splitter]: "MỚI · TÁCH · vỡ 3 mảnh",
};
const TEACH_KIND: Readonly<Record<string, number>> = { brute: KIND.brute, leader: KIND.leader, shield: KIND.shield, splitter: KIND.splitter };

function el<T extends HTMLElement>(tag: string, className: string, parent: HTMLElement, text = ""): T {
  const node = document.createElement(tag) as T;
  node.className = className;
  if (text !== "") node.textContent = text;
  parent.append(node);
  return node;
}

type Slot = { root: HTMLElement; line: HTMLElement; typed: HTMLElement; rest: HTMLElement; mean: HTMLElement; mags: HTMLElement[]; gun: number; key: string };

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
  private readonly learn: HTMLElement;
  private readonly learnWord: { line: HTMLElement; typed: HTMLElement; rest: HTMLElement };
  private readonly learnIpa: HTMLElement;
  private readonly learnMean: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly slots: Slot[] = [];
  readonly overlay: HTMLElement;
  readonly vignette: HTMLElement;
  private done: { text: string; until: number } | null = null;
  private last = { hp: -1, time: "", kills: -1, total: -1, learn: "", peak: 0, goal: "", warn: "" };
  private bannerUntil = 0;
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
    const bottom = el("div", "sv-bottom", root);
    const kit = w.header.kit;
    const chapter = w.stage.id !== "s0";
    // Columns: bay 3, bay 1, the frame, bay 2, bay 4.
    const cell = (bay: number): void => {
      const gun = bay < kit.bays ? (w.guns.gun[bay] ?? -1) : -1;
      if (gun < 0) {
        const plate = el("section", "sv-bay-lock sv-panel", bottom);
        plate.dataset.bay = String(bay + 1);
        if (bay === 2 && chapter) el("span", "", plate, "MỞ Ở MỐC");
        else el("i", "sv-lock", plate);
        return;
      }
      const spec = GUN_SPECS[gun]!;
      const root = el("section", "sv-slot sv-panel sv-" + spec.key, bottom);
      root.dataset.bay = String(bay + 1);
      const head = el("header", "", root);
      el("span", "sv-gun", head, spec.name);
      const mags = el("div", "sv-mags", head);
      const line = el("div", "sv-word", root);
      const slot: Slot = { root, line, typed: el("span", "sv-typed", line), rest: el("span", "", line), mean: el("div", "sv-mean", root), mags: [], gun, key: "" };
      for (let m = 0; m < w.guns.cap[bay]!; m += 1) slot.mags.push(el("i", "", mags));
      this.slots[bay] = slot;
    };
    cell(2);
    cell(0);
    this.learn = el("section", "sv-learn sv-panel", bottom);
    cell(1);
    cell(3);
    const learnWord = el("div", "sv-learn-word", this.learn);
    this.learnWord = { line: learnWord, typed: el("span", "sv-typed", learnWord), rest: el("span", "", learnWord) };
    this.learnIpa = el("div", "sv-learn-ipa", this.learn);
    this.learnMean = el("div", "sv-learn-mean", this.learn);
    this.overlay = el("div", "sv-overlay", root);
    this.teach = new Set(w.stage.teach.map((thing) => TEACH_KIND[thing]).filter((kind): kind is number => kind !== undefined));
  }

  /** The rectangles no damage number may cover (CSS px), with a small margin: the frame, the armour, the bays, the objective's plate. */
  protectedRects(): Rect[] {
    const nodes = [this.learn, this.hp, ...this.slots.filter(Boolean).map((slot) => slot.root)];
    if (!this.goal.hidden) nodes.push(this.goal);
    return nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.left - 6, y: box.top - 6, w: box.width + 12, h: box.height + 12 };
    });
  }

  /** A word finished on `slot`: the slot flashes, the frame shows "word · meaning ✓". */
  finished(slot: number, index: number, perfect: boolean, now: number): void {
    const word = this.words(index);
    this.done = { text: word.en + " · " + word.vi + " ✓", until: now + DONE_MS };
    const root = this.slots[slot]?.root;
    if (root === undefined) return;
    root.classList.toggle("is-perfect", perfect);
    root.classList.remove("is-loaded");
    void root.offsetWidth;
    root.classList.add("is-loaded");
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
    if (w.hp !== this.last.hp) {
      this.last.hp = w.hp;
      this.hpFill.style.transform = "scaleX(" + Math.max(0, w.hp / w.armourMax).toFixed(3) + ")";
      this.hpText.textContent = String(Math.ceil(w.hp));
      this.hp.classList.toggle("is-low", w.hp <= w.armourMax * 0.3);
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
      // A storm surge says so: the horde is far thicker this time.
      if (peak > 0) this.showBanner("ĐỈNH TRÀN " + peak + (w.plan.storm[peak - 1] === 1 || w.plan.strength[peak - 1]! >= STAGE_S0.storm.spread[0] ? " · DỮ DỘI" : ""), now);
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
    this.updateGoal(w);
    this.updateWarn(w);
    this.updateFresh(w, now);
    for (let s = 0; s < this.slots.length; s += 1) if (this.slots[s] !== undefined) this.updateSlot(w, s);
    this.updateLearn(w, now);
  }

  private updateSlot(w: World, s: number): void {
    const slot = this.slots[s]!;
    const T = w.typing;
    const index = T.word[s]!;
    const word = index >= 0 ? w.deck[index]! : "";
    const typed = T.lock === s ? T.typed[s]! : 0;
    const key = index + ":" + typed + ":" + T.shown[s];
    if (key !== slot.key) {
      if (!slot.key.startsWith(index + ":")) slot.mean.textContent = index >= 0 ? this.words(index).vi : "";
      slot.key = key;
      slot.typed.textContent = word.slice(0, typed);
      slot.rest.textContent = masked(word, typed, T.hidden[s]!, T.shown[s]!);
      if (typed === 0) this.fit(slot.line, slot.root);
    }
    slot.root.classList.toggle("is-active", T.lock === s);
    slot.root.classList.toggle("is-dim", T.lock >= 0 && T.lock !== s);
    const mags = w.guns.mags[s]!;
    const first = w.guns.left[s]! / UNITS[slot.gun]!;
    for (let m = 0; m < slot.mags.length; m += 1) {
      const fill = m < mags - 1 ? 1 : m === mags - 1 ? Math.max(0, Math.min(1, first)) : 0;
      slot.mags[m]!.style.setProperty("--fill", fill.toFixed(3));
    }
    slot.root.classList.toggle("is-firing", mags > 0);
    slot.root.classList.toggle("is-full", mags >= w.guns.cap[s]!);
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
    const text = O.need > 0 ? (O.retreat >= 0 ? "BẦY RÚT LUI" : "ĐẦU ĐÀN " + O.done + "/" + O.need + " · LỌT " + O.leaked + "/" + (O.of - O.need)) : "";
    if (text === this.last.goal) return;
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
      text = "⚠ VẾT NỨT · " + Math.max(0, H.at[H.next]! - w.time).toFixed(1).replace(".", ",") + " s";
    } else if (H.state === 2) {
      side = H.side[H.next]!;
      text = "⚠ VẾT NỨT";
    }
    const key = text + side;
    if (key === this.last.warn) return;
    this.last.warn = key;
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

  private updateLearn(w: World, now: number): void {
    const T = w.typing;
    let key: string;
    if (T.lock >= 0) {
      const index = T.word[T.lock]!;
      const word = this.words(index);
      const text = w.deck[index]!;
      const typed = T.typed[T.lock]!;
      key = "w" + index + ":" + typed + ":" + T.shown[T.lock];
      if (key !== this.last.learn) {
        this.learnWord.typed.textContent = text.slice(0, typed);
        this.learnWord.rest.textContent = masked(text, typed, T.hidden[T.lock]!, T.shown[T.lock]!);
        this.learnIpa.textContent = word.ipa;
        this.learnMean.textContent = word.vi;
        this.learn.className = "sv-learn sv-panel is-typing sv-" + (GUN_SPECS[w.guns.gun[T.lock]!]?.key ?? "xung");
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
