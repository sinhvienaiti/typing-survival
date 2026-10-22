/**
 * Runs a world in real time: fixed 1/60 s steps, at most 8 a frame (as
 * Typing Defense's session). Input becomes commands stamped with the tick
 * they act on; every command goes into the log a replay feeds back through
 * the same step. A hit stop is a logged `stop` command too: the world slows,
 * the steps (and the typing in them) never do.
 */
import { MAX_STEPS_PER_FRAME, TICK_HZ } from "../content/rules";
import { createWorld, step, type Command, type CommandBody, type World, type WorldOptions } from "../sim/world";

const STEP_MS = 1000 / TICK_HZ;
/** A frame later than this (a background tab) does not try to catch up. */
const MAX_FRAME_MS = 250;

export class Session {
  readonly world: World;
  readonly log: Command[] = [];
  paused = false;
  private readonly pending: CommandBody[] = [];
  private carry = 0;
  private last = -1;

  constructor(options: WorldOptions) {
    this.world = createWorld(options);
  }

  send(body: CommandBody): void {
    this.pending.push(body);
  }

  /** A hit stop of `ms`: whole ticks at the slowed world speed (at least one). */
  stop(ms: number): void {
    if (ms > 0) this.send({ t: "stop", ticks: Math.max(1, Math.round(ms / STEP_MS)) });
  }

  /** Steps for the time since the last frame; returns how many steps ran. */
  frame(now: number): number {
    const elapsed = this.last < 0 ? 0 : Math.min(MAX_FRAME_MS, Math.max(0, now - this.last));
    this.last = now;
    if (this.paused) return 0;
    this.carry += elapsed;
    let steps = Math.floor(this.carry / STEP_MS);
    if (steps > MAX_STEPS_PER_FRAME) {
      steps = MAX_STEPS_PER_FRAME;
      this.carry = 0;
    } else this.carry -= steps * STEP_MS;
    for (let index = 0; index < steps; index += 1) this.tick();
    return steps;
  }

  /** Seconds of world time since the last step: what the view extrapolates moving things by. */
  lead(): number {
    return (Math.min(this.carry, STEP_MS) / 1000) * this.world.scale;
  }

  /** One step now, with every queued command stamped with this tick. */
  tick(): void {
    const tick = this.world.tick;
    const commands = this.pending.splice(0);
    for (const command of commands) this.log.push({ ...command, tick } as Command);
    step(this.world, commands);
  }
}
