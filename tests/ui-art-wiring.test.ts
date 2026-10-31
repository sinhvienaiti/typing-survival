import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu, type MenuItem } from "../src/app/menu";
import { CHAPTER_1, stageById } from "../src/content/chapter-1";
import { KIND } from "../src/content/foes";
import { GUN, GUN_SPECS } from "../src/content/guns";
import type { Word } from "../src/app/vocab";
import { createWorld, type World } from "../src/sim/world";
import { Hud } from "../src/view/hud";
import { renderScreen } from "../src/view/screens";
import { foeRole, gunRole, resetArtWarnings, stageRole } from "../src/view/ui-art";
import table from "../src/view/ui-art.json";
import config, { UI_ART_RECORD, uiArtRecordStaysHome } from "../vite.config";
// @ts-expect-error Node-only build tool has no declaration file.
import { BASE as ART_BASE, OUT as ART_OUT, RECORD as ART_RECORD } from "../scripts/ui-art/prepare.mjs";
import { sharedDeck } from "./survival/typist-bot";

/**
 * Recheck 230-F1 to 230-F3: the UI art is wired where the player sees it.
 * The HUD is built on a small fake DOM (no DOM shim in Node), main.ts's
 * screen data is read from its source and evaluated, survival.css keeps
 * every layout rule of an art image behind :not([hidden]), so an image that
 * failed to load takes no space, and the art build record stays out of dist.
 */

type Listener = { type: string; handler: (event: { target: unknown }) => void; capture: unknown };

/** Just what Hud's constructor, appendArt and handleArtError touch. */
class FakeElement {
  readonly tagName: string;
  className = "";
  hidden = false;
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, unknown> & { setProperty(name: string, value: string): void } = {
    setProperty(this: Record<string, unknown>, name: string, value: string): void { this[name] = value; },
  };
  readonly attributes = new Map<string, string>();
  readonly listeners: Listener[] = [];
  nodes: (FakeElement | string)[] = [];
  readonly classList = {
    contains: (name: string): boolean => this.className.split(/\s+/).includes(name),
    add: (...names: string[]): void => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" "); },
    remove: (...names: string[]): void => { this.className = this.className.split(/\s+/).filter((name) => name && !names.includes(name)).join(" "); },
    toggle: (name: string, on?: boolean): boolean => {
      const set = on ?? !this.classList.contains(name);
      if (set) this.classList.add(name);
      else this.classList.remove(name);
      return set;
    },
  };
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  get textContent(): string { return this.nodes.map((node) => (typeof node === "string" ? node : node.textContent)).join(""); }
  set textContent(value: string) { this.nodes = value === "" ? [] : [value]; }
  get src(): string { return this.attributes.get("src") ?? ""; }
  get currentSrc(): string { return this.src; }
  append(...nodes: (FakeElement | string)[]): void { this.nodes.push(...nodes); }
  replaceChildren(...nodes: (FakeElement | string)[]): void { this.nodes = [...nodes]; }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === "class") this.className = value;
  }
  addEventListener(type: string, handler: Listener["handler"], capture?: unknown): void { this.listeners.push({ type, handler, capture }); }
  children(): FakeElement[] { return this.nodes.filter((node): node is FakeElement => typeof node !== "string"); }
  find(className: string): FakeElement[] {
    return this.children().flatMap((child) => [...(child.classList.contains(className) ? [child] : []), ...child.find(className)]);
  }
}

const deck = sharedDeck();
const noWord = (): Word => { throw new Error("the constructor reads no word"); };

function hudOn(stage: string): { hud: Hud; root: FakeElement; world: World } {
  vi.stubGlobal("document", { createElement: (tag: string) => new FakeElement(tag) });
  const world = createWorld({ seed: 1, deck, stage });
  const root = new FakeElement("div");
  return { hud: new Hud(root as unknown as HTMLElement, noWord, world), root, world };
}

function art(node: FakeElement | string | undefined): FakeElement {
  expect(node, "an art image").toBeInstanceOf(FakeElement);
  const img = node as FakeElement;
  expect(img.tagName).toBe("IMG");
  expect(img.classList.contains("sv-art")).toBe(true);
  return img;
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); resetArtWarnings(); });

describe("HUD art hookups (230-F1, hud.ts)", () => {
  it("puts each live gun's icon first in its bay (LL-39) and only the lock icon on a locked plate (LL-41)", () => {
    const { root, world } = hudOn("c1-s1");
    const slots = root.find("sv-slot");
    const live = [0, 1, 2, 3].filter((bay) => bay < world.header.kit.bays && (world.guns.gun[bay] ?? -1) >= 0);
    expect(live.length).toBeGreaterThan(0);
    expect(slots.map((slot) => Number(slot.dataset.bay) - 1)).toEqual(live);
    for (const slot of slots) {
      const spec = GUN_SPECS[world.guns.gun[Number(slot.dataset.bay) - 1]!]!;
      const img = art(slot.nodes[0]);
      expect(img.className).toBe("sv-art sv-art-bay");
      expect(img.src).toContain("/" + gunRole(spec.key) + ".");
      // 44 px: the gun on its small tab plate at the bay's top edge (UI pass 2).
      expect(img.attributes.get("width")).toBe("44");
      expect(img.attributes.get("aria-hidden")).toBe("true");
      expect(slot.children().filter((child) => child.tagName === "IMG")).toHaveLength(1);
    }
    const plates = root.find("sv-bay-lock");
    expect(plates.length).toBeGreaterThan(0);
    for (const plate of plates) {
      // A sealed bay (UI pass 2): the 40 px lock centred over a short "LOCKED".
      expect(plate.nodes).toHaveLength(2);
      const img = art(plate.nodes[0]);
      expect(img.className).toBe("sv-art sv-art-lock");
      expect(img.src).toContain("/icon-lock.");
      expect(img.attributes.get("width")).toBe("40");
      expect((plate.nodes[1] as FakeElement).textContent).toBe("LOCKED");
    }
  });

  it("watches the HUD root, so a bay icon that fails to load is hidden", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { root } = hudOn("c1-s1");
    const errors = root.listeners.filter((listener) => listener.type === "error");
    expect(errors).toHaveLength(1);
    // Image errors do not bubble: only a capturing listener on the root sees them.
    expect(errors[0]!.capture).toBe(true);
    const img = art(root.find("sv-slot")[0]!.nodes[0]);
    errors[0]!.handler({ target: img });
    expect(img.hidden).toBe(true);
  });

  it("shows a taught foe's portrait before the new-foe card's text (LL-35)", () => {
    const { hud, root, world } = hudOn("c1-s1");
    expect(world.stage.teach).toContain("brute");
    const foes = world.foes;
    foes.kind[0] = KIND.brute;
    foes.alive[0] = 1;
    foes.z[0] = 30;
    foes.top = Math.max(foes.top, 1);
    (hud as unknown as { updateFresh(w: World, now: number): void }).updateFresh(world, 1000);
    const card = root.find("sv-fresh")[0]!;
    expect(card.classList.contains("is-on")).toBe(true);
    expect(card.nodes).toHaveLength(3);
    const img = art(card.nodes[0]);
    expect(img.className).toBe("sv-art sv-art-fresh");
    expect(img.src).toContain("/" + foeRole(KIND.brute) + ".");
    // Then the new badge (UIC-LL-2) before the text.
    expect(art(card.nodes[1]).src).toContain("/icon-new-badge.");
    expect(art(card.nodes[1]).className).toBe("sv-art sv-art-small");
    expect(card.nodes[2]).toMatch(/^NEW · BRUTE · /);
  });
});

/** The images among `node`'s children, as their roles (file name before the width). */
const roles = (node: FakeElement): string[] => node.children().filter((child) => child.tagName === "IMG").map((img) => /\/([\w-]+)\.\d+\.webp/.exec(img.src)?.[1] ?? "?");

describe("HUD icon hookups (tickets 149–153, hud.ts and strip.ts)", () => {
  it("leads the hull, clock, kills and objective panels with their icons (LL-30, LL-31, LL-33, LL-32)", () => {
    const { root } = hudOn("c1-s2");
    const panel = (name: string): FakeElement => root.find(name)[0]!;
    expect(roles(panel("sv-hp"))).toEqual(["icon-armour"]);
    expect(art(panel("sv-hp").nodes[0]).className).toBe("sv-art sv-art-icon");
    expect(roles(panel("sv-clock"))).toEqual(["icon-clock"]);
    expect(roles(panel("sv-kills"))).toEqual(["icon-kills"]);
    // The hunt's plate: the objective icon, then the Pack Leader's portrait (LL-32).
    expect(roles(panel("sv-goal"))).toEqual(["icon-objective", "foe-pack-leader"]);
    expect(art(panel("sv-goal").nodes[1]).className).toBe("sv-art sv-art-icon");
    for (const name of ["sv-hp", "sv-clock", "sv-kills", "sv-goal"]) expect(art(panel(name).nodes[0]).attributes.get("aria-hidden")).toBe("true");
  });

  it("keeps the objective icon when the plate's text changes (the text is its own span)", () => {
    const { hud, root, world } = hudOn("c1-s2");
    world.objective.need = 3;
    world.objective.retreat = -1;
    (hud as unknown as { updateGoal(w: World): void }).updateGoal(world);
    const goal = root.find("sv-goal")[0]!;
    expect(goal.hidden).toBe(false);
    expect(roles(goal)).toEqual(["icon-objective", "foe-pack-leader"]);
    expect(goal.textContent).toMatch(/^PACK LEADER 0\/3/);
  });

  it("marks a full bay with the bay-full icon in its header, before the magazine cells, at 28 px (LL-43; UI pass 3 fixes)", () => {
    const { root } = hudOn("c1-s1");
    for (const slot of root.find("sv-slot")) {
      const head = slot.children().find((child) => child.tagName === "HEADER")!;
      expect(roles(head)).toEqual(["icon-bay-full"]);
      const kinds = head.children().map((child) => child.tagName === "IMG" ? "img" : child.className);
      expect(kinds).toEqual(["sv-gun", "img", "sv-mags"]);
      expect(art(head.nodes[1]).className).toBe("sv-art sv-art-icon");
    }
  });

  it("gives the surge and repair banners their icons, other banners none (LL-34)", () => {
    const { hud, root } = hudOn("c1-s1");
    const banner = root.find("sv-banner")[0]!;
    hud.showBanner("SURGE 1", 0, "icon-surge");
    expect(roles(banner)).toEqual(["icon-surge"]);
    expect(art(banner.nodes[0]).className).toBe("sv-art sv-art-banner");
    expect(banner.textContent).toBe("SURGE 1");
    hud.showBanner("STAGE CLEAR!", 1);
    expect(roles(banner)).toEqual([]);
    expect(banner.textContent).toBe("STAGE CLEAR!");
  });

  it("leads an input warning with the keyboard icon, a hint with none (LL-37)", () => {
    const { hud, root } = hudOn("c1-s1");
    const notice = root.find("sv-notice")[0]!;
    hud.setNotice("Turn off Vietnamese input");
    expect(roles(notice)).toEqual(["icon-keyboard"]);
    // 24 px beside the notice's 20 px text (review 31/10).
    expect(art(notice.nodes[0]).className).toBe("sv-art sv-art-item");
    expect(notice.textContent).toBe("Turn off Vietnamese input");
    hud.setNotice("Loading", "hint");
    expect(roles(notice)).toEqual([]);
    expect(notice.textContent).toBe("Loading");
    expect(notice.classList.contains("is-hint")).toBe(true);
  });

  it("shows a rift's warning as one chip: the arrow to its wall, the Rift icon and the countdown (LL-36, LL-44, UI pass 3)", () => {
    const { hud, root, world } = hudOn("c1-s3");
    const H = world.hazards;
    H.state = 1; H.next = 0; H.count = Math.max(H.count, 1); H.side[0] = -1; H.at[0] = world.time + 3;
    (hud as unknown as { updateWarn(w: World): void }).updateWarn(world);
    // No second mark on the corridor wall (UI pass 3): the one chip carries the wall's arrow.
    expect(root.find("sv-warn")).toEqual([]);
    const chips = root.find("sv-strip-warn");
    expect(chips).toHaveLength(1);
    const line = chips[0]!;
    expect(roles(line)).toEqual(["part-arrow", "icon-rift"]);
    // The arrow at 20 px, mirrored for the left wall; the icon at 32 px; the countdown after them.
    expect(art(line.nodes[0]).className).toBe("sv-art sv-art-small is-left");
    expect(art(line.nodes[1]).className).toBe("sv-art sv-art-item");
    expect(line.textContent).toBe("Rift · 3.0 s");
    expect(line.classList.contains("is-on") && line.classList.contains("is-left")).toBe(true);
    H.side[0] = 1;
    (hud as unknown as { updateWarn(w: World): void }).updateWarn(world);
    expect(roles(line)).toEqual(["icon-rift", "part-arrow"]);
    expect(art(line.nodes[2]).classList.contains("is-left")).toBe(false);
    expect(line.classList.contains("is-left")).toBe(false);
    // The rift opens ("Rift"), then closes: the chip goes.
    H.state = 2;
    (hud as unknown as { updateWarn(w: World): void }).updateWarn(world);
    expect(line.textContent).toBe("Rift");
    H.state = 0;
    (hud as unknown as { updateWarn(w: World): void }).updateWarn(world);
    expect(line.nodes).toEqual([]);
    expect(line.classList.contains("is-on")).toBe(false);
  });

  it("leads the clean streak's LED with the streak icon and keeps its text (LL-44)", () => {
    const { hud, root } = hudOn("c1-s1");
    hud.streak(5, 0, 1, 0);
    const led = root.find("sv-streak")[0]!;
    expect(roles(led)).toEqual(["icon-streak"]);
    expect(led.textContent).toBe("CLEAN ×5");
  });
});

// main.ts boots the page on import: its screen data is read from the source.
const main = ts.createSourceFile("src/app/main.ts", readFileSync("src/app/main.ts", "utf8"), ts.ScriptTarget.Latest, true);

function all(node: ts.Node): ts.Node[] {
  const found: ts.Node[] = [];
  const visit = (child: ts.Node): void => { found.push(child); ts.forEachChild(child, visit); };
  ts.forEachChild(node, visit);
  return found;
}
function caseOf(name: string, label: string): ts.CaseClause {
  const fn = main.statements.find((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === name);
  const clause = fn && all(fn).find((n): n is ts.CaseClause => ts.isCaseClause(n) && ts.isStringLiteral(n.expression) && n.expression.text === label);
  if (!clause) throw new Error(`main.ts: no case "${label}" in ${name}()`);
  return clause;
}
function prop(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const found = object.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name);
  return found?.initializer;
}
function objectWith(scope: ts.Node, key: string, value: string): ts.ObjectLiteralExpression {
  const object = all(scope).find((n): n is ts.ObjectLiteralExpression => ts.isObjectLiteralExpression(n) && (() => { const v = prop(n, key); return v !== undefined && ts.isStringLiteral(v) && v.text === value; })());
  if (!object) throw new Error(`main.ts: no object with ${key}: "${value}"`);
  return object;
}
/** Evaluates one expression of main.ts with the names it reads. */
function evaluate(expression: ts.Expression | undefined, scope: Record<string, unknown>): unknown {
  if (!expression) return undefined;
  const js = ts.transpileModule("__value = (" + expression.getText(main) + ");", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), "let __value;\n" + js + "\nreturn __value;")(...Object.values(scope));
}

/** Each menu item of `items()`'s case `label` in main.ts: its id and icon role (undefined: none). */
function menuIcons(label: string): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const node of all(caseOf("items", label))) {
    if (!ts.isObjectLiteralExpression(node)) continue;
    const id = prop(node, "id");
    if (id === undefined || !ts.isStringLiteral(id)) continue;
    const icon = prop(node, "icon");
    out[id.text] = icon !== undefined && ts.isStringLiteral(icon) ? icon.text : undefined;
  }
  return out;
}

describe("menu icons (tickets 150–152, main.ts items())", () => {
  it("gives every title item its menu icon (LL-09)", () => {
    expect(menuIcons("title")).toEqual({ journey: "icon-menu-journey", start: "icon-clock", continue: "icon-menu-play", mode: "icon-menu-mode", profile: "icon-menu-profile", settings: "icon-menu-settings", armory: "icon-menu-armory" });
  });
  it("gives every option its icon, the ship's too (LL-13; ticket 243's Ship icon, 31/10)", () => {
    // Music takes the Sound panel's note (vol-music), so Options and the panel match (UI pass 3).
    expect(menuIcons("settings")).toEqual({ sfx: "icon-sfx", music: "vol-music", shake: "icon-shake", motion: "icon-reduced-motion", speak: "icon-read-aloud", adapt: "icon-pace-director", pilot: "icon-ship", quality: "icon-quality", done: "icon-check" });
  });
  it("gives the pause, armory, profile and results items theirs (LL-48, LL-53)", () => {
    expect(menuIcons("pause")).toEqual({ resume: "icon-menu-play", settings: "icon-menu-settings", title: "icon-back" });
    // "armory" falls through to "profile": one Back item for both sheets.
    expect(menuIcons("profile")).toEqual({ back: "icon-back" });
    expect(menuIcons("end")).toEqual({ next: "icon-next-stage", replay: "icon-retry", stages: "icon-menu-journey", title: "icon-back" });
  });
  it("hands the repair banner its icon (LL-34)", () => {
    expect(readFileSync("src/app/main.ts", "utf8")).toMatch(/hud\.showBanner\("REPAIR \+"[^\n]*"icon-repair-pod"\)/);
  });
  it("sets the CSS art (key caps, magazine cells) on the page's root at boot, before the HUD draws", () => {
    const code = readFileSync("src/app/main.ts", "utf8");
    expect(code).toMatch(/^applyArtVars\(document\.documentElement\);$/m);
    expect(code.indexOf("applyArtVars(document.documentElement)")).toBeLessThan(code.indexOf("new Combat("));
  });
  it("leads the no-WebGL message with the warning icon (LL-02), on the painted panel over the menu's background (UI pass 3)", () => {
    const code = readFileSync("src/app/main.ts", "utf8");
    const fallback = code.slice(code.indexOf("} catch {", code.indexOf("new Stage(")), code.indexOf('throw new Error("survival: no WebGL")'));
    expect(fallback).toMatch(/watchArt\(hudRoot\);\s*applyArtVars\(document\.documentElement\);[^]*artNode\("icon-warning", "banner"\)[^]*"WEBGL UNAVAILABLE"[^]*"This browser does not support WebGL\. Last Line cannot run here\."[^]*artNode\(bgRole\("menu"\), "bg"\)[^]*hudRoot\.replaceChildren\(\.\.\.\(backdrop !== null \? \[backdrop\] : \[\]\), message\)/);
  });
  it("marks the words finished for the first time ever for the results' new badge (LL-52)", () => {
    const code = readFileSync("src/app/main.ts", "utf8");
    expect(code).toMatch(/const before = history\.finished\(text\);\s*if \(before === "new"\) firstTime\.add\(index\);\s*tallyWord\(tally, before,/);
    expect(code).toContain("words: runWords(world, wordOf, (index) => firstTime.has(index)),");
  });
});

describe("screen art hookups (230-F1, main.ts)", () => {
  it("gives the results screen's next-stage item that stage's art (LL-53)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const next = objectWith(caseOf("items", "end"), "id", "next");
    for (const stage of CHAPTER_1.slice(1)) {
      const role = evaluate(prop(next, "art"), { next: stage });
      expect(role).toBe(stageRole(stage.id));
      const item = { id: "next", art: role, label: "Stage " + stage.index, enabled: true } as MenuItem;
      const html = renderScreen({ kind: "end", menu: new Menu([item]), won: true, stage: "", mode: "Balanced", stats: [], words: [], advice: "", note: "" });
      expect(html).toMatch(new RegExp('class="sv-art sv-art-menu" src="[^"]*/' + stageRole(stage.id) + "\\."));
    }
  });

  it("hands the pre-battle card its stage and gun keys, and no stage art to the Trial", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const intro = objectWith(caseOf("view", "intro"), "kind", "intro");
    const world = { header: { kit: { guns: [GUN.xung, GUN.tia] } } };
    const card = (level: { id: string }) => {
      const stage = evaluate(prop(intro, "stage"), { level }) as string | undefined;
      const guns = evaluate(prop(intro, "guns"), { world, GUN_SPECS }) as string[] | undefined;
      return { stage, guns, html: renderScreen({ kind: "intro", title: "", lines: ["", "Pulse Gun · Heat Beam"], ready: true, stage, guns: guns as never }) };
    };
    // main.ts: `const level = stageById(choice?.stage ?? "s0")`.
    const trial = card(stageById("s0"));
    expect(trial.stage).toBeUndefined();
    expect(trial.guns).toEqual(["xung", "tia"]);
    expect(trial.html).not.toContain("sv-art-intro\"");
    expect(trial.html.match(/sv-art-introGun/g)).toHaveLength(2);
    for (const level of CHAPTER_1) {
      const stage = card(level);
      expect(stage.stage).toBe(level.id);
      expect(stage.html).toContain("/" + stageRole(level.id) + ".");
      expect(stage.html.match(/<img /g)).toHaveLength(3);
    }
  });
});

/** Splits at `separator` outside parentheses and brackets. */
function splitTop(text: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (c === "(" || c === "[") depth += 1;
    else if (c === ")" || c === "]") depth -= 1;
    else if (depth === 0 && separator.test(c)) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}
/** Pseudo-classes with an argument at the compound's own level: [name, argument]. */
function pseudos(compound: string): [string, string][] {
  const found: [string, string][] = [];
  let depth = 0;
  for (let i = 0; i < compound.length; i += 1) {
    const c = compound[i]!;
    if (c === "(") {
      if (depth === 0) {
        const name = /:([\w-]+)$/.exec(compound.slice(0, i))?.[1] ?? "";
        let close = i, inner = 0;
        for (; close < compound.length; close += 1) { if (compound[close] === "(") inner += 1; else if (compound[close] === ")" && --inner === 0) break; }
        found.push([name, compound.slice(i + 1, close)]);
        i = close;
        continue;
      }
      depth += 1;
    } else if (c === ")") depth -= 1;
  }
  return found;
}
const ART = /\.sv-(?:art(?:-[\w-]+)?|bg)(?![\w-])/;
/** The compound names an art image itself (not only inside one of its pseudo-classes). */
const isArt = (compound: string): boolean => ART.test(compound.replace(/\((?:[^()]|\([^()]*\))*\)/g, ""));
const guarded = (compound: string): boolean => pseudos(compound).some(([name, arg]) => name === "not" && arg.trim() === "[hidden]");
/** A failed image keeps [hidden] (ui-art.ts): only `display` from these rules could bring its box back. */
const LAYOUT = /(?:^|;)\s*(?:display|position)\s*:/;

/** Selectors that would let a hidden (failed) art image still take space or change its parent's layout. */
function unguarded(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: string[] = [];
  // Inside :has() an art image changes its parent's layout, so it always needs the guard.
  const check = (selector: string, layout: boolean, rule: string, inHas = false): void => {
    const compounds = splitTop(selector, /[\s>+~]/);
    compounds.forEach((compound, index) => {
      for (const [name, arg] of pseudos(compound)) if (name === "has") for (const inner of splitTop(arg, /,/)) check(inner, true, rule, true);
      const subject = index === compounds.length - 1 && !inHas;
      if (isArt(compound) && !guarded(compound) && (!subject || layout)) found.push(rule);
    });
  };
  for (const [, selectors, body] of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector of splitTop(selectors!, /,/)) check(selector, LAYOUT.test(body!), selector);
  }
  return [...new Set(found)];
}

describe("failed art takes no space (230-F2, survival.css)", () => {
  const css = readFileSync("src/view/survival.css", "utf8");

  it("keeps every display, position and :has() rule of an art image behind :not([hidden])", () => {
    expect(unguarded(css)).toEqual([]);
  });

  it("shows the stage card's art band as a block only while the image has not failed", () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({ selectors: splitTop(selectors!, /,/), body: body! }));
    const band = rules.filter((rule) => rule.selectors.some((s) => /\.sv-art-briefing(?![\w-])/.test(s)) && LAYOUT.test(rule.body));
    expect(band).toHaveLength(1);
    expect(band[0]!.selectors).toEqual([".sv-art-briefing:not([hidden])"]);
    expect(band[0]!.body).toMatch(/display:\s*block/);
  });

  it("catches a band, a background or a parent rule that drops the guard", () => {
    expect(unguarded(css.replace(".sv-art-briefing:not([hidden]) {", ".sv-art-briefing {"))).toEqual([".sv-art-briefing"]);
    expect(unguarded(css.replace(".sv-bg:not([hidden]) {", ".sv-bg {"))).toEqual([".sv-bg"]);
    expect(unguarded(css.replace(".sv-fresh:has(> .sv-art-fresh:not([hidden]))", ".sv-fresh:has(> .sv-art-fresh)"))).toEqual([".sv-fresh:has(> .sv-art-fresh)"]);
    expect(unguarded(".sv-slot > .sv-art-bay + header { margin: 0; }")).toEqual([".sv-slot > .sv-art-bay + header"]);
    // Box sizes on the bare class are fine: hidden still wins over them.
    expect(unguarded(".sv-art-bay { width: 40px; height: 40px; } .sv-slot[data-bay=\"2\"] > .sv-art-bay { left: auto; }")).toEqual([]);
  });
});

describe("the art build record stays out of dist (230-F3)", () => {
  it("is removed after the build; the art, other files and the vocabulary manifest stay", () => {
    mkdirSync("tmp", { recursive: true });
    const out = mkdtempSync(join("tmp", "230-dist-"));
    try {
      const files = [UI_ART_RECORD, "assets/typing-survival/ui/gun-xung.64.webp", "vocabulary/vocab-manifest.json", "index.html"];
      for (const file of files) { mkdirSync(dirname(join(out, file)), { recursive: true }); writeFileSync(join(out, file), "{}"); }
      const plugin = uiArtRecordStaysHome();
      expect(plugin.apply).toBe("build");
      (plugin.configResolved as (c: unknown) => void)({ root: process.cwd(), build: { outDir: out } });
      (plugin.closeBundle as () => void)();
      expect(existsSync(join(out, UI_ART_RECORD))).toBe(false);
      for (const file of files.slice(1)) expect(existsSync(join(out, file)), file).toBe(true);
      // A build without UI art (a fresh checkout) has no record to remove.
      expect(() => (plugin.closeBundle as () => void)()).not.toThrow();
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it("names the record prepare.mjs writes, at the art's runtime base (230 review)", () => {
    // prepare.mjs writes ART_RECORD into ART_OUT; Vite copies public/ into dist as is.
    expect(join("public", UI_ART_RECORD)).toBe(join(ART_OUT, ART_RECORD));
    expect(ART_OUT).toBe("public" + ART_BASE.replace(/\/$/, ""));
    // The runtime table's base is the folder the game fetches the WebP files from.
    expect(table.base).toBe(ART_BASE);
    expect("/" + UI_ART_RECORD).toBe(table.base + ART_RECORD);
  });

  it("runs in the game's build, and the game never reads the record", () => {
    // vite.config.ts exports defineConfig(({ mode }) => ...) since the portal origin (207) and Typing Feel (B3) builds.
    const built = config({ command: "build", mode: "production" });
    expect((built.plugins ?? []).flat().some((p) => p && typeof p === "object" && "name" in p && p.name === "typing-survival-ui-art-record")).toBe(true);
    const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === "kit" ? [] : sources(path);
      return /\.(?:ts|json|css)$/.test(entry.name) ? [path] : [];
    });
    const readers = sources("src").filter((file) => /ui\/manifest\.json/.test(readFileSync(file, "utf8")));
    expect(readers).toEqual([]);
    expect(readFileSync("index.html", "utf8")).not.toMatch(/ui\/manifest\.json/);
  });
});
