import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu } from "../src/app/menu";
import { GUN_SPECS } from "../src/content/guns";
import { renderScreen } from "../src/view/screens";
import { renderJourney } from "../src/view/screens-journey";
import { previewFit, SEAT } from "../src/view/type-fx-preview";
import { BOX, resetArtWarnings } from "../src/view/ui-art";
import { journey206 } from "./ui-art-fixtures";

/**
 * Last Line UI pass 3, the judges' fixes (31/10, two judges after parts A and
 * B): the loadout below the corner gear and speaker, its chips in fixed
 * columns with their names on every card, the Settings preview on the word
 * plate with its plate seated at 58 %, the rift chip in the amber tint with a
 * glow that never fades out, the armory's gun art at 96 px with a learning
 * tile, the stage card's art as a band, the status line on the word plate,
 * readable locked rows, lamp bullets, the bay-full icon at 28 px and clearer
 * wording. The browser scenario survival-ui-art.mjs measures each on the page.
 */
const css = readFileSync("src/view/survival.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const theme = readFileSync("src/view/theme.css", "utf8");
const source = (path: string): string => readFileSync(path, "utf8");

afterEach(() => { vi.restoreAllMocks(); resetArtWarnings(); });

describe("the loadout and the corner buttons", () => {
  it("starts the loadout below the corner buttons' bottom edge, which main.ts measures", () => {
    expect(css).toContain('.sv-overlay[data-screen="journey-loadout"] { padding-top: calc(var(--qs-low) + 6px * var(--ui)); }');
    expect(css).toContain('.sv-overlay[data-screen="journey-loadout"] .sv-loadout { max-height: calc(100vh - var(--qs-low) - 8px * var(--ui)); }');
    expect(theme).toMatch(/--qs-low: 0px;/);
    expect(source("src/app/main.ts")).toContain('hudRoot.style.setProperty("--qs-low", Math.ceil(bar.bottom) + "px")');
  });

  it("lays the chips in fixed columns, one chip wide, spread with one gap; names under every chip", () => {
    expect(css).toContain(".sv-vs ul { list-style: none; margin: calc(3px * var(--ui)) 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, calc(44px * var(--ui))); justify-content: space-between;");
    expect(css).toMatch(/\.sv-vs li \{ display: flex; flex-direction: column; align-items: center; width: calc\(44px \* var\(--ui\)\); \}/);
    expect(css).not.toMatch(/\.sv-vs li \{[^}]*min-width/);
  });

  it("names what the threat numbers are", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const j = journey206("c1-s1");
    j.loadout();
    const html = renderJourney(j);
    expect(html).toContain('<div class="sv-threats"><b>Threats this stage (% of foes)</b>');
    expect(html).not.toContain("Threats here");
  });
});

describe("the Settings preview", () => {
  it("seats the plate's middle at 58 % of the box with the whole flight above it inside, at 720p and 1080p", () => {
    expect(SEAT).toBe(0.58);
    for (const [height, line] of [[170, 54], [255, 76]] as const) {
      for (const size of ["medium", "large", "huge"] as const) {
        const { font, top } = previewFit(height, line, size);
        // The plate (row and meaning) is two font sizes tall; a Stamp lands from 2.5 above the row.
        expect(top + font).toBeCloseTo(height * SEAT, 6);
        expect(top - 2.5 * font).toBeGreaterThanOrEqual(4 - 1e-9);
        expect(top + 2 * font).toBeLessThanOrEqual(height - 4);
      }
    }
  });

  it("draws the box on the word plate's art, with a plain screen only without it", () => {
    expect(source("src/view/type-fx-preview.ts")).not.toMatch(/background:var\(--steel-950\)|border-radius:6px/);
    expect(css).toContain(".sv-tfx-preview { background: var(--steel-950);");
    expect(css).toMatch(/:root\[data-art~="frame-word"\] \.sv-tfx-preview \{ background: none; border-radius: 0; border: 0 solid transparent; border-image: var\(--art-frame-word\) var\(--art-frame-word-slice\) \//);
  });
});

describe("the rift's chip", () => {
  it("lays its plate again in the amber hazard tint and keeps its glow at 0.5 alpha or more", () => {
    expect(css).toContain(':root[data-art~="frame-word"] .sv-strip-warn::before { content: ""; position: absolute; inset: 0; z-index: -1; border: 0 solid transparent; border-image: inherit; filter: var(--hazard-tint);');
    expect(theme).toMatch(/--hazard-tint: grayscale\(1\) sepia\(1\)/);
    const alpha = (name: string): number => Number(new RegExp("--" + name + ": rgba\\([^)]*, ([\\d.]+)\\)").exec(theme)![1]);
    expect(alpha("rift-glow-lo")).toBeGreaterThanOrEqual(0.5);
    expect(alpha("rift-glow-mid")).toBeGreaterThan(alpha("rift-glow-lo"));
    expect(alpha("rift-glow-hi")).toBeGreaterThan(alpha("rift-glow-mid"));
    const frames = /@keyframes sv-rift-glow \{([^]*?)\} \}/.exec(css)![1]!;
    expect(frames).toContain("var(--rift-glow-lo)");
    expect(frames).not.toContain("var(--hot-glow)");
    // Reduced motion: the glow stands still at the middle strength.
    expect(css).toMatch(/:root\[data-motion="reduced"\]\[data-art~="frame-word"\] \.sv-strip-warn\.is-on \{ animation: none; filter: [^}]*var\(--rift-glow-mid\)/);
  });
});

describe("the armory", () => {
  const armory = (learning: readonly string[]): string => renderScreen({ kind: "armory", menu: new Menu([{ id: "back", label: "Back", enabled: true }]), guns: GUN_SPECS.map((g) => ({ kind: g.key, name: g.name, title: g.title, text: g.magazine })), learning });

  it("draws the gun art at the loadout's 96 px", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(BOX.armory).toEqual({ width: 96, height: 96 });
    expect(armory([]).match(/sv-art-armory[^>]*width="96" height="96"/g)).toHaveLength(5);
  });

  it("fills the sixth cell with how learning works: the learning-rule icon and the notes, no list under the grid", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const html = armory(["One.", "Two."]);
    const grid = html.slice(html.indexOf('<div class="sv-guns">'), html.indexOf('<nav class="sv-menu'));
    expect(grid).toMatch(/<section class="sv-gun-card sv-learn-tile"><header><img class="sv-art sv-art-icon" src="[^"]*\/icon-learning-rule\.[^>]*><b>HOW LEARNING WORKS<\/b><\/header><ul class="sv-learning"><li>One\.<\/li><li>Two\.<\/li><\/ul><\/section><\/div>$/);
    expect(html.match(/sv-learning/g)).toHaveLength(1);
    // No tile without notes.
    expect(armory([])).not.toContain("sv-learn-tile");
  });

  it("tells the player where the words go without the game's internal id", () => {
    const main = source("src/app/main.ts");
    expect(main).toContain('"Every word you finish goes into your learning log, shared across the portal\'s games."');
    expect(main).not.toMatch(/learning log \(typing-survival\)/);
  });

  it("puts a short text right under its name: the art spans two rows, the text's takes the spare height", () => {
    expect(css).toContain(".sv-guns > .sv-gun-card:has(> .sv-art-armory:not([hidden])) { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto 1fr;");
  });
});

describe("notes, the stage card, the title and locked rows", () => {
  it("bullets every note with the panel lamp's art, 12 px, not the browser's disc", () => {
    expect(css).toMatch(/\.sv-learning \{[^}]*padding-left: 0; list-style: none;/);
    expect(css).toMatch(/\.sv-learning li::before \{[^}]*width: calc\(12px \* var\(--ui\)\); height: calc\(12px \* var\(--ui\)\); background: var\(--art-led-off, none\)/);
    expect(source("src/view/screens.ts").match(/learningList\(view\./g)).toHaveLength(2);
  });

  it("shows the stage card's art as a band inside the frame's rails, as on the briefing", () => {
    expect(BOX.intro).toEqual({ width: 760, height: 200 });
    expect(css).toContain(".sv-intro:has(> .sv-art-intro:not([hidden])) { width: min(94vw, calc(778px * var(--ui))); }");
    expect(css).toMatch(/\.sv-art-intro:not\(\[hidden\]\) \{ display: block; object-fit: cover; margin: calc\(8px \* var\(--ui\)\) calc\(-17px \* var\(--ui\) - 1px\) calc\(10px \* var\(--ui\)\); width: calc\(100% \+ 34px \* var\(--ui\) \+ 2px\);/);
  });

  it("sets the title's status line on the word plate", () => {
    expect(css).toMatch(/:root\[data-art~="frame-word"\] \.sv-status \{ width: max-content;[^}]*background: none; border: 0 solid transparent;[^}]*border-image: var\(--art-frame-word\) var\(--art-frame-word-slice\)/);
  });

  it("dims only a locked row's pictures and lock, its words stay readable", () => {
    expect(css).not.toMatch(/\.sv-item\.is-off \{[^}]*opacity/);
    expect(css).toContain(".sv-item.is-off > .sv-art:not(.sv-art-led), .sv-item.is-off > .sv-icon-gap, .sv-item.is-off > .sv-stars { opacity: 0.5; filter: grayscale(0.7); }");
    expect(css).toContain(".sv-item.is-off b { color: var(--steel-300); }");
    expect(css).toContain(".sv-item.is-off small { color: var(--soft); }");
  });
});

describe("the fight's HUD", () => {
  it("reads the kills plate as \"8 kills in 3 s\" and draws the bay-full icon at 28 px", () => {
    const hud = source("src/view/hud.ts");
    expect(hud).toContain('el("small", "", kills, "kills in 3 s");');
    expect(hud).toContain("this.kills.textContent = String(killsRecent);");
    expect(hud).not.toContain('"×" + killsRecent');
    expect(hud).toContain('appendArt(head, artAttrs("icon-bay-full", "icon"));');
    expect(css).toContain(".sv-slot > header > .sv-art-icon { margin: calc(-8px * var(--ui)) 0 calc(-8px * var(--ui)) auto; }");
    expect(css).toContain(".sv-slot:not(.is-full) > header > .sv-art-icon { visibility: hidden; }");
  });
});
