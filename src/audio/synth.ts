/**
 * Small Web Audio building blocks for the industrial palette of Tuyến Cuối:
 * an enveloped tone (optionally through a filter), filtered noise, and struck
 * steel (inharmonic partials, the high ones dying first). Every function
 * builds short-lived nodes into `out` from `at` (context seconds); nothing is
 * kept, so the nodes go once they have played.
 */
export type Voice = { ctx: AudioContext; out: AudioNode; at: number; noise: AudioBuffer };

const FLOOR = 0.0001;

/** A gain envelope: 0 → `peak` in `attack` s, then an exponential fall to silence at `seconds`. */
function envelope(v: Voice, delay: number, seconds: number, peak: number, attack = 0.002): GainNode {
  const t = v.at + delay;
  const env = new GainNode(v.ctx, { gain: FLOOR });
  env.gain.setValueAtTime(FLOOR, t);
  env.gain.exponentialRampToValueAtTime(Math.max(FLOOR * 2, peak), t + Math.max(0.001, attack));
  env.gain.exponentialRampToValueAtTime(FLOOR, t + Math.max(attack + 0.005, seconds));
  env.connect(v.out);
  return env;
}

export type ToneOptions = { type?: OscillatorType; attack?: number; filter?: BiquadFilterType; cutoff?: number; cutoffTo?: number; q?: number; detune?: number };

/** A tone sliding `from` → `to` Hz over `seconds`. */
export function tone(v: Voice, delay: number, seconds: number, gain: number, from: number, to: number, options: ToneOptions = {}): void {
  const t = v.at + delay;
  const env = envelope(v, delay, seconds, gain, options.attack);
  const osc = new OscillatorNode(v.ctx, { type: options.type ?? "sine", frequency: from, detune: options.detune ?? 0 });
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + seconds);
  if (options.filter !== undefined) {
    const filter = new BiquadFilterNode(v.ctx, { type: options.filter, frequency: options.cutoff ?? 1200, Q: options.q ?? 0.7 });
    if (options.cutoffTo !== undefined) {
      filter.frequency.setValueAtTime(options.cutoff ?? 1200, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, options.cutoffTo), t + seconds);
    }
    osc.connect(filter).connect(env);
  } else osc.connect(env);
  osc.start(t);
  osc.stop(t + seconds + 0.03);
}

/** Noise through a `type` filter at `freq` Hz (sliding to `freqTo`), for `seconds`. */
export function noise(v: Voice, delay: number, seconds: number, gain: number, type: BiquadFilterType, freq: number, q = 0.8, freqTo?: number, attack?: number): void {
  const t = v.at + delay;
  const env = envelope(v, delay, seconds, gain, attack);
  const source = new AudioBufferSourceNode(v.ctx, { buffer: v.noise, playbackRate: 0.85 + Math.random() * 0.3 });
  const filter = new BiquadFilterNode(v.ctx, { type, frequency: freq, Q: q });
  if (freqTo !== undefined) {
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t + seconds);
  }
  source.connect(filter).connect(env);
  source.start(t, Math.random() * Math.max(0, v.noise.duration - seconds - 0.05));
  source.stop(t + seconds + 0.03);
}

/** Inharmonic ratios of struck steel: a bar, a plate, a heavy beam. */
export const STEEL = {
  bar: [1, 2.756, 5.404],
  plate: [1, 1.594, 2.136, 2.653],
  beam: [1, 2.32, 4.25, 6.63],
} as const;

/** Struck steel at `base` Hz: each partial quieter and shorter than the one below it. */
export function steel(v: Voice, delay: number, seconds: number, gain: number, base: number, ratios: readonly number[] = STEEL.bar): void {
  ratios.forEach((ratio, index) => {
    const fall = 1 / (1 + index * 0.9);
    tone(v, delay, seconds * fall, gain * fall, base * ratio, base * ratio * 0.995, { type: index === 0 ? "triangle" : "sine", attack: 0.001 });
  });
}

/** A crackle: `count` tiny bursts of bright noise spread over `spread` s (electric arcs). */
export function crackle(v: Voice, delay: number, spread: number, count: number, gain: number, freq = 5200): void {
  for (let k = 0; k < count; k += 1) noise(v, delay + Math.random() * spread, 0.012 + Math.random() * 0.02, gain * (0.5 + Math.random() * 0.5), "highpass", freq * (0.8 + Math.random() * 0.5), 0.9);
}
