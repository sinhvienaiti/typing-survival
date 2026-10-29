// Source: new for the kit: keyboard sound profiles on preloaded AudioBuffers (TYPING_FEEDBACK_REVIEW.md §4, §6; owner 29/10)
/**
 * Keypress sounds from recorded files (owner 29/10: every one made in the
 * Audio Lab, no downloaded packs). A keyboard profile is `key-01 … key-10`
 * and `space-01 … space-03`, loudness-matched across profiles, listed in a
 * `keys-manifest.json` beside them; the game gives the base URL
 * (`<base>/<profile>/keys-manifest.json`). Everything is fetched and decoded
 * before play: a key never waits on a file.
 *
 * Each play takes the next variant of a shuffled round (never the same twice
 * in a row), nudges pitch and level a little, and takes a voice: at most
 * `keyVoices` key sounds at once (the oldest is cut with a 4 ms fade), and a
 * separate `wordVoices` for the space set so a burst of keys never cuts a
 * word's sound. Letters (right, wrong or stray) play the key set; a word done
 * (and the spacebar) plays the space set. The hierarchy key < wrong-damped <
 * word < perfect < milestone is by level, inside the owner's two sets.
 *
 * "synth" profiles are the kit's code-made AudioCues through a stand-in the
 * Lab sets: for testing in the Lab only, never in a game.
 */
import type { TypingFxSink } from "./driver";
import { isMilestone } from "./intensity";

/** The two recorded sets of a keyboard profile. */
export const TYPING_SOUND_SETS = ["key", "space"] as const;
export type TypingSoundSet = (typeof TYPING_SOUND_SETS)[number];

/** What a sound is played for: the driver's calls (and the spacebar). */
export const TYPING_SOUND_EVENTS = ["key", "wrong", "stray", "space", "word", "perfect", "combo"] as const;
export type TypingSoundEvent = (typeof TYPING_SOUND_EVENTS)[number];

/** Each event's set and level (before the player's volume): keys quiet and dry, a word above them. */
export const TYPING_SOUND_MAP: Readonly<Record<TypingSoundEvent, { set: TypingSoundSet; gain: number }>> = {
  key: { set: "key", gain: 0.55 },
  wrong: { set: "key", gain: 0.42 },
  stray: { set: "key", gain: 0.32 },
  space: { set: "space", gain: 0.6 },
  word: { set: "space", gain: 0.68 },
  perfect: { set: "space", gain: 0.78 },
  combo: { set: "space", gain: 0.88 },
};

/** Files a keyboard profile has (owner 29/10): ten keys, three spaces; fewer still plays, the Lab lists the gap. */
export const TYPING_SOUND_SET: Readonly<Record<TypingSoundSet, { min: number; want: number }>> = {
  key: { min: 6, want: 10 },
  space: { min: 1, want: 3 },
};

/**
 * The five keyboard profiles, premium aluminium keyboards (owner 29/10, Codex ticket 182; the first
 * set was rejected, Clicky and Classic Spring are gone). Player names are English.
 */
export const KEYBOARD_PROFILES: readonly { readonly id: string; readonly name: string }[] = [
  { id: "creamy", name: "Creamy Linear" },
  { id: "thock", name: "Deep Thock" },
  { id: "marbly", name: "Marbly" },
  { id: "clack", name: "Clean Clack" },
  { id: "dome", name: "Soft Dome" },
];

export type TypingSoundProfile = {
  readonly id: string;
  readonly name: string;
  /** "audio-lab": files made by the pipeline; "synth": the Lab's labelled code stand-in (never in a game). */
  readonly source: "audio-lab" | "synth";
  readonly licence: string;
  readonly files: Partial<Record<TypingSoundSet, readonly string[]>>;
  /** Level per event, over TYPING_SOUND_MAP's. */
  readonly gain?: Partial<Record<TypingSoundEvent, number>>;
  /** ± playback-rate share (default 0.03) and ± level share (default 0.08) per play. */
  readonly pitch?: number;
  readonly level?: number;
};

const FILE = /(?:^|\/)(key|space)-(\d{2})\.(?:ogg|opus|webm|m4a|mp3|wav|flac)$/i;

/**
 * The files a `keys-manifest.json` names, as URLs under `base` (the profile's
 * folder). Any JSON shape works: every string that ends in `key-NN.<ext>` or
 * `space-NN.<ext>` is taken (a list, `files`, objects with `file`/`path`…),
 * sorted by number, duplicates dropped.
 */
export function keyboardFiles(manifest: unknown, base: string): Record<TypingSoundSet, string[]> {
  const found: Record<TypingSoundSet, Map<number, string>> = { key: new Map(), space: new Map() };
  const walk = (value: unknown, depth: number): void => {
    if (depth > 6 || value === null) return;
    if (typeof value === "string") {
      const m = FILE.exec(value.trim());
      if (m === null || /^[a-z]+:|^\/|\.\./i.test(value.trim())) return;
      const set = m[1]!.toLowerCase() as TypingSoundSet;
      const n = Number(m[2]);
      if (!found[set].has(n)) found[set].set(n, value.trim());
      return;
    }
    if (Array.isArray(value)) for (const item of value) walk(item, depth + 1);
    else if (typeof value === "object") for (const item of Object.values(value as Record<string, unknown>)) walk(item, depth + 1);
  };
  walk(manifest, 0);
  const root = base.endsWith("/") ? base : base + "/";
  const list = (set: TypingSoundSet): string[] => [...found[set].entries()].sort((a, b) => a[0] - b[0]).map(([, file]) => root + file);
  return { key: list("key"), space: list("space") };
}

export type KeyboardLoad = {
  id: string;
  /** "ready": every file in; "partial": plays, but fewer than the owner's set; "pending": nothing staged yet. */
  state: "ready" | "partial" | "pending";
  keys: number;
  spaces: number;
  missing: string[];
};

/**
 * A shuffled round of `n` variants: each plays once per round in random
 * order, and a new round never starts with the one that just played.
 */
export class VariantPicker {
  private readonly order: Int16Array;
  private cursor: number;
  private last = -1;

  constructor(readonly n: number, private readonly random: () => number = Math.random) {
    this.order = new Int16Array(Math.max(1, n));
    for (let i = 0; i < this.order.length; i += 1) this.order[i] = i;
    this.cursor = this.order.length;
  }

  next(): number {
    const n = this.order.length;
    if (n === 1) return 0;
    if (this.cursor >= n) {
      for (let i = n - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        const t = this.order[i]!;
        this.order[i] = this.order[j]!;
        this.order[j] = t;
      }
      if (this.order[0] === this.last) {
        const j = 1 + Math.floor(this.random() * (n - 1));
        const t = this.order[0]!;
        this.order[0] = this.order[j]!;
        this.order[j] = t;
      }
      this.cursor = 0;
    }
    this.last = this.order[this.cursor]!;
    this.cursor += 1;
    return this.last;
  }
}

/** `cap` voices on a clock in seconds: a free one, else the one that started first. */
export class VoicePool {
  readonly starts: Float64Array;
  readonly ends: Float64Array;
  stolen = 0;
  /** The last acquire cut a sounding voice. */
  stole = false;

  constructor(readonly cap: number) {
    this.starts = new Float64Array(cap).fill(-Infinity);
    this.ends = new Float64Array(cap).fill(-Infinity);
  }

  /** A voice for a sound of `duration` s from `now`: returns its slot; `stole` tells whether it cut one. */
  acquire(now: number, duration: number): number {
    let slot = -1;
    let oldest = Infinity;
    for (let i = 0; i < this.cap; i += 1) {
      if (this.ends[i]! <= now) {
        slot = i;
        break;
      }
      if (this.starts[i]! < oldest) {
        oldest = this.starts[i]!;
        slot = i;
      }
    }
    this.stole = this.ends[slot]! > now;
    if (this.stole) this.stolen += 1;
    this.starts[slot] = now;
    this.ends[slot] = now + duration;
    return slot;
  }

  busy(slot: number, now: number): boolean {
    return this.ends[slot]! > now;
  }

  active(now: number): number {
    let n = 0;
    for (let i = 0; i < this.cap; i += 1) if (this.ends[i]! > now) n += 1;
    return n;
  }
}

export type TypingSoundsOptions = {
  /** The game's context (shared), or a function that makes it on resume(); default its own. */
  context?: AudioContext | (() => AudioContext);
  /** Where the sounds play into (the game's sfx bus); default the destination. */
  destination?: AudioNode | (() => AudioNode);
  random?: () => number;
  keyVoices?: number;
  wordVoices?: number;
};

type Loaded = { profile: TypingSoundProfile; buffers: Partial<Record<TypingSoundSet, AudioBuffer[]>>; pickers: Partial<Record<TypingSoundSet, VariantPicker>> };

/** What a "synth" profile plays instead of files (the Lab's labelled stand-in). */
export type SoundStandIn = (event: TypingSoundEvent, step: number, gain: number) => void;

const STEAL_FADE_S = 0.004;

export class TypingSounds implements TypingFxSink {
  private ctx: AudioContext | null = null;
  private own = false;
  private out: GainNode | null = null;
  private readonly loaded = new Map<string, Loaded>();
  private current: Loaded | null = null;
  private readonly keyPool: VoicePool;
  private readonly wordPool: VoicePool;
  private keyGains: GainNode[] = [];
  private wordGains: GainNode[] = [];
  private readonly keySources: (AudioBufferSourceNode | null)[];
  private readonly wordSources: (AudioBufferSourceNode | null)[];
  private readonly random: () => number;
  private volume = 0.7;
  muted = false;
  /** Plays a "synth" profile (set by the Lab only). */
  standIn: SoundStandIn | null = null;
  /** Counts for the Lab's readout. */
  readonly stats = { played: 0, standIn: 0, missing: 0 };

  constructor(private readonly options: TypingSoundsOptions = {}) {
    this.random = options.random ?? Math.random;
    this.keyPool = new VoicePool(Math.max(1, options.keyVoices ?? 6));
    this.wordPool = new VoicePool(Math.max(1, options.wordVoices ?? 2));
    this.keySources = new Array<AudioBufferSourceNode | null>(this.keyPool.cap).fill(null);
    this.wordSources = new Array<AudioBufferSourceNode | null>(this.wordPool.cap).fill(null);
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Browsers start audio on a gesture: call on the first key or click. Makes the voices once. */
  resume(): AudioContext {
    if (this.ctx === null) {
      const given = this.options.context;
      const ctx = given === undefined ? new AudioContext() : typeof given === "function" ? given() : given;
      this.own = given === undefined;
      this.ctx = ctx;
      const target = this.options.destination;
      this.out = new GainNode(ctx, { gain: this.volume });
      this.out.connect(target === undefined ? ctx.destination : typeof target === "function" ? target() : target);
      this.keyGains = Array.from({ length: this.keyPool.cap }, () => this.voice(ctx));
      this.wordGains = Array.from({ length: this.wordPool.cap }, () => this.voice(ctx));
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private voice(ctx: AudioContext): GainNode {
    const gain = new GainNode(ctx, { gain: 0 });
    gain.connect(this.out!);
    return gain;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0));
    if (this.out !== null) this.out.gain.value = this.volume;
  }

  /**
   * Fetches and decodes every file of `profile` before play. Missing or
   * broken files are listed, the rest load.
   */
  async load(profile: TypingSoundProfile, fetchBytes: (url: string) => Promise<ArrayBuffer> = defaultFetch): Promise<{ loaded: number; missing: string[] }> {
    const entry: Loaded = { profile, buffers: {}, pickers: {} };
    const missing: string[] = [];
    let loaded = 0;
    if (profile.source !== "synth") {
      const ctx = this.resume();
      for (const set of TYPING_SOUND_SETS) {
        const urls = profile.files[set] ?? [];
        const buffers: AudioBuffer[] = [];
        await Promise.all(
          urls.map(async (url, index) => {
            try {
              buffers[index] = await ctx.decodeAudioData(await fetchBytes(url));
              loaded += 1;
            } catch {
              missing.push(url);
            }
          }),
        );
        const kept = buffers.filter((buffer): buffer is AudioBuffer => buffer !== undefined);
        if (kept.length > 0) {
          entry.buffers[set] = kept;
          entry.pickers[set] = new VariantPicker(kept.length, this.random);
        }
      }
    }
    this.loaded.set(profile.id, entry);
    if (this.current?.profile.id === profile.id || this.current === null) this.current = entry;
    return { loaded, missing };
  }

  /**
   * Loads keyboard profile `id` from `<base>/<id>/keys-manifest.json` (the
   * Audio Lab's layout). No manifest, or no file in it: "pending", and the
   * profile stays silent; nothing stands in for it.
   */
  async loadKeyboard(base: string, id: string, name = id, fetchJson: (url: string) => Promise<unknown> = defaultJson, fetchBytes: (url: string) => Promise<ArrayBuffer> = defaultFetch): Promise<KeyboardLoad> {
    const folder = (base.endsWith("/") ? base : base + "/") + encodeURIComponent(id) + "/";
    let manifest: unknown = null;
    try {
      manifest = await fetchJson(folder + "keys-manifest.json");
    } catch {
      manifest = null;
    }
    const files = manifest === null ? { key: [], space: [] } : keyboardFiles(manifest, folder);
    if (files.key.length === 0 && files.space.length === 0) return { id, state: "pending", keys: 0, spaces: 0, missing: [] };
    const result = await this.load({ id, name, source: "audio-lab", licence: "project-owned (Audio Lab)", files }, fetchBytes);
    const keys = this.loaded.get(id)?.buffers.key?.length ?? 0;
    const spaces = this.loaded.get(id)?.buffers.space?.length ?? 0;
    const full = keys >= TYPING_SOUND_SET.key.want && spaces >= TYPING_SOUND_SET.space.want;
    return { id, state: keys === 0 ? "pending" : full ? "ready" : "partial", keys, spaces, missing: result.missing };
  }

  /** Switches to a loaded profile ("off" or unknown: silent). */
  use(id: string): boolean {
    this.current = this.loaded.get(id) ?? null;
    return this.current !== null;
  }

  get profile(): TypingSoundProfile | null {
    return this.current?.profile ?? null;
  }

  /** Plays the sound of `event` now (its set, its level); `step` is the letter's place in the word. False: nothing played. */
  play(event: TypingSoundEvent, step = 0): boolean {
    const entry = this.current;
    if (entry === null || this.muted) return false;
    const profile = entry.profile;
    const row = TYPING_SOUND_MAP[event];
    const base = profile.gain?.[event] ?? row.gain;
    if (profile.source === "synth") {
      if (this.standIn === null) return false;
      this.standIn(event, step, base * this.volume);
      this.stats.standIn += 1;
      return true;
    }
    if (this.ctx === null) return false;
    // A profile without its space set plays a key for a word: never silence on a finished word.
    const set: TypingSoundSet = entry.buffers[row.set] !== undefined ? row.set : row.set === "space" ? "key" : "space";
    const buffers = entry.buffers[set];
    if (buffers === undefined) {
      this.stats.missing += 1;
      return false;
    }
    const buffer = buffers[entry.pickers[set]!.next()]!;
    const pitch = profile.pitch ?? 0.03;
    const level = profile.level ?? 0.08;
    const rate = 1 + (this.random() * 2 - 1) * pitch;
    const gain = Math.max(0, base * (1 + (this.random() * 2 - 1) * level));
    const words = set === "space";
    const pool = words ? this.wordPool : this.keyPool;
    const gains = words ? this.wordGains : this.keyGains;
    const sources = words ? this.wordSources : this.keySources;
    const ctx = this.ctx;
    let t = ctx.currentTime;
    const slot = pool.acquire(t, buffer.duration / rate);
    const voice = gains[slot]!.gain;
    const old = sources[slot];
    voice.cancelScheduledValues(t);
    if (pool.stole && old !== null && old !== undefined) {
      // Cut the oldest voice with a short fade, then start on the same voice.
      voice.setValueAtTime(voice.value, t);
      voice.linearRampToValueAtTime(0, t + STEAL_FADE_S);
      try {
        old.stop(t + STEAL_FADE_S);
      } catch {
        // Already stopped.
      }
      t += STEAL_FADE_S;
    }
    voice.setValueAtTime(gain, t);
    const source = new AudioBufferSourceNode(ctx, { buffer, playbackRate: rate });
    source.connect(gains[slot]!);
    source.start(t);
    sources[slot] = source;
    this.stats.played += 1;
    return true;
  }

  /** Voices sounding now (keys and words). */
  activeVoices(): number {
    if (this.ctx === null) return 0;
    const t = this.ctx.currentTime;
    return this.keyPool.active(t) + this.wordPool.active(t);
  }

  get stolen(): number {
    return this.keyPool.stolen + this.wordPool.stolen;
  }

  // The sink side: the same driver calls as the focus strip.
  key(index: number): void {
    this.play("key", index);
  }

  wrong(): void {
    this.play("wrong");
  }

  stray(): void {
    this.play("stray");
  }

  /** The spacebar (a game that types phrases or queues words). */
  space(): void {
    this.play("space");
  }

  complete(perfect: boolean, combo: number): void {
    this.play(isMilestone(combo) ? "combo" : perfect ? "perfect" : "word");
  }

  dispose(): void {
    for (const source of [...this.keySources, ...this.wordSources]) {
      try {
        source?.stop();
      } catch {
        // Already stopped.
      }
    }
    this.out?.disconnect();
    if (this.own && this.ctx !== null) void this.ctx.close();
    this.ctx = null;
    this.out = null;
    this.loaded.clear();
    this.current = null;
  }
}

async function defaultFetch(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url + ": " + response.status);
  return response.arrayBuffer();
}

async function defaultJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(url + ": " + response.status);
  return response.json();
}

/** Each set of a profile against the owner's ten keys and three spaces: what the Audio Lab still owes. */
export function profileGaps(profile: TypingSoundProfile): { set: TypingSoundSet; have: number; min: number; want: number }[] {
  return TYPING_SOUND_SETS.map((set) => ({ set, have: profile.files[set]?.length ?? 0, ...TYPING_SOUND_SET[set] })).filter((row) => row.have < row.want);
}
