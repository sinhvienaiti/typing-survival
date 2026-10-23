/**
 * The music placeholder of Tuyến Cuối, made in code until real stems exist
 * (docs/audio/THEME_SOUND_LIST.md: music.calm, music.surge): industrial,
 * 96 BPM, A minor. Calm is a deep detuned pad, a sub, the wind of the void
 * and a far steel clank every two bars. Surge adds machine drums, then a
 * filtered saw bass, then riveting at the top. The layers crossfade with the
 * horde's intensity (`setIntensity`, smoothed over ~1.5 s); the whole of it
 * plays on the music bus, which dips while a word is spoken. Notes are
 * scheduled 0.25 s ahead on the audio clock.
 */
import { noise, steel, STEEL, tone, type Voice } from "./synth";

const BPM = 96;
const STEP_S = 60 / BPM / 4;
const LOOKAHEAD_S = 0.25;
const TICK_MS = 60;
/** Overall level of the music before its volume setting. */
const BASE = 0.55;

/** Two bars each: A minor, F, D minor, E. `root` drives the bass and the sub; `pad` the three voices. */
const CHORDS = [
  { root: 55, pad: [110, 130.81, 164.81] },
  { root: 43.65, pad: [87.31, 110, 130.81] },
  { root: 36.71, pad: [73.42, 87.31, 110] },
  { root: 41.2, pad: [82.41, 103.83, 123.47] },
] as const;
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0];
const CLANK = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
const BASS = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0];

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const smooth = (from: number, to: number, x: number): number => {
  const k = clamp01((x - from) / (to - from));
  return k * k * (3 - 2 * k);
};

/** How loud each layer plays at horde intensity `x` (0 … 1): the pad gives way as the drums, then the bass, then the rivets come in. */
export function layerGains(x: number): { calm: number; drums: number; bass: number; rivets: number } {
  const k = clamp01(x);
  return { calm: 1 - 0.55 * k, drums: smooth(0.08, 0.45, k), bass: smooth(0.3, 0.75, k), rivets: smooth(0.72, 1, k) };
}

/** The horde's intensity from the foes on screen (15 → 0, 120 → 1); a surge is at least 0.75. */
export function hordeIntensity(onScreen: number, surge: boolean): number {
  const x = clamp01((onScreen - 15) / 105);
  return surge ? Math.max(x, 0.75) : x;
}

type Layer = "calm" | "drums" | "bass" | "rivets";

export class Music {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private master: GainNode | null = null;
  private readonly layers = new Map<Layer, GainNode>();
  private readonly pads: OscillatorNode[] = [];
  private sub: OscillatorNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextAt = 0;
  private step = 0;
  private intensity = 0;
  private target = 0;
  private level = 1;
  private gains = layerGains(0);

  get playing(): boolean {
    return this.ctx !== null;
  }

  /** Builds the graph into `out` (the music bus) and starts the clock. */
  start(ctx: AudioContext, out: AudioNode, buffer: AudioBuffer): void {
    if (this.ctx !== null) return;
    this.ctx = ctx;
    this.buffer = buffer;
    const now = ctx.currentTime;
    const master = new GainNode(ctx, { gain: 0 });
    master.connect(out);
    master.gain.setTargetAtTime(BASE * this.level, now, 1.2);
    this.master = master;
    for (const name of ["calm", "drums", "bass", "rivets"] as const) {
      const node = new GainNode(ctx, { gain: name === "calm" ? 1 : 0 });
      node.connect(master);
      this.layers.set(name, node);
    }
    const calm = this.layers.get("calm")!;
    // The pad: three voices, each two saws a few cents apart, through a slowly breathing low-pass.
    const padFilter = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 520, Q: 0.9 });
    const padGain = new GainNode(ctx, { gain: 0.045 });
    padFilter.connect(padGain).connect(calm);
    const lfo = new OscillatorNode(ctx, { frequency: 0.07 });
    const depth = new GainNode(ctx, { gain: 240 });
    lfo.connect(depth).connect(padFilter.frequency);
    lfo.start(now);
    for (const freq of CHORDS[0].pad) {
      for (const detune of [-8, 7]) {
        const osc = new OscillatorNode(ctx, { type: "sawtooth", frequency: freq, detune });
        osc.connect(padFilter);
        osc.start(now);
        this.pads.push(osc);
      }
    }
    this.sub = new OscillatorNode(ctx, { type: "sine", frequency: CHORDS[0].root });
    this.sub.connect(new GainNode(ctx, { gain: 0.16 })).connect(calm);
    this.sub.start(now);
    // The wind of the void: looped noise, low-passed, swelling slowly.
    const wind = new AudioBufferSourceNode(ctx, { buffer, loop: true });
    const windFilter = new BiquadFilterNode(ctx, { type: "bandpass", frequency: 240, Q: 0.6 });
    const windGain = new GainNode(ctx, { gain: 0.05 });
    const swell = new OscillatorNode(ctx, { frequency: 0.05 });
    const swellDepth = new GainNode(ctx, { gain: 0.035 });
    swell.connect(swellDepth).connect(windGain.gain);
    wind.connect(windFilter).connect(windGain).connect(calm);
    wind.start(now);
    swell.start(now);
    this.nextAt = now + 0.1;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  /** The horde's intensity, 0 … 1 (hordeIntensity). */
  setIntensity(x: number): void {
    this.target = clamp01(x);
  }

  /** Overall level: 1 in a fight, lower while paused. */
  setLevel(level: number): void {
    this.level = clamp01(level);
    if (this.ctx !== null && this.master !== null) this.master.gain.setTargetAtTime(BASE * this.level, this.ctx.currentTime, 0.5);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.master?.disconnect();
    this.ctx = null;
  }

  private voice(layer: Layer, at: number): Voice {
    return { ctx: this.ctx!, out: this.layers.get(layer)!, at, noise: this.buffer! };
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (ctx === null) return;
    const now = ctx.currentTime;
    // A late tick (a background tab) skips ahead instead of piling notes up.
    if (this.nextAt < now) this.nextAt = now + 0.05;
    this.intensity += (this.target - this.intensity) * 0.04;
    this.gains = layerGains(this.intensity);
    for (const [name, node] of this.layers) node.gain.setTargetAtTime(this.gains[name], now, 0.35);
    while (this.nextAt < now + LOOKAHEAD_S) {
      this.play(this.step, this.nextAt);
      this.nextAt += STEP_S;
      this.step = (this.step + 1) % 128;
    }
  }

  private play(step: number, at: number): void {
    const bar = step >> 4;
    const s = step & 15;
    const chord = CHORDS[(bar >> 1) & 3]!;
    if (s === 0 && (bar & 1) === 0) {
      // A new chord: the pad glides to it; a far clank rings out in the dark.
      this.pads.forEach((osc, index) => osc.frequency.setTargetAtTime(chord.pad[index >> 1]!, at, 0.5));
      this.sub?.frequency.setTargetAtTime(chord.root, at, 0.3);
      const calm = this.voice("calm", at);
      steel(calm, 0, 2.2, 0.022, 196, STEEL.beam);
      noise(calm, 0, 1.1, 0.025, "lowpass", 420, 0.7, 160);
    }
    if (this.gains.drums > 0.02) {
      const drums = this.voice("drums", at);
      if (KICK[s] === 1) {
        tone(drums, 0, 0.3, 0.55, 150, 40);
        noise(drums, 0, 0.03, 0.12, "lowpass", 1400);
      }
      if (CLANK[s] === 1) {
        const accent = s === 15 ? 0.45 : 1;
        noise(drums, 0, 0.14, 0.2 * accent, "bandpass", 1900, 1.4);
        steel(drums, 0, 0.16, 0.05 * accent, 340, STEEL.plate);
        noise(drums, 0.004, 0.05, 0.06 * accent, "highpass", 6200);
      }
      if ((s & 1) === 0) noise(drums, 0, 0.026, (s & 3) === 2 ? 0.07 : 0.04, "highpass", 8600, 0.7);
    }
    if (this.gains.bass > 0.02 && BASS[s] === 1) {
      tone(this.voice("bass", at), 0, STEP_S * 1.7, 0.2, chord.root * 2, chord.root * 2, { type: "sawtooth", filter: "lowpass", cutoff: 950, cutoffTo: 150, q: 5 });
    }
    if (this.gains.rivets > 0.02) {
      const rivets = this.voice("rivets", at);
      steel(rivets, 0, 0.05, 0.018, 2300 + (s % 3) * 170, STEEL.bar);
      if ((s & 3) === 3) noise(rivets, 0, 0.03, 0.03, "highpass", 4800, 2);
    }
  }
}
