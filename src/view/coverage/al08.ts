/** AL-08 (the guns): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-08 edits this file. */
import { row, type CoverageRow } from "./types";

const OWNER = "AL-08";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "ev.shot", ["M083", "M084"], ["fx.muzzle.flash", "fx.shot.tracer"], ["gun.xung", "gun.xung.tail"], "y"),
  row(OWNER, "ev.hit", ["M068", "M090", "M091", "M102"], ["fx.hit.gun", "fx.hit.armour", "fx.number.damage"], ["hit.t1", "hit.t2", "hit.t4", "hit.armour", "hit.sub", "hit.tail"], "y"),
  row(OWNER, "ev.beamStart", ["M085"], ["fx.beam.start"], ["gun.tia.start", "gun.tia.loop"], "y"),
  row(OWNER, "ev.beamPulse", ["M085"], ["fx.beam.burn"], ["gun.tia.pulse"], "y"),
  row(OWNER, "ev.beamEnd", ["M085"], ["fx.beam.end"], ["gun.tia.end"], "y"),
  row(OWNER, "ev.volley", ["M086"], ["fx.gun.scatter"], ["gun.tan.fire"], "y"),
  row(OWNER, "ev.charge", ["M087"], ["fx.gun.railCharge"], ["gun.ray.charge", "gun.ray.armed"], "c"),
  row(OWNER, "ev.rail", ["M087"], ["fx.gun.railShot"], ["gun.ray.fire"], "c"),
  row(OWNER, "ev.launch", ["M088"], ["fx.gun.mortarLaunch", "fx.gun.mortarShell"], ["gun.phao.launch", "gun.phao.whistle"], "y"),
  row(OWNER, "ev.burst", ["M089"], ["fx.gun.mortarBurst", "fx.gun.mortarRing"], ["gun.phao.burst"], "y"),
];
