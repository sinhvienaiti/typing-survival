/**
 * The S1 sounds (docs/BUILD_S1.md §12, docs/audio/THEME_SOUND_LIST.md), made
 * in code on ThemeAudio's buses like the rest of "Vành Chân Trời": Tán's
 * sharp blast on steel with casings ringing, Ray's capacitor whine and its
 * cracking release with a tail, Pháo Sao's mortar thump, whistle and deep
 * burst, a blow ringing off Vỏ, a shield's hum struck and its glass breaking,
 * a Tách cracking apart, Đầu Đàn's horn and fall, a rift's groan and tearing
 * steel, a star won. ThemeAudio opens each voice (and counts its id).
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

/** Each sound's notes on an open voice. */
export const GUN_SOUNDS: Readonly<Record<GunSoundId, (v: Voice) => void>> = {
  "gun.tan.fire": (v) => {
    // A sharp blast on steel, then the spent casings ringing.
    noise(v, 0, 0.05, 0.42, "highpass", 1400);
    tone(v, 0, 0.12, 0.5, 120, 42);
    noise(v, 0.01, 0.14, 0.16, "bandpass", 900, 0.9, 400);
    steel(v, 0.09, 0.08, 0.035, 2600, STEEL.bar);
    steel(v, 0.15, 0.07, 0.025, 3100, STEEL.bar);
  },
  "gun.ray.charge": (v) => {
    // A capacitor whining up (0.15 s).
    tone(v, 0, 0.16, 0.06, 900, 3600, { type: "sawtooth", filter: "bandpass", cutoff: 2400, cutoffTo: 6000, q: 4, attack: 0.02 });
    tone(v, 0, 0.16, 0.025, 1800, 7200, { type: "sine", attack: 0.03 });
  },
  "gun.ray.fire": (v) => {
    // The release: a hard crack, a low punch and a long singing tail.
    noise(v, 0, 0.03, 0.5, "highpass", 3000);
    tone(v, 0, 0.18, 0.45, 220, 50);
    tone(v, 0.005, 0.5, 0.05, 2400, 600, { type: "sawtooth", filter: "lowpass", cutoff: 6000, cutoffTo: 900 });
    steel(v, 0.01, 0.6, 0.03, 740, STEEL.beam);
  },
  "gun.phao.launch": (v) => {
    // A mortar's thump and a whistle climbing away.
    tone(v, 0, 0.22, 0.55, 95, 38);
    noise(v, 0, 0.18, 0.18, "lowpass", 700);
    tone(v, 0.05, 0.5, 0.025, 1200, 2200, { type: "sine", attack: 0.08 });
  },
  "gun.phao.burst": (v) => {
    // A deep burst, debris rattling.
    tone(v, 0, 0.42, 0.6, 70, 26);
    noise(v, 0, 0.32, 0.32, "lowpass", 900, 0.7, 160);
    noise(v, 0.02, 0.08, 0.12, "highpass", 4200);
    crackle(v, 0.06, 0.3, 6, 0.05, 3800);
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
