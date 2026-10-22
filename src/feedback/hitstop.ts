/**
 * Hit stop (SURVIVAL_MODE_PLAN.md 5.3): which blows earn a short slow-down of
 * the world and for how long. Only the world slows (the mode applies the
 * granted ms to its world clock); the HUD, the gun slots, the learning frame
 * and the keyboard never stop. Two stops are at least 150 ms apart, a tier's
 * own stops further (tiers.ts), and a sweep of 30 kills in 0.5 s earns one
 * 25 ms stop, then rests. Times are ms on any clock the caller keeps.
 */
import { STOP_GAP_MS, SWEEP, tier } from "./tiers";

const KILL_RING = 64;

export class HitStop {
  private last = -Infinity;
  private readonly lastByTier = new Float64Array(6).fill(-Infinity);
  private readonly kills = new Float64Array(KILL_RING).fill(-Infinity);
  private killCursor = 0;
  private sweepReady = 0;
  /** Off: no stop is ever granted (a test switch, or a mode that does not want them). */
  enabled = true;

  /** A blow of tier `id` at `now`: the ms of stop granted (0: none). */
  request(id: number, now: number): number {
    const profile = tier(id);
    if (!this.enabled || profile.stopMs <= 0) return 0;
    if (now - this.last < STOP_GAP_MS || now - this.lastByTier[id]! < profile.stopGapMs) return 0;
    this.last = now;
    this.lastByTier[id] = now;
    return profile.stopMs;
  }

  /** Counts `count` kills at `now`: the ms of a sweep's stop when this makes 30 inside 0.5 s (0: none). */
  kill(count: number, now: number): number {
    for (let index = 0; index < count; index += 1) {
      this.kills[this.killCursor % KILL_RING] = now;
      this.killCursor += 1;
    }
    if (!this.enabled || now < this.sweepReady || this.killCursor < SWEEP.kills) return 0;
    const oldest = this.kills[(this.killCursor - SWEEP.kills) % KILL_RING]!;
    if (now - oldest > SWEEP.windowMs || now - this.last < STOP_GAP_MS) return 0;
    this.sweepReady = now + SWEEP.cooldownMs;
    this.last = now;
    return SWEEP.stopMs;
  }

  /** Kills inside the window before `now`. */
  recentKills(now: number, windowMs: number): number {
    let count = 0;
    for (let index = 0; index < KILL_RING; index += 1) if (now - this.kills[index]! <= windowMs) count += 1;
    return count;
  }
}
