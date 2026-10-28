import { describe, expect, it } from "vitest";
import { Journey } from "../src/app/journey";
import { Menu } from "../src/app/menu";
import { stageById } from "../src/content/chapter-1";
import { renderJourney } from "../src/view/screens-journey";
import { renderScreen } from "../src/view/screens";

function journey(): Journey {
  return new Journey({
    mode: () => "balanced",
    store: { getItem: () => null, setItem() {} },
    sound() {}, draw() {}, start() {}, back() {},
  });
}

describe("small player labels (ticket 104)", () => {
  it.each(["c1-s1", "c1-s4"])("learning instructions on %s use sentences of at most 14 words", (id) => {
    const screen = journey();
    screen.brief(stageById(id));
    const html = renderJourney(screen);
    const detail = /<dt>Luật học<\/dt><dd><b>[^<]+<\/b> · ([\s\S]*?)<\/dd>/.exec(html)![1]!;
    const sentences = detail.split(/[.!?]/).map((sentence) => sentence.trim()).filter(Boolean);
    expect(sentences.length).toBeGreaterThan(0);
    for (const sentence of sentences) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(14);
    expect(detail).toContain("phiên âm");
    expect(detail).not.toMatch(/IPA|&quot;/);
  });

  it("stage 2 has its approved name in the journey, briefing and results", () => {
    const stage = stageById("c1-s2");
    const screen = journey();
    screen.open();
    expect(renderJourney(screen)).toContain("Ải 2 · Săn Pack Leader");
    screen.brief(stage);
    expect(renderJourney(screen)).toContain("ẢI 2 · SĂN PACK LEADER");
    expect(renderScreen({
      kind: "end", menu: new Menu([]), mode: "Cân bằng", won: true,
      stats: [], words: [], advice: "", note: "", stage: "Ải 2 · " + stage.name,
    })).toContain("ẢI 2 · SĂN PACK LEADER · CÂN BẰNG");
  });
});
