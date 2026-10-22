/**
 * One camera shake for every blow (SURVIVAL_MODE_PLAN.md 5.2): shake =
 * trauma², trauma falls 1.8 a second, at most 14 px at 1080p; plus a
 * directional kick (2–6 px against the shot) that springs back in ~120 ms.
 * Both scale with the player's screen-shake setting (0 turns them off) and
 * stop under reduced motion. Output is in CSS pixels for the 3D view only:
 * the HUD and the learning frame never move.
 */
const MAX_PX_AT_1080 = 14;
const DECAY = 1.8;
/** The kick's spring: back to rest in about 120 ms. */
const KICK_RATE = 38;

export class Trauma {
  trauma = 0;
  /** The player's setting, 0 … 1. */
  scale = 1;
  reduced = false;
  offsetX = 0;
  offsetY = 0;
  roll = 0;
  private kickX = 0;
  private kickY = 0;
  private time = 0;
  private readonly phase = [Math.random() * 100, Math.random() * 100, Math.random() * 100];

  get enabled(): boolean {
    return this.scale > 0 && !this.reduced;
  }

  add(amount: number): void {
    if (this.enabled) this.trauma = Math.min(1, this.trauma + amount);
  }

  /** A push of `px` (2–6) along the screen direction (dx, dy), e.g. against a muzzle. */
  kick(dx: number, dy: number, px: number): void {
    if (!this.enabled) return;
    const length = Math.hypot(dx, dy) || 1;
    const size = Math.max(0, Math.min(6, px));
    this.kickX = Math.max(-8, Math.min(8, this.kickX + (dx / length) * size));
    this.kickY = Math.max(-8, Math.min(8, this.kickY + (dy / length) * size));
  }

  /** Advances by `dt` s; `height` is the view's CSS height (the shake scales from 1080p). */
  update(dt: number, height: number): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - DECAY * dt);
    const keep = Math.exp(-KICK_RATE * dt);
    this.kickX *= keep;
    this.kickY *= keep;
    if (!this.enabled) {
      this.trauma = 0;
      this.kickX = this.kickY = this.offsetX = this.offsetY = this.roll = 0;
      return;
    }
    const shake = this.trauma * this.trauma * MAX_PX_AT_1080 * (height / 1080) * this.scale;
    const t = this.time;
    const [a, b, c] = this.phase as [number, number, number];
    // Smooth noise: three detuned sines per axis.
    const nx = (Math.sin(t * 37 + a) + Math.sin(t * 61 + b) * 0.6 + Math.sin(t * 97 + c) * 0.3) / 1.9;
    const ny = (Math.sin(t * 41 + c) + Math.sin(t * 67 + a) * 0.6 + Math.sin(t * 89 + b) * 0.3) / 1.9;
    this.offsetX = nx * shake + this.kickX * this.scale;
    this.offsetY = ny * shake + this.kickY * this.scale;
    this.roll = Math.sin(t * 29 + b) * this.trauma * this.trauma * 0.012 * this.scale;
  }
}
