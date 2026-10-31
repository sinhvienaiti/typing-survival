/**
 * The 152 runs of the chapter-hash check (scripts/chapter-hashes.ts, pinned
 * by tests/chapter-hashes.test.ts): per chapter stage 1–4, every pair of
 * guns × seeds 1–3 with the standard bot in Cân bằng (director on), plus the
 * bot matrix's own picks for 4 bots × 2 seeds; one "stage kit seed hash"
 * line per run, 38 per stage.
 */
import { gunSets } from "../src/content/threat";
import { botRows, runOne } from "./balance-lib";
import { sharedDeck } from "../tests/survival/typist-bot";

export const CHAPTER_HASH_STAGES = ["c1-s1", "c1-s2", "c1-s3", "c1-s4"] as const;

/** The 38 lines of one stage, in the check's order. */
export function chapterHashLines(stage: string): string[] {
  const deck = sharedDeck();
  const rows = botRows();
  const standard = rows.find((b) => b.id === "standard")!;
  const lines: string[] = [];
  for (const kit of gunSets(2)) for (const seed of [1, 2, 3]) lines.push(stage + " " + kit.join("") + " " + seed + " " + runOne(deck, standard, "balanced", seed, true, null, { stage, guns: kit }).hash);
  for (const id of ["novice", "steady", "sloppy", "fast"]) {
    const bot = rows.find((b) => b.id === id)!;
    for (const seed of [1, 2]) {
      const r = runOne(deck, bot, "balanced", seed, true, null, { stage });
      lines.push(stage + " " + id + ":" + r.guns.join("") + " " + seed + " " + r.hash);
    }
  }
  return lines;
}
