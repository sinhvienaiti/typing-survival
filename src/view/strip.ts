/**
 * The word line above the ship's nose (docs/FEEL_PASS_S1.md §2, §3): the
 * word being typed, 42 px, on a plate that hugs it (16 px each side, at most
 * 420 px at 1280×720), its bottom 4 px above the bottom line's stripes. It
 * hides until a key locks a bay; a finished word shows "word · meaning ✓"
 * for 0.6 s (on two lines, "word ✓" over the meaning, when one line is too
 * wide: the word and its meaning always together, never split onto a bay).
 * Every letter typed pops in place (1.25× → 1×, the gun's ink with a halo
 * from its first frame, a sweep line under it that stays as the typed
 * part's underline; a spark behind the word frames it, its rays out past the
 * plate, for 5 frames), the plate's edge flashes the gun's colour for 3 frames,
 * and the letter stands still after 100 ms; a wrong key underlines the
 * letter due in red; a stray key ghosts in red at the line's centre. Beside
 * it the clean streak's LED ("SẠCH ×N", shown with the plate); a rift's
 * countdown on its wall's side; under it a red tick at each near foe the
 * plate hides. Every effect runs on the
 * page's frame clock (`now`), never CSS keyframes, so the held clock of the
 * scenarios captures it frame by frame. DOM outside the canvas: never shaken.
 */
import * as THREE from "three";
import { GUN_SPECS } from "../content/guns";
import { NEAR } from "../content/rules";
import type { World } from "../sim/world";
import type { Stage } from "./scene";
import { bounce, popColour, popDrop, popGlow, popScale, sparkLevel, sweepAlpha, sweepLength, swell, STREAK, POP } from "./type-rules";

const LETTERS = 16;
const MARKS = 6;
/** The plate: 56 px tall, at most 420 px wide, 16 px padding (× --ui). */
const PLATE = { height: 56, width: 420, pad: 16 } as const;
/** "word · meaning ✓" for 600 ms, fading in 120; before it, the finished word for f0–f2 (under 45 ms: the frame clock's sums sit a hair under 50 at f3). */
const DONE = { show: 600, fade: 120, word: 45 } as const;
/** A popping letter's properties (ink, halo, sweep, its alpha). */
const POP_VARS = ["--k", "--g", "--sw", "--swo"] as const;

function el<T extends HTMLElement>(tag: string, className: string, parent: HTMLElement): T {
  const node = document.createElement(tag) as T;
  node.className = className;
  parent.append(node);
  return node;
}

type Done = { word: string; text: string; full: boolean; gun: string; start: number };

export class WordStrip {
  private readonly plate: HTMLElement;
  private readonly spark: HTMLElement;
  /** The last right key's letter and its spark's turn (deg: a burst, not a cross-hair). */
  private readonly lastKey = { at: 0, turn: 0 };
  private readonly word: HTMLElement;
  private readonly done: HTMLElement;
  private readonly sweep: HTMLElement;
  private readonly ghost: HTMLElement;
  private readonly led: HTMLElement;
  private readonly hazard: HTMLElement;
  private readonly ticks: HTMLElement[] = [];
  private readonly letters: HTMLElement[] = [];
  private readonly popAt = new Float64Array(LETTERS).fill(-1e9);
  private readonly missAt = new Float64Array(LETTERS).fill(-1e9);
  private readonly styled = new Uint8Array(LETTERS);
  private count = 0;
  private key = "";
  private mode = "";
  private gun = "";
  private lockAt = -1e9;
  private badAt = -1e9;
  private strayAt = -1e9;
  private keyAt = -1e9;
  private hazardKey = "";
  private last: Done | null = null;
  private streakN = 0;
  private streakAt = -1e9;
  private brokeAt = -1e9;
  private ui = 1;
  private center = 640;
  private bottom = 472;
  /** The plate's width now (CSS px), measured when its text changes. */
  private wide = 0;
  private stage: Stage | null = null;
  private readonly at = new THREE.Vector3();
  private readonly markX = [0, 0, 0, 0, 0, 0];
  private readonly css = new WeakMap<HTMLElement, Record<string, string>>();
  reduced = false;

  constructor(root: HTMLElement) {
    this.plate = el("div", "sv-strip", root);
    // First in the plate: drawn behind the word, never over a letter.
    this.spark = el("i", "sv-strip-spark", this.plate);
    this.word = el("div", "sv-strip-word", this.plate);
    this.done = el("div", "sv-strip-done", this.plate);
    this.sweep = el("i", "sv-strip-sweep", this.plate);
    for (let i = 0; i < LETTERS; i += 1) this.letters.push(el("i", "", this.word));
    this.ghost = el("div", "sv-strip-ghost", root);
    this.led = el("div", "sv-streak", root);
    this.hazard = el("div", "sv-strip-warn", root);
    const marks = el("div", "sv-marks", root);
    for (let i = 0; i < MARKS; i += 1) this.ticks.push(el("i", "", marks));
  }

  /** Places the line: centred on the view, its bottom at `bottom` (CSS px). */
  layout(stage: Stage, bottom: number, ui: number): void {
    this.stage = stage;
    this.center = stage.width / 2;
    this.bottom = bottom;
    this.ui = ui;
    const top = bottom - PLATE.height * ui;
    this.plate.style.top = top + "px";
    this.ghost.style.top = top + "px";
    this.led.style.top = top + (PLATE.height - 22) * 0.5 * ui + "px";
    this.hazard.style.top = top + (PLATE.height - 30) * 0.5 * ui + "px";
    (this.ticks[0]!.parentElement as HTMLElement).style.top = bottom - 3 * ui + "px";
    this.wide = this.plate.offsetWidth;
    this.placeLed();
  }

  /** The widest the plate gets (damage numbers keep off it even while it is hidden). */
  rect(): { x: number; y: number; w: number; h: number } {
    const w = PLATE.width * this.ui;
    return { x: this.center - w / 2, y: this.bottom - PLATE.height * this.ui, w, h: PLATE.height * this.ui };
  }

  /** Under letter `index`, on the plate's bottom edge (CSS px): where its key's bolt leaves (never drawn over a letter). */
  anchor(index: number, out: { x: number; y: number }): boolean {
    const letter = this.letters[index];
    if (letter === undefined || index >= this.count) return false;
    const box = letter.getBoundingClientRect();
    out.x = box.left + box.width / 2;
    out.y = this.bottom;
    return true;
  }

  typed(index: number, now: number): void {
    if (index === 0) this.lockAt = now;
    if (index < LETTERS) this.popAt[index] = now;
    this.keyAt = now;
    this.lastKey.at = index;
    this.lastKey.turn = 10 + Math.random() * 25;
  }

  /** A rift's countdown beside the line, on its wall's side (`side` < 0 left; "" hides it). */
  warn(text: string, side: number): void {
    const key = text + side;
    if (key === this.hazardKey) return;
    this.hazardKey = key;
    this.hazard.textContent = text;
    this.hazard.classList.toggle("is-on", text !== "");
    this.hazard.classList.toggle("is-left", side < 0);
    this.placeHazard();
  }

  private placeHazard(): void {
    // Clear of the widest plate (420 px) and of the streak LED on the right.
    const off = (PLATE.width / 2 + (this.hazard.classList.contains("is-left") ? 12 : 120)) * this.ui;
    this.put(this.hazard, "transform", this.hazard.classList.contains("is-left") ? "translateX(calc(" + (this.center - off).toFixed(1) + "px - 100%))" : "translateX(" + (this.center + off).toFixed(1) + "px)");
  }

  /** A wrong key in the locked word: the letter due (`index`) underlined red, the plate's edge flashes. */
  miss(index: number, now: number): void {
    if (index < LETTERS) this.missAt[index] = now;
    this.badAt = now;
  }

  /** A key no bay starts with: it ghosts in red at the line's centre. */
  stray(letter: string, now: number): void {
    this.ghost.textContent = letter;
    this.strayAt = now;
  }

  /** A word finished: the word white-hot for 2 frames, then "word · meaning ✓" (or "word ✓" over the meaning when one line is too wide; "word ✓ · ĐẦY"). */
  finished(word: string, meaning: string, gun: number, full: boolean, now: number): void {
    const key = GUN_SPECS[gun]?.key ?? "xung";
    this.setDone(full ? word + " ✓ · " : word + " · " + meaning + " ✓", full, "");
    // Measured at its own size (26 px) while shown for a moment; update() picks what shows this frame.
    const wasHidden = this.done.hidden;
    this.done.hidden = false;
    this.done.style.setProperty("--fit", "1");
    const fits = full || meaning === "" || this.done.scrollWidth <= (PLATE.width - 2 * PLATE.pad) * this.ui;
    this.done.hidden = wasHidden;
    if (!fits) this.setDone(word + " ✓", false, meaning);
    this.key = "";
    this.last = { word, text: this.done.textContent ?? "", full, gun: key, start: now };
  }

  /** The done line; `below`: the meaning on a second line under "word ✓". */
  private setDone(text: string, full: boolean, below: string): void {
    this.done.classList.toggle("is-two", below !== "");
    if (below === "") this.done.textContent = text;
    else {
      const top = document.createElement("span");
      top.textContent = text;
      const under = document.createElement("small");
      under.textContent = below;
      this.done.replaceChildren(top, under);
    }
    if (full) {
      const tag = document.createElement("b");
      tag.textContent = "FULL";
      this.done.append(tag);
    }
  }

  /** The clean streak now; `broke`: the streak a wrong key just broke. */
  streak(n: number, broke: number, now: number): void {
    if (n > this.streakN && n >= STREAK.show) this.streakAt = now;
    if (broke >= STREAK.show) this.brokeAt = now;
    if (n >= STREAK.show) this.led.textContent = "CLEAN ×" + n;
    this.streakN = n;
    this.placeLed();
  }

  private placeLed(): void {
    this.led.style.left = this.center + this.wide / 2 + 8 * this.ui + "px";
    this.placeHazard();
  }

  /** Near foes the plate hides (§2.4): a red tick under it at each one's x, blinking at 4 Hz (at most 6). */
  private marks(w: World, now: number): void {
    let count = 0;
    if ((this.mode === "word" || this.mode === "done") && this.stage !== null) {
      const F = w.foes;
      const left = this.center - this.wide / 2;
      const top = this.bottom - PLATE.height * this.ui;
      for (let s = 0; s < F.top && count < MARKS; s += 1) {
        if (F.alive[s] !== 1 || F.z[s]! > NEAR.z) continue;
        const p = this.stage.project(F.x[s]!, F.z[s]!, 0.6, this.at, true);
        if (p.x >= left && p.x <= left + this.wide && p.y >= top && p.y <= this.bottom + 6) this.markX[count++] = p.x;
      }
    }
    const on = Math.floor(now / 125) % 2 === 0;
    for (let i = 0; i < MARKS; i += 1) {
      const mark = this.ticks[i]!;
      const show = i < count && on;
      if (show) this.put(mark, "transform", "translateX(" + (this.markX[i]! - 12 * this.ui).toFixed(1) + "px)");
      if (mark.classList.contains("is-on") !== show) mark.classList.toggle("is-on", show);
    }
  }

  update(w: World, now: number, hotEdge: boolean): void {
    const T = w.typing;
    const last = this.last;
    const doneAge = last === null ? 1e9 : now - last.start;
    let mode = "hidden";
    if (T.lock >= 0) mode = "word";
    else if (last !== null && doneAge < DONE.show + DONE.fade) mode = doneAge < DONE.word ? "final" : "done";
    if (mode === "word") this.showWord(w, T.lock);
    else if (mode === "final") this.showFinal(last!);
    else if (mode === "done") this.showDone();
    if (mode !== this.mode) {
      this.mode = mode;
      this.plate.classList.toggle("is-on", mode !== "hidden");
      this.plate.classList.toggle("is-done", mode === "done");
      this.wide = this.plate.offsetWidth;
      this.placeLed();
    }
    const gun = mode === "word" ? (GUN_SPECS[w.guns.gun[T.lock]!]?.key ?? "xung") : last?.gun ?? "xung";
    if (gun !== this.gun) {
      if (this.gun !== "") this.plate.classList.remove("sv-" + this.gun);
      this.plate.classList.add("sv-" + gun);
      this.gun = gun;
    }
    this.animate(now, mode, doneAge, hotEdge);
    this.marks(w, now);
  }

  private showWord(w: World, bay: number): void {
    const T = w.typing;
    const index = T.word[bay]!;
    const text = w.deck[index]!;
    const typed = T.typed[bay]!;
    const key = "w" + index + ":" + typed + ":" + T.shown[bay];
    if (key === this.key) return;
    const fresh = !this.key.startsWith("w" + index + ":") || this.mode !== "word";
    this.key = key;
    this.word.hidden = false;
    this.done.hidden = true;
    const hidden = T.hidden[bay]!;
    const shown = T.shown[bay]!;
    this.count = Math.min(LETTERS, text.length);
    for (let i = 0; i < LETTERS; i += 1) {
      const letter = this.letters[i]!;
      if (i >= this.count) {
        if (letter.textContent !== "") letter.textContent = "";
        continue;
      }
      const masked = i >= typed && (hidden & (1 << i)) !== 0 && (shown & (1 << i)) === 0;
      const char = masked ? "_" : text[i]!;
      if (letter.textContent !== char) letter.textContent = char;
      letter.classList.toggle("is-typed", i < typed);
    }
    if (fresh) this.fit(this.word);
  }

  /** The finished word, every letter typed, white-hot for its first two frames. */
  private showFinal(last: Done): void {
    const key = "f" + last.start;
    if (key === this.key) return;
    this.key = key;
    this.word.hidden = false;
    this.done.hidden = true;
    this.count = Math.min(LETTERS, last.word.length);
    for (let i = 0; i < LETTERS; i += 1) {
      const letter = this.letters[i]!;
      letter.textContent = i < this.count ? last.word[i]! : "";
      letter.classList.add("is-typed");
    }
  }

  private showDone(): void {
    if (this.key === "d") return;
    this.key = "d";
    this.word.hidden = true;
    this.done.hidden = false;
    this.fit(this.done);
  }

  /** A long line shrinks to the plate (never under half). */
  private fit(line: HTMLElement): void {
    line.style.setProperty("--fit", "1");
    const room = (PLATE.width - 2 * PLATE.pad) * this.ui;
    const need = line.scrollWidth;
    if (need > room) line.style.setProperty("--fit", Math.max(0.5, room / need).toFixed(3));
    this.wide = this.plate.offsetWidth;
    this.placeLed();
  }

  /** Writes a style only when it changed (most frames change nothing). */
  private put(node: HTMLElement, prop: string, value: string): void {
    let seen = this.css.get(node);
    if (seen === undefined) this.css.set(node, (seen = {}));
    if (seen[prop] === value) return;
    seen[prop] = value;
    node.style.setProperty(prop, value);
  }

  private animate(now: number, mode: string, doneAge: number, hotEdge: boolean): void {
    const ui = this.ui;
    const move = !this.reduced;
    for (let i = 0; i < LETTERS; i += 1) {
      const letter = this.letters[i]!;
      const t = now - this.popAt[i]!;
      const m = now - this.missAt[i]!;
      const popping = mode === "word" && t >= 0 && t < POP.glow;
      const missing = mode === "word" && m >= 0 && m < 220;
      if (popping) {
        letter.style.transform = move ? "translateY(" + (popDrop(t) * ui).toFixed(2) + "px) scale(" + popScale(t).toFixed(3) + ")" : "";
        letter.style.setProperty("--k", popColour(t).toFixed(3));
        letter.style.setProperty("--g", popGlow(t).toFixed(3));
        letter.style.setProperty("--sw", sweepLength(t).toFixed(3));
        letter.style.setProperty("--swo", sweepAlpha(t).toFixed(3));
        this.styled[i] = 1;
      } else if (this.styled[i] === 1) {
        letter.style.transform = "";
        for (const name of POP_VARS) letter.style.removeProperty(name);
        this.styled[i] = 0;
      }
      if (letter.classList.contains("is-pop") !== popping) letter.classList.toggle("is-pop", popping);
      // A finished word: white-hot for its first two frames.
      const hot = mode === "final" && doneAge < 30;
      if (letter.classList.contains("is-hot") !== hot) letter.classList.toggle("is-hot", hot);
      if (letter.classList.contains("is-miss") !== missing) letter.classList.toggle("is-miss", missing);
    }
    // The last right key's spark, centred on its letter (f0–f4).
    const sp = mode === "word" || mode === "final" ? sparkLevel(now - this.keyAt) : 0;
    const on = this.letters[this.lastKey.at];
    if (sp > 0 && on !== undefined) this.put(this.spark, "transform", "translate(" + (on.offsetLeft + on.offsetWidth / 2) + "px, " + (on.offsetTop + on.offsetHeight / 2) + "px) rotate(" + this.lastKey.turn.toFixed(1) + "deg)");
    this.put(this.spark, "--sp", sp.toFixed(3));
    // The word as a whole: the plate opens on the first key, a finished word swells and a sweep runs under it.
    const open = mode === "word" && move ? 0.9 + 0.1 * Math.min(1, (now - this.lockAt) / 80) : 1;
    this.put(this.plate, "transform", "translateX(-50%) scaleX(" + open.toFixed(3) + ")");
    const grow = mode === "final" || mode === "done" ? (move ? swell(doneAge) : 1) : 1;
    this.put(this.word, "transform", mode === "final" && grow !== 1 ? "scale(" + grow.toFixed(3) + ")" : "none");
    this.put(this.done, "transform", mode === "done" && grow !== 1 ? "scale(" + grow.toFixed(3) + ")" : "none");
    const sweep = mode === "final" || mode === "done" ? Math.min(1, doneAge / 100) : 0;
    this.put(this.sweep, "transform", "scaleX(" + sweep.toFixed(3) + ")");
    this.put(this.sweep, "opacity", sweep > 0 && doneAge < 260 ? Math.max(0, 1 - Math.max(0, doneAge - 100) / 160).toFixed(3) : "0");
    this.put(this.plate, "opacity", mode === "done" && doneAge > DONE.show ? Math.max(0, 1 - (doneAge - DONE.show) / DONE.fade).toFixed(3) : mode === "hidden" ? "0" : "1");
    this.plate.classList.toggle("is-bad", now - this.badAt < 120);
    // Each right key: the plate's edge flashes the gun's colour for 3 frames.
    this.plate.classList.toggle("is-key", mode === "word" && now - this.keyAt < 45);
    this.plate.classList.toggle("is-streak", hotEdge);
    // A stray key's ghost fades in 250 ms.
    const ghost = now - this.strayAt;
    this.put(this.ghost, "opacity", ghost >= 0 && ghost < 250 ? (0.6 * (1 - ghost / 250)).toFixed(3) : "0");
    // The streak LED: shown from 3, a bump at each rise; broken, it greys and fades in 400 ms.
    const broke = now - this.brokeAt;
    const lit = this.streakN >= STREAK.show;
    const fading = !lit && broke >= 0 && broke < 400;
    // Shown with the plate only: alone on the field it reads as a stray label.
    this.led.classList.toggle("is-on", (lit || fading) && mode !== "hidden");
    this.led.classList.toggle("is-broken", fading);
    this.put(this.led, "opacity", fading ? (1 - broke / 400).toFixed(3) : "1");
    const bump = now - this.streakAt;
    this.put(this.led, "transform", lit && move && bump >= 0 && bump < 160 ? "scale(" + (1.2 - 0.2 * (bump / 160)).toFixed(3) + ")" : "none");
  }
}

/** A first letter's bounce on a bay (a stray key): its scale `t` ms after. */
export const firstBounce = (t: number, reduced: boolean): number => (reduced ? 1 : bounce(t));
