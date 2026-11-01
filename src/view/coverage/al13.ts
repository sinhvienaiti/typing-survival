/** AL-13 (the journey and results): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-13 edits this file. */
import { row, type CoverageRow } from "./types";

const OWNER = "AL-13";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "screen.end", ["M038", "M039", "M040", "M041", "M042", "M043"], ["fx.end.card", "fx.end.star", "fx.end.count"], ["star.1", "star.2", "star.3", "stat.tick", "stamp.newbest"], "k"),
  row(OWNER, "screen.journey-stages", ["M026", "M027"], ["fx.journey.map", "fx.stage.unlock"], ["ui.move", "stage.unlock"], "k"),
  row(OWNER, "screen.journey-briefing", ["M028", "M029"], ["fx.briefing.pan", "fx.briefing.newfoe"], ["newfoe.sting", "ui.move"], "k"),
  row(OWNER, "screen.journey-loadout", ["M030", "M031", "M032"], ["fx.loadout.equip", "fx.loadout.deny"], ["loadout.equip", "ui.deny"], "k"),
  row(OWNER, "ui.deny", ["M023", "M031"], ["fx.menu.deny"], ["ui.deny"], "k"),
  row(OWNER, "ui.star", ["M039"], ["fx.end.star"], ["star.1", "star.2", "star.3", "star.miss"], "y"),
  row(OWNER, "ui.count.up", ["M038"], ["fx.end.count"], ["stat.tick"], "k"),
  row(OWNER, "ui.newbest", ["M038"], ["fx.end.newbest"], ["stamp.newbest"], "k"),
  row(OWNER, "ui.stage.unlock", ["M027"], ["fx.stage.unlock"], ["stage.unlock"], "k"),
  row(OWNER, "ui.gun.equip", ["M030"], ["fx.loadout.equip"], ["loadout.equip"], "k"),
];
