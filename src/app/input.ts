/**
 * The keyboard (docs/survival/BUILD_S0.md §1): a letter types (a `key`
 * command), Backspace takes one back; command keys are never letters
 * (Escape pauses, Enter starts or restarts, Tab says the word again).
 * Composing presses of a Vietnamese input method, held keys, Ctrl/Alt/Meta
 * and synthetic presses (unless the dev flag allows them) type nothing;
 * a sign of an input method at work asks the player to switch it off.
 */
import { isComposingKey, typedLetter, vietnameseInputSign } from "../../scene3d/keys";
import type { CommandBody } from "../sim/world";

export type KeyHandlers = { send(command: CommandBody): void; act(action: "pause" | "enter" | "repeat"): void; onVietnamese(): void; allowUntrusted: boolean };

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
    if (event.code === "Backspace") {
      event.preventDefault();
      keys.send({ t: "back" });
    } else if (event.repeat) return;
    else if (event.code === "Escape") keys.act("pause");
    else if (event.code === "Enter" || event.code === "NumpadEnter") {
      event.preventDefault();
      keys.act("enter");
    } else if (event.code === "Tab") {
      event.preventDefault();
      keys.act("repeat");
    }
  });
}
