import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Menu } from "../src/app/menu";
import { soundRows } from "../src/app/quick";
import { runStats } from "../src/app/results";
import type { World } from "../src/sim/world";
import { renderScreen } from "../src/view/screens";
import { previewFit } from "../src/view/type-fx-preview";
import table from "../src/view/ui-art.json";
import selection from "../scripts/ui-art/selection.json";

/**
 * Last Line UI pass 3 (31/10), from the second in-game scoring: the ticket 242
 * icons and the Words stat, the Options music note, Keyboard volume's icon, the
 * advice on the word plate, the input notice and the no-WebGL plate on painted
 * parts in the warning tint, opaque sealed bays, the results card clear of the
 * painted hero, 80 px stars that light in, and the Settings preview that keeps
 * a Stamp's flight inside its box. The browser scenario survival-ui-art.mjs
 * measures each on the page.
 */
const css = readFileSync("src/view/survival.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const theme = readFileSync("src/view/theme.css", "utf8");
const roleOf = (html: string): string[] => [...html.matchAll(/\/([\w-]+)\.\d+\.webp/g)].map(([, role]) => role!);

describe("ticket 242 (accepted 31/10 17:05, graded at real size)", () => {
  it("wires the seven redrawn icons from their .r2 sources and leaves the three that failed alone", () => {
    for (const role of ["icon-next-stage", "icon-bay-full", "icon-kills", "icon-stat-accuracy", "icon-keyboard", "icon-clock", "icon-hazard"]) {
      const entries = selection.entries.filter((entry) => entry.role === role && entry.accepted);
      expect(entries, role).toHaveLength(1);
      expect(entries[0]!.source, role).toMatch(/^ui\/icons\/[\w-]+\.r2$/);
      expect(entries[0]!).toMatchObject({ ticket: "242", verdict: "CODEX_QUEUE 242: Nhận 31/10 17:05 (cỡ thật)", fill: 0.85 });
    }
    // Ticket 247 redraws these: their accepted entries keep the older art.
    for (const role of ["icon-stat-evenness", "icon-stat-new-word", "icon-rift"]) {
      for (const entry of selection.entries.filter((e) => e.role === role)) expect(entry.source, role).not.toContain(".r2");
    }
  });

  it("adds the Words stat icon and draws it on the results' Words tile", () => {
    expect(selection.entries.filter((entry) => entry.role === "icon-stat-words")).toEqual([
      { role: "icon-stat-words", kind: "icon", source: "ui/icons/stat-words", accepted: true, ticket: "242", verdict: "CODEX_QUEUE 242: Nhận 31/10 17:05 (cỡ thật)", alt: "Words", fill: 0.85 },
    ]);
    expect(table.roles["icon-stat-words"]).toMatchObject({ kind: "icon", alt: "Words", widths: [64, 128, 256] });
    const world = { stats: { keysOk: 90, keysBad: 10, kills: 41, words: 52 }, seconds: 150, time: 150 } as unknown as World;
    expect(runStats(world).map((stat) => [stat.label, stat.icon])).toEqual([["Time", "icon-stat-time"], ["Kills", "icon-kills"], ["Accuracy", "icon-stat-accuracy"], ["Words", "icon-stat-words"]]);
  });
});

describe("the Sound panel and Options", () => {
  it("gives Keyboard volume the keyboard row's key cap through the kit's row icon", () => {
    const rows = soundRows([{ value: "off", label: "Off" }]);
    const icon = (id: string) => { const row = rows.find((r) => r.id === id); return row !== undefined && "icon" in row ? row.icon : undefined; };
    expect(icon("keyboard")).toBe("vol-keyboard");
    expect(icon("keyboardVolume")).toBe("vol-keyboard");
    expect(icon("music")).toBe("vol-music");
  });

  it("widens the quick panel so Letter style's six chips hold one line", () => {
    expect(css).toContain(".sv-hud .kit-qs__panel { width: min(calc(720px * var(--kit-qs-s)), calc(100% - 32px)); }");
  });
});

describe("the advice line (Profile, Results)", () => {
  it("leads with the learning-rule icon, on the word plate, with no CSS rule left", () => {
    const profile = renderScreen({ kind: "profile", menu: new Menu([]), stats: [], advice: "Focus on each letter first.", lines: [] });
    expect(profile).toMatch(/<p class="sv-advice"><img class="sv-art sv-art-icon" src="[^"]*\/icon-learning-rule\.[^>]*><span>Focus on each letter first\.<\/span><\/p>/);
    const end = renderScreen({ kind: "end", menu: new Menu([]), won: false, mode: "Balanced", stats: [], words: [], advice: "", note: "" });
    expect(end).not.toContain("sv-advice");
    const framed = css.match(/:root\[data-art~="frame-word"\] \.sv-advice \{([^}]*)\}/)?.[1] ?? "";
    expect(framed).toContain("border-image: var(--art-frame-word) var(--art-frame-word-slice)");
    expect(framed).toContain("border: 0 solid transparent");
    expect(framed).toContain("background: none");
  });
});

describe("warnings on painted parts (input notice, no WebGL)", () => {
  it("defines the warning tint as a filter over the painted part", () => {
    expect(theme).toMatch(/--warn-tint: grayscale\(1\) sepia\(1\) saturate\(10\) hue-rotate\(-45deg\) brightness\(1\.1\) contrast\(1\.3\);/);
    expect(theme).toMatch(/--warn-tint-alpha: 0\.9;/);
  });

  it("draws the warning notice on the word plate, tinted, without the CSS ring", () => {
    const framed = css.match(/:root\[data-art~="frame-word"\] \.sv-notice \{([^}]*)\}/)?.[1] ?? "";
    expect(framed).toContain("box-shadow: none");
    expect(framed).toContain("filter: drop-shadow(");
    expect(framed).not.toMatch(/0 0 0 calc\(2px/);
    const tint = css.match(/:root\[data-art~="frame-word"\] \.sv-notice:not\(\.is-hint\)::before \{([^}]*)\}/)?.[1] ?? "";
    expect(tint).toContain("border-image: inherit");
    expect(tint).toContain("filter: var(--warn-tint)");
    expect(tint).toContain("z-index: -1");
  });

  it("draws the no-WebGL plate on the panel frame, tinted the same way", () => {
    expect(css).toMatch(/:root\[data-art~="frame-panel"\] \.sv-nogl \{[^}]*border-image: var\(--art-frame-panel\) var\(--art-frame-panel-slice\)/);
    expect(css).toMatch(/:root\[data-art~="frame-panel"\] \.sv-nogl::before \{[^}]*border-image: inherit;[^}]*filter: var\(--warn-tint\)/);
  });
});

describe("sealed bays, the results card and its stars", () => {
  it("makes the sealed plate opaque", () => {
    expect(css).toContain(':root[data-art~="frame-card"] .sv-bay-lock { filter: saturate(0.35) brightness(0.8); opacity: 1; }');
  });

  it("stands the results card left of centre on a wide view, clear of the painted hero", () => {
    const media = css.slice(css.indexOf("@media (min-aspect-ratio: 4/3) and (min-width: 1000px)"));
    expect(media).toMatch(/^@media[^{]*\{\s*\.sv-overlay\[data-screen="end"\]:has\(> \.sv-bg:not\(\[hidden\]\)\) \{ place-items: center start; padding-left: max\(4vw, calc\(48px \* var\(--ui\)\)\); \}/);
    // 700 px × ui plus the larger of 4vw and 48 px × ui: at 16:9 (ui = width / 1280) the right edge is 58.6 % of the width, under 62 %.
    for (const width of [1280, 1920]) {
      const ui = width / 1280;
      expect((Math.max(0.04 * width, 48 * ui) + 700 * ui) / width).toBeLessThanOrEqual(0.62);
    }
  });

  it("draws the stars at 80 px with a lit-in that reduced motion drops", () => {
    expect(css).toContain(".sv-art-star { width: calc(80px * var(--ui)); height: calc(80px * var(--ui)); }");
    expect(css).toMatch(/\.sv-star-row li\.is-on \.sv-art-star \{ animation: sv-star-in 0\.6s /);
    expect(css).toMatch(/@keyframes sv-star-in \{\s*0% \{ opacity: 0; transform: scale\(0\.35\)/);
    expect(css).toContain('[data-motion="reduced"] .sv-star-row li.is-on .sv-art-star { animation: none; }');
    // Two lines of four words make the room (the card holds 720p without scrolling).
    expect(readFileSync("src/view/screens.ts", "utf8")).toContain("const END_WORDS = 8;");
  });
});

describe("the Settings preview keeps a letter's whole flight inside its box", () => {
  it("fits the flight above the row and the meaning below in the box, at 720p and 1080p", () => {
    for (const [height, line] of [[170, 54], [255, 76]] as const) {
      for (const size of ["medium", "large", "huge"] as const) {
        const { font, top } = previewFit(height, line, size);
        // A Stamp lands from 2.5 font sizes above the row; the row and meaning take 2 below its top.
        expect(top - 2.5 * font, size).toBeGreaterThanOrEqual(0);
        expect(top + 2 * font, size).toBeLessThanOrEqual(height - 4);
      }
      expect(previewFit(height, line, "medium").font).toBeLessThan(previewFit(height, line, "large").font);
      expect(previewFit(height, line, "huge").font).toBe(previewFit(height, line, "large").font);
    }
    // Never larger than the word line itself.
    expect(previewFit(400, 30, "large").font).toBe(30);
  });
});
