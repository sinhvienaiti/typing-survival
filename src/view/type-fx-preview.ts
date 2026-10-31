/**
 * The Settings panel's preview of the letter style (quick.ts): a small focus
 * strip of its own typing a few words of the deck in a loop at ~9 keys a
 * second (a wrong key in every other word, every word finished), at the word line's
 * size when it fits. It runs on its own animation frame, so it moves while
 * the fight stands paused under the panel.
 */
import { FocusStrip, TypingFxDriver, type TypingFxProgress, type TypingFxSettings } from "../kit/feedback/typing-fx";
import { PALETTE } from "./type-fx";

export type PreviewWord = { readonly en: string; readonly vi: string };

/** One step of the demo typist (ms). */
const STEP_MS = 110;
/** Steps between two words. */
const REST = 5;
/** The box's height at a 720 px view (it scales with the panel). */
const BOX_PX = 132;

export class TypeFxPreview {
  private readonly box: HTMLDivElement;
  private strip: FocusStrip;
  private driver: TypingFxDriver;
  private readonly timer: number;
  private readonly p: TypingFxProgress = { kind: "advance", word: 0, text: "", meaning: "", typed: 0, combo: 0 };
  private word = 0;
  private step = 0;
  private combo = 0;

  constructor(
    host: HTMLElement,
    private settings: TypingFxSettings,
    private reduced: boolean,
    private accent: string,
    /** The word line's font size now (px): the preview matches it when it fits. */
    private readonly font: () => number,
    private readonly words: readonly PreviewWord[],
  ) {
    const doc = host.ownerDocument;
    this.box = doc.createElement("div");
    this.box.className = "sv-tfx-preview";
    const scale = parseFloat(getComputedStyle(host).getPropertyValue("--kit-qs-s")) || 1;
    this.box.style.cssText = "position:relative;overflow:hidden;width:100%;height:" + Math.round(BOX_PX * scale) + "px;border-radius:6px;background:var(--steel-950)";
    host.append(this.box);
    this.strip = this.make();
    this.driver = new TypingFxDriver([this.strip]);
    this.timer = window.setInterval(this.next, STEP_MS);
  }

  configure(settings: TypingFxSettings): void {
    const resize = settings.size !== this.settings.size;
    this.settings = settings;
    if (resize) this.rebuild();
    else this.strip.configure(settings);
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.strip.setReducedMotion(reduced);
  }

  setAccent(accent: string): void {
    this.accent = accent;
    this.strip.setPalette({ accent });
  }

  dispose(): void {
    window.clearInterval(this.timer);
    this.strip.dispose();
    this.box.remove();
  }

  /** A new size: a new strip (its font is fixed when it is made). */
  private rebuild(): void {
    this.strip.dispose();
    this.strip = this.make();
    this.driver = new TypingFxDriver([this.strip]);
    this.step = 0;
  }

  private make(): FocusStrip {
    const height = this.box.clientHeight || BOX_PX;
    // The row and one meaning line take ~2.1 font sizes.
    const font = Math.max(18, Math.min(this.font(), height / 2.1));
    const box = this.box;
    return new FocusStrip({
      root: box,
      anchor: { x: 0.5, y: 0.1 },
      fontPx: (font * 1080) / height,
      settings: this.settings,
      reducedMotion: this.reduced,
      palette: { ...PALETTE, accent: this.accent },
      // Finished letters dive to the box's bottom edge (the ship's place in play).
      target: (out) => {
        out.x = box.clientWidth / 2;
        out.y = box.clientHeight - 4;
        return true;
      },
    });
  }

  private readonly next = (): void => {
    const sample = this.words[this.word % Math.max(1, this.words.length)];
    if (sample === undefined || sample.en === "") return;
    const text = sample.en;
    const s = this.step++;
    const p = this.p;
    p.word = this.word;
    p.text = text;
    p.meaning = sample.vi;
    p.combo = this.combo;
    p.mask = undefined;
    p.key = undefined;
    p.perfect = undefined;
    // Step 0 shows the word; then one key a step (every other word a wrong key before its third letter); then done.
    const wrongAt = this.word % 2 === 0 ? Math.min(2, text.length - 1) : -1;
    const typed = wrongAt >= 0 && s > wrongAt ? s - 1 : s;
    if (wrongAt >= 0 && s === wrongAt + 1) {
      p.kind = "wrong";
      p.typed = wrongAt;
      p.key = text[wrongAt] === "x" ? "z" : "x";
    } else if (s === 0) {
      p.kind = "show";
      p.typed = 0;
    } else if (typed < text.length) {
      p.kind = "advance";
      p.typed = typed;
    } else if (typed === text.length) {
      p.kind = "done";
      p.typed = text.length;
      this.combo += 1;
      p.combo = this.combo;
    } else {
      if (typed >= text.length + REST) {
        this.word += 1;
        this.step = 0;
      }
      return;
    }
    this.driver.progress(p);
  };
}
