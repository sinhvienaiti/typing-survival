/**
 * What the sim tells its readers: one dense ring of typed columns. Readers
 * (view, sound, HUD, tests) keep their own count of `written` and read the
 * slots in between; nothing here is state, so the hash leaves it out.
 */
export const EV = {
  shot: 1, hit: 2, kill: 3, breach: 4, foeShot: 5, shotDown: 6, playerHit: 7,
  keyOk: 8, keyBad: 9, word: 10, load: 11, beamStart: 12, beamPulse: 13, beamEnd: 14, spawn: 15, end: 16,
  /** A point of armour leached by the near zone (slot, ref: the foe nearest the line). */
  drain: 17,
  /** The director's repair pod (value: armour restored). */
  support: 18,
  /** A pace director step (slot: lever index, ref: its id, x: dir, z: tension ‰, dx: level, dz: spawn scale ‰, value: what applied). */
  pace: 19,
  // S1 (docs/BUILD_S1.md): kinds 1–19 are S0's (their trace is golden); these are new.
  /** Tán fires a volley (slot: bay; x, z: the muzzle; dx, dz: the fan's axis; value: pellets). */
  volley: 20,
  /** Ray starts charging a shot (slot: bay; x, z: where it aims; value: charge seconds). */
  charge: 21,
  /** Ray fires (slot: bay; x, z: the line's far end; dx, dz: its direction; value: foes and shields pierced). */
  rail: 22,
  /** Pháo Sao launches a shell (slot: bay; ref: shell id; x, z: where it lands; value: flight seconds). */
  launch: 23,
  /** A shell bursts (slot: bay; ref: foes struck; x, z; value: radius). */
  burst: 24,
  /** A shield takes a blow or stops one (slot: its bearer; ref: bearer id; x, z: where; dx, dz: the blow; value: shield left 0 … 1). */
  shieldHit: 25,
  /** A shield breaks (slot, ref: its bearer; x, z: its centre; dx, dz: the blow). */
  shieldBreak: 26,
  /** A Tách breaks (slot, ref: the Tách; x, z; value: shards). */
  split: 27,
  /** A telegraph starts (slot: TELEGRAPH kind; x, z: where; value: seconds until it strikes). */
  telegraph: 28,
  /** A Đầu Đàn walks in at the gate (slot, ref: it; x, z). */
  leader: 29,
  /** The objective moved (slot: OBJECTIVE kind; ref: done; value: needed; x: leaders through). */
  objective: 30,
  /** A rift opens on the wall (slot: side −1 / 1 as 0 / 1; x, z: its centre; value: foes it pours out). */
  rift: 31,
  /** The planner moved a telegraph so two never meet (slot: TELEGRAPH kind; value: seconds moved). */
  plan: 32,
  /** The horde pulls back: the objective is done (value: seconds of fading). */
  retreat: 33,
} as const;

/** EV.telegraph and EV.plan kinds. */
export const TELEGRAPH = { surge: 0, rift: 1, horn: 2 } as const;
/** EV.objective kinds. */
export const OBJECTIVE = { hold: 0, hunt: 1 } as const;

/**
 * flags bits: crit, perfect magazine, Tia, killing blow, scout, clean, fast,
 * Bọc Thép (an armoured foe); S1: the blow's gun (Tán, Ray, Pháo Sao), Vỏ
 * took some of it, a clean magazine pierced Vỏ, a knock-back, a big foe.
 */
export const FLAG = {
  crit: 1, perfect: 2, tia: 4, kill: 8, scout: 16, clean: 32, fast: 64, elite: 128,
  tan: 256, ray: 512, phao: 1024, armour: 2048, pierce: 4096, knock: 8192, big: 16384,
} as const;

const SIZE = 16384;

export class Ring {
  readonly size = SIZE;
  written = 0;
  readonly kind = new Uint8Array(SIZE);
  readonly flags = new Uint16Array(SIZE);
  /** A slot (foe, gun) and a reference (foe id, deck index, count). */
  readonly slot = new Int32Array(SIZE);
  readonly ref = new Int32Array(SIZE);
  readonly tick = new Int32Array(SIZE);
  readonly x = new Float32Array(SIZE);
  readonly z = new Float32Array(SIZE);
  readonly dx = new Float32Array(SIZE);
  readonly dz = new Float32Array(SIZE);
  readonly value = new Float32Array(SIZE);

  push(tick: number, kind: number, slot: number, ref: number, x: number, z: number, dx: number, dz: number, value: number, flags: number): void {
    const i = this.written % SIZE;
    this.kind[i] = kind;
    this.tick[i] = tick;
    this.slot[i] = slot;
    this.ref[i] = ref;
    this.x[i] = x;
    this.z[i] = z;
    this.dx[i] = dx;
    this.dz[i] = dz;
    this.value[i] = value;
    this.flags[i] = flags;
    this.written += 1;
  }
}
