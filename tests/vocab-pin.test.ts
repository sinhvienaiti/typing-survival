import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deckHash } from "../src/app/vocab";
import { buildDeck } from "../src/content/deck";

const root = fileURLToPath(new URL("../", import.meta.url));
const vocabulary = join(root, "public/vocabulary");
const config = JSON.parse(readFileSync(join(root, "vocab.config.json"), "utf8")) as { pin: string; files: string[] };
const manifest = JSON.parse(readFileSync(join(vocabulary, "vocab-manifest.json"), "utf8")) as {
  pin: string; version: number; files: Record<string, string>;
};
const index = JSON.parse(readFileSync(join(vocabulary, "index.json"), "utf8")) as {
  version: number; levels: { level: number; file: string }[];
};
const pageLevels = [1, 2, 3];

function levelFile(level: number): string {
  const item = index.levels.find((entry) => entry.level === level);
  expect(item, "index entry for level " + level).toBeDefined();
  return join(vocabulary, item!.file);
}

function filesIn(directory: string): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = directory + "/" + entry.name;
    if (path === "src/kit") return [];
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

describe("the pinned vocabulary", () => {
  it("keeps all five configured files and their SHA-256 hashes", () => {
    expect(config.files).toEqual(["index.json", "levels/001.json", "levels/002.json", "levels/003.json", "ATTRIBUTION.md"]);
    expect(Object.keys(manifest.files)).toEqual([...config.files].sort());
    for (const file of config.files) {
      const path = join(vocabulary, file);
      expect(existsSync(path), file).toBe(true);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex"), file).toBe(manifest.files[file]);
    }
  });

  it("agrees on the pin and index version", () => {
    expect(config.pin).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.pin).toBe(config.pin);
    expect(manifest.version).toBe(index.version);
  });

  it("contains the index file for every level requested by loadVocab", () => {
    for (const level of pageLevels) expect(existsSync(levelFile(level)), "level " + level).toBe(true);
  });

  it("builds the page's unchanged deck", () => {
    const levels = pageLevels.map((level) => {
      const data = JSON.parse(readFileSync(levelFile(level), "utf8")) as { entries: { en: string }[] };
      return data.entries;
    });
    expect(deckHash(buildDeck(levels))).toBe("7f073fa2");
  });

  it("keeps game source, tests and scripts independent of the parent vocabulary", () => {
    const needle = "shared" + "/vocabulary";
    const matches = ["src", "tests", "scripts"].flatMap(filesIn)
      .filter((file) => readFileSync(join(root, file), "utf8").includes(needle));
    expect(matches).toEqual([]);
  });
});
