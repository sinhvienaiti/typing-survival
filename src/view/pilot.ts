/**
 * The firing character as the fight's effects see it (docs/ALIVE_PLAN.md
 * AL-00 step 5, §4.3; parent docs/games/QUALITY_RESCUE_2026-11-01.md §4.7).
 * Combat, the typing feel, the focus strip, the shots and the beams talk to a
 * PilotRig, never to the ship: today ship.ts implements it (Vanguard or
 * Draconis); AL-15 swaps in the heroine and her drone behind the same calls.
 * `bay` is the bay a call is for (the heroine and the drone fire from
 * different muzzles); the ship has one set of muzzles and ignores it.
 */
import * as THREE from "three";
import type { Glows, Strips } from "./fx";
import type { KickName } from "./ship-rules";

/** The ship the player picked (Options, ?pilot=): a choice of look, not the rig. */
export type Pilot = "vanguard" | "draconis";
/** Muzzle sockets: the centre gun, Xung's left and right, the core (Pháo Sao fires upward from it). */
export const MUZZLE = { centre: 0, left: 1, right: 2, core: 3 } as const;
/** Each pilot's shot and beam colours (the shots, the beams, the combat flashes). */
export const PILOT_COLORS: Record<Pilot, { shot: THREE.Color; beam: THREE.Color }> = {
  vanguard: { shot: new THREE.Color("#3db8ff"), beam: new THREE.Color("#ff8c32") },
  draconis: { shot: new THREE.Color("#ff8a3a"), beam: new THREE.Color("#ff5a1f") },
};
/** The poses a later package asks for (AL-11 at a run's end). */
export type PilotPose = "idle" | "win" | "lose";

export interface PilotRig {
  /** Muzzle `which` (MUZZLE) in world space, as of this frame's update. */
  muzzle(out: THREE.Vector3, which?: number, bay?: number): THREE.Vector3;
  /** The core (FX_CORE) in world space: where typed letters land. */
  core(out: THREE.Vector3, bay?: number): THREE.Vector3;
  /** A gun's kick or a load's lunge; `side` the Xung muzzle that fired (MUZZLE.left / right). */
  kick(name: KickName, side?: number, bay?: number): void;
  /** A blow to turn to: its priority (ship-rules AIM_PRIO) and the sim point it goes for. */
  cue(prio: number, x: number, z: number): void;
  /** Struck (a breach, a scout's round). */
  hurt(): void;
  /** The glow's gain (1; the clean streak's tier 3 burns it × 1.3). */
  boost(level: number): void;
  /** Its own glows and streaks into the fight's pools (between strips.begin() and end()). */
  drawFx(glows: Glows, strips: Strips): void;
  /** A foe's blow taken on the rig's guard, from sim direction (dx, dz) (AL-09: breach, a scout's round, the drain). */
  shield(dx: number, dz: number): void;
  /** A held pose (AL-11: a run's end). */
  pose(name: PilotPose): void;
}
