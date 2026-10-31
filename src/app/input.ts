/**
 * The keyboard (docs/BUILD_S0.md §1): a letter types (a `key`
 * command), Backspace takes one back; command keys are never letters
 * (Escape pauses or goes back, Enter takes a menu item, Tab says the word again).
 * Composing presses of a Vietnamese input method, held keys, Ctrl/Alt/Meta
 * and synthetic presses (unless the dev flag allows them) type nothing;
 * a sign of an input method at work asks the player to switch it off (for
 * a few seconds after the last sign: ImeNotice). Arrow keys move through the
 * menus (held, they repeat); digits 1–9 pick a card on a screen (the gun
 * cards of the loadout), never a letter. A hidden tab or a window
 * that loses focus pauses the fight (installAutoPause): keys cannot reach
 * it there, and the horde would not wait.
 */
import { isComposingKey, typedLetter, vietnameseInputSign } from "../kit/input";
import type { CommandBody } from "../sim/world";

export type KeyAction = "pause" | "enter" | "repeat" | "up" | "down" | "left" | "right";
export type KeyHandlers = { send(command: CommandBody): void; act(action: KeyAction): void; onVietnamese(): void; allowUntrusted: boolean; pick?: (n: number) => void; space?: () => void };

/** Digit keys (top row and keypad) → 1 … 9. */
const DIGIT = /^(?:Digit|Numpad)([1-9])$/;

/** Arrow keys move through the menus (held keys repeat there). */
const ARROWS: Readonly<Record<string, KeyAction>> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

export function installKeys(target: Window, keys: KeyHandlers): void {
  target.addEventListener("keydown", (event) => {
    const trusted = event.isTrusted || keys.allowUntrusted;
    if (!trusted) return;
    if (vietnameseInputSign(event)) keys.onVietnamese();
    if (event.ctrlKey || event.metaKey || event.altKey || isComposingKey(event)) return;
    const letter = typedLetter(event);
    if (letter !== null) {
      event.preventDefault();
      keys.send({ t: "key", letter: letter.charCodeAt(0) - 97 });
      return;
    }
    const arrow = ARROWS[event.code];
    if (event.code === "Backspace") {
      event.preventDefault();
      keys.send({ t: "back" });
    } else if (arrow !== undefined) {
      event.preventDefault();
      keys.act(arrow);
    } else if (event.repeat) return;
    else if (event.code === "Space" && keys.space !== undefined) {
      event.preventDefault();
      keys.space();
    } else if (DIGIT.test(event.code) && keys.pick !== undefined) {
      event.preventDefault();
      keys.pick(Number(DIGIT.exec(event.code)![1]));
    } else if (event.code === "Escape") keys.act("pause");
    else if (event.code === "Enter" || event.code === "NumpadEnter") {
      event.preventDefault();
      keys.act("enter");
    } else if (event.code === "Tab") {
      event.preventDefault();
      keys.act("repeat");
    }
  });
}

/** How long the "switch the Vietnamese input method off" notice stays after the last sign of one (ms). */
export const IME_NOTICE_MS = 7000;

/** The input-method notice: on for IME_NOTICE_MS after the last sign, so it goes once the player switched it off. */
export class ImeNotice {
  private until = -Infinity;

  note(now: number): void {
    this.until = now + IME_NOTICE_MS;
  }

  on(now: number): boolean {
    return now < this.until;
  }
}

type Listens = { addEventListener(type: string, listener: () => void): void };

/** Calls `pause` when the document is hidden or the window loses focus. */
export function installAutoPause(win: Listens, doc: Listens & { readonly hidden: boolean }, pause: () => void): void {
  doc.addEventListener("visibilitychange", () => {
    if (doc.hidden) pause();
  });
  win.addEventListener("blur", () => pause());
}
