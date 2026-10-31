import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHAPTER_HASH_STAGES, chapterHashLines } from "../scripts/chapter-hash-lines";

/**
 * The chapter stages still play the game they played (230-F8): the 152 world
 * hashes of scripts/chapter-hashes.ts with every tuning knob at its committed
 * value (FULL_BAY off). Any change to what hashWorld reads, to the sim or to
 * the bots turns this red; a ticket that changes the hashes on purpose
 * rewrites tests/golden/chapter-hashes.txt with that script and says so.
 */
const golden = readFileSync(new URL("./golden/chapter-hashes.txt", import.meta.url), "utf8").trimEnd().split("\n");

describe("chapter world hashes (golden)", () => {
  it("pins 152 lines, 38 per chapter stage", () => {
    expect(golden).toHaveLength(152);
    for (const stage of CHAPTER_HASH_STAGES) expect(golden.filter((line) => line.startsWith(stage + " "))).toHaveLength(38);
  });

  for (const stage of CHAPTER_HASH_STAGES) {
    it(stage, { timeout: 120_000 }, () => {
      expect(chapterHashLines(stage)).toEqual(golden.filter((line) => line.startsWith(stage + " ")));
    });
  }
});
