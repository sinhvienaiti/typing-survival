/**
 * The sim-unchanged check of a view-only pass (docs/FEEL_PASS_S1.md §7.1):
 * every pair of guns × chapter stages 1–4 × seeds 1–3 with the standard bot
 * in Cân bằng (director on), plus the bot matrix's own picks for 4 bots × 2
 * seeds; one "stage kit seed hash" line per run, 152 lines. Run it on HEAD
 * and on the commit before the pass (a temporary `git worktree`): `diff`
 * must print nothing.
 *   node --import tsx scripts/chapter-hashes.ts [--set=…] > after.txt
 * tests/chapter-hashes.test.ts pins the 152 lines without --set
 * (tests/golden/chapter-hashes.txt); a ticket that changes them on purpose
 * rewrites that file with this script and says so.
 */
import "./overrides";
import { CHAPTER_HASH_STAGES, chapterHashLines } from "./chapter-hash-lines";

console.log(CHAPTER_HASH_STAGES.flatMap(chapterHashLines).join("\n"));
