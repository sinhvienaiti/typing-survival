import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOX, gunRole, resetArtWarnings } from "../src/view/ui-art";
import { screens206 } from "./ui-art-fixtures";

/**
 * 206 browser check (30/10) at 1280×720 and 1920×1080:
 * (a) the stage card's art band reached 1 px past the card's padding box, so
 *     the card scrolled 1 px sideways and showed a classic scrollbar;
 * (b) the armory's 64 px gun icons added a row to every gun card and pushed
 *     the card past max-height 94vh (705 > 675 px at 720p).
 * The browser scenario (survival-ui-art.mjs, noOverflow and cardsFit) measures
 * the result; these checks hold the CSS and markup that make it fit.
 */
const css = readFileSync("src/view/survival.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({ selectors: selectors!.split(/,(?![^(]*\))/).map((s) => s.trim()), body: body! }));
/** The value the cascade gives `property` for exactly this selector (the last rule that names it). */
function decl(selector: string, property: string): string | undefined {
  let value: string | undefined;
  for (const rule of rules) {
    if (!rule.selectors.includes(selector)) continue;
    for (const [, name, v] of rule.body.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)) if (name === property) value = v!.trim();
  }
  return value;
}
const px = (value: string | undefined, at: number): number => Number(value?.match(/(-?\d+(?:\.\d+)?)px/g)?.[at]?.replace("px", ""));

afterEach(() => { vi.restoreAllMocks(); resetArtWarnings(); });

describe("the stage card's art band stays inside the card (206 browser check a)", () => {
  const side = px(decl(".sv-card", "padding"), 1);
  const border = px(decl(".sv-panel", "border"), 0);

  it("reads the card's side padding and border it has to fill", () => {
    expect(side).toBe(26);
    expect(border).toBe(1);
  });

  it("pulls the band out by the side padding only, never over the border", () => {
    expect(decl(".sv-art-briefing:not([hidden])", "margin")).toBe(`calc(6px * var(--ui)) calc(-${side}px * var(--ui))`);
    expect(decl(".sv-art-briefing:not([hidden])", "width")).toBe(`calc(100% + ${2 * side}px * var(--ui))`);
  });

  it("widens the stage card by its border, so the band is BOX.briefing wide at every scale", () => {
    // Border box = BOX × ui + both borders; padding box = BOX × ui = the band.
    expect(decl(".sv-brief", "width")).toBe(`min(94vw, calc(${BOX.briefing.width}px * var(--ui) + ${2 * border}px))`);
  });
});

describe("the armory's gun icons fit the card (206 browser check b)", () => {
  it("puts each gun's icon first in its card, beside the header and text", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const cards = screens206().armory!.match(/<section class="sv-gun-card[^"]*">[^]*?<\/section>/g) ?? [];
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      const kind = card.match(/class="sv-gun-card sv-(\w+)"/)![1]!;
      expect(card).toMatch(new RegExp('^<section class="sv-gun-card sv-' + kind + '"><img class="sv-art sv-art-armory" src="[^"]*/' + gunRole(kind) + "\\.[^>]*><header><b>"));
      expect(card.match(/<img /g)).toHaveLength(1);
    }
  });

  it("gives the icon its own column across the name and the text, so it adds no row", () => {
    const card = ".sv-guns > .sv-gun-card:has(> .sv-art-armory:not([hidden]))";
    expect(decl(card, "display")).toBe("grid");
    expect(decl(card, "grid-template-columns")).toBe("auto 1fr");
    // A card stretched by its taller neighbour keeps the text under the title, not spread down.
    expect(decl(card, "align-content")).toBe("start");
    expect(decl(".sv-art-armory:not([hidden])", "grid-row")).toBe("1 / 3");
    // Name above title in the narrower text column: every card gets the same two lines.
    expect(decl(card + " > header > b", "display")).toBe("block");
    expect(decl(card + " > header > small", "display")).toBe("block");
  });

  it("gives the armory the journey sheets' width, so the text column keeps its old measure", () => {
    expect(decl(".sv-armory", "width")).toBe(decl(".sv-stages", "width"));
    expect(decl(".sv-stages", "width")).toBe("min(94vw, calc(760px * var(--ui)))");
  });

  it("keeps the 64 px icon box", () => {
    expect(BOX.armory).toEqual({ width: 64, height: 64 });
  });
});
