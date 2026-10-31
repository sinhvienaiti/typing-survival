import { describe, expect, it, vi, afterEach } from "vitest";
import { quickSkin } from "../src/app/quick";
import { KIND } from "../src/content/foes";
import { artAttrs, artHtml, artUrl, BOX, foeArt, foeRole, resetArtWarnings, rowRoles, SILHOUETTE_MAX, type ArtPlace } from "../src/view/ui-art";
import table from "../src/view/ui-art.json";
import selection from "../scripts/ui-art/selection.json";
import { SILHOUETTES, WIRED_245 } from "./ui-art-roles";

/**
 * Ticket 245 wired (accepted 31/10 23:55, graded at real size): the quick
 * panels' Close is the round art button, and a foe drawn at 40 px or less is
 * its bold silhouette (the portraits thinned to look-alike smudges at
 * 20–28 px). docs/changelog/2026-10-31-wire-245.md.
 */
const VERDICT = "CODEX_QUEUE 245: Nhận 31/10 23:55 (cỡ thật)";
const entries = (role: string) => selection.entries.filter((entry) => entry.role === role);
const roles = table.roles as Record<string, { kind: string; widths: number[]; aspect: number; alt: string }>;
const src = (role: string, place: ArtPlace): string => String(artAttrs(role, place)?.src ?? "");
afterEach(() => { vi.restoreAllMocks(); resetArtWarnings(); });

describe("ticket 245 in the selection", () => {
  it("takes the Close and the six silhouettes, one accepted entry each, beside the portraits they stand in for", () => {
    expect(entries("quick-close")).toEqual([{ role: "quick-close", kind: "icon", source: "ui/frames-epic/close", accepted: true, ticket: "245", verdict: VERDICT, alt: "Close", fill: 0.85 }]);
    for (const foe of SILHOUETTES) {
      const role = "foe-" + foe + "-small";
      expect(entries(role), role).toEqual([expect.objectContaining({ kind: "portrait", source: WIRED_245[role]!.source, accepted: true, ticket: "245", verdict: VERDICT, fill: 0.9 })]);
      // Same name as the portrait; the portrait stays accepted for the larger places.
      expect(entries(role)[0]!.alt).toBe(entries("foe-" + foe).find((e) => e.accepted)!.alt);
      expect(entries("foe-" + foe).filter((e) => e.accepted)).toEqual([expect.objectContaining({ ticket: "089" })]);
      expect(roles[role]).toMatchObject({ kind: "portrait", widths: [64, 128, 256], aspect: 1 });
    }
    expect(roles["quick-close"]).toMatchObject({ kind: "icon", alt: "Close", widths: [64, 128, 256], aspect: 1 });
    // No silhouette for the Shard (not in the ticket).
    expect(roles["foe-shard-small"]).toBeUndefined();
  });
});

describe("foes at 40 px or less are the silhouettes", () => {
  it("swaps a foe's portrait for its silhouette in every place up to 40 px, and only there", () => {
    expect(SILHOUETTE_MAX).toBe(40);
    const small = (Object.keys(BOX) as ArtPlace[]).filter((place) => BOX[place].width <= 40);
    expect(small).toEqual(expect.arrayContaining(["foe", "teach", "chip", "threat", "icon"]));
    for (const kind of [KIND.mine, KIND.scout, KIND.brute, KIND.leader, KIND.shield, KIND.splitter]) {
      const role = foeRole(kind);
      for (const place of small) expect(foeArt(role, place), role + " " + place).toBe(role + "-small");
      // The new-foe card (48 px) keeps the portrait.
      expect(foeArt(role, "fresh")).toBe(role);
      expect(src(role, "fresh")).toContain("/" + role + ".");
    }
    expect(foeArt("foe-shard", "threat")).toBe("foe-shard");
    expect(foeArt("icon-objective", "icon")).toBe("icon-objective");
    expect(foeArt("foe-brute-small", "chip")).toBe("foe-brute-small");
  });

  it("draws the chips (36 px), the threat strip (24 px), the objective plate (28 px), the briefing rows (40 px) and the taught foe (32 px) from the silhouettes", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(src(foeRole(KIND.brute), "chip")).toMatch(/\/foe-brute-small\.64\.webp\?v=[a-f0-9]{8}$/);
    expect(artHtml(foeRole(KIND.leader), "icon")).toContain("/foe-pack-leader-small.64.webp");
    expect(artHtml(foeRole(KIND.leader), "icon")).toContain("/foe-pack-leader-small.128.webp?v=" + table.roles["foe-pack-leader-small"].rev + " 2x");
    expect(artHtml(foeRole(KIND.shield), "foe")).toContain("/foe-shield-guard-small.");
    expect(artHtml(foeRole("splitter"), "teach")).toContain("/foe-splitter-small.");
    expect(rowRoles("armoured").map((role) => src(role, "threat"))).toEqual([expect.stringContaining("/foe-brute-small."), expect.stringContaining("/foe-pack-leader-small.")]);
    // Same box and decoration as the portrait it replaces.
    const attrs = artAttrs(foeRole(KIND.scout), "chip")!;
    expect(attrs).toMatchObject({ class: "sv-art sv-art-chip", width: 36, height: 36, alt: "", "aria-hidden": "true" });
    expect(artAttrs(foeRole(KIND.scout), "chip", { label: true })!.alt).toBe("Scout");
  });
});

describe("the quick panels' Close", () => {
  it("is the 245 button through QuickSkin.close, its 128 px copy (sharp at 2× on the 1080p scale)", () => {
    const close = quickSkin().close;
    expect(close).toBe(artUrl("quick-close", 32));
    expect(close).toMatch(/^\/assets\/typing-survival\/ui\/quick-close\.128\.webp\?v=[a-f0-9]{8}$/);
  });
});
