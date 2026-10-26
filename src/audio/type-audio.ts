/**
 * The typing sounds (docs/FEEL_PASS_S1.md §3.5, docs/audio/THEME_SOUND_LIST.md
 * §3), shaped as the action (Q6): a key is the word's wind-up (a steel
 * relay and a charge note climbing the A-minor pentatonic, letter by letter),
 * a loaded word its release (the latch, a stream of energy gliding up to A5,
 * the magazine slammed home, a short tail down the steel corridor). The
 * 1–4 kHz band (the spoken word's) is used only at a sound's attacks (gone
 * within 30 ms); bodies and tails sit under 1 kHz or above 4 kHz, so the
 * word read after it stays clear and a key heard 20 times a word never
 * tires. ThemeAudio opens each voice (bus, pan, the id's count).
 */
import { crackle, noise, steel, STEEL, tone, type Voice } from "./synth";
import { noteHz, WORD_HZ } from "../view/type-rules";

/** The new typing ids (in THEME_SOUND_LIST.md order). */
export const TYPE_SOUND_IDS = ["word.full", "streak.up"] as const;

const RELAY = 0.17;
/** dB → gain. */
const db = (value: number): number => 10 ** (value / 20);
const KEY_PITCH = [1, 1.06, 0.94, 1.12, 0.89] as const;

/** A right key: the relay (as before), then the `typed`-th letter's note under it and the steel desk answering an octave down. */
export function keyOk(v: Voice, typed: number, letter: number, octave: boolean): void {
  const p = KEY_PITCH[letter % KEY_PITCH.length]! * (1 + (Math.random() - 0.5) * 0.06);
  noise(v, 0, 0.012, RELAY, "bandpass", 2700 * p, 2.6);
  tone(v, 0.001, 0.018, 0.025, 3300 * p, 3200 * p, { type: "triangle" });
  const hz = noteHz(typed);
  const note = RELAY * db(-14);
  tone(v, 0, 0.064, note, hz, hz, { type: "triangle", attack: 0.004, filter: "lowpass", cutoff: 1000 });
  if (octave) tone(v, 0, 0.06, note * db(-12), hz * 2, hz * 2, { attack: 0.004 });
  tone(v, 0.004, 0.09, RELAY * db(-20), hz / 2, hz / 2, { attack: 0.006 });
}

/** A wrong key: the relay closes without catching (muffled), a short fizz, the last note sagging a semitone; a stray key is 3 dB softer and has no note. */
export function keyBad(v: Voice, typed: number, stray: boolean): void {
  const level = stray ? db(-3) : 1;
  noise(v, 0, 0.014, RELAY * db(-6) * level, "lowpass", 1200, 0.9);
  tone(v, 0.001, 0.018, 0.025 * db(-6) * level, 3300, 3200, { type: "triangle", filter: "lowpass", cutoff: 1200 });
  // The fizz: three short grains above 5 kHz, all gone by 25 ms.
  for (const at of [0.002, 0.008, 0.014]) noise(v, at, 0.008, RELAY * db(-18) * level, "highpass", 5200, 0.9);
  if (!stray && typed > 0) {
    const hz = noteHz(typed);
    tone(v, 0, 0.03, RELAY * db(-14), hz, hz / 1.0595, { type: "triangle", attack: 0.003, filter: "lowpass", cutoff: 1000 });
  }
}

/**
 * A word loads its gun: the latch, a filtered saw gliding from the last
 * key's note up to A5 (the word's resolution), then the magazine slammed
 * home (170 → 52 Hz) with a low plate ringing, and a tail down the steel
 * corridor (under 1 kHz). `perfect`: a charge whine crosses 1–4 kHz in its
 * first 25 ms and rings on above 4 kHz, with electric ticks.
 */
export function wordLoad(v: Voice, length: number, perfect: boolean): void {
  noise(v, 0, 0.02, 0.22, "highpass", 3200);
  tone(v, 0.004, 0.09, 0.05, noteHz(length), WORD_HZ, { type: "sawtooth", attack: 0.01, filter: "lowpass", cutoff: 900, q: 1.2 });
  const slam = 0.09;
  noise(v, slam, 0.06, 0.3, "lowpass", 900);
  tone(v, slam, 0.14, 0.38, 170, 52);
  steel(v, slam + 0.004, 0.09, 0.06, 310, STEEL.plate);
  noise(v, slam + 0.02, 0.35, 0.38 * db(-10), "lowpass", 800, 0.7, 300, 0.02);
  steel(v, slam + 0.01, 0.35, 0.38 * db(-16), 233, STEEL.beam);
  if (perfect) {
    tone(v, 0, 0.025, 0.05, 1000, 4600, { attack: 0.002 });
    tone(v, 0.022, 0.2, 0.04, 4600, 6400, { attack: 0.004 });
    crackle(v, 0.06, 0.14, 4, 0.05, 6500);
  }
}

/** A word into a full bay: the latch strikes and does not lock, a spring rattles; no tail (6 dB under word.load). */
export function wordFull(v: Voice): void {
  const level = db(-6);
  noise(v, 0, 0.015, 0.22 * level, "bandpass", 2200, 2.2);
  tone(v, 0, 0.015, 0.06 * level, 2200, 2150, { type: "triangle" });
  tone(v, 0.012, 0.08, 0.14 * level, 900, 600, { type: "triangle", filter: "lowpass", cutoff: 1000 });
  tone(v, 0.016, 0.07, 0.08 * level, 760, 640, { attack: 0.003 });
}

/** The clean streak reaches a tier: two small steel bars, A5 then E6, whose bodies die in 30 ms and ring on above 4 kHz (12 dB under word.load). */
export function streakUp(v: Voice): void {
  const g = 0.38 * db(-12);
  for (const [at, hz] of [[0, 880], [0.06, 1318.5]] as const) {
    tone(v, at, 0.03, g, hz, hz, { type: "triangle", attack: 0.001 });
    tone(v, at, 0.2, g * 0.5, hz * 6.02, hz * 6.0, { attack: 0.001 });
    tone(v, at, 0.18, g * 0.35, hz * 8.98, hz * 8.95, { attack: 0.001 });
  }
}
