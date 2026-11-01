/**
 * The damage numbers (moved from combat.ts by ALIVE_PLAN AL-00, behaviour
 * unchanged; AL-07 owns their pop and life in wave 3): the kit's number
 * field, sized by the blow's tier (gun-rules FEEL), placed on screen from the
 * sim's (x, z), kept off the HUD's protected rectangles, drawn as sprites
 * over the scene.
 */
import * as THREE from "three";
import { NumberField, NumberSprites, tier, type Rect } from "../kit/feedback";
import { FEEL, KILL_NUMBER, numberFont } from "./gun-rules";
import type { Stage } from "./scene";

export class DamageNumbers {
  readonly field = new NumberField(FEEL);
  readonly sprites = new NumberSprites(FEEL);
  private readonly screen = new THREE.Vector3();

  constructor(private readonly stage: Stage, limit: number) {
    this.field.limit = limit;
  }

  /** The view's height (the font) and the rectangles no number may cover. */
  resize(height: number, rects: readonly Rect[]): void {
    this.field.protected = rects;
    this.field.fontPx = numberFont(height);
  }

  /** Projects sim (x, z) and spawns a number; `dx, dz` the blow; a killing blow's is larger. */
  spawn(key: number, x: number, z: number, value: number, style: number, tierId: number, dx: number, dz: number, now: number, kill: boolean): void {
    const profile = tier(tierId, FEEL.tiers).number;
    if (profile === null) return;
    this.stage.project(x, z, 1.6, this.screen);
    this.field.spawn(key, this.screen.x, this.screen.y, value, style, tierId, profile.size * (kill ? KILL_NUMBER : 1), profile.life, dx, -dz, now);
  }

  /** One frame: the numbers rise and fade, and their sprites are written. */
  draw(dt: number): void {
    this.field.update(dt);
    this.sprites.write(this.field, this.stage.width, this.stage.height);
  }
}
