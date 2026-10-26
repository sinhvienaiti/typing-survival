/**
 * Every program the fight can draw, compiled once its models are in
 * (docs/FEEL_PASS_S1.md §6: no new program once a fight runs; before, a
 * gun's first shot, a first kill and Tia's first burn each compiled some
 * mid-fight). With bloom the scene draws into the composer's buffer, whose
 * programs output linear colour without tone mapping: ones compiled for the
 * screen would never be used. Overlays (the damage numbers) draw straight to
 * the screen. three's compile() takes hidden objects too.
 */
import type * as THREE from "three";
import type { Stage } from "./scene";

export function warmPrograms(stage: Stage, overlays: readonly { scene: THREE.Scene; camera: THREE.Camera }[]): void {
  const r = stage.renderer;
  const target = r.getRenderTarget();
  r.setRenderTarget(stage.composer?.readBuffer ?? null);
  r.compile(stage.scene, stage.camera);
  r.setRenderTarget(null);
  for (const overlay of overlays) r.compile(overlay.scene, overlay.camera);
  r.setRenderTarget(target);
}
