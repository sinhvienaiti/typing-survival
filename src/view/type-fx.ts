/**
 * The word line as the kit's focus strip (parent docs/games/TYPING_FEEDBACK_REVIEW.md
 * §18, §20 item 5): the word being typed big above the ship's nose, its
 * bottom on the line Hud.layout gives (where the old plate stood), its
 * meaning under it. Each right key plays the player's letter style, a wrong
 * key bounces the letter typed off the row, a finished word flies its
 * letters into the ship's core. Its colours follow the gun of the bay being
 * typed. TypeFeel reads the sim's typing events and feeds them here through
 * the kit's TypingFxDriver.
 *
 * The kit's TypingSounds sits on the driver for the keyboard packs to come;
 * none is loaded (the owner paused keyboard sounds, 29/10), so it plays
 * nothing and the game's own key sound (theme-audio.ts) stays.
 *
 * The strip runs on its own clock, which stands still while the fight is
 * paused (the pause screen, the quick panels and their countdown).
 */
import * as THREE from "three";
import type { Rect } from "../kit/feedback";
import { FocusStrip, TypingFxDriver, TypingSounds, type TypingFxKind, type TypingFxPalette, type TypingFxProgress, type TypingFxSettings } from "../kit/feedback/typing-fx";
import type { ThemeAudio } from "../audio/theme-audio";
import type { Stage } from "./scene";
import type { Ship } from "./ship";
import type { StripHost } from "./strip";

/** Typed-letter colours by GUN id (Xung, Tia, Tán, Ray, Pháo Sao): theme.css --volt, --hot, --tan, --ray-ink, --phao. */
export const GUN_ACCENT = ["#3db8ff", "#ff7a1f", "#ffc53d", "#8fa3ff", "#ff3f6c"] as const;
/** The rest from theme.css: --white-hot, --ink, --danger, a warm gold, --text, --soft. */
export const PALETTE: Omit<TypingFxPalette, "accent"> = { hot: "#fff0d8", ink: "#050607", warn: "#ff4a4a", gold: "#ffd36a", pending: "#f4f1eb", meaning: "#cdd2d6" };
/** A word's id: its bay × WORD_ID + its deck index (§20). */
export const WORD_ID = 100000;
/**
 * The plate at its widest, in font sizes: a long meaning wraps at 24 em of
 * its 0.36 font (plus padding) and runs to two lines under the 1.2 row; up
 * to 2.75 covers a one-line plate's combo badge too (0.62 over its top).
 */
const WIDEST = { w: 9.7, h: 2.75 } as const;
/** The word row's centre over the strip's bottom, in font sizes, before a word has shown (one meaning line). */
const ROW_UP = 1.3;
/** Clock steps longer than this (a background tab) count as this much (ms). */
const MAX_STEP = 100;

export class TypeFx implements StripHost {
  readonly strip: FocusStrip;
  readonly sounds: TypingSounds;
  readonly driver: TypingFxDriver;
  /** The strip's clock (ms): the page's frame clock, standing still while the fight is paused. */
  time = 0;
  private last = -1;
  private gun = -1;
  private x = 0;
  private bottom = 0;
  private row = 0;
  private readonly p: TypingFxProgress = { kind: "advance", word: -1, text: "", meaning: "", typed: 0, combo: 0 };
  private readonly v = new THREE.Vector3();
  private readonly pt = { x: 0, y: 0 };

  constructor(root: HTMLElement, private readonly stage: Stage, ship: Ship, audio: ThemeAudio, settings: TypingFxSettings, reduced: boolean) {
    const v = this.v;
    this.strip = new FocusStrip({
      root,
      anchorEdge: "bottom",
      palette: { ...PALETTE, accent: GUN_ACCENT[0] },
      settings,
      reducedMotion: reduced,
      autoTick: false,
      clock: () => this.time,
      plateClass: "sv-tfx-plate",
      // Finished letters fly into the ship's core, seen through the still camera (the DOM never shakes).
      target: (out) => {
        ship.core(v);
        stage.project(v.x, -v.z, v.y, v, true);
        out.x = v.x;
        out.y = v.y;
        return true;
      },
    });
    // Silent until a keyboard pack is loaded (none is: paused by the owner); it would share the page's context and keys bus.
    this.sounds = new TypingSounds({ context: () => started(audio.context), destination: () => started(audio.input("keys")) });
    this.driver = new TypingFxDriver([this.strip, this.sounds]);
  }

  /** Moves the strip's clock with the page's (`running`: the fight runs). */
  tick(clock: number, running: boolean): void {
    if (this.last >= 0 && running) this.time += Math.max(0, Math.min(MAX_STEP, clock - this.last));
    this.last = clock;
  }

  /** One frame of the strip's effects (after the frame's events). */
  update(): void {
    this.strip.update(this.time);
  }

  /** The player's style, strength and size. */
  configure(settings: Partial<TypingFxSettings>): void {
    this.strip.configure(settings);
    this.place(this.x, this.bottom);
  }

  setReduced(reduced: boolean): void {
    this.strip.setReducedMotion(reduced);
  }

  /** The strip's colours follow the bay's gun (GUN id). */
  setGun(gun: number): void {
    if (gun === this.gun || gun < 0) return;
    this.gun = gun;
    this.strip.setPalette({ accent: GUN_ACCENT[gun] ?? GUN_ACCENT[0] });
  }

  /** One typing event (TypingFxKind) of word `word`, `typed` letters in; `mask`: its hidden letters (unset: unchanged); `key`: a wrong key's letter. */
  progress(kind: TypingFxKind, word: number, text: string, meaning: string, typed: number, combo: number, mask?: number, key?: string, perfect?: boolean): void {
    const p = this.p;
    p.kind = kind;
    p.word = word;
    p.text = text;
    p.meaning = meaning;
    p.typed = typed;
    p.combo = combo;
    p.mask = mask;
    p.key = key;
    p.perfect = perfect;
    this.driver.progress(p, this.time);
  }

  /** A key no bay starts with. */
  stray(): void {
    this.progress("stray", -1, "", "", 0, 0);
  }

  /** The clean streak now (escalates the key effects; a wrong key resets it). */
  setCombo(n: number): void {
    this.strip.setCombo(n);
  }

  // ── StripHost: the old line's LED, rift countdown and near-foe ticks are laid out around the strip. ──

  place(x: number, bottom: number): void {
    this.x = x;
    this.bottom = bottom;
    // Reads the root's size now (its ResizeObserver would only run after this frame).
    this.strip.layout();
    this.strip.setAnchorPx(x, bottom, "bottom");
    this.row = bottom - this.strip.fontSize * ROW_UP;
  }

  rect(): Rect {
    return this.strip.rect();
  }

  widest(): Rect {
    const size = this.strip.fontSize;
    const w = Math.min(this.stage.width - 32, size * WIDEST.w);
    const h = size * WIDEST.h;
    return { x: this.x - w / 2, y: this.bottom - h, w, h };
  }

  rowY(): number {
    if (this.strip.glyphPoint(0, this.pt)) this.row = this.pt.y - this.strip.fontSize * 0.5;
    return this.row;
  }

  /** Where the 3D bolt of letter `index`'s key leaves: under the letter, on the plate's bottom edge (CSS px). */
  anchor(index: number, out: { x: number; y: number }): boolean {
    if (!this.strip.glyphPoint(index, out)) return false;
    const plate = this.strip.rect();
    out.y = Math.max(out.y, plate.y + plate.h);
    return true;
  }
}

function started<T>(value: T | null): T {
  if (value === null) throw new Error("survival: keyboard sounds need the page's audio started first");
  return value;
}
