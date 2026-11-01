/** AL-09 (the foes and their blows): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-09 edits this file. */
import { row, type CoverageRow } from "./types";

const OWNER = "AL-09";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "ev.kill", ["M067", "M082", "M098", "M099", "M101", "M102"], ["fx.kill.burst", "fx.kill.chunks", "fx.kill.big"], ["kill.swarm", "kill.elite", "kill.chime", "kill.big"], "y"),
  row(OWNER, "ev.breach", ["M062", "M095", "M119"], ["fx.breach.strike", "fx.pilot.guard", "fx.hull.flash"], ["hurt.breach", "line.zap"], "y"),
  row(OWNER, "ev.foeShot", ["M096"], ["fx.foe.shot"], ["foe.shot"], "y"),
  row(OWNER, "ev.shotDown", ["M097", "M111"], ["fx.foe.shotDown"], ["foe.shot.down"], "y"),
  row(OWNER, "ev.playerHit", ["M062", "M110"], ["fx.pilot.guard", "fx.hull.flash"], ["hurt.hull"], "y"),
  row(OWNER, "ev.spawn", ["M092"], ["fx.foe.spawn"], ["foe.spawn"], "y"),
  row(OWNER, "ev.drain", ["M063", "M106"], ["fx.drain.leach", "fx.floor.red"], ["hurt.drain"], "y"),
  row(OWNER, "ev.shieldHit", ["M103", "M134"], ["fx.shield.ripple"], ["shield.hit"], "y"),
  row(OWNER, "ev.shieldBreak", ["M103", "M134"], ["fx.shield.break"], ["shield.break"], "y"),
  row(OWNER, "ev.leader", ["M100"], ["fx.leader.beacon"], ["leader.horn", "leader.beacon"], "y"),
];
