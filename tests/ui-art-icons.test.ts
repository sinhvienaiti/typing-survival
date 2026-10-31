import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu } from "../src/app/menu";
import { paintRanges, quickOptions, quickSkin, type QuickHooks } from "../src/app/quick";
import { TypingSounds } from "../src/kit/feedback/typing-fx";
import { renderScreen } from "../src/view/screens";
import { renderJourney, starRow } from "../src/view/screens-journey";
import { applyArtVars, artUrl, artVars, BOX, FRAMES, frameSlices, quickIcons, resetArtWarnings } from "../src/view/ui-art";
import table from "../src/view/ui-art.json";
import selection from "../scripts/ui-art/selection.json";
import { ICONS, WIRED } from "./ui-art-roles";
import { journey206 } from "./ui-art-fixtures";

/**
 * The icons and parts of tickets 149–153 (retries 237–240) and the sliders
 * of 225, wired where UI_IMAGERY §4 puts them (parent docs/games/map1): the
 * selection holds each accepted pick, the runtime table carries it, and every
 * screen draws it beside the words it marks.
 */
const roles = (html: string, place?: string): string[] =>
  [...html.matchAll(/<img class="sv-art sv-art-([\w]+)[^"]*" src="[^"]*\/([\w-]+)\.\d+\.webp/g)].filter(([, at]) => place === undefined || at === place).map(([, , role]) => role!);

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); resetArtWarnings(); });

describe("the selection and table (149–153, 225)", () => {
  it("accepts each wired role once, from the accepted pick's source and ticket, with an English name", () => {
    for (const [role, want] of Object.entries(ICONS)) {
      const entries = selection.entries.filter((entry) => entry.role === role);
      expect(entries, role).toHaveLength(1);
      const entry = entries[0]!;
      expect(entry.accepted, role).toBe(true);
      expect(entry.source, role).toBe(want.source);
      expect(entry.ticket, role).toBe(want.ticket);
      expect(entry.kind, role).toBe(role === "slider-track" ? "track" : "icon");
      expect(entry.verdict, role).toMatch(new RegExp("^CODEX_QUEUE " + want.ticket + ": Nhận 31/10"));
      expect(entry.alt, role).toMatch(/^[A-Z][A-Za-z0-9 ,-]+$/);
    }
    expect(selection.entries.find((entry) => entry.role === "foe-shard")).toMatchObject({ source: "ui/foes/shard", accepted: true, ticket: "238" });
  });

  it("carries every wired role in the runtime table, the groove at 16:1", () => {
    for (const role of WIRED) expect(Object.keys(table.roles), role).toContain(role);
    expect(table.roles["slider-track"]).toMatchObject({ kind: "track", widths: [512, 1024], aspect: 16 });
    expect(table.roles["foe-shard"]).toMatchObject({ kind: "portrait", widths: [64, 128, 256] });
  });

  it("gives CSS its background art as variables and the quick panels their slider art", () => {
    const vars = artVars();
    expect(Object.keys(vars).sort()).toEqual([
      "--art-frame-banner", "--art-frame-button", "--art-frame-button-active", "--art-frame-card", "--art-frame-panel", "--art-frame-plate", "--art-frame-word",
      "--art-icon-quality", "--art-icon-read-aloud", "--art-icon-reduced-motion", "--art-icon-shake",
      "--art-keycap", "--art-keycap-on", "--art-led-off", "--art-led-on", "--art-mag-empty", "--art-mag-full",
    ]);
    expect(vars["--art-keycap"]).toMatch(/^url\("\/assets\/typing-survival\/ui\/part-keycap\.256\.webp\?v=[a-f0-9]{8}"\)$/);
    expect(vars["--art-keycap-on"]).toContain("/part-keycap-active.256.webp");
    // A magazine cell's 40 px canvas (UI pass 2), sharp at 2× on the 1080p scale (60 px → 120 device px).
    expect(vars["--art-mag-empty"]).toContain("/part-mag-empty.128.webp");
    expect(vars["--art-mag-full"]).toContain("/part-mag-full.128.webp");
    // The Settings rows' icons (the Options screen's art) at 28 px; every frame from its 896 px copy.
    expect(vars["--art-icon-quality"]).toContain("/icon-quality.128.webp");
    for (const role of FRAMES) expect(vars["--art-" + role]).toContain("/" + role + ".896.webp?v=");
    expect(quickSkin()).toEqual({ sliderTrack: artUrl("slider-track", 290), sliderThumb: artUrl("slider-thumb", 22) });
    expect(quickSkin().sliderTrack).toContain("/slider-track.1024.webp?v=");
    expect(quickSkin().sliderThumb).toContain("/slider-thumb.128.webp?v=");
  });

  it("hands the quick panels the slider skin (quickOptions)", () => {
    const hooks: QuickHooks = {
      host: {} as HTMLElement, values: () => ({}), change: () => {}, preview: () => {}, keyboardChoices: [], keyboardSounds: new TypingSounds(),
      keyboardFail: () => {}, mountPreview: () => {}, pause: () => {}, resume: () => {}, quit: () => {}, countdown: () => 0,
    };
    expect(quickOptions(hooks).skin).toEqual(quickSkin());
  });

  it("sets the CSS art on the page's root at boot, and on a failed image warns once and brings back the CSS fallback", () => {
    const set = new Map<string, string>();
    const root = { style: { setProperty: (name: string, value: string) => { set.set(name, value); }, removeProperty: (name: string) => set.delete(name) } };
    // Node has no Image: the variables are set, nothing is probed.
    applyArtVars(root);
    expect(Object.fromEntries(set)).toEqual({ ...frameSlices(), ...artVars() });
    // In the page each image is probed; one that fails drops its variable (survival.css draws the var() fallback) and warns once.
    const probes: { url: string; fail(): void }[] = [];
    vi.stubGlobal("Image", class {
      private onError: (() => void) | null = null;
      addEventListener(type: string, handler: () => void): void { if (type === "error") this.onError = handler; }
      set src(url: string) { probes.push({ url, fail: () => this.onError?.() }); }
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    set.clear();
    applyArtVars(root);
    expect(probes.map((probe) => probe.url)).toEqual(Object.values(artVars()).map((value) => value.slice(5, -2)));
    probes[2]!.fail();
    probes[2]!.fail();
    expect([...set.keys()].sort()).toEqual(Object.keys({ ...frameSlices(), ...artVars() }).filter((name) => name !== "--art-mag-empty").sort());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/^\[ui-art\] missing image: \/assets\/typing-survival\/ui\/part-mag-empty\.128\.webp\?v=/);
  });
});

describe("menus (LL-09, LL-48, LL-53)", () => {
  const items = new Menu([
    { id: "a", icon: "icon-menu-play", label: "Play", enabled: true },
    { id: "b", label: "Mode", value: "Balanced", enabled: true },
    { id: "c", icon: "icon-back", label: "Back", enabled: true },
  ]);

  it("draws each item's lamp lit or dark, its icon at the menu's size, and a gap where an item has none", () => {
    const title = renderScreen({ kind: "title", menu: items, lead: "", status: "" });
    expect(roles(title, "led")).toEqual(["part-led-on", "part-led-off", "part-led-off"]);
    // The lamp draws 8 px of its 12 px box (the art keeps a 15 % margin; UI pass 2: was 10).
    expect(BOX.led).toEqual({ width: 12, height: 12 });
    expect(roles(title, "item")).toEqual(["icon-menu-play", "icon-back"]);
    expect(title).toContain('<i class="sv-icon-gap sv-gap-item" aria-hidden="true"></i>');
    expect(title).not.toMatch(/sv-led"|sv-dot/);
    const pause = renderScreen({ kind: "pause", menu: items });
    expect(roles(pause, "icon")).toEqual(["icon-menu-play", "icon-back"]);
    expect(pause).toContain("sv-gap-icon");
  });

  it("draws a value between two arrows, the left one mirrored (UIC-LL-5 arrow)", () => {
    const html = renderScreen({ kind: "settings", menu: items, note: "" });
    expect(roles(html, "arrow")).toEqual(["part-arrow", "part-arrow"]);
    expect(html).toMatch(/sv-art-arrow is-left"[^>]*>(?:<[^>]*>)*<b>Balanced<\/b><img class="sv-art sv-art-arrow" /);
    expect(html).not.toMatch(/[◀▶]/);
  });

  it("puts the station crest in the title's tag (LL-05)", () => {
    const html = renderScreen({ kind: "title", menu: items, lead: "", status: "" });
    expect(html).toMatch(/<div class="sv-title-tag"><img class="sv-art sv-art-icon" src="[^"]*\/icon-station-crest\.[^>]*>STATION VC-7/);
  });
});

describe("the journey (LL-16 to LL-22, LL-26 to LL-28)", () => {
  it("shows the chapter crest, each open stage's stars, the lock on closed ones and the Back icon", () => {
    const j = journey206();
    j.open();
    const html = renderJourney(j);
    expect(roles(html, "chapter")).toEqual(["icon-chapter-crest"]);
    expect(html).toContain('<span class="sv-stars" role="img" aria-label="0 of 3 stars">');
    expect(roles(html, "icon")).toEqual(["icon-star-unlit", "icon-star-unlit", "icon-star-unlit", "icon-lock", "icon-lock", "icon-lock", "icon-back"]);
    expect(html).not.toMatch(/[★☆]/);
  });

  it("leads the briefing's four rules with their icons, marks the new foe and the two buttons", () => {
    const j = journey206("c1-s1");
    const html = renderJourney(j);
    expect([...html.matchAll(/<dt><img [^>]*\/(icon-[\w-]+)\.[^>]*>(\w+)<\/dt>/g)].map(([, role, term]) => [role, term])).toEqual([
      ["icon-objective", "Goal"], ["icon-hazard", "Hazard"], ["icon-learning-rule", "Learning"], ["icon-equipment", "Gear"],
    ]);
    expect(html).toMatch(/<em><img class="sv-art sv-art-small" src="[^"]*\/icon-new-badge\.[^>]*>NEW<\/em>/);
    // The learning rule's check mark is the check icon, which keeps the word for screen readers.
    expect(html).not.toContain("✓");
    const check = /Finished words get a (<img class="sv-art sv-art-small" src="[^"]*\/icon-check\.[^>]*>)\./.exec(html)?.[1];
    expect(check).toContain('alt="check"');
    expect(check).not.toContain("aria-hidden");
    expect(roles(html.slice(html.indexOf('<nav class="sv-menu sv-row"')), "icon")).toEqual(["icon-load-guns", "icon-back"]);
  });

  it("marks uncovered threats and the start button with the warning icon, not a glyph", () => {
    const j = journey206("c1-s1");
    j.loadout();
    const html = renderJourney(j);
    expect(html).not.toContain("⚠");
    const open = (html.match(/<span class="is-open"/g) ?? []).length;
    expect(open).toBeGreaterThan(0);
    expect(roles(html.slice(html.indexOf('<div class="sv-threats">')), "small")).toHaveLength(open);
    // The start button's 17 px text takes the 20 px icon (review 31/10).
    expect(html).toMatch(/START · <img class="sv-art sv-art-icon" src="[^"]*\/icon-warning\.[^>]*>UNCOVERED/);
  });
});

describe("results and the profile (LL-14, LL-50 to LL-52)", () => {
  it("draws the star row as lit and dark stars that name themselves, over their rules", () => {
    const html = starRow([true, false, true], 0.9);
    expect(roles(html, "star")).toEqual(["icon-star-lit", "icon-star-unlit", "icon-star-lit"]);
    // A 64 px box, the results card's hero (UI pass 2, 31/10: 40 px was small for the reward).
    expect(BOX.star).toEqual({ width: 64, height: 64 });
    expect(html).toContain('width="64" height="64"');
    expect(html).toContain('alt="Star earned"');
    expect(html).toContain('alt="Star not earned"');
    expect(html).not.toMatch(/[★☆]/);
    expect(html).toContain("Accuracy ≥ 90%");
  });

  it("puts each stat's icon beside its number and a check before each word learned", () => {
    const stats = [{ value: "2:30", label: "Time", icon: "icon-stat-time" }, { value: "41", label: "Kills", icon: "icon-kills" }, { value: "96%", label: "Accuracy", icon: "icon-stat-accuracy" }, { value: "52", label: "Words", icon: "icon-keyboard" }];
    const html = renderScreen({ kind: "end", menu: new Menu([]), won: true, stage: "Stage 1 · First Shift", mode: "Balanced", stats, words: [{ en: "hold", vi: "giữ" }, { en: "line", vi: "tuyến" }], advice: "", note: "" });
    expect(roles(html, "item")).toEqual(["icon-stat-time", "icon-kills", "icon-stat-accuracy", "icon-keyboard"]);
    expect(html).toMatch(/<div><b><img class="sv-art sv-art-item" [^>]*>2:30<\/b><small>Time<\/small><\/div>/);
    expect(roles(html, "small")).toEqual(["icon-check", "icon-check"]);
    // A word finished for the first time ever carries the new badge, named for screen readers (LL-52).
    const fresh = renderScreen({ kind: "end", menu: new Menu([]), won: true, stage: "", mode: "Balanced", stats, words: [{ en: "hold", vi: "giữ", fresh: true }, { en: "line", vi: "tuyến" }], advice: "", note: "" });
    expect(roles(fresh, "small")).toEqual(["icon-new-badge", "icon-check"]);
    expect(fresh).toMatch(/<li><img class="sv-art sv-art-small" src="[^"]*\/icon-new-badge\.[^>]*alt="New"[^>]*><b>hold<\/b>/);
    const profile = renderScreen({ kind: "profile", menu: new Menu([]), stats: [{ value: "41", label: "Speed (WPM)", note: "measured", icon: "icon-stat-wpm" }], advice: "", lines: [] });
    expect(profile).toMatch(/<b><img class="sv-art sv-art-item" src="[^"]*\/icon-stat-wpm\.[^>]*>41<\/b><small>Speed \(WPM\)<\/small><em>measured<\/em>/);
  });
});

describe("CSS for the parts (survival.css)", () => {
  const css = readFileSync("src/view/survival.css", "utf8");
  it("draws keys on the key cap, a picked card's on the lit one, and no CSS key box", () => {
    expect(css).toMatch(/\.sv-hints kbd, \.sv-cards \.sv-gun-card kbd \{[^}]*border-image: var\(--art-keycap, linear-gradient\(var\(--steel-800\), var\(--steel-800\)\)\) 39\.94% 24\.8% 41\.89% 24\.8% fill/);
    expect(css).toContain(".sv-cards .sv-gun-card.is-picked kbd { border-image-source: var(--art-keycap-on, linear-gradient(var(--steel-600), var(--steel-600))); }");
    expect(css).not.toMatch(/\.sv-hints kbd \{[^}]*background: var\(--steel-800\)/);
  });
  it("draws magazine cells from the empty and full art on a 40 px canvas, the full glass in the gun's colour, cut down as it empties", () => {
    expect(css).toMatch(/\.sv-mags i \{[^}]*--cell: calc\(40px \* var\(--ui\)\); --tint: var\(--gun\);[^}]*width: calc\(var\(--cell\) \* 0\.25\); height: calc\(var\(--cell\) \* 0\.71875\);[^}]*background: var\(--art-mag-empty, linear-gradient\(var\(--track\), var\(--track\)\)\)/);
    expect(css).toMatch(/\.sv-mags i::after \{[^}]*background: linear-gradient\(var\(--tint\), var\(--tint\)\) center \/ 62% 76% no-repeat, var\(--art-mag-full, linear-gradient\(var\(--tint\), var\(--tint\)\)\)[^}]*background-blend-mode: color, normal;[^}]*clip-path: inset\(calc\(\(1 - var\(--fill\)\) \* 100%\) 0 0 0\)/);
    // A word into a full bay turns the cells themselves urgent, as they blink.
    expect(css).toContain(".sv-slot.is-overfull .sv-mags i { --tint: var(--urgent); filter: brightness(1.35); }");
  });
  it("puts the Rift icon and arrow on dark chips on the orange plates, lights the selected lamp and dims missed stars", () => {
    expect(css).toContain(".sv-strip-warn > .sv-art, .sv-warn > .sv-art { background: var(--ink);");
    expect(css).toContain(".sv-item.is-on > .sv-art-led { filter: drop-shadow(");
    expect(css).toContain(".sv-star-row li:not(.is-on) .sv-art-star { opacity: 0.45; filter: grayscale(1) brightness(0.6); }");
    expect(css).toContain(".sv-art.is-left { transform: scaleX(-1); }");
  });
  it("never gives the objective plate or the input notice a display that would undo their [hidden] (hud.ts hides them so)", () => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selectors, body] of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/(?:^|;)\s*display\s*:/.test(body!)) continue;
      for (const selector of selectors!.split(",")) if (/\.sv-(?:goal|notice)(?![\w-])/.test(selector)) expect(selector.trim()).toMatch(/\.sv-(?:goal|notice):not\(\[hidden\]\)/);
    }
  });
  it("drops the CSS lock, lamp, dot and glyph icons; clears the kit's colours under the slider art", () => {
    expect(css).not.toMatch(/\.sv-lock\b|\.sv-led\b|\.sv-dot\b|\.sv-arrow\b|content: "⌨/);
    for (const part of ["-webkit-slider-runnable-track", "-moz-range-track", "-webkit-slider-thumb", "-moz-range-thumb"]) {
      expect(css).toContain(".sv-hud .kit-qs--skin-slider .kit-qs__range::" + part + " { background-color: transparent; }");
    }
  });
});

describe("the briefing's stage art still leads its rules", () => {
  it("keeps the stage band right after the title", () => {
    const html = renderJourney(journey206("c1-s2"));
    expect(html).toMatch(/<h1>STAGE 2 · LEADER HUNT<\/h1><img class="sv-art sv-art-briefing"/);
  });
});

describe("UI pass 2: frames, quick panel icons and lit grooves (31/10)", () => {
  it("gives each ticket 127 frame its slice lines as percentages with fill, and marks the root's data-art", () => {
    const slices = frameSlices();
    expect(Object.keys(slices).sort()).toEqual(FRAMES.map((role) => "--art-" + role + "-slice").sort());
    for (const value of Object.values(slices)) expect(value).toMatch(/^(\d+(\.\d+)?% ){4}fill$/);
    // The banner's two burning ends only: no top or bottom slice.
    expect(slices["--art-frame-banner-slice"]).toBe("0% 28.06% 0% 28.06% fill");
    const attrs = new Map<string, string>();
    const set = new Map<string, string>();
    const root = { style: { setProperty: (name: string, value: string) => { set.set(name, value); }, removeProperty: (name: string) => set.delete(name) }, setAttribute: (name: string, value: string) => { attrs.set(name, value); } };
    const probes: { url: string; fail(): void }[] = [];
    vi.stubGlobal("Image", class {
      private onError: (() => void) | null = null;
      addEventListener(type: string, handler: () => void): void { if (type === "error") this.onError = handler; }
      set src(url: string) { probes.push({ url, fail: () => this.onError?.() }); }
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    applyArtVars(root);
    expect(attrs.get("data-art")!.split(" ").sort()).toEqual([...FRAMES].sort());
    // A frame that fails to load leaves the theme's plate: its token goes, the others stay.
    probes.find((probe) => probe.url.includes("/frame-card."))!.fail();
    expect(attrs.get("data-art")!.split(" ")).not.toContain("frame-card");
    expect(attrs.get("data-art")!.split(" ")).toContain("frame-panel");
    expect(set.has("--art-frame-card")).toBe(false);
  });

  it("hands the kit the ticket 180 gear and speakers (32 px) and the Sound rows' icons (24 px), sharp at 2× on the 1080p scale", () => {
    const icons = quickIcons();
    expect(Object.keys(icons).sort()).toEqual(["hud-settings", "hud-sound", "hud-sound-muted", "vol-effects", "vol-interface", "vol-keyboard", "vol-master", "vol-music", "vol-voice"]);
    for (const [name, url] of Object.entries(icons)) expect(url).toContain("/" + name + ".128.webp?v=");
    const hooks: QuickHooks = {
      host: {} as HTMLElement, values: () => ({}), change: () => {}, preview: () => {}, keyboardChoices: [], keyboardSounds: new TypingSounds(),
      keyboardFail: () => {}, mountPreview: () => {}, pause: () => {}, resume: () => {}, quit: () => {}, countdown: () => 0,
    };
    expect(quickOptions(hooks).icons).toEqual(icons);
  });

  it("lights each slider's groove up to its value (--v, 0–100), so 50 and 100 read apart", () => {
    const inputs = [{ min: "0", max: "100", value: "50" }, { min: "0", max: "100", value: "100" }, { min: "", max: "", value: "0" }, { min: "10", max: "10", value: "10" }].map((attrs) => {
      const props = new Map<string, string>();
      return { ...attrs, props, style: { setProperty: (name: string, value: string) => { props.set(name, value); } } };
    });
    paintRanges({ querySelectorAll: (selector: string) => (selector === ".kit-qs__range" ? (inputs as unknown as Element[]) : []) });
    expect(inputs.map((input) => input.props.get("--v"))).toEqual(["50", "100", "0", "0"]);
    // No host (the kit not mounted yet): nothing to paint, no throw.
    expect(() => paintRanges(null)).not.toThrow();
    expect(() => paintRanges({} as never)).not.toThrow();
  });

  it("draws the panels, rows, cards, HUD plates, chips, banner and quick panels on the frames only while their token is set", () => {
    const css = readFileSync("src/view/survival.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const frame = /var\(--art-(frame-[\w-]+?)(?:-slice)?\)/.exec(body!);
      if (!frame) continue;
      // Every rule that draws a frame is guarded by that frame's token (or the button's, for the active state's swap).
      for (const selector of selectors!.split(",")) expect(selector.trim(), selector).toMatch(/^:root\[data-art~="frame-[\w-]+"\]/);
    }
    for (const role of FRAMES) expect(css).toContain(':root[data-art~="' + role + '"]');
  });
});
