/**
 * The S1 sounds (docs/BUILD_S1.md §12, docs/audio/THEME_SOUND_LIST.md), made
 * in code on ThemeAudio's buses like the rest of "Vành Chân Trời": Tán's
 * sharp blast on steel with casings ringing, Ray's capacitor whine and its
 * cracking release with a tail, Pháo Sao's mortar thump, whistle and deep
 * burst, a blow ringing off Vỏ, a shield's hum struck and its glass breaking,
 * a Tách cracking apart, Đầu Đàn's horn and fall, a rift's groan and tearing
 * steel, a star won. ThemeAudio opens each voice (and counts its id).
 * The feel pass (docs/FEEL_PASS_S1.md §4.3, Q6) shapes the guns as their
 * action: a breech, a crisp attack (the 1–4 kHz band, the spoken word's, only
 * there, gone within 30 ms), a body under 1 kHz or a ring over 4 kHz, a tail
 * down the steel corridor under 1 kHz; never a lone low thump. Xung plays every
 * round and its corridor slap (gun.xung.tail) at a run's start, every 0.5 s
 * and after its last round; Tia's arc and Ray's armed capacitor are loops.
 */
import { crackle, noise, steel, STEEL, tone, type Voice } from "./synth";

/** The new sound ids, in THEME_SOUND_LIST.md order. */
export const GUN_SOUND_IDS = [
  "gun.tan.fire",
  "gun.ray.charge",
  "gun.ray.fire",
  "gun.phao.launch",
  "gun.phao.burst",
  "hit.armour",
  "shield.hit",
  "shield.break",
  "foe.split",
  "leader.horn",
  "leader.down",
  "rift.warn",
  "rift.open",
  "star.get",
] as const;
export type GunSoundId = (typeof GUN_SOUND_IDS)[number];
/** Loops: Tia's arc while it burns, Ray's capacitor while a magazine waits armed. */
export const LOOP_SOUND_IDS = ["gun.tia.loop", "gun.ray.armed"] as const;
export type LoopSoundId = (typeof LOOP_SOUND_IDS)[number];

/** A beam's low-passed partials only (the steel's high ones would ring in the speech band). */
const LOW_BEAM = [1, 2.32, 4.25] as const;

/** A Xung round: the breech (the magazine's first), a crisp crack (30 ms), a punch 150 → 46 Hz (90 ms; the rest 70 ms, −3 dB), a short body under 1 kHz. */
export function xungRound(v: Voice, first: boolean): void {
  if (first) {
    noise(v, 0, 0.015, 0.16, "bandpass", 3400, 2.4);
    tone(v, 0, 0.015, 0.03, 5200, 5000, { type: "triangle" });
  }
  const at = first ? 0.012 : 0;
  noise(v, at, 0.03, 0.26, "highpass", 1900);
  tone(v, at, first ? 0.09 : 0.07, first ? 0.42 : 0.3, 150, 46);
  noise(v, at + 0.008, 0.07, 0.13, "bandpass", 640, 1.2);
}

/** Xung's corridor slap: the round's report rolling down the steel corridor, under 900 Hz, ~0.4 s. */
export function xungTail(v: Voice): void {
  noise(v, 0, 0.42, 0.13, "lowpass", 560, 0.6, 220, 0.012);
  steel(v, 0.01, 0.36, 0.025, 150, LOW_BEAM);
}

/** Tia's end, with its arc's echo under 1 kHz (300 ms). */
export function tiaEnd(v: Voice): void {
  tone(v, 0, 0.36, 0.09, 260, 48, { type: "sawtooth", filter: "lowpass", cutoff: 900, cutoffTo: 200 });
  noise(v, 0, 0.32, 0.06, "lowpass", 560, 0.6, 220);
  steel(v, 0.02, 0.3, 0.02, 120, LOW_BEAM);
}

/**
 * The loops' nodes, started at `v.at` into `v.out`; the returned function
 * fades them out (60 ms) and stops them. Tia: the arc's 55 Hz hum and a
 * crackle of 5–7 kHz grains (−4 dB of its start); Ray armed: a small
 * capacitor's hum under 400 Hz and a glitter over 5 kHz (−15 dB).
 */
export const GUN_LOOPS: Readonly<Record<LoopSoundId, (v: Voice) => () => void>> = {
  "gun.tia.loop": (v) => loop(v, [{ type: "sine", hz: 55, gain: 0.11 }, { type: "sawtooth", hz: 110, gain: 0.035, lowpass: 320 }], { band: 6000, gain: 0.05, flutter: 23 }),
  "gun.ray.armed": (v) => loop(v, [{ type: "triangle", hz: 196, gain: 0.03, lowpass: 380 }, { type: "sine", hz: 98, gain: 0.02 }], { band: 7200, gain: 0.012, flutter: 9 }),
};

function loop(v: Voice, hums: { type: OscillatorType; hz: number; gain: number; lowpass?: number }[], grains: { band: number; gain: number; flutter: number }): () => void {
  const ctx = v.ctx;
  const out = new GainNode(ctx, { gain: 0.0001 });
  out.gain.setValueAtTime(0.0001, v.at);
  out.gain.exponentialRampToValueAtTime(1, v.at + 0.05);
  out.connect(v.out);
  const sources: AudioScheduledSourceNode[] = [];
  for (const hum of hums) {
    const osc = new OscillatorNode(ctx, { type: hum.type, frequency: hum.hz });
    const level = new GainNode(ctx, { gain: hum.gain });
    if (hum.lowpass !== undefined) osc.connect(new BiquadFilterNode(ctx, { type: "lowpass", frequency: hum.lowpass })).connect(level);
    else osc.connect(level);
    level.connect(out);
    sources.push(osc);
  }
  // Grains: looped noise through a band over 5 kHz, gated by a fast square flutter.
  const noiseSource = new AudioBufferSourceNode(ctx, { buffer: v.noise, loop: true });
  const gate = new GainNode(ctx, { gain: grains.gain * 0.5 });
  const flutter = new OscillatorNode(ctx, { type: "square", frequency: grains.flutter });
  const depth = new GainNode(ctx, { gain: grains.gain * 0.5 });
  flutter.connect(depth).connect(gate.gain);
  noiseSource.connect(new BiquadFilterNode(ctx, { type: "bandpass", frequency: grains.band, Q: 1.2 })).connect(gate).connect(out);
  sources.push(noiseSource, flutter);
  for (const source of sources) source.start(v.at);
  // Once stopped, the loop leaves the bus (a fight starts and stops these many times).
  noiseSource.onended = () => {
    out.disconnect();
    v.out.disconnect();
  };
  return () => {
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    for (const source of sources) source.stop(t + 0.08);
  };
}

/** Each sound's notes on an open voice; `pitch` × (Pháo Sao's bursts climb a semitone each in a chain). */
export const GUN_SOUNDS: Readonly<Record<GunSoundId, (v: Voice, pitch: number) => void>> = {
  "gun.tan.fire": (v) => {
    // The pump's crack (30 ms), a heavy body on steel, casings ringing over 4 kHz, the corridor's slap under 900 Hz.
    noise(v, 0, 0.03, 0.42, "highpass", 1400);
    tone(v, 0, 0.12, 0.5, 120, 40);
    noise(v, 0.01, 0.14, 0.16, "bandpass", 820, 0.9, 380);
    steel(v, 0.09, 0.12, 0.03, 4700, [1, 1.36]);
    steel(v, 0.16, 0.1, 0.022, 5300, [1, 1.36]);
    noise(v, 0.02, 0.25, 0.07, "lowpass", 760, 0.7, 260, 0.01);
  },
  "gun.ray.charge": (v) => {
    // A capacitor whining up (0.15 s).
    tone(v, 0, 0.16, 0.06, 900, 3600, { type: "sawtooth", filter: "bandpass", cutoff: 2400, cutoffTo: 6000, q: 4, attack: 0.02 });
    tone(v, 0, 0.16, 0.025, 1800, 7200, { type: "sine", attack: 0.03 });
  },
  "gun.ray.fire": (v) => {
    // The release: a hard crack (30 ms), a low punch, electricity tearing over 4.5 kHz (120 ms), the corridor ringing under 1 kHz (0.5 s).
    noise(v, 0, 0.03, 0.5, "highpass", 3000);
    tone(v, 0, 0.18, 0.45, 220, 50);
    noise(v, 0.005, 0.12, 0.12, "highpass", 4800, 0.8, 7200);
    crackle(v, 0.01, 0.1, 6, 0.07, 6200);
    noise(v, 0.02, 0.5, 0.08, "lowpass", 800, 0.7, 220, 0.015);
    steel(v, 0.01, 0.6, 0.03, 196, LOW_BEAM);
  },
  "gun.phao.launch": (v) => {
    // The shell sliding home (20 ms), a crisp launch crack, the rocket's hiss at 4–8 kHz over a rumble under 300 Hz (0.4 s), a short tail under 1 kHz.
    noise(v, 0, 0.02, 0.14, "bandpass", 2600, 2);
    tone(v, 0, 0.02, 0.03, 4800, 4600, { type: "triangle" });
    noise(v, 0.02, 0.028, 0.34, "highpass", 2200);
    tone(v, 0.02, 0.2, 0.3, 140, 55);
    noise(v, 0.04, 0.4, 0.09, "bandpass", 6000, 0.8, 4600, 0.03);
    noise(v, 0.02, 0.4, 0.16, "lowpass", 260, 0.8, 120, 0.02);
    noise(v, 0.06, 0.25, 0.05, "lowpass", 700, 0.7, 240, 0.02);
  },
  "gun.phao.burst": (v, pitch) => {
    // A crisp crack, a deep boom 60–200 Hz (0.25 s), shrapnel crackling over 4 kHz, the corridor rolling under 1 kHz (0.6 s).
    noise(v, 0, 0.025, 0.3, "highpass", 2200 * pitch);
    noise(v, 0, 0.02, 0.12, "highpass", 4200);
    tone(v, 0, 0.25, 0.6, 180 * pitch, 58 * pitch);
    noise(v, 0, 0.25, 0.26, "lowpass", 210 * pitch, 0.7, 90);
    crackle(v, 0.05, 0.3, 7, 0.05, 5600);
    noise(v, 0.03, 0.6, 0.16, "lowpass", 800, 0.7, 160, 0.02);
  },
  "hit.armour": (v) => {
    // A blow ringing off thick plate: keng.
    steel(v, 0, 0.32, 0.12, 980 + Math.random() * 90, STEEL.plate);
    noise(v, 0, 0.02, 0.2, "highpass", 5200);
  },
  "shield.hit": (v) => {
    // The energy wall struck: a glassy hum dipping.
    tone(v, 0, 0.18, 0.05, 1300, 700, { type: "triangle", filter: "bandpass", cutoff: 1400, q: 3 });
    noise(v, 0, 0.05, 0.08, "bandpass", 5200, 3);
  },
  "shield.break": (v) => {
    // Glass shattering over a collapsing hum.
    tone(v, 0, 0.45, 0.08, 900, 120, { type: "sawtooth", filter: "lowpass", cutoff: 3000, cutoffTo: 300 });
    crackle(v, 0, 0.35, 14, 0.07, 7200);
    noise(v, 0, 0.3, 0.16, "highpass", 6000, 0.7, 2500);
  },
  "foe.split": (v) => {
    // A shell cracking apart, three pieces skittering.
    noise(v, 0, 0.06, 0.25, "bandpass", 1800, 1.4);
    tone(v, 0, 0.12, 0.2, 260, 120);
    for (let k = 0; k < 3; k += 1) noise(v, 0.05 + k * 0.04, 0.03, 0.08, "bandpass", 3600 - k * 500, 3);
  },
  "leader.horn": (v) => {
    // A low war horn, two notes, from far off.
    tone(v, 0, 0.9, 0.11, 98, 96, { type: "sawtooth", filter: "lowpass", cutoff: 500, cutoffTo: 900, attack: 0.12 });
    tone(v, 0.75, 0.9, 0.1, 73.4, 72, { type: "sawtooth", filter: "lowpass", cutoff: 450, cutoffTo: 750, attack: 0.1 });
    tone(v, 0, 1.6, 0.15, 49, 48, { attack: 0.2 });
  },
  "leader.down": (v) => {
    // A heavy body folding twice, its beacon dying.
    tone(v, 0, 0.3, 0.55, 80, 30);
    tone(v, 0.25, 0.4, 0.5, 66, 24);
    steel(v, 0.25, 0.6, 0.06, 196, STEEL.beam);
    tone(v, 0.1, 0.6, 0.04, 880, 220, { type: "square", filter: "lowpass", cutoff: 2000, cutoffTo: 200 });
  },
  "rift.warn": (v) => {
    // The wall groaning, heat building (≈ the warning's length).
    tone(v, 0, 2.4, 0.07, 55, 70, { type: "sawtooth", filter: "lowpass", cutoff: 300, cutoffTo: 1200, attack: 0.4 });
    noise(v, 0, 2.4, 0.06, "bandpass", 400, 1.2, 1500, 0.5);
    steel(v, 0.6, 0.8, 0.03, 160, STEEL.beam);
  },
  "rift.open": (v) => {
    // Steel tearing open, sparks pouring.
    noise(v, 0, 0.5, 0.3, "bandpass", 900, 0.9, 2800);
    tone(v, 0, 0.4, 0.4, 110, 40);
    crackle(v, 0.05, 0.6, 12, 0.06, 4600);
  },
  "star.get": (v) => {
    // A star won: a bright struck bar and a shimmer.
    steel(v, 0, 0.6, 0.08, 1046.5, STEEL.bar);
    tone(v, 0.02, 0.5, 0.03, 2093, 2093, { type: "triangle", attack: 0.01 });
  },
};
