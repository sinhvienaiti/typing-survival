/** AL-16 (stages 2–4, Splitter and the boss): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-16 edits this file. */
import { row, type CoverageRow } from "./types";

const OWNER = "AL-16";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "ev.split", ["M104"], ["fx.foe.split"], ["foe.split"], "y"),
];
