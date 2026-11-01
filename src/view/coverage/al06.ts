/** AL-06 (the gun cards (bays)): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-06 edits this file. */
import { NO_SOUND, row, type CoverageRow } from "./types";

const OWNER = "AL-06";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "ev.load", ["M048", "M055", "M059"], ["fx.bay.load", "fx.bay.cell"], ["bay.latch"], "k"),
  row(OWNER, "typing.lock", ["M053"], ["fx.bay.lock"], ["bay.lock"], "k"),
  row(OWNER, "typing.switch", ["M055"], ["fx.bay.switch"], ["\u2014"], "k"),
  row(OWNER, "ui.bay.lock", ["M053"], ["fx.bay.lock"], ["bay.lock"], "k"),
  row(OWNER, "ui.bay.full", ["M060"], ["fx.bay.full"], ["word.full"], "y"),
];
