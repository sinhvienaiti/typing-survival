import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIST_ROW_VARS, quickOptions, ROW_EDGE, settingsRows, type QuickHooks } from "../src/app/quick";
import { TypingSounds } from "../src/kit/feedback/typing-fx";
import { quickIcons } from "../src/view/ui-art";
import { FRAME_PX, previewFit, previewTargetY, REST, RING_REACH } from "../src/view/type-fx-preview";
import { defaultSoundRows } from "../src/kit/ui";
import table from "../src/view/ui-art.json";
import selection from "../scripts/ui-art/selection.json";

/**
 * The quick panels after the kit's skin pass (parent 18722b41, b8a224d0) and
 * the art accepted on 31/10 (docs/changelog/2026-10-31-panels-art.md): ticket
 * 243's gear, Sound and Options icons and the typing-effect rows' icons,
 * 244's lit fill on the 225 groove; Resume and Quit to title only in a run.
 */
const css = readFileSync("src/view/survival.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const entries = (role: string) => selection.entries.filter((entry) => entry.role === role);
const hooks = (extra: Partial<QuickHooks> = {}): QuickHooks => ({
  host: {} as HTMLElement, values: () => ({}), change: () => {}, preview: () => {}, keyboardChoices: [], keyboardSounds: new TypingSounds(),
  keyboardFail: () => {}, mountPreview: () => {}, pause: () => {}, resume: () => {}, quit: () => {}, countdown: () => 0, ...extra,
});

describe("tickets 243 and 244 in the selection", () => {
  it("takes 243's eight accepted icons (four redrawn in place, four new) and 244's fill, graded at real size", () => {
    const want: Record<string, string> = {
      "hud-settings": "ui/quick-settings/selected/hud-settings.r2", "vol-effects": "ui/quick-settings/selected/vol-effects.r2",
      "vol-interface": "ui/quick-settings/selected/vol-interface.r2", "icon-menu-settings": "ui/icons/menu-settings.r2",
      "icon-ship": "ui/icons/ship", "icon-letter-style": "ui/icons/letter-style", "icon-effect-strength": "ui/icons/effect-strength", "icon-word-size": "ui/icons/word-size",
    };
    for (const [role, source] of Object.entries(want)) {
      expect(entries(role), role).toEqual([expect.objectContaining({ kind: "icon", source, accepted: true, ticket: "243", verdict: "CODEX_QUEUE 243: Nhận 31/10 17:40 (cỡ thật)", fill: 0.85 })]);
      expect(Object.keys(table.roles)).toContain(role);
    }
    expect(entries("slider-fill")).toEqual([{ role: "slider-fill", kind: "track", source: "ui/quick-settings/sliders/slider-fill", accepted: true, ticket: "244", verdict: "CODEX_QUEUE 244: Nhận 31/10 18:00 (cỡ thật)", alt: "Slider fill" }]);
    expect(table.roles["slider-fill"]).toMatchObject({ kind: "track", widths: [512, 1024], aspect: 16 });
  });

  it("keeps 243's two failed redraws out (pace-director.r2, shake.r2: ticket 247) and nothing of tickets 245–249", () => {
    expect(entries("icon-pace-director")).toEqual([expect.objectContaining({ source: "ui/icons/pace-director.v2", ticket: "152" })]);
    expect(entries("icon-shake")).toEqual([expect.objectContaining({ source: "ui/icons/shake", ticket: "240" })]);
    expect(selection.entries.filter((entry) => /\.r2$/.test(entry.source ?? "") && /pace-director|shake/.test(entry.source ?? ""))).toEqual([]);
    expect(selection.entries.filter((entry) => ["245", "246", "247", "248", "249"].includes(entry.ticket))).toEqual([]);
  });
});

describe("the quick panels' skin (kit 18722b41 / b8a224d0)", () => {
  it("names the typing-effect rows' icons as the kit does and draws them with 243's art", () => {
    const icon = (id: string) => { const row = settingsRows(() => {}).find((r) => r.id === id); return row !== undefined && "icon" in row ? row.icon : undefined; };
    expect([icon("fxStyle"), icon("fxIntensity"), icon("fxSize")]).toEqual(["fx-style", "fx-strength", "fx-size"]);
    const icons = quickIcons();
    expect(icons["fx-style"]).toContain("/icon-letter-style.128.webp?v=");
    expect(icons["fx-strength"]).toContain("/icon-effect-strength.128.webp?v=");
    expect(icons["fx-size"]).toContain("/icon-word-size.128.webp?v=");
    expect(icons["hud-settings"]).toContain("/hud-settings.128.webp?v=" + table.roles["hud-settings"].rev);
  });

  it("scales the keyboard rows' plate edges and the label's inset with the panel", () => {
    expect(ROW_EDGE).toEqual([9, 10, 9, 10]);
    expect(LIST_ROW_VARS).toEqual({
      "--kit-qs-list-edge": "calc(9px * var(--kit-qs-s)) calc(10px * var(--kit-qs-s)) calc(9px * var(--kit-qs-s)) calc(10px * var(--kit-qs-s))",
      "--kit-qs-list-active-edge": "calc(9px * var(--kit-qs-s)) calc(10px * var(--kit-qs-s)) calc(9px * var(--kit-qs-s)) calc(10px * var(--kit-qs-s))",
      "--kit-qs-list-text-x": "calc(16px * var(--kit-qs-s))",
    });
  });

  it("hides Resume and Quit to title off a run: the context comes from the game, \"play\" when it gives none", () => {
    const context = (options: ReturnType<typeof quickOptions>) => (typeof options.context === "function" ? options.context() : options.context);
    expect(context(quickOptions(hooks()))).toBe("play");
    let mode = "start";
    const options = quickOptions(hooks({ context: () => (mode === "start" ? "title" : "play") }));
    expect(context(options)).toBe("title");
    mode = "play";
    expect(context(options)).toBe("play");
    expect(readFileSync("src/app/main.ts", "utf8")).toContain('context: () => (mode === "start" ? "title" : "play"),');
  });

  it("lines the 244 fill's ends up with the 225 groove's: cut 12 px further in, caps and outset in the groove's scale", () => {
    // Measured on the art (1024 × 64): the groove's alpha box is the whole canvas, the fill's 1000 × 64 at x 12.
    const cap = 64, inset = 12;
    expect(css).toContain("--kit-qs-groove-slice: 0 " + cap + ";");
    expect(css).toContain("--kit-qs-groove-cap: var(--kit-qs-groove-h);");
    expect(css).toContain("--kit-qs-fill-slice: 0 " + (cap + inset) + ";");
    expect(css).toContain("--kit-qs-fill-cap: calc(var(--kit-qs-groove-h) * " + (cap + inset) / cap + ");");
    expect(css).toContain(".sv-hud .kit-qs--fill-art .kit-qs__fill { border-image-outset: 0 calc(var(--kit-qs-groove-h) * " + inset / cap + "); }");
    // The fill's slice and outset only with the fill's own art: a fill drawn from the groove keeps the groove's cut.
    expect(css).toMatch(/\.sv-hud \.kit-qs\.kit-qs--fill-art \{ --kit-qs-fill-slice/);
  });

  it("glows in the game's cyan, titles in Chakra Petch, mutes the whole slider, and drops the old groove paint", () => {
    expect(css).toMatch(/--kit-qs-glow: var\(--volt\);/);
    expect(css).toMatch(/--kit-qs-title-font: var\(--font-title\);/);
    // The muted state is the kit's (kit-qs__row--muted, 2026-10-31 night); the game sets only its dim.
    expect(css).toContain(".sv-hud .kit-qs { --kit-qs-muted-filter: saturate(0.3) opacity(0.45); }");
    expect(css).not.toContain('[data-toggle="muted"][aria-pressed="true"]) .kit-qs__slider');
    expect(css).toContain(':root[data-art~="frame-button"] .sv-hud .kit-qs__btn:focus-visible, :root[data-art~="frame-button"] .sv-hud .kit-qs__opt input:focus-visible + .kit-qs__chip { outline: none; filter: var(--kit-qs-glow-filter); }');
    expect(css).not.toMatch(/var\(--v\b|--groove-dark|\.sv-hud \.kit-keyboards \{|0 0 0 1px var\(--volt\)/);
  });
});

describe("judges' items after the art pass (2026-10-31, night)", () => {
  it("a muted Master is the kit's: Unmute on the pressed plate, the 180 muted speaker on the row (already in icons), Unmute fits the 70 px column", () => {
    const master = defaultSoundRows()[0]!;
    expect(master).toMatchObject({ id: "master", mutedIcon: "hud-sound-muted", toggle: { id: "muted", label: "Mute", pressedLabel: "Unmute" } });
    expect(quickIcons()["hud-sound-muted"]).toContain("/hud-sound-muted.128.webp?v=" + table.roles["hud-sound-muted"].rev);
    expect(css).toContain("--kit-qs-aside-w: calc(70px * var(--kit-qs-s));");
    expect(css).toContain(".sv-hud .kit-qs__aside > .kit-qs__btn { padding: 0 calc(6px * var(--kit-qs-s)); }");
  });

  it("a chosen chip and a switch that is On read in the chosen keyboard row's lit cyan", () => {
    expect(css).toContain("--kit-qs-active-text: var(--volt-hi);");
    // After the active plate's rule (its "color: var(--text)"), at the same weight, so it wins; only on the lit plate.
    const rule = ':root[data-art~="frame-button-active"] .sv-hud .kit-qs__btn[aria-checked="true"], :root[data-art~="frame-button-active"] .sv-hud .kit-qs__opt input:checked + .kit-qs__chip { color: var(--kit-qs-active-text); }';
    expect(css).toContain(rule);
    expect(css.indexOf(rule)).toBeGreaterThan(css.indexOf("border-image-source: var(--art-frame-button-active);"));
  });

  it("blurs the scene behind an open panel, as Dragonhold does", () => {
    expect(css).toContain(".sv-hud .kit-qs__backdrop { -webkit-backdrop-filter: blur(calc(5px * var(--kit-qs-s))); backdrop-filter: blur(calc(5px * var(--kit-qs-s))); }");
  });

  it("leaves the Listen icons' size to the kit and gives the list's thin scrollbar the game's cyan", () => {
    expect(css).not.toMatch(/kit-keyboards__listen img \{/);
    expect(css).toContain(".sv-hud .kit-qs { --kit-qs-scroll-thumb: var(--volt-glow); }");
  });

  it("the Settings preview starts the next word while the last one's letters fly, and its impact ring lands inside the frame", () => {
    expect(REST).toBe(1);
    expect(RING_REACH).toBe((0.3 + 1.5 * 0.75) / 2);
    for (const [height, scale] of [[170, 1], [255, 1.5]] as const) {
      for (const size of ["medium", "large", "huge"] as const) {
        const { font, top } = previewFit(height, 36 * scale, size);
        const y = previewTargetY(height, scale, font);
        // Until it has faded to half (1.43× its size) the ring stays above the frame's bottom band; at its own size it stays below the plate's middle.
        expect(y + RING_REACH * (font + 6)).toBeLessThanOrEqual(height - FRAME_PX * scale + 1e-9);
        expect(y - (font + 6) / 2).toBeGreaterThan(top + font);
      }
    }
  });
});
