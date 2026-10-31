import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { CHAPTER_1 } from "../src/content/chapter-1";
import { GUN, GUN_KEYS } from "../src/content/guns";
import { installKeys } from "../src/app/input";
import { introKey, Journey, NEXT_KEY, STAGES_KEY } from "../src/app/journey";

const origins = ["loadout", "journey", "direct"] as const;

describe("stage card key decision", () => {
  it.each(origins)("Escape from %s goes back only to a known screen", (from) => {
    expect(introKey("Escape", from)).toBe(from === "direct" ? "none" : "back");
  });

  it.each(["a", "Enter", " ", "Space", "ArrowLeft", "1", "Tab"])("%s still enters from every origin", (key) => {
    for (const from of origins) expect(introKey(key, from)).toBe("enter");
  });
});

// Run the real card listeners and act() without starting WebGL or a browser.
const main = readFileSync(new URL("../src/app/main.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("main.ts", main, ts.ScriptTarget.Latest, true);
const act = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "act")!;
const listeners = main.slice(main.indexOf('for (const type of ["pointerdown", "keydown"])'), main.indexOf("installAutoPause(window"));
const script = new Script(ts.transpileModule(act.getText(ast) + "\n" + listeners, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText);

function page(store = new Map<string, string>(), guns = [GUN.ray, GUN.tia], stage = CHAPTER_1[3]!) {
  const handlers = new Map<string, ((event: any) => void)[]>();
  const sent: unknown[] = [];
  const sounds: string[] = [];
  const starts: unknown[] = [];
  let resumed = 0;
  let draws = 0;
  const safeSessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  };
  const win = {
    addEventListener(type: string, handler: (event: any) => void) {
      handlers.set(type, [...(handlers.get(type) ?? []), handler]);
    },
  };
  const journey = new Journey({
    mode: () => "balanced", store: { getItem: (key) => key === STAGES_KEY ? JSON.stringify({ best: {}, passed: { "c1-s1": true, "c1-s2": true, "c1-s3": true } }) : null, setItem: () => {} }, draw: () => { draws += 1; },
    sound: (kind) => sounds.push(kind), back: () => {},
    start: (choice) => {
      starts.push(choice);
      safeSessionStorage.setItem(NEXT_KEY, JSON.stringify({ stage: choice.stage, guns: choice.guns.map((gun) => GUN_KEYS[gun]) }));
    },
  });
  const context = createContext({
    mode: "intro", screen: "intro", live: true, clock: 0, journey, level: stage,
    world: { header: { kit: { guns } } },
    window: win, params: new URLSearchParams("card=1"), safeSessionStorage, NEXT_KEY,
    GUN_KEYS, introKey, installKeys,
    session: { send: (command: unknown) => sent.push(command) },
    // The quick panels (quick.ts): while one is open or counting back in, the page's own key handlers take nothing.
    quick: { blocking: false },
    audio: { resume: () => { resumed += 1; }, ui: (kind: string) => sounds.push(kind) },
    hud: { showBanner: () => {} }, imeNotice: { note: () => {} },
    setMode: (next: string) => { context.mode = next; context.screen = next === "play" ? "none" : "title"; },
  });
  script.runInContext(context);
  const fire = (type: string, key = "", extra = {}) => {
    let stopped = false;
    let prevented = false;
    const event = {
      key, code: key === " " ? "Space" : key.length === 1 ? "Key" + key.toUpperCase() : key,
      isTrusted: true, repeat: false, ...extra,
      preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => { stopped = true; },
    };
    for (const handler of handlers.get(type) ?? []) {
      handler(event);
      if (stopped) break;
    }
    return { prevented, stopped };
  };
  return { store, journey, context, fire, sent, sounds, starts, resumed: () => resumed, draws: () => draws };
}

function leave(from: "loadout" | "journey" | "replay") {
  const old = page();
  old.context.mode = from === "replay" ? "end" : "start";
  old.context.screen = from === "replay" ? "end" : "title";
  if (from === "loadout") {
    old.journey.brief(CHAPTER_1[3]!);
    old.journey.picked = [GUN.ray, GUN.tia];
    old.journey.loadout();
    old.journey.begin();
  } else {
    if (from === "journey") old.journey.open("c1-s4");
    old.store.set(NEXT_KEY, JSON.stringify({ stage: "c1-s4", guns: ["ray", "tia"] }));
  }
  old.fire("pagehide");
  old.store.set(NEXT_KEY, "");
  return old.store;
}

describe("actual stage card listeners", () => {
  it("returns to the same stage and ordered loadout, consumes Escape, then accepts a changed loadout", () => {
    const p = page(leave("loadout"));
    expect(p.fire("keydown", "Escape")).toEqual({ prevented: true, stopped: true });
    expect(p.context.mode).toBe("start");
    expect(p.journey.screen).toBe("loadout");
    expect(p.journey.stage.id).toBe("c1-s4");
    expect(p.journey.picked).toEqual([GUN.ray, GUN.tia]);
    expect(p.resumed()).toBe(0);
    expect(p.sounds).toEqual([]);
    expect(p.sent).toEqual([]);
    p.journey.pick(GUN.ray + 1);
    p.journey.pick(GUN.tan + 1);
    p.journey.begin();
    expect(p.starts).toEqual([{ stage: "c1-s4", guns: [GUN.tia, GUN.tan] }]);
  });

  it.each(["journey", "replay"] as const)("returns from %s to Journey focused on the same stage", (from) => {
    const p = page(leave(from));
    p.fire("keydown", "Escape");
    expect(p.context.mode).toBe("start");
    expect(p.journey.screen).toBe("stages");
    expect(p.journey.menu.current?.id).toBe("c1-s4");
    expect(p.resumed()).toBe(0);
    expect(p.sent).toEqual([]);
  });

  it("keeps a direct URL on the card, without unlocking audio or typing", () => {
    const p = page();
    p.fire("keydown", "Escape");
    expect(p.context.mode).toBe("intro");
    expect(p.journey.active).toBe(false);
    expect(p.resumed()).toBe(0);
    expect(p.sent).toEqual([]);
  });

  it("consumes the origin once, and rejects a marker for different guns or a different stage", () => {
    const store = leave("loadout");
    page(store);
    const direct = page(store);
    direct.fire("keydown", "Escape");
    expect(direct.context.mode).toBe("intro");
    const otherGuns = page(leave("loadout"), [GUN.tia, GUN.ray]);
    otherGuns.fire("keydown", "Escape");
    expect(otherGuns.context.mode).toBe("intro");
    const otherStage = page(leave("loadout"), undefined, CHAPTER_1[0]!);
    otherStage.fire("keydown", "Escape");
    expect(otherStage.context.mode).toBe("intro");
  });

  it.each(["a", "Enter", " ", "1", "ArrowLeft", "Tab"])("%s enters once, unlocks audio and never types the entry key", (key) => {
    const p = page(leave("loadout"));
    p.fire("keydown", key);
    expect(p.context.mode).toBe("play");
    expect(p.journey.active).toBe(false);
    expect(p.resumed()).toBe(1);
    expect(p.sounds).toEqual(["select"]);
    expect(p.sent).toEqual([]);
    p.fire("keydown", "a");
    expect(p.sent).toEqual([{ t: "key", letter: 0 }]);
  });

  it("an open quick panel (or its countdown) holds the card and the fight's keys", () => {
    const p = page(leave("loadout"));
    p.context.quick.blocking = true;
    p.fire("keydown", "a");
    p.fire("keydown", "Escape");
    expect(p.context.mode).toBe("intro");
    expect(p.journey.active).toBe(false);
    p.context.quick.blocking = false;
    p.fire("keydown", "a");
    expect(p.context.mode).toBe("play");
    p.context.quick.blocking = true;
    p.fire("keydown", "b");
    p.fire("keydown", "Escape");
    expect(p.sent).toEqual([]);
    expect(p.context.mode).toBe("play");
    p.context.quick.blocking = false;
    p.fire("keydown", "b");
    expect(p.sent).toEqual([{ t: "key", letter: 1 }]);
  });

  it("ignores held or untrusted card keys, and Escape works before assets are ready", () => {
    const p = page(leave("loadout"));
    p.fire("keydown", "Escape", { repeat: true });
    p.fire("keydown", "a", { isTrusted: false });
    expect(p.context.mode).toBe("intro");
    p.context.live = false;
    p.fire("keydown", "Escape");
    expect(p.journey.screen).toBe("loadout");
    expect(p.sent).toEqual([]);
  });
});
