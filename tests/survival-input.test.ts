import { describe, expect, it } from "vitest";
import { IME_NOTICE_MS, ImeNotice, installAutoPause, installKeys } from "../src/app/input";
import type { CommandBody } from "../src/sim/world";

/**
 * Sinh Tồn's keyboard and focus (docs/BUILD_S0.md §1, S0 review):
 * letters type, command keys are never letters, an input method's presses
 * type nothing and raise a notice that goes again, and a hidden tab or a
 * window that lost focus pauses the fight.
 */
type Listener = (event: never) => void;
const target = () => {
  const listeners = new Map<string, Listener[]>();
  return {
    hidden: false,
    addEventListener(type: string, listener: Listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    fire(type: string, event: object = {}) {
      for (const listener of listeners.get(type) ?? []) listener(event as never);
    },
  };
};
const press = (key: string, extra: Record<string, unknown> = {}) => ({ key, code: key.length === 1 ? "Key" + key.toUpperCase() : key, isTrusted: true, preventDefault() {}, ...extra });

function keyboard() {
  const win = target();
  const sent: CommandBody[] = [];
  const acts: string[] = [];
  let signs = 0;
  installKeys(win as unknown as Window, { send: (command) => sent.push(command), act: (action) => acts.push(action), onVietnamese: () => (signs += 1), allowUntrusted: false });
  return { win, sent, acts, signs: () => signs };
}

describe("keys", () => {
  it("letters type (either case), Backspace takes one back, command keys act and never type", () => {
    const k = keyboard();
    for (const key of ["g", "O", "d"]) k.win.fire("keydown", press(key));
    k.win.fire("keydown", press("Backspace", { code: "Backspace" }));
    for (const key of ["Escape", "Enter", "Tab"]) k.win.fire("keydown", press(key, { code: key }));
    expect(k.sent).toEqual([{ t: "key", letter: 6 }, { t: "key", letter: 14 }, { t: "key", letter: 3 }, { t: "back" }]);
    expect(k.acts).toEqual(["pause", "enter", "repeat"]);
  });

  it("an input method's presses, held keys, shortcuts and synthetic presses type nothing", () => {
    const k = keyboard();
    k.win.fire("keydown", press("a", { isComposing: true }));
    k.win.fire("keydown", press("Process", { keyCode: 229 }));
    k.win.fire("keydown", press("Enter", { code: "Enter", isComposing: true }));
    k.win.fire("keydown", press("a", { repeat: true }));
    k.win.fire("keydown", press("c", { ctrlKey: true }));
    k.win.fire("keydown", press("b", { isTrusted: false }));
    expect(k.sent).toEqual([]);
    expect(k.acts).toEqual([]);
    // Composing presses are a sign of an input method; so is an accented letter (UniKey).
    k.win.fire("keydown", press("ô"));
    expect(k.signs()).toBe(4);
    expect(k.sent).toEqual([]);
  });
});

describe("the input-method notice", () => {
  it("shows after a sign and goes again a few seconds after the last one", () => {
    const notice = new ImeNotice();
    expect(notice.on(0)).toBe(false);
    notice.note(1000);
    expect(notice.on(1000 + IME_NOTICE_MS - 1)).toBe(true);
    notice.note(5000);
    expect(notice.on(1000 + IME_NOTICE_MS + 1)).toBe(true);
    expect(notice.on(5000 + IME_NOTICE_MS)).toBe(false);
  });
});

describe("auto-pause", () => {
  it("pauses when the tab is hidden or the window loses focus, not when it shows again", () => {
    const win = target();
    const doc = target();
    let pauses = 0;
    installAutoPause(win, doc, () => (pauses += 1));
    doc.hidden = false;
    doc.fire("visibilitychange");
    expect(pauses).toBe(0);
    doc.hidden = true;
    doc.fire("visibilitychange");
    expect(pauses).toBe(1);
    win.fire("blur");
    expect(pauses).toBe(2);
  });
});
