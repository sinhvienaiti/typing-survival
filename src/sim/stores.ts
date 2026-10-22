/**
 * The sim's pools: structure-of-arrays stores with a free-slot stack, so a
 * match allocates nothing after it starts. Slots are reused in a fixed order
 * (deterministic); `top` bounds the slots ever used, `id` tells a reused slot
 * from its last owner.
 */
class Pool {
  top = 0;
  count = 0;
  nextId = 1;
  readonly alive: Uint8Array;
  readonly id: Int32Array;
  readonly free: Int32Array;
  freeTop = 0;

  constructor(readonly cap: number) {
    this.alive = new Uint8Array(cap);
    this.id = new Int32Array(cap);
    this.free = new Int32Array(cap);
  }

  /** A slot for a new member, or −1 when full. */
  protected take(): number {
    const slot = this.freeTop > 0 ? this.free[--this.freeTop]! : this.top < this.cap ? this.top++ : -1;
    if (slot < 0) return -1;
    this.alive[slot] = 1;
    this.id[slot] = this.nextId++;
    this.count += 1;
    return slot;
  }

  remove(slot: number): void {
    if (this.alive[slot] === 0) return;
    this.alive[slot] = 0;
    this.free[this.freeTop++] = slot;
    this.count -= 1;
  }
}

/** Foes. state: 0 walking in, 1 holding (scouts), 2 walking on. */
export class Foes extends Pool {
  readonly kind = new Uint8Array(this.cap);
  readonly state = new Uint8Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly vx = new Float64Array(this.cap);
  readonly vz = new Float64Array(this.cap);
  readonly hp = new Float64Array(this.cap);
  /** Damage already flying at it (Xung skips a foe that is as good as dead). */
  readonly incoming = new Float64Array(this.cap);
  readonly phase = new Float64Array(this.cap);
  /** Scouts: where they hold, seconds to the next shot, seconds of holding left. */
  readonly holdZ = new Float64Array(this.cap);
  readonly timer = new Float64Array(this.cap);
  readonly wait = new Float64Array(this.cap);

  add(kind: number, x: number, z: number, hp: number, phase: number): number {
    const s = this.take();
    if (s < 0) return -1;
    this.kind[s] = kind;
    this.state[s] = 0;
    this.x[s] = x;
    this.z[s] = z;
    this.vx[s] = 0;
    this.vz[s] = 0;
    this.hp[s] = hp;
    this.incoming[s] = 0;
    this.phase[s] = phase;
    this.holdZ[s] = 0;
    this.timer[s] = 0;
    this.wait[s] = 0;
    return s;
  }
}

/** Xung rounds. flags: 1 crit, 2 perfect magazine. target: the foe (or shot, as −2 − slot) it was fired at. */
export class Bullets extends Pool {
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly vx = new Float64Array(this.cap);
  readonly vz = new Float64Array(this.cap);
  readonly damage = new Float64Array(this.cap);
  readonly life = new Float64Array(this.cap);
  readonly flags = new Uint8Array(this.cap);
  readonly target = new Int32Array(this.cap);
  readonly targetId = new Int32Array(this.cap);

  add(x: number, z: number, vx: number, vz: number, damage: number, life: number, flags: number, target: number, targetId: number): number {
    const s = this.take();
    if (s < 0) return -1;
    this.x[s] = x;
    this.z[s] = z;
    this.vx[s] = vx;
    this.vz[s] = vz;
    this.damage[s] = damage;
    this.life[s] = life;
    this.flags[s] = flags;
    this.target[s] = target;
    this.targetId[s] = targetId;
    return s;
  }
}

/** Scout shots flying at the ship (Xung and Tia can shoot them down). */
export class Shots extends Pool {
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly vx = new Float64Array(this.cap);
  readonly vz = new Float64Array(this.cap);
  readonly life = new Float64Array(this.cap);
  /** 1 while a Xung round is on its way to it. */
  readonly marked = new Uint8Array(this.cap);

  add(x: number, z: number, vx: number, vz: number, life: number): number {
    const s = this.take();
    if (s < 0) return -1;
    this.x[s] = x;
    this.z[s] = z;
    this.vx[s] = vx;
    this.vz[s] = vz;
    this.life[s] = life;
    this.marked[s] = 0;
    return s;
  }
}
