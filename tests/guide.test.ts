import { describe, expect, it, vi } from "vitest";
import { Journey, STAGES_KEY } from "../src/app/journey";
import { CHAPTER_1 } from "../src/content/chapter-1";
import { GUN, GUN_IDS } from "../src/content/guns";
import type { TextStore } from "../src/app/skill";
import { renderJourney } from "../src/view/screens-journey";

const KEY = "survival.guide";
const HINT = "Type a word on a bay to load its gun";
const NOTE = "Press Enter to start. Guns fire on their own; type words to load them.";
const guide = () => import("../src/app/guide");
function storage(record?: unknown) {
  const data = new Map<string, string>();
  if (record !== undefined) data.set(KEY, JSON.stringify(record));
  const store = { getItem: (key: string) => data.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { data.set(key, value); }) };
  return { data, store };
}
function page(store: TextStore = storage().store, index = 0) {
  const start = vi.fn();
  const journey = new Journey({ store, mode: () => "balanced", sound: () => {}, draw: () => {}, back: () => {}, start });
  journey.brief(CHAPTER_1[index]!);
  return { journey, start };
}

describe("guide record", () => {
  it("defaults an empty store", async () => { expect((await guide()).loadGuide(storage().store)).toEqual({ started: false, hint: false }); });
  it.each(["{", "null", "[]", '{"started":"yes","hint":1}'])("rejects broken record %s", async (raw) => {
    const { data, store } = storage(); data.set(KEY, raw);
    expect((await guide()).loadGuide(store)).toEqual({ started: false, hint: false });
  });
  it("exempts returning players even with a broken guide", async () => {
    const { data, store } = storage(); data.set(STAGES_KEY, JSON.stringify({ passed: { "c1-s1": true } })); data.set(KEY, "{");
    expect((await guide()).loadGuide(store)).toEqual({ started: true, hint: true });
  });
  it("merges both marks in either order", async () => {
    const { loadGuide, markStarted, markHintDone } = await guide();
    for (const marks of [[markStarted, markHintDone], [markHintDone, markStarted]]) {
      const { store } = storage(); marks[0]!(store);
      expect(loadGuide(store)).toEqual({ started: marks[0] === markStarted, hint: marks[0] === markHintDone });
      marks[1]!(store);
      expect(loadGuide(store)).toEqual({ started: true, hint: true });
    }
  });
  it.each([false, "throw"])("tolerates a failed write: %s", async (failure) => {
    const { markStarted, markHintDone } = await guide();
    const store = { getItem: () => null, setItem: () => { if (failure === "throw") throw Error("full"); return false; } };
    expect(() => { markStarted(store); markHintDone(store); }).not.toThrow();
  });
});

describe("first loadout", () => {
  it("preselects the ordered pair, ready with START focused; Enter starts", () => {
    const { journey, start } = page(); journey.loadout();
    expect(journey.picked).toEqual([GUN.xung, GUN.tia]); expect(journey.ready).toBe(true); expect(journey.cursor).toBe(GUN_IDS.length);
    journey.act("enter"); expect(start).toHaveBeenCalledWith({ stage: "c1-s1", guns: [GUN.xung, GUN.tia] });
  });
  it("does not preselect after starting", () => { const { journey } = page(storage({ started: true, hint: false }).store); journey.loadout(); expect(journey.picked).toEqual([]); });
  it("does not preselect stage 2", () => { const { journey } = page(undefined, 1); journey.loadout(); expect(journey.picked).toEqual([]); });
  it("keeps existing picks and order on return", () => {
    const { journey } = page(); journey.picked = [GUN.tia, GUN.xung]; journey.loadout(); journey.close(); journey.loadout();
    expect(journey.picked).toEqual([GUN.tia, GUN.xung]);
  });
  it("does not refill after deselecting all, Escape and return", () => {
    const { journey } = page(); journey.loadout(); journey.pick(1); journey.pick(2); journey.act("pause"); journey.loadout(); expect(journey.picked).toEqual([]);
  });
  it("marks started before the host starts", async () => {
    const { store } = storage(); const { loadGuide } = await guide();
    const journey = new Journey({ store, mode: () => "balanced", sound: () => {}, draw: () => {}, back: () => {}, start: () => expect(loadGuide(store).started).toBe(true) });
    journey.picked = [GUN.xung, GUN.tia]; journey.begin(); expect(loadGuide(store).started).toBe(true);
  });
  it("limits recommendations to the stage 1 pair at all times", () => {
    const { journey } = page(storage({ started: true, hint: true }).store); journey.loadout();
    expect(journey.cards().map((card) => card.recommended)).toEqual([true, true, false, false, false]);
    journey.brief(CHAPTER_1[1]!); expect(journey.cards().map((card) => card.recommended)).toEqual([false, false, false, false, false]);
  });
});

describe("loadout markup", () => {
  it("renders two separate labels and exactly one START note", () => {
    const { journey } = page(); journey.loadout(); const html = renderJourney(journey);
    expect(html.match(/class="sv-rec"/g)).toHaveLength(2); expect(html.split(NOTE)).toHaveLength(2);
    expect(html).toMatch(/data-start="1">[\s\S]*?<\/div><p class="sv-note[^\"]*">Press Enter/);
    expect([...html.matchAll(/<em>[\s\S]*?<\/em>/g)].every(([tag]) => !tag.includes("sv-rec"))).toBe(true);
  });
  it("keeps recommendations but hides the note after starting", () => {
    const { journey } = page(storage({ started: true, hint: false }).store); journey.picked = [GUN.xung, GUN.tia]; journey.loadout();
    const html = renderJourney(journey); expect(html.match(/class="sv-rec"/g)).toHaveLength(2); expect(html).not.toContain(NOTE);
  });
  it("has no recommendations on stage 2", () => { const { journey } = page(undefined, 1); journey.loadout(); expect(renderJourney(journey)).not.toContain("sv-rec"); });
  it("hides the note until ready", () => { const { journey } = page(); journey.loadout(); journey.picked = [GUN.xung]; expect(renderJourney(journey)).not.toContain(NOTE); });
});

describe("load hint", () => {
  it("shows for loads 0 and 1, saves once at 2, and stays done across pages", async () => {
    const { LoadHint } = await guide(); const { store } = storage(); const hint = new LoadHint(store);
    expect(hint.text("play", 0)).toBe(HINT); expect(hint.text("play", 1)).toBe(HINT); expect(store.setItem).not.toHaveBeenCalled();
    expect(hint.text("play", 2)).toBe(""); expect(hint.text("play", 3)).toBe(""); expect(hint.text("play", 2)).toBe("");
    expect(store.setItem).toHaveBeenCalledTimes(1); expect(store.setItem).toHaveBeenCalledWith(KEY, JSON.stringify({ started: false, hint: true }));
    expect(new LoadHint(store).text("play", 0)).toBe("");
  });
  it.each(["intro", "pause", "end", "start"])("hides in %s", async (mode) => { const { LoadHint } = await guide(); expect(new LoadHint(storage().store).text(mode, 0)).toBe(""); });
  it("hides from the start when the hint is done", async () => { const { LoadHint } = await guide(); expect(new LoadHint(storage({ started: false, hint: true }).store).text("play", 0)).toBe(""); });
  it("attempts a failed save only once per page", async () => {
    const { LoadHint } = await guide(); const setItem = vi.fn(() => { throw Error("full"); }); const hint = new LoadHint({ getItem: () => null, setItem });
    expect(hint.text("play", 2)).toBe(""); expect(hint.text("play", 4)).toBe(""); expect(setItem).toHaveBeenCalledTimes(1);
  });
});

describe("notice priority", () => {
  it.each([
    [true, true, HINT, "Switch to an English keyboard", "warn"],
    [false, true, HINT, "Offline word list (server words unavailable)", "warn"],
    [false, false, HINT, HINT, "hint"],
    [false, false, "", "", "warn"],
  ] as const)("resolves IME %s / offline %s", async (ime, offline, hint, text, kind) => {
    expect((await guide()).noticeFor(ime, offline, hint)).toEqual({ text, kind });
  });
});
