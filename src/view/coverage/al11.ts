/** AL-11 (the director: stage card, world events, camera, time, the run's end): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-11 edits this file. */
import { row, type CoverageRow } from "./types";

const OWNER = "AL-11";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "ev.end", ["M036", "M037", "M071"], ["fx.end.win", "fx.end.lose"], ["end.win", "end.lose"], "k"),
  row(OWNER, "ev.pace", ["M132", "M138"], ["fx.world.surge"], ["alarm.surge", "surge.horn", "surge.riser", "surge.end", "music.surge"], "k"),
  row(OWNER, "ev.telegraph", ["M132", "M069", "M074", "M131", "M100"], ["fx.telegraph.surge", "fx.telegraph.rift", "fx.telegraph.horn"], ["alarm.surge", "rift.warn", "rift.tick", "leader.horn"], "y"),
  row(OWNER, "ev.rift", ["M074", "M131"], ["fx.rift.open"], ["rift.open", "rift.tear"], "y"),
  row(OWNER, "ev.retreat", ["M071"], ["fx.horde.retreat", "fx.banner.retreat"], ["allclear.chime"], "k"),
  row(OWNER, "screen.intro", ["M033", "M034"], ["fx.intro.card", "fx.intro.enter"], ["deploy.sting", "screen.whoosh"], "k"),
  row(OWNER, "screen.trial", ["M035"], ["fx.trial.enter"], ["screen.whoosh", "deploy.sting"], "k", "code"),
];
