/**
 * Scenario probes (window.__survival, main.ts): the ship's pose on screen
 * (survival-feel-ship), the live foes and their size (survival-feel f8).
 */
import * as THREE from "three";
import { FOES } from "../content/foes";
import type { World } from "../sim/world";
import type { Stage } from "./scene";
import type { Ship, ShipPose } from "./ship";

const at = new THREE.Vector3();
const round = (v: number, k = 10): number => Math.round(v * k) / k;

/** The ship's pose (ship.ts), its root on screen through the still view and where it would stand undrifted (cx; CSS px). */
export function shipProbe(stage: Stage, ship: Ship): ShipPose & { sx: number; sy: number; cx: number } {
  const r = ship.root.position;
  const cx = round(stage.project(0, -r.z, r.y, at, true).x);
  const p = stage.project(r.x, -r.z, r.y, at, true);
  const pose = Object.fromEntries(Object.entries(ship.pose).map(([k, v]) => [k, round(v, 10000)])) as ShipPose;
  return { ...pose, sx: round(p.x), sy: round(p.y), cx };
}

/** Live foes the camera shows (sim z ≤ 30): screen centre, body radius (CSS px, the live view), depth, kind. */
export function foesOnScreen(stage: Stage, w: World): number[][] {
  const F = w.foes;
  const out: number[][] = [];
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] !== 1 || F.z[s]! > 30) continue;
    const r = FOES[F.kind[s]!]?.radius ?? 0.5;
    const { x, y } = stage.project(F.x[s]!, F.z[s]!, r, at);
    out.push([Math.round(x), Math.round(y), round(Math.abs(stage.project(F.x[s]! + r, F.z[s]!, r, at).x - x)), round(F.z[s]!), F.kind[s]!]);
  }
  return out;
}
