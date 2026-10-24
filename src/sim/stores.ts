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

/** Foe `mark` bits: its shield broke (it walks faster), it is charging (Trâu, Đầu Đàn close in). */
export const MARK = { shieldGone: 1, charging: 2 } as const;

/**
 * Foes. state: 0 walking in, 1 holding (scouts), 2 walking on. elite: 1 for
 * the Bọc Thép affix; maxHp: its hit points at spawn; shield: its shield's
 * slot in Shields (−1 none).
 */
export class Foes extends Pool {
  readonly kind = new Uint8Array(this.cap);
  readonly state = new Uint8Array(this.cap);
  readonly elite = new Uint8Array(this.cap);
  readonly mark = new Uint8Array(this.cap);
  readonly maxHp = new Float64Array(this.cap);
  /** World seconds at spawn, and when it came within the guns' reach (the stage's drain start, DRAIN.from in the trial; −1 not yet): how long it lived under fire (BALANCE.md §7 B4). */
  readonly born = new Float64Array(this.cap);
  readonly reached = new Float64Array(this.cap);
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
  readonly shield = new Int32Array(this.cap);

  add(kind: number, x: number, z: number, hp: number, phase: number, elite = 0, born = 0): number {
    const s = this.take();
    if (s < 0) return -1;
    this.born[s] = born;
    this.reached[s] = -1;
    this.kind[s] = kind;
    this.state[s] = 0;
    this.elite[s] = elite;
    this.mark[s] = 0;
    this.maxHp[s] = hp;
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
    this.shield[s] = -1;
    return s;
  }
}

/** Bullet kinds: a Xung round, a Tán pellet. */
export const ROUND = { xung: 0, pellet: 1 } as const;

/**
 * Xung rounds and Tán pellets. flags: the hit's flags (crit, perfect, gun…).
 * target: the foe (or shot, as −2 − slot) a round was fired at (−1 none).
 * pierce: the armour a blow meets (× Vỏ); bay: the bay that fired it.
 */
export class Bullets extends Pool {
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly vx = new Float64Array(this.cap);
  readonly vz = new Float64Array(this.cap);
  readonly damage = new Float64Array(this.cap);
  readonly life = new Float64Array(this.cap);
  readonly pierce = new Float64Array(this.cap);
  readonly flags = new Uint16Array(this.cap);
  readonly kind = new Uint8Array(this.cap);
  readonly bay = new Uint8Array(this.cap);
  readonly target = new Int32Array(this.cap);
  readonly targetId = new Int32Array(this.cap);

  add(x: number, z: number, vx: number, vz: number, damage: number, life: number, flags: number, target: number, targetId: number, pierce = 1, kind = 0, bay = 0): number {
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
    this.pierce[s] = pierce;
    this.kind[s] = kind;
    this.bay[s] = bay;
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

/** Pháo Sao shells: where and when they land (the view draws their arc from the muzzle), their blow. */
export class Shells extends Pool {
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  /** Seconds left in the air, of `flight`. */
  readonly left = new Float64Array(this.cap);
  readonly flight = new Float64Array(this.cap);
  readonly damage = new Float64Array(this.cap);
  readonly pierce = new Float64Array(this.cap);
  readonly flags = new Uint16Array(this.cap);
  readonly bay = new Uint8Array(this.cap);

  add(x: number, z: number, flight: number, damage: number, pierce: number, flags: number, bay: number): number {
    const s = this.take();
    if (s < 0) return -1;
    this.x[s] = x;
    this.z[s] = z;
    this.left[s] = flight;
    this.flight[s] = flight;
    this.damage[s] = damage;
    this.pierce[s] = pierce;
    this.flags[s] = flags;
    this.bay[s] = bay;
    return s;
  }
}

/**
 * Khiên's energy shields: a wall SHIELD.width wide, its centre (x, z)
 * SHIELD.ahead in front of the bearer, facing (nx, nz) (toward the ship,
 * turning at a capped rate); hp left of maxHp.
 */
export class Shields extends Pool {
  readonly owner = new Int32Array(this.cap);
  readonly ownerId = new Int32Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly nx = new Float64Array(this.cap);
  readonly nz = new Float64Array(this.cap);
  readonly hp = new Float64Array(this.cap);
  readonly maxHp = new Float64Array(this.cap);

  add(owner: number, ownerId: number, x: number, z: number, hp: number): number {
    const s = this.take();
    if (s < 0) return -1;
    this.owner[s] = owner;
    this.ownerId[s] = ownerId;
    this.x[s] = x;
    this.z[s] = z;
    this.nx[s] = 0;
    this.nz[s] = -1;
    this.hp[s] = hp;
    this.maxHp[s] = hp;
    return s;
  }
}
