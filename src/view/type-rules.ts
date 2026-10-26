/**
 * The typing feel's numbers (docs/FEEL_PASS_S1.md §3), pure so the tests
 * read them: the A-minor pentatonic a word climbs letter by letter (the
 * music is in A minor, 96 BPM), the clean-word streak and its tiers, and the
 * curves of a typed letter's pop. View only: nothing here reaches the sim.
 */

/** Letter n (1-based) of a word sounds NOTE_HZ[n − 1]; a finished word lands on WORD_HZ (A5). */
export const NOTE_HZ = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.26, 783.99] as const;
export const WORD_HZ = 880;

/** The note of the `typed`-th letter (1-based; past the table it stays on the top note). */
export function noteHz(typed: number): number {
  return NOTE_HZ[Math.max(0, Math.min(NOTE_HZ.length, typed) - 1)]!;
}

/** The streak shows from 3 clean words; tiers start at 3, 6, 10, 20; streak.up plays at those. */
export const STREAK = { show: 3, tiers: [3, 6, 10, 20] } as const;

/** 0 below the first tier, else 1 … 4. */
export function streakTier(n: number): number {
  let tier = 0;
  for (const from of STREAK.tiers) if (n >= from) tier += 1;
  return tier;
}

/**
 * Clean words in a row (display only: the clean magazine's real reward is
 * its crit and Vỏ pierce, docs/BUILD_S1.md §5.1). The first wrong key in a
 * locked word breaks it; a stray key (no bay starts with it) does not.
 */
export class CleanStreak {
  n = 0;

  /** A word finished; returns true when it reached a tier (3, 6, 10, 20). */
  word(clean: boolean): boolean {
    if (!clean) {
      this.n = 0;
      return false;
    }
    this.n += 1;
    return (STREAK.tiers as readonly number[]).includes(this.n);
  }

  /** A wrong key; `locked`: inside a locked word. Returns the streak it broke (0: none). */
  bad(locked: boolean): number {
    if (!locked) return 0;
    const broke = this.n;
    this.n = 0;
    return broke;
  }

  get tier(): number {
    return streakTier(this.n);
  }
}

/**
 * A typed letter's pop (§3.1), `t` ms after its key: 1.25× and 6 px low at
 * f0, 1.12× and 3 px at f1, 1.03× by f3, still at 1× from 100 ms; white-hot
 * to the gun's colour by 120 ms; its glow gone at 160 ms; a sweep line under
 * it in 50 ms.
 */
export const POP = { scale: 0.25, drop: 6, tau: 24, settle: 100, colour: 120, glow: 160, sweep: 50 } as const;

export function popScale(t: number): number {
  return t >= POP.settle || t < 0 ? 1 : 1 + POP.scale * Math.exp(-t / POP.tau);
}

/** px below the letter's place (× --ui). */
export function popDrop(t: number): number {
  return t >= POP.settle || t < 0 ? 0 : POP.drop * Math.exp(-t / POP.tau);
}

/** 0 white-hot … 1 the gun's colour. */
export function popColour(t: number): number {
  return Math.max(0, Math.min(1, t / POP.colour));
}

/** The letter's glow, 1 … 0. */
export function popGlow(t: number): number {
  return Math.max(0, 1 - t / POP.glow);
}

/** A finished word swells 1 → 1.06 → 1 over 160 ms. */
export function swell(t: number): number {
  return t < 0 || t >= 160 ? 1 : 1 + 0.06 * Math.sin((Math.PI * t) / 160);
}

/** A first letter's bounce (a stray key, 200 ms): 1.15× at once, back to 1×. */
export function bounce(t: number): number {
  return t < 0 || t >= 200 ? 1 : 1 + 0.15 * (1 - t / 200) * (1 - t / 200);
}

/** The bay's magazine LEDs blink urgent twice on a full bay (120 ms lit, 120 ms dark). */
export function fullBlink(t: number): boolean {
  return t >= 0 && t < 360 && Math.floor(t / 120) % 2 === 0;
}
