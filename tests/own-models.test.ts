import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ModelLibrary } from "../src/kit/three";
import { MODEL_MANIFEST_URL, modelTier, crowdModelRequests, shipModelRequest, loadMesh } from "../src/view/models";
import { Bolts, BOLT } from "../src/view/bolts";
import { GUN, type GunId } from "../src/content/guns";
import type { Tier } from "../src/content/rules";

vi.mock("../src/view/models", async (original) => ({
  ...await original<typeof import("../src/view/models")>(),
  loadMesh: vi.fn(async () => null),
}));
const expected = [
  "ships/vanguard", "heroes/draconis-v3",
  ...["mine", "scout", "tank", "shield", "splitter"].map((id) => "enemies/rainbow-" + id + "-3d"),
  ...["vanguard-bolt", "solar-lance-bolt", "frost-seraph-bolt", "crimson-talon-bolt", "dragon-fireball"].map((id) => "skills/" + id),
];
const manifest = () => JSON.parse(readFileSync("public/assets/typing-survival/models/manifest.json", "utf8"));
const tiers: Tier[] = ["low", "medium", "high", "ultra"];

describe("own models", () => {
  beforeEach(() => vi.mocked(loadMesh).mockClear());

  it("ships exactly twelve ids with two local tiers and no legacy fallbacks", () => {
    const models = manifest().models;
    expect(Object.keys(models).sort()).toEqual(expected.slice().sort());
    for (const [key, entry] of Object.entries<any>(models)) {
      expect(key).toBe(entry.kind + "/" + entry.id);
      expect(entry.id).not.toMatch(/-lod$|^draconis(?:-v2)?$/);
      expect(Object.keys(entry.tiers).sort()).toEqual(["high", "medium"]);
      for (const file of Object.values<any>(entry.tiers)) expect(file.url.startsWith("/assets/typing-survival/models/")).toBe(true);
    }
  });

  it.each(tiers)("resolves all twelve %s models to the correct file", async (tier) => {
    const fetcher = vi.fn(async () => ({ ok: true, headers: { get: () => "application/json" }, json: async () => manifest() }));
    const library = new ModelLibrary({ manifests: MODEL_MANIFEST_URL, fetcher });
    const suffix = tier === "low" || tier === "medium" ? "medium" : "high";
    for (const key of expected) {
      const [kind, id] = key.split("/");
      expect(await library.url(kind!, id!, modelTier(tier))).toMatch(new RegExp("\\." + suffix + "\\.glb\\?v=[a-f0-9]{10}$"));
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/assets/typing-survival/models/manifest.json", { cache: "no-cache" });
  });

  for (const tier of tiers) {
    for (const [draconis, guns, ids] of [
      [false, [GUN.xung, GUN.tia], ["vanguard-bolt"]],
      [true, [GUN.xung, GUN.tia], ["dragon-fireball"]],
      [false, [GUN.tan, GUN.ray], ["solar-lance-bolt", "frost-seraph-bolt"]],
      [false, [GUN.phao, GUN.xung], ["crimson-talon-bolt", "vanguard-bolt"]],
    ] as const) {
      it(`loads only selected bolts: ${tier}, ${draconis}, ${guns}`, async () => {
        const bolts = new Bolts(new THREE.Scene(), tier, draconis, guns);
        await bolts.load();
        const wanted = tier === "low" ? [] : [...ids];
        expect(vi.mocked(loadMesh).mock.calls.map((call) => call[1][0]).sort()).toEqual(wanted.sort());
        for (const call of vi.mocked(loadMesh).mock.calls) {
          expect(call[0]).toBe("skills");
          expect(call[2]).toBe(tier === "medium" ? "medium" : "high");
        }
        expect(bolts.ready).toBe(true);
        expect(bolts.add(BOLT.ray, 0, 0, 0, 0, 0, 1, 0)).toBe(false);
      });
    }
  }

  it.each<{ guns: GunId[] }>([{ guns: [] }, { guns: [GUN.tia] }, { guns: [GUN.xung, GUN.xung] }])("handles empty, beam-only and repeated guns: $guns", async ({ guns }) => {
    const bolts = new Bolts(new THREE.Scene(), "high", false, guns);
    await bolts.load();
    expect(loadMesh).toHaveBeenCalledTimes(guns.includes(GUN.xung) ? 1 : 0);
    expect(bolts.ready).toBe(true);
  });

  it.each(tiers)("requests the crowd and both ships at %s", (tier) => {
    const wanted = tier === "low" || tier === "medium" ? "medium" : "high";
    const crowd = crowdModelRequests(tier);
    expect(crowd).toHaveLength(7);
    expect([...new Set(crowd.flatMap((request) => request.ids))].sort()).toEqual(expected.filter((id) => id.startsWith("enemies/")).map((id) => id.split("/")[1]).sort());
    for (const request of crowd) expect(request.tier).toBe(wanted);
    expect(shipModelRequest("vanguard", tier)).toEqual({ kind: "ships", ids: ["vanguard"], tier: wanted });
    expect(shipModelRequest("draconis", tier)).toEqual({ kind: "heroes", ids: ["draconis-v3"], tier: wanted });
  });

  it("wires quality and selected guns from the page into the loaders", () => {
    const source = (file: string) => readFileSync(file, "utf8");
    expect(source("src/view/crowd.ts")).toContain("crowdModelRequests(tier)");
    expect(source("src/view/ship.ts")).toContain("shipModelRequest(this.pilot, tier)");
    expect(source("src/app/main.ts")).toContain("crowd.load(tier)");
    expect(source("src/app/main.ts")).toContain("ship.load(stage.scene, tier)");
    expect(source("src/app/main.ts")).toContain("world.header.kit.guns, audio");
    expect(source("src/view/combat.ts")).toContain('new Bolts(stage.scene, tierName, pilot === "draconis", guns)');
  });

  it("has no foreign asset path in game source or Vite", () => {
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return path === "src/kit" ? [] : entry.isDirectory() ? files(path) : [path];
    });
    const foreign = "/assets/" + "space-typing/";
    const matches = [...files("src"), "vite.config.ts", "index.html"].filter((file) => readFileSync(file, "utf8").includes(foreign));
    expect(matches).toEqual([]);
  });
});
