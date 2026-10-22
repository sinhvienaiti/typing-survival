/**
 * What the sim tells its readers: one dense ring of typed columns. Readers
 * (view, sound, HUD, tests) keep their own count of `written` and read the
 * slots in between; nothing here is state, so the hash leaves it out.
 */
export const EV = {
  shot: 1, hit: 2, kill: 3, breach: 4, foeShot: 5, shotDown: 6, playerHit: 7,
  keyOk: 8, keyBad: 9, word: 10, load: 11, beamStart: 12, beamPulse: 13, beamEnd: 14, spawn: 15, end: 16,
} as const;

/** flags bits: crit, perfect magazine, Tia, killing blow, scout, clean, fast. */
export const FLAG = { crit: 1, perfect: 2, tia: 4, kill: 8, scout: 16, clean: 32, fast: 64 } as const;

const SIZE = 16384;

export class Ring {
  readonly size = SIZE;
  written = 0;
  readonly kind = new Uint8Array(SIZE);
  readonly flags = new Uint8Array(SIZE);
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
