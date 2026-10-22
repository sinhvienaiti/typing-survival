/**
 * Combat sounds made in code (SURVIVAL_MODE_PLAN.md 7; no files), on buses
 * keys / guns / hits / kills / alerts into a limiter:
 * - a hit is a sharp head (filtered noise) and a body (a falling tone), with
 *   a low thump from T2 and a tail from T4; hits are gathered for 30–45 ms
 *   and play as one, louder for more;
 * - kills confirm with a crisp "core crack", and kills close together climb
 *   a pentatonic scale instead of piling up; at most 4 bursts in 120 ms;
 * - keys: 5 click variants, ±3 % pitch; a wrong key is a small dull thud;
 * - while a word is pronounced (the kit speech's PRONUNCIATION_EVENT) guns and hits duck
 *   6 dB (80 ms down, 400 ms back).
 */
import { PRONUNCIATION_EVENT } from "../kit/speech";
import { tier } from "./tiers";

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const HIT_GATHER_MS = 38;
const BURSTS = { max: 4, windowMs: 120 } as const;
const DUCK = { gain: 0.5, downS: 0.08, upS: 0.4 } as const;

type Bus = "keys" | "guns" | "hits" | "kills" | "alerts";
const BUS_GAIN: Record<Bus, number> = { keys: 0.55, guns: 0.32, hits: 0.6, kills: 0.55, alerts: 0.8 };

export class AudioCues {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buses = new Map<Bus, GainNode>();
  private noise: AudioBuffer | null = null;
  private volume = 0.7;
  muted = false;
  private pending = { count: 0, tier: 0, pan: 0, at: 0 };
  private chain = { step: 0, last: -1e9 };
  private readonly bursts: number[] = [];

  constructor(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    window.addEventListener(PRONUNCIATION_EVENT, (event) => this.duck((event as CustomEvent<{ active: boolean }>).detail?.active === true));
  }

  /** Browsers start audio only after a gesture: call on the first key or click. */
  resume(): void {
    if (this.ctx === null) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      this.master = new GainNode(ctx, { gain: this.volume });
      this.master.connect(limiter).connect(ctx.destination);
      for (const bus of Object.keys(BUS_GAIN) as Bus[]) {
        const node = new GainNode(ctx, { gain: BUS_GAIN[bus] });
        node.connect(this.master);
        this.buses.set(bus, node);
      }
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    } else if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  get ready(): boolean {
    return this.ctx !== null && !this.muted;
  }

  /** Guns and hits 6 dB down while a word is spoken. */
  duck(active: boolean): void {
    if (this.ctx === null) return;
    const t = this.ctx.currentTime;
    for (const bus of ["guns", "hits"] as const) {
      const gain = this.buses.get(bus)!.gain;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(gain.value, t);
      gain.linearRampToValueAtTime(BUS_GAIN[bus] * (active ? DUCK.gain : 1), t + (active ? DUCK.downS : DUCK.upS));
    }
  }

  private out(bus: Bus, pan: number): AudioNode {
    const ctx = this.ctx!;
    const panner = new StereoPannerNode(ctx, { pan: Math.max(-0.8, Math.min(0.8, pan)) });
    panner.connect(this.buses.get(bus)!);
    return panner;
  }

  /** A tone `freq` → `to` Hz for `seconds`, with a 2 ms attack and an exponential fall. */
  private tone(bus: AudioNode, delay: number, seconds: number, gain: number, freq: number, to: number, type: OscillatorType = "sine"): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const env = new GainNode(ctx, { gain: 0.0001 });
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    const osc = new OscillatorNode(ctx, { type, frequency: freq });
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + seconds);
    osc.connect(env).connect(bus);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  /** Filtered noise for `seconds`. */
  private hiss(bus: AudioNode, delay: number, seconds: number, gain: number, cutoff: number, type: BiquadFilterType, q = 0.8): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const env = new GainNode(ctx, { gain: 0.0001 });
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    const source = new AudioBufferSourceNode(ctx, { buffer: this.noise, playbackRate: 0.8 + Math.random() * 0.4 });
    const filter = new BiquadFilterNode(ctx, { type, frequency: cutoff, Q: q });
    source.connect(filter).connect(env).connect(bus);
    source.start(t, Math.random() * 0.5);
    source.stop(t + seconds + 0.02);
  }

  /** A typed key: one of 5 clicks (±3 % pitch); a wrong key thuds. */
  key(ok: boolean, letter: number): void {
    if (!this.ready) return;
    const bus = this.out("keys", 0);
    if (!ok) {
      this.tone(bus, 0, 0.07, 0.22, 150, 110, "sine");
      this.hiss(bus, 0, 0.04, 0.08, 600, "lowpass");
      return;
    }
    const variant = letter % 5;
    const pitch = (1 + (Math.random() - 0.5) * 0.06) * [1, 1.06, 0.94, 1.12, 0.89][variant]!;
    this.hiss(bus, 0, 0.018, 0.16, 4200 * pitch, "bandpass", 1.6);
    this.tone(bus, 0, 0.03, 0.08, 1850 * pitch, 1500 * pitch, "triangle");
  }

  /** A magazine loaded (a word done): a clack and a bright note, higher when perfect. */
  load(perfect: boolean, gun: number): void {
    if (!this.ready) return;
    const bus = this.out("alerts", gun === 0 ? -0.35 : 0.35);
    this.hiss(bus, 0, 0.05, 0.28, 1800, "bandpass", 2);
    this.tone(bus, 0.015, 0.09, 0.2, 220, 160, "square");
    this.tone(bus, 0.03, 0.22, 0.16, perfect ? 1568 : 1046.5, perfect ? 1568 : 1046.5, "sine");
    if (perfect) this.tone(bus, 0.09, 0.3, 0.12, 2093, 2093, "sine");
  }

  /** A Xung round leaving the barrel. */
  shot(pan: number): void {
    if (!this.ready) return;
    const bus = this.out("guns", pan);
    this.hiss(bus, 0, 0.035, 0.22, 2600, "highpass");
    this.tone(bus, 0, 0.05, 0.12, 900, 260, "sawtooth");
  }

  /** Tia opening: a rising sweep and a hum. */
  beam(start: boolean, pan: number): void {
    if (!this.ready) return;
    const bus = this.out("guns", pan);
    if (start) {
      this.tone(bus, 0, 0.35, 0.22, 180, 720, "sawtooth");
      this.hiss(bus, 0, 0.4, 0.18, 1200, "bandpass", 3);
      this.tone(bus, 0.02, 0.6, 0.18, 70, 55, "sine");
    } else this.tone(bus, 0, 0.25, 0.12, 400, 120, "triangle");
  }

  /** One beam pulse: a soft crackle. */
  pulse(pan: number, hits: number): void {
    if (!this.ready || hits === 0) return;
    const bus = this.out("hits", pan);
    this.hiss(bus, 0, 0.05, Math.min(0.25, 0.08 + hits * 0.012), 3200, "bandpass", 0.9);
  }

  /** A hit of tier `t` (gathered for ~38 ms and played once). */
  hit(t: number, pan: number, now: number): void {
    const p = this.pending;
    if (p.count === 0) p.at = now;
    p.count += 1;
    p.tier = Math.max(p.tier, t);
    p.pan += pan;
    if (now - p.at >= HIT_GATHER_MS) this.flush(now);
  }

  /** Plays the gathered hits; call once a frame. */
  flush(now: number): void {
    const p = this.pending;
    if (p.count === 0 || now - p.at < HIT_GATHER_MS * 0.8) return;
    if (this.ready) {
      const profile = tier(p.tier);
      const bus = this.out("hits", p.pan / p.count);
      const loud = Math.min(1, 0.45 + Math.log2(1 + p.count) * 0.18);
      this.hiss(bus, 0, 0.022, 0.35 * loud, 5200, "highpass");
      this.tone(bus, 0, 0.07 + p.tier * 0.015, 0.28 * loud, 520 + Math.random() * 60, 150, "triangle");
      if (profile.bass) this.tone(bus, 0, 0.16, 0.5 * loud, 120, 42, "sine");
      if (profile.tail) this.hiss(bus, 0.02, 0.5, 0.2, 700, "lowpass");
    }
    p.count = 0;
    p.tier = 0;
    p.pan = 0;
  }

  /** `count` kills now: a burst (at most 4 in 120 ms) and a note that climbs while kills keep coming. */
  kill(count: number, pan: number, scout: boolean, now: number): void {
    if (!this.ready || count === 0) return;
    while (this.bursts.length > 0 && now - this.bursts[0]! > BURSTS.windowMs) this.bursts.shift();
    if (this.bursts.length >= BURSTS.max) return;
    this.bursts.push(now);
    this.chain.step = now - this.chain.last < 1000 ? Math.min(SCALE.length - 1, this.chain.step + 1) : 0;
    this.chain.last = now;
    const bus = this.out("kills", pan);
    const note = 660 * 2 ** (SCALE[this.chain.step]! / 12);
    const size = Math.min(1, 0.55 + Math.sqrt(count) * 0.15);
    this.hiss(bus, 0, 0.09, 0.4 * size, scout ? 900 : 2400, "bandpass", 1.2);
    this.tone(bus, 0, 0.12, 0.3 * size, scout ? 160 : 240, 50, "sine");
    this.tone(bus, 0.01, 0.16, 0.13, note, note, "triangle");
    this.tone(bus, 0.012, 0.12, 0.06, note * 2.01, note * 2.01, "sine");
  }

  /** The ship is hurt (a breach or a scout shot): a low boom and a short warning blip. */
  hurt(heavy: boolean): void {
    if (!this.ready) return;
    const bus = this.out("alerts", 0);
    this.tone(bus, 0, heavy ? 0.45 : 0.3, 0.55, 95, 32, "sine");
    this.hiss(bus, 0, 0.3, 0.3, 500, "lowpass");
    this.tone(bus, 0.05, 0.12, 0.08, 880, 660, "square");
  }

  /** End of the run: up for a win, down for a loss. */
  end(won: boolean): void {
    if (!this.ready) return;
    const bus = this.out("alerts", 0);
    const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 261.63, 196];
    notes.forEach((freq, index) => this.tone(bus, index * 0.12, 0.45, 0.2, freq, freq, "triangle"));
  }
}
