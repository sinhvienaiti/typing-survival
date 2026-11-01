/**
 * Every program the fight can draw, compiled once its models are in
 * (docs/FEEL_PASS_S1.md §6: no new program once a fight runs; before, a
 * gun's first shot, a first kill and Tia's first burn each compiled some
 * mid-fight). With bloom the scene draws into the composer's buffer, whose
 * programs output linear colour without tone mapping: ones compiled for the
 * screen would never be used. Overlays (the damage numbers) draw straight to
 * the screen. three's compile() takes hidden objects too.
 *
 * A registry (ALIVE_PLAN AL-00): a package with programs of its own (a new
 * pool, a pass drawn outside the fight's scene) registers a warmer from its
 * own module instead of editing this file. A warmer runs first: it may add
 * hidden objects to the stage's scene (compiled with it) and returns the
 * overlay scenes it draws to the screen.
 */
import type * as THREE from "three";
import type { Stage } from "./scene";

export type Overlay = { scene: THREE.Scene; camera: THREE.Camera };
export type Warmer = (stage: Stage) => readonly Overlay[] | void;

const warmers = new Map<string, Warmer>();

/** Adds `warmer` under `id` (its package and part, e.g. "al08.flipbooks"); one per id. */
export function registerWarm(id: string, warmer: Warmer): void {
  if (warmers.has(id)) throw new Error("warm: " + id + " is registered twice");
  warmers.set(id, warmer);
}

/** The registered warmers' ids (the scenarios' probe). */
export function warmIds(): string[] {
  return [...warmers.keys()];
}

export function warmPrograms(stage: Stage, overlays: readonly Overlay[]): void {
  const extra: Overlay[] = [];
  for (const warmer of warmers.values()) extra.push(...(warmer(stage) ?? []));
  const r = stage.renderer;
  const target = r.getRenderTarget();
  r.setRenderTarget(stage.composer?.readBuffer ?? null);
  r.compile(stage.scene, stage.camera);
  r.setRenderTarget(null);
  for (const overlay of overlays) r.compile(overlay.scene, overlay.camera);
  for (const overlay of extra) r.compile(overlay.scene, overlay.camera);
  r.setRenderTarget(target);
}
