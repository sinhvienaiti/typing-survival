/**
 * The sim-unchanged check of a view-only pass (docs/FEEL_PASS_S1.md §7.1):
 * every pair of guns × chapter stages 1–4 × seeds 1–3 with the standard bot
 * in Cân bằng (director on), plus the bot matrix's own picks for 4 bots × 2
 * seeds; one "stage kit seed hash" line per run, 152 lines. Run it on HEAD
 * and on the commit before the pass (a temporary `git worktree`): `diff`
 * must print nothing.
 *   node --import tsx scripts/chapter-hashes.ts [--set=…] > after.txt
 */
import "./overrides";
import { gunSets } from "../src/content/threat";
import { botRows, runOne } from "./balance-lib";
import { sharedDeck } from "../tests/survival/typist-bot";

const deck = sharedDeck();
const rows = botRows();
const standard = rows.find((b) => b.id === "standard")!;
const lines: string[] = [];
for (const stage of ["c1-s1", "c1-s2", "c1-s3", "c1-s4"]) {
  for (const kit of gunSets(2)) for (const seed of [1, 2, 3]) lines.push(stage + " " + kit.join("") + " " + seed + " " + runOne(deck, standard, "balanced", seed, true, null, { stage, guns: kit }).hash);
  for (const id of ["novice", "steady", "sloppy", "fast"]) {
    const bot = rows.find((b) => b.id === id)!;
    for (const seed of [1, 2]) {
      const r = runOne(deck, bot, "balanced", seed, true, null, { stage });
      lines.push(stage + " " + id + ":" + r.guns.join("") + " " + seed + " " + r.hash);
    }
  }
}
console.log(lines.join("\n"));
