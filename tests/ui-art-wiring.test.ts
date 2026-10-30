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
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly listeners: Listener[] = [];
  nodes: (FakeElement | string)[] = [];
  readonly classList = {
    contains: (name: string): boolean => this.className.split(/\s+/).includes(name),
    add: (...names: string[]): void => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" "); },
    remove: (...names: string[]): void => { this.className = this.className.split(/\s+/).filter((name) => name && !names.includes(name)).join(" "); },
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
  it("puts each live gun's icon first in its bay (LL-39) and none on a locked plate", () => {
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
      expect(img.attributes.get("width")).toBe("40");
      expect(img.attributes.get("aria-hidden")).toBe("true");
      expect(slot.children().filter((child) => child.tagName === "IMG")).toHaveLength(1);
    }
    for (const plate of root.find("sv-bay-lock")) expect(plate.children().some((child) => child.tagName === "IMG")).toBe(false);
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
    expect(card.nodes).toHaveLength(2);
    const img = art(card.nodes[0]);
    expect(img.className).toBe("sv-art sv-art-fresh");
    expect(img.src).toContain("/" + foeRole(KIND.brute) + ".");
    expect(card.nodes[1]).toMatch(/^NEW · BRUTE · /);
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
    expect((config.plugins ?? []).flat().some((p) => p && typeof p === "object" && "name" in p && p.name === "typing-survival-ui-art-record")).toBe(true);
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
