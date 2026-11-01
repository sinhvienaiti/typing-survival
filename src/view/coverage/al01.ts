/** AL-01 (one screen host, no page reload, transitions): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-01 edits this file. */
import { NO_SOUND, row, type CoverageRow } from "./types";

const OWNER = "AL-01";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "screen.loader", ["M001"], ["fx.loader.ring", "fx.screen.dissolve"], ["\u2014"], "k", "none"),
  row(OWNER, "ui.screen.enter", ["M002", "M003", "M004"], ["fx.screen.enter"], ["screen.whoosh", "launch.riser"], "k"),
  row(OWNER, "ui.screen.exit", ["M002", "M005"], ["fx.screen.exit"], ["screen.whoosh"], "k"),
];
