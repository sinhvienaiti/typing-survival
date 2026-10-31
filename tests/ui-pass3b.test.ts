import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ROW_LABELS } from "../src/app/journey";
import { COUNTERS, COUNTER_ROWS, GUN_KEYS, GUN_SPECS } from "../src/content/guns";
import { renderJourney } from "../src/view/screens-journey";
import { BOX, resetArtWarnings } from "../src/view/ui-art";
import { journey206 } from "./ui-art-fixtures";

/**
 * Last Line UI pass 3, part B (31/10), from the second in-game scoring (both
 * judges: the loadout was the weakest screen after the quick panels): each gun
 * card shows its art at 96 px beside its name, the stats on one line and
 * Strong / Weak as rows of foe chips on the painted word plate; the picked
 * card wears the lit button frame with its gun's glow and the tags sit on the
 * word plate; a rift's warning is one painted chip inside the corridor. The
 * browser scenario survival-ui-art.mjs measures each on the page.
 */
const css = readFileSync("src/view/survival.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const theme = readFileSync("src/view/theme.css", "utf8");
const cardsOf = (html: string): string[] => html.split('<section class="sv-gun-card').slice(1).map((part) => part.slice(0, part.indexOf("</section>")));
const decode = (text: string): string => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

afterEach(() => { vi.restoreAllMocks(); resetArtWarnings(); });

describe("loadout cards", () => {
  it("shows each gun's art at 96 px, its name and role, its magazine and the stats on one line", () => {
    expect(BOX.loadout).toEqual({ width: 96, height: 96 });
    const j = journey206("c1-s1");
    j.loadout();
    const cards = cardsOf(renderJourney(j));
    expect(cards).toHaveLength(5);
    cards.forEach((card, n) => {
      const spec = GUN_SPECS[n]!;
      expect(card).toMatch(new RegExp('<img class="sv-art sv-art-loadout" src="[^"]*/gun-' + spec.key + '\\.256\\.webp[^>]*width="96" height="96"'));
      expect(card).toContain("<header><kbd>" + (n + 1) + "</kbd><b>" + spec.name + "</b><small>" + spec.title + "</small></header>");
      expect(card).toContain('<p class="sv-does">' + spec.magazine + "</p>");
      expect(card).toContain('<p class="sv-gun-stats">Range <b>' + spec.range + "</b>" + (spec.heavy ? " · Words <b>+1 letter</b>" : "") + "</p>");
    });
  });

  it("draws Strong and Weak as foe chips that keep every counter row: a 36 px foe (the 245 silhouette) on the plate, a short name, the row's label as the tooltip", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(BOX.chip).toEqual({ width: 36, height: 36 });
    const j = journey206("c1-s4");
    j.loadout();
    const cards = cardsOf(renderJourney(j));
    GUN_KEYS.forEach((key, gun) => {
      for (const [kind, mark] of [["good", 2], ["poor", 0]] as const) {
        const block = cards[gun]!.split('<div class="sv-vs sv-' + kind + '">')[1]!.split("</div>")[0]!;
        expect(block.startsWith("<b>" + (kind === "good" ? "Strong" : "Weak") + "</b><ul>"), key + " " + kind).toBe(true);
        const rows = COUNTER_ROWS.filter((row) => COUNTERS[row][gun] === mark);
        const titles = [...block.matchAll(/<li title="([^"]*)">/g)].map(([, title]) => decode(title!));
        // Every row's label is in a chip's tooltip, in the table's order (a two-foe row's chips share it).
        expect([...new Set(titles)].join(", "), key + " " + kind).toBe(rows.map((row) => ROW_LABELS[row]).join(", "));
        for (const chip of block.match(/<li [^]*?<\/li>/g) ?? []) {
          expect(chip).toMatch(/<span class="sv-chip"><img class="sv-art sv-art-chip" src="[^"]*\/foe-[\w-]+\.64\.webp[^>]*width="36" height="36"[^>]*><\/span><small>[A-Z][\w ]+<\/small><\/li>$/);
        }
      }
    });
    // The Rail Gun's two Swarm rows are one Swarm chip; the Star Mortar's Swarm says which part of the lane.
    expect(cards[3]).toContain('<li title="Swarm mid-lane, Swarm at the line">');
    expect((cards[3]!.match(/class="sv-art sv-art-chip" src="[^"]*\/foe-swarm-small\./g) ?? []).length).toBe(1);
    expect(cards[4]).toMatch(/sv-good[^]*<small>Mid Swarm<\/small>[^]*sv-poor[^]*<small>Near Swarm<\/small>/);
    expect(cards[4]!.match(/sv-art-chip/g)).toHaveLength(8);
  });

  it("puts the tags on the word plate and the picked card on the lit button frame, with no CSS ring", () => {
    const j = journey206("c1-s1");
    j.loadout();
    const html = renderJourney(j);
    expect(html.match(/<i class="sv-rec">Recommended<\/i>/g)).toHaveLength(2);
    expect(html).toMatch(/<em class="sv-bay-tag">BAY 1<\/em>/);
    expect(css).toMatch(/:root\[data-art~="frame-word"\] \.sv-cards \.sv-gun-card \.sv-rec, :root\[data-art~="frame-word"\] \.sv-cards \.sv-gun-card \.sv-bay-tag \{ background: none; border: 0 solid transparent; border-image: var\(--art-frame-word\)/);
    expect(css).toMatch(/:root\[data-art~="frame-button-active"\] \.sv-cards \.sv-gun-card\.is-picked \{ border-image: var\(--art-frame-button-active\) var\(--art-frame-button-active-slice\)/);
    expect(css).toContain(':root[data-art~="frame-card"] .sv-cards .sv-gun-card.is-on, :root[data-art~="frame-card"] .sv-cards .sv-gun-card.is-picked { box-shadow: none; }');
    // The gun's glow and the focus glow light a copy of the painted frame, so they follow its edge.
    expect(css).toMatch(/:root\[data-art~="frame-card"\] \.sv-cards \.sv-gun-card::before \{[^}]*border-image: inherit;/);
    expect(css).toContain(':root[data-art~="frame-card"] .sv-cards .sv-gun-card.is-picked::before { opacity: 1; filter: drop-shadow(0 0 calc(4px * var(--ui)) var(--gun))');
    expect(css).toContain(':root[data-art~="frame-card"] .sv-cards .sv-gun-card.is-on::before { opacity: 1; filter: drop-shadow(0 0 calc(4px * var(--ui)) var(--hot))');
  });

  it("tints the chips green and red over the painted plate and shows the names on every card, brighter on the focused one, without moving it", () => {
    expect(css).toMatch(/:root\[data-art~="frame-word"\] \.sv-chip \{ background: none; border: 0 solid transparent; border-image: var\(--art-frame-word\)/);
    expect(css).toContain(':root[data-art~="frame-word"] .sv-good .sv-chip::before { filter: var(--good-tint); }');
    expect(css).toContain(':root[data-art~="frame-word"] .sv-poor .sv-chip::before { filter: var(--warn-tint); }');
    expect(theme).toMatch(/--good-tint: grayscale\(1\) sepia\(1\)/);
    // UI pass 3 fixes: every card shows its names (judge B: 4 of 5 cards could not be read); focus only brightens them, so it moves nothing.
    expect(css).not.toMatch(/\.sv-vs li small \{[^}]*opacity/);
    expect(css).toContain(".sv-cards .sv-gun-card.is-on .sv-vs li small, .sv-cards .sv-gun-card:hover .sv-vs li small { color: var(--text); }");
  });
});

describe("the rift's warning", () => {
  it("is one chip on the word plate that glows instead of blinking, with no mark of its own on the wall", () => {
    expect(css).not.toMatch(/\.sv-warn\b/);
    expect(css).toMatch(/:root\[data-art~="frame-word"\] \.sv-strip-warn \{[^}]*border-image: var\(--art-frame-word\)[^}]*filter: drop-shadow\(/);
    expect(css).toMatch(/:root\[data-art~="frame-word"\] \.sv-strip-warn\.is-on \{ animation: sv-rift-glow /);
    // UI pass 3 fixes: reduced motion keeps the glow, standing still at its middle strength.
    expect(css).toMatch(/:root\[data-motion="reduced"\]\[data-art~="frame-word"\] \.sv-strip-warn\.is-on \{ animation: none; filter: /);
    const hud = readFileSync("src/view/hud.ts", "utf8");
    // Between the word line and the bays, inside the corridor's walls and off the bays' gun tabs.
    expect(hud).toContain("const y = (this.placed.line + this.placed.glow) / 2;");
    expect(hud).toMatch(/stage\.project\(-inner, z, 0, this\.at, true\)\.x \+ RIFT_CHIP\.wall \* ui/);
    expect(hud).toContain('".sv-art-bay:not([hidden])"');
    expect(hud).not.toContain('"sv-warn"');
  });
});
