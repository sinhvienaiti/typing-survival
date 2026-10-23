/**
 * The sound of Tuyến Cuối, "Vành Chân Trời" (docs/audio/THEME_SOUND_LIST.md):
 * industrial. Keys are relays on steel, a loaded word is a magazine slammed
 * home, Xung is a heavy autocannon, Tia an electric arc, hits clank on steel,
 * kills break metal (a struck bar climbs a pentatonic scale while kills keep
 * coming), the line's alarms are klaxons; the music (./music.ts) is deep pads,
 * machine drums and bass that rise with the horde.
 *
 * It plays through the kit's SceneAudio (src/kit/audio): our own bus table,
 * every bus dipping by its `duck` while a word is spoken (kit speech's
 * PRONUNCIATION_EVENT: guns and impacts −6 dB, music −4 dB). Each bus gets
 * one insert built through SceneAudio.synth: our volume and a glue
 * compressor, so a sweep of 40 kills does not clip. Hits gather for ~38 ms
 * and play once, at most 4 kill bursts in 120 ms (as the kit's AudioCues);
 * the tier table is the kit's feedback tiers. Made in code, no files.
 * Nothing plays before resume() (browsers start audio on a gesture).
 */
import { SceneAudio, noiseBuffer, type BusTable } from "../kit/audio";
import { pentatonicRatio, tier } from "../kit/feedback";
import { PRONUNCIATION_EVENT } from "../kit/speech";
import { GUN_SOUNDS, GUN_SOUND_IDS, type GunSoundId } from "./gun-audio";
import { Music } from "./music";
import { crackle, noise, steel, STEEL, tone, type Voice } from "./synth";

export type Bus = "keys" | "guns" | "impacts" | "kills" | "alerts" | "ui" | "music";

/** Bus levels and how far each dips while a word is spoken (SURVIVAL_MODE_PLAN.md 6.5). */
export const BUSES: BusTable<Bus> = {
  keys: { gain: 0.5, duck: 0.6 },
  guns: { gain: 0.42, duck: 0.5 },
  impacts: { gain: 0.6, duck: 0.5 },
  kills: { gain: 0.55, duck: 0.56 },
  alerts: { gain: 0.8, duck: 0.8 },
  ui: { gain: 0.55, duck: 0.7 },
  music: { gain: 0.9, duck: 0.63 },
};

/** Every sound id of the theme (docs/audio/THEME_SOUND_LIST.md has one section per id). */
export const SOUND_IDS = [
  "key.ok",
  "key.bad",
  "word.load",
  "word.perfect",
  "gun.xung",
  "gun.tia.start",
  "gun.tia.end",
  "gun.tia.pulse",
  "hit.t1",
  "hit.t2",
  "hit.t4",
  "kill.swarm",
  "kill.elite",
  "foe.shot",
  "foe.shot.down",
  "hurt.breach",
  "hurt.hull",
  "hurt.drain",
  "support.repair",
  "alarm.surge",
  "end.win",
  "end.lose",
  "ui.move",
  "ui.select",
  "ui.back",
  "music.calm",
  "music.surge",
  ...GUN_SOUND_IDS,
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

/** S1 sounds: their bus, and the least time between two (ms; a sweep of blows on Vỏ is one ring, not a buzz). */
const GUN_BUS: Readonly<Record<GunSoundId, { bus: Bus; gap: number }>> = {
  "gun.tan.fire": { bus: "guns", gap: 60 },
  "gun.ray.charge": { bus: "guns", gap: 0 },
  "gun.ray.fire": { bus: "guns", gap: 0 },
  "gun.phao.launch": { bus: "guns", gap: 0 },
  "gun.phao.burst": { bus: "impacts", gap: 45 },
  "hit.armour": { bus: "impacts", gap: 90 },
  "shield.hit": { bus: "impacts", gap: 70 },
  "shield.break": { bus: "impacts", gap: 0 },
  "foe.split": { bus: "kills", gap: 60 },
  "leader.horn": { bus: "alerts", gap: 0 },
  "leader.down": { bus: "kills", gap: 0 },
  "rift.warn": { bus: "alerts", gap: 0 },
  "rift.open": { bus: "alerts", gap: 0 },
  "star.get": { bus: "ui", gap: 0 },
};

const HIT_GATHER_MS = 38;
const BURSTS = { max: 4, windowMs: 120 } as const;
const CHAIN_MS = 1000;
const KEY_PITCH = [1, 1.06, 0.94, 1.12, 0.89] as const;
const DRAIN_GAP_MS = 420;

export type ThemeAudioOptions = { sfx: number; music: number };

export class ThemeAudio {
  readonly scene = new SceneAudio<never, Bus>({ sounds: {}, buses: BUSES, defaultBus: "impacts", dragonSamples: false, sfxVolume: 1, musicVolume: 0 });
  readonly music = new Music();
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private readonly inserts = new Map<Bus, GainNode>();
  private sfx: number;
  private musicVolume: number;
  private readonly pending = { count: 0, tier: 0, pan: 0, at: 0 };
  private readonly chain = { step: 0, last: -1e9 };
  private readonly bursts: number[] = [];
  private level = 1;
  private surging = false;
  private drainAt = -1e9;
  /** Sounds started since the page opened, by id (the scenarios read it). */
  readonly played = new Map<SoundId, number>();
  private readonly lastGun = new Map<GunSoundId, number>();

  constructor(options: ThemeAudioOptions) {
    this.sfx = clamp01(options.sfx);
    this.musicVolume = clamp01(options.music);
    if (typeof window !== "undefined") {
      window.addEventListener(PRONUNCIATION_EVENT, (event) => this.scene.setPronunciationActive((event as CustomEvent<{ active?: boolean }>).detail?.active === true));
    }
  }

  /** Call on the first key or click: unlocks the context, builds the bus inserts, starts the music. */
  resume(): void {
    this.scene.unlock();
    if (this.ctx !== null) return;
    for (const bus of Object.keys(BUSES) as Bus[]) {
      this.scene.synth(
        "insert:" + bus,
        (context, out) => {
          this.ctx = context;
          const level = new GainNode(context, { gain: bus === "music" ? this.musicVolume : this.sfx });
          const glue = new DynamicsCompressorNode(context, { threshold: -12, knee: 6, ratio: 8, attack: 0.002, release: 0.14 });
          level.connect(glue).connect(out);
          this.inserts.set(bus, level);
        },
        1,
        { bus, gap: 0 },
      );
    }
    if (this.ctx === null) return;
    this.buffer = noiseBuffer(this.ctx);
    this.music.start(this.ctx, this.inserts.get("music")!, this.buffer);
    this.count("music.calm");
  }

  get ready(): boolean {
    return this.ctx !== null && this.buffer !== null;
  }

  setVolumes(sfx: number, music: number): void {
    this.sfx = clamp01(sfx);
    this.musicVolume = clamp01(music);
    if (this.ctx === null) return;
    for (const [bus, node] of this.inserts) node.gain.setTargetAtTime(bus === "music" ? this.musicVolume : this.sfx, this.ctx.currentTime, 0.05);
  }

  /** A voice on `bus`, panned; null before resume(). */
  private voice(bus: Bus, pan: number, id: SoundId): Voice | null {
    const ctx = this.ctx;
    const input = this.inserts.get(bus);
    if (ctx === null || input === undefined || this.buffer === null || !this.scene.enabled) return null;
    const panner = new StereoPannerNode(ctx, { pan: Math.max(-0.8, Math.min(0.8, pan)) });
    panner.connect(input);
    this.count(id);
    return { ctx, out: panner, at: ctx.currentTime, noise: this.buffer };
  }

  private count(id: SoundId): void {
    this.played.set(id, (this.played.get(id) ?? 0) + 1);
  }

  /** An S1 sound (gun-audio.ts) at `pan`; `now` in ms keeps its gap. */
  gun(id: GunSoundId, pan: number, now: number): void {
    const spec = GUN_BUS[id];
    if (now - (this.lastGun.get(id) ?? -1e9) < spec.gap) return;
    const v = this.voice(spec.bus, pan, id);
    if (v === null) return;
    this.lastGun.set(id, now);
    GUN_SOUNDS[id](v);
  }

  /** A typed key (a relay on steel), `letter` 0–25; a wrong key is a muffled thud, never a buzzer. */
  key(ok: boolean, letter: number): void {
    if (!ok) {
      const v = this.voice("keys", 0, "key.bad");
      if (v === null) return;
      tone(v, 0, 0.07, 0.2, 105, 72);
      noise(v, 0, 0.045, 0.07, "lowpass", 420);
      return;
    }
    const v = this.voice("keys", 0, "key.ok");
    if (v === null) return;
    const p = KEY_PITCH[letter % KEY_PITCH.length]! * (1 + (Math.random() - 0.5) * 0.06);
    noise(v, 0, 0.014, 0.17, "bandpass", 2700 * p, 2.6);
    tone(v, 0, 0.028, 0.06, 240 * p, 150 * p, { type: "square", filter: "lowpass", cutoff: 1400 });
    tone(v, 0.001, 0.018, 0.025, 3300 * p, 3200 * p, { type: "triangle" });
  }

  /** A word done: a magazine slammed home (ka-chunk); a perfect word also charges up with a rising whine. */
  word(perfect: boolean, pan = 0): void {
    const v = this.voice("alerts", pan, perfect ? "word.perfect" : "word.load");
    if (v === null) return;
    noise(v, 0, 0.02, 0.22, "highpass", 3200);
    noise(v, 0.055, 0.06, 0.3, "lowpass", 1300);
    tone(v, 0.055, 0.14, 0.38, 170, 52);
    steel(v, 0.06, 0.09, 0.07, 1380, STEEL.plate);
    if (perfect) {
      tone(v, 0.09, 0.22, 0.07, 620, 1900, { attack: 0.03 });
      tone(v, 0.09, 0.2, 0.018, 1240, 3800, { type: "square", attack: 0.03, filter: "lowpass", cutoff: 5000 });
      crackle(v, 0.12, 0.14, 4, 0.05, 6500);
    }
  }

  /** A Xung round: a heavy autocannon (a low punch, a crack, the breech). */
  shot(pan: number): void {
    const v = this.voice("guns", pan, "gun.xung");
    if (v === null) return;
    tone(v, 0, 0.09, 0.42, 150, 46);
    noise(v, 0, 0.035, 0.26, "highpass", 1900);
    noise(v, 0.012, 0.07, 0.15, "bandpass", 720, 1.2);
  }

  /** Tia opens (an arc spinning up and its hum) or closes (a power-down). */
  beam(start: boolean, pan: number): void {
    if (start) {
      const v = this.voice("guns", pan, "gun.tia.start");
      if (v === null) return;
      tone(v, 0, 0.36, 0.12, 70, 260, { type: "sawtooth", filter: "lowpass", cutoff: 500, cutoffTo: 2600, q: 3 });
      noise(v, 0, 0.42, 0.12, "bandpass", 2600, 2.2, 4200, 0.04);
      crackle(v, 0, 0.36, 7, 0.09);
      tone(v, 0.03, 0.6, 0.2, 55, 52, { attack: 0.05 });
      return;
    }
    const v = this.voice("guns", pan, "gun.tia.end");
    if (v === null) return;
    tone(v, 0, 0.36, 0.09, 260, 48, { type: "sawtooth", filter: "lowpass", cutoff: 1800, cutoffTo: 200 });
    noise(v, 0, 0.2, 0.05, "lowpass", 900);
  }

  /** One pulse of Tia on `hits` foes: an electric zap. */
  pulse(pan: number, hits: number): void {
    if (hits === 0) return;
    const v = this.voice("impacts", pan, "gun.tia.pulse");
    if (v === null) return;
    noise(v, 0, 0.045, Math.min(0.22, 0.07 + hits * 0.012), "highpass", 4200, 1.1);
    tone(v, 0, 0.026, 0.024, 1900, 880, { type: "square", filter: "lowpass", cutoff: 4000 });
  }

  /** A hit of tier `t` (gathered for ~38 ms and played once); `now` in ms. */
  hit(t: number, pan: number, now: number): void {
    const p = this.pending;
    if (p.count === 0) p.at = now;
    p.count += 1;
    p.tier = Math.max(p.tier, t);
    p.pan += pan;
    if (now - p.at >= HIT_GATHER_MS) this.flush(now);
  }

  /** Plays the gathered hits: a clank on steel, with a thump from T2 and a ringing beam from T4. Call once a frame. */
  flush(now: number): void {
    const p = this.pending;
    if (p.count === 0 || now - p.at < HIT_GATHER_MS * 0.8) return;
    const row = tier(p.tier);
    const v = this.voice("impacts", p.pan / p.count, row.tail ? "hit.t4" : row.bass ? "hit.t2" : "hit.t1");
    if (v !== null) {
      const loud = Math.min(1, 0.45 + Math.log2(1 + p.count) * 0.18);
      noise(v, 0, 0.02, 0.3 * loud, "highpass", 3600);
      steel(v, 0, 0.08 + p.tier * 0.02, 0.17 * loud, 430 + Math.random() * 70, STEEL.beam);
      if (row.bass) tone(v, 0, 0.16, 0.46 * loud, 115, 40);
      if (row.tail) {
        noise(v, 0.02, 0.5, 0.15, "lowpass", 620);
        steel(v, 0.01, 0.7, 0.05, 233, STEEL.beam);
      }
    }
    p.count = 0;
    p.tier = 0;
    p.pan = 0;
  }

  /** `count` kills at `now` ms: metal breaking, a boom, and a struck bar climbing while kills keep coming. `elite`: a scout, with an electric discharge. */
  kill(count: number, pan: number, elite: boolean, now: number): void {
    if (count === 0) return;
    while (this.bursts.length > 0 && now - this.bursts[0]! > BURSTS.windowMs) this.bursts.shift();
    if (this.bursts.length >= BURSTS.max) return;
    const v = this.voice("kills", pan, elite ? "kill.elite" : "kill.swarm");
    if (v === null) return;
    this.bursts.push(now);
    this.chain.step = now - this.chain.last < CHAIN_MS ? Math.min(12, this.chain.step + 1) : 0;
    this.chain.last = now;
    const size = Math.min(1, 0.55 + Math.sqrt(count) * 0.15);
    noise(v, 0, 0.13, 0.36 * size, "bandpass", elite ? 800 : 1150, 0.9, elite ? 300 : 500);
    noise(v, 0.008, 0.05, 0.12 * size, "highpass", 5200);
    tone(v, 0, 0.2, 0.32 * size, elite ? 95 : 150, 38);
    steel(v, 0.01, 0.24, 0.065, 523.25 * pentatonicRatio(this.chain.step), STEEL.bar);
    if (elite) {
      tone(v, 0, 0.24, 0.06, 1100, 120, { type: "sawtooth", filter: "lowpass", cutoff: 3000, cutoffTo: 400 });
      crackle(v, 0, 0.2, 6, 0.08, 4800);
    }
  }

  /** A scout fires at the line: a charged plasma spit (a warning: something comes at you). */
  foeShot(pan: number): void {
    const v = this.voice("alerts", pan, "foe.shot");
    if (v === null) return;
    tone(v, 0, 0.16, 0.05, 340, 880, { type: "sawtooth", filter: "bandpass", cutoff: 900, cutoffTo: 2200, q: 3, attack: 0.02 });
    noise(v, 0.05, 0.08, 0.05, "bandpass", 2400, 2);
  }

  /** A scout's shot shot down: a small metallic pop. */
  shotDown(pan: number): void {
    const v = this.voice("impacts", pan, "foe.shot.down");
    if (v === null) return;
    noise(v, 0, 0.04, 0.16, "bandpass", 3000, 1.5);
    steel(v, 0, 0.07, 0.04, 880, STEEL.bar);
  }

  /** The line is hurt: a breach (a deep boom, metal groaning, a klaxon blip) or a hit on the hull (a heavy clang). */
  hurt(breach: boolean): void {
    const v = this.voice("alerts", 0, breach ? "hurt.breach" : "hurt.hull");
    if (v === null) return;
    if (breach) {
      tone(v, 0, 0.5, 0.55, 82, 28);
      tone(v, 0, 0.45, 0.07, 72, 44, { type: "sawtooth", filter: "lowpass", cutoff: 500 });
      noise(v, 0, 0.32, 0.25, "lowpass", 520);
      tone(v, 0.06, 0.09, 0.045, 440, 440, { type: "square", filter: "lowpass", cutoff: 2400 });
      tone(v, 0.17, 0.09, 0.045, 330, 330, { type: "square", filter: "lowpass", cutoff: 2400 });
      return;
    }
    steel(v, 0, 0.38, 0.17, 176, STEEL.beam);
    tone(v, 0, 0.26, 0.4, 100, 38);
    noise(v, 0, 0.2, 0.14, "lowpass", 900);
  }

  /**
   * The near zone leaches the line (EV.drain): a dry electric crackle on the
   * armour, quiet, at most one every DRAIN_GAP_MS however fast points go.
   */
  drain(pan: number, now: number): void {
    if (now - this.drainAt < DRAIN_GAP_MS) return;
    this.drainAt = now;
    const v = this.voice("alerts", pan, "hurt.drain");
    if (v === null) return;
    crackle(v, 0, 0.16, 5, 0.035, 3600);
    tone(v, 0, 0.14, 0.03, 220, 150, { type: "sawtooth", filter: "lowpass", cutoff: 900 });
  }

  /** The repair pod docks (the pace director's support near defeat): servos rising, a lock clunk, a hiss. */
  repair(): void {
    const v = this.voice("alerts", 0, "support.repair");
    if (v === null) return;
    tone(v, 0, 0.45, 0.05, 180, 720, { type: "square", filter: "lowpass", cutoff: 1400, cutoffTo: 3000, attack: 0.05 });
    tone(v, 0.42, 0.22, 0.4, 150, 60);
    steel(v, 0.42, 0.25, 0.08, 520, STEEL.bar);
    noise(v, 0.5, 0.5, 0.05, "highpass", 3000, 0.7, 1500, 0.04);
  }

  /** A surge begins: the station's siren, two tones swept twice. */
  siren(): void {
    const v = this.voice("alerts", 0, "alarm.surge");
    if (v === null) return;
    for (let k = 0; k < 2; k += 1) {
      tone(v, k * 0.62, 0.3, 0.05, 420, 640, { type: "sawtooth", filter: "lowpass", cutoff: 1500, attack: 0.04 });
      tone(v, k * 0.62 + 0.3, 0.3, 0.05, 640, 420, { type: "sawtooth", filter: "lowpass", cutoff: 1500, attack: 0.02 });
    }
    tone(v, 0, 1.25, 0.12, 55, 52, { attack: 0.1 });
  }

  /** The end: a power chord opening with a hiss of steam (held), or a power-down and collapsing metal (broken). */
  end(won: boolean): void {
    const v = this.voice("alerts", 0, won ? "end.win" : "end.lose");
    if (v === null) return;
    if (won) {
      for (const freq of [110, 164.81, 220]) tone(v, 0, 1.7, 0.07, freq, freq, { type: "sawtooth", attack: 0.04, filter: "lowpass", cutoff: 380, cutoffTo: 3200, q: 1.5 });
      tone(v, 0, 1.4, 0.3, 55, 54);
      noise(v, 0.35, 0.9, 0.06, "highpass", 3200, 0.7, 1800, 0.05);
      return;
    }
    for (const freq of [220, 261.63]) tone(v, 0, 1.4, 0.07, freq, freq / 4, { type: "sawtooth", filter: "lowpass", cutoff: 2000, cutoffTo: 160 });
    for (let k = 0; k < 5; k += 1) steel(v, 0.12 + k * 0.17, 0.3, 0.09 - k * 0.012, 300 - k * 34, STEEL.beam);
    tone(v, 0.1, 0.9, 0.5, 70, 26);
    noise(v, 0.1, 0.9, 0.18, "lowpass", 700, 0.7, 120);
  }

  /** The menus: a relay tick (move), a heavy switch (select), a lower one (back). */
  ui(kind: "move" | "select" | "back"): void {
    const v = this.voice("ui", 0, ("ui." + kind) as SoundId);
    if (v === null) return;
    if (kind === "move") {
      noise(v, 0, 0.01, 0.12, "bandpass", 3600, 3);
      tone(v, 0, 0.012, 0.02, 1650, 1600, { type: "square", filter: "lowpass", cutoff: 4000 });
      return;
    }
    const low = kind === "back" ? 0.75 : 1;
    tone(v, 0, 0.09, 0.26, 190 * low, 70 * low);
    noise(v, 0, 0.045, 0.14, "lowpass", 1600 * low);
    steel(v, 0.006, 0.07, 0.045, 900 * low, STEEL.plate);
  }

  /** The music follows the horde (0 … 1) and the screen (fight 1, paused or a menu over a fight lower). */
  setMusic(intensity: number, level: number): void {
    this.music.setIntensity(intensity);
    if (level !== this.level) {
      this.level = level;
      this.music.setLevel(level);
    }
    if (!this.surging && intensity > 0.1 && this.ready) {
      this.surging = true;
      this.count("music.surge");
    } else if (this.surging && intensity < 0.05) this.surging = false;
  }
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
