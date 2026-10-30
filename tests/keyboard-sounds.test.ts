import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applyKeyboardLevels, defaultKeyboard, keyboardSink, KEYS_BASE, loadKeyboardChoices, loadSavedKeyboard, restoreKeyboardChoice } from "../src/app/keyboard";
import { applyQuick, DEFAULT_KEYBOARD_SOUND, loadSettings } from "../src/app/settings";
import { KEYBOARD_DECODE_BATCH_SIZE, keyboardFiles, KeyboardSoundPreview, TypingFxDriver, TypingSounds, type KeyboardSoundChoice } from "../src/kit/feedback/typing-fx";
import { ThemeAudio } from "../src/audio/theme-audio";

// Read the shipped media through fetch's interface; these tests never use the network.
const json = async (url: string): Promise<unknown> => JSON.parse(readFileSync("public" + url, "utf8"));
/** The shipped root catalogue (owner 30/10: 32 Firefly sets in seven families). */
const CATALOGUE = (JSON.parse(readFileSync("public" + KEYS_BASE + "keys-manifest.json", "utf8")) as { profiles: { id: string; family: string; order: number }[] }).profiles;
const IDS = [...CATALOGUE].sort((a, b) => a.order - b.order).map((p) => p.id);
const FAMILIES = ["Deep", "Warm", "Rounded", "Solid", "Crisp", "Clear", "Bright Clack"];
/** The 29/10 set ids, kept by the 30/10 catalogue as the first set of each family. */
const FIRST_OF_FAMILY = ["deep", "warm", "rounded", "solid", "crisp", "clear", "bright-clack"];
let choices: readonly KeyboardSoundChoice[];
beforeAll(async () => { choices = await loadKeyboardChoices(json); });

class Param {
  constructor(public value = 1) {}
  cancelScheduledValues = vi.fn();
  setValueAtTime(value: number): void { this.value = value; }
  linearRampToValueAtTime = vi.fn();
}
class Gain {
  readonly gain: Param;
  target: unknown;
  constructor(ctx: Context, options?: { gain?: number }) {
    this.gain = new Param(options?.gain ?? 1);
    ctx.gains.push(this);
  }
  connect(target: unknown): unknown { this.target = target; return target; }
  disconnect = vi.fn();
}
class Source {
  buffer: { url?: string } | null;
  target: Gain | null = null;
  onended: (() => void) | null = null;
  constructor(ctx: Context, options?: { buffer?: { url?: string } }) {
    this.buffer = options?.buffer ?? null;
    ctx.sources.push(this);
  }
  connect(target: Gain): void { this.target = target; }
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
}
class Context {
  sampleRate = 48000;
  get currentTime(): number { return Date.now() / 1000; }
  state = "running";
  destination = {};
  gains: Gain[] = [];
  sources: Source[] = [];
  bytes = new Map<ArrayBuffer, string>();
  decodeAudioData = vi.fn(async (bytes: ArrayBuffer) => ({ duration: 1, url: this.bytes.get(bytes) }) as unknown as AudioBuffer);
  resume = vi.fn(async () => { this.state = "running"; });
  createGain(): Gain { return new Gain(this); }
  createBufferSource(): Source { return new Source(this); }
  createBuffer(_channels: number, length: number): AudioBuffer { return { getChannelData: () => new Float32Array(length) } as unknown as AudioBuffer; }
}
let ctx: Context;
let requests: string[];
const players: TypingSounds[] = [];
const previews: KeyboardSoundPreview[] = [];
const flush = async (): Promise<void> => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
/** A set's 70–88 files decode in batches of 16 with a macrotask between them: run the fake clock dry. */
const settle = async (): Promise<void> => { await vi.runAllTimersAsync(); await flush(); };
const settled = async <T>(work: Promise<T>): Promise<T> => { await settle(); return work; };
const packFiles = async (c: KeyboardSoundChoice) => keyboardFiles(await json(c.manifest!), c.manifest!.slice(0, c.manifest!.lastIndexOf("/") + 1));
const player = (): TypingSounds => {
  const sounds = new TypingSounds({ context: ctx as unknown as AudioContext, random: () => 0.5 });
  players.push(sounds);
  return sounds;
};
const choice = (id: string): KeyboardSoundChoice => choices.find((c) => c.value === id)!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  ctx = new Context();
  requests = [];
  vi.stubGlobal("GainNode", Gain);
  vi.stubGlobal("AudioBufferSourceNode", Source);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    requests.push(url);
    if (!url.startsWith(KEYS_BASE)) throw new Error("Unexpected asset: " + url);
    return {
      ok: true,
      json: () => json(url),
      arrayBuffer: async () => {
        const data = readFileSync("public" + url);
        const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        ctx.bytes.set(bytes, url);
        return bytes;
      },
    };
  }));
});
afterEach(() => {
  for (const preview of previews.splice(0)) preview.destroy();
  for (const sounds of players.splice(0)) sounds.dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Last Line Firefly catalogue and save", () => {
  it("reads one root catalogue, offers Off + Relay + 32 sets in seven families, and resolves all 2,652 samples and 32 previews", async () => {
    const result = await loadKeyboardChoices();
    expect(result.map((c) => c.value)).toEqual(["off", "relay", ...IDS]);
    expect(IDS).toHaveLength(32);
    expect(requests).toEqual([KEYS_BASE + "keys-manifest.json"]);
    let count = 0;
    for (const pack of result.filter((c) => c.manifest)) {
      const files = await packFiles(pack);
      expect(files.key.length, pack.value).toBeGreaterThanOrEqual(70);
      expect(files.key.length, pack.value).toBeLessThanOrEqual(80);
      expect(files.space, pack.value).toHaveLength(8);
      for (const url of [...files.key, ...files.space, pack.preview!]) {
        expect(url).toMatch(new RegExp("^" + KEYS_BASE + pack.value + "/(key|space)-\\d{2}\\.ogg$|/preview\\.ogg$"));
        expect(readFileSync("public" + url).subarray(0, 4).toString()).toBe("OggS");
      }
      count += files.key.length + files.space.length;
    }
    expect(count).toBe(2652);
  });

  it("passes each set's family through for the kit's grouped list: Off and Relay first with none, then one contiguous run per family", () => {
    expect(choices.slice(0, 2).map((c) => [c.value, c.family])).toEqual([["off", undefined], ["relay", undefined]]);
    const sets = choices.slice(2);
    expect(sets.every((c) => typeof c.family === "string" && c.manifest && c.preview)).toBe(true);
    const runs = sets.filter((c, i) => i === 0 || sets[i - 1]!.family !== c.family);
    expect(runs.map((c) => c.family)).toEqual(FAMILIES);
    expect(runs.map((c) => c.value)).toEqual(FIRST_OF_FAMILY);
    expect(sets.map((c) => c.family)).toEqual(CATALOGUE.map((p) => p.family));
    expect(choice(DEFAULT_KEYBOARD_SOUND)).toMatchObject({ family: "Bright Clack", label: "Bright Clack Velvet" });
  });

  it("a missing catalogue leaves Off and Relay available, without the five pending packs", async () => {
    expect((await loadKeyboardChoices(async () => { throw new Error("missing"); })).map((c) => c.value)).toEqual(["off", "relay"]);
  });

  it("repairs a removed id to the default (Bright Clack), round-trips the save, and preserves Off and Relay", () => {
    const settings = loadSettings({ typingFx: { soundProfile: "thock", volume: 0.3, style: "rune" } });
    expect(restoreKeyboardChoice(settings, choices)).toBe(true);
    expect(settings.typingFx).toMatchObject({ soundProfile: DEFAULT_KEYBOARD_SOUND, volume: 0.3, style: "rune" });
    expect(loadSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
    for (const id of ["off", "relay", ...choices.filter((c) => c.manifest).map((c) => c.value)]) {
      settings.typingFx.soundProfile = id;
      expect(restoreKeyboardChoice(settings, choices)).toBe(false);
      expect(loadSettings(JSON.parse(JSON.stringify(settings))).typingFx.soundProfile).toBe(id);
    }
  });

  it("uses the first catalogue pack if the default disappears, and Relay if all media is absent", () => {
    expect(defaultKeyboard(choices.filter((c) => c.value !== DEFAULT_KEYBOARD_SOUND))).toBe("deep");
    expect(defaultKeyboard(choices.filter((c) => !c.manifest))).toBe("relay");
  });
});

describe("Last Line sampled keyboard", () => {
  it("prepares sample decoding silently, then starts music once on the first gesture", () => {
    const theme = new ThemeAudio({ sfx: 0.7, music: 0.5 });
    vi.spyOn(theme.scene, "unlock").mockImplementation(() => {});
    vi.spyOn(theme.scene, "synth").mockImplementation((_id, build) => { build(ctx as unknown as AudioContext, new Gain(ctx) as unknown as AudioNode, {} as AudioBuffer, 0); });
    vi.stubGlobal("DynamicsCompressorNode", Gain);
    const music = vi.spyOn(theme.music, "start").mockImplementation(() => {});
    theme.prepare();
    theme.prepare();
    theme.key(1, 0, false);
    theme.xung(0, true);
    expect(theme.context).toBe(ctx);
    expect(theme.ready).toBe(false);
    expect(theme.played.size).toBe(0);
    expect(music).not.toHaveBeenCalled();
    theme.resume();
    theme.resume();
    expect(theme.ready).toBe(true);
    expect(music).toHaveBeenCalledTimes(1);
    expect(theme.played.get("music.calm")).toBe(1);
  });

  it.each(IDS)("selects %s into the gameplay player, saves it, and restores it on reload", async (id) => {
    const settings = loadSettings(null);
    const sounds = player();
    const preview = new KeyboardSoundPreview({ sounds, levels: () => ({ master: 1, keyboard: 1 }) });
    previews.push(preview);
    expect(applyQuick(settings, "keyboard", id)).toBe(true);
    applyKeyboardLevels(sounds, settings);
    preview.select(choice(id));
    await settle();
    expect(sounds.profile?.id).toBe(id);
    const files = await packFiles(choice(id));
    expect(requests.filter((url) => /\/(key|space)-\d+\.ogg$/.test(url))).toHaveLength(files.key.length + files.space.length);
    expect(requests.every((url) => url.startsWith(KEYS_BASE + id + "/"))).toBe(true);
    sounds.key(0);
    expect(ctx.sources.at(-1)?.buffer?.url).toMatch(new RegExp("/" + id + "/key-\\d{2}\\.ogg$"));
    sounds.space();
    expect(ctx.sources.at(-1)?.buffer?.url).toMatch(new RegExp("/" + id + "/space-\\d{2}\\.ogg$"));
    const saved = loadSettings(JSON.parse(JSON.stringify(settings)));
    const reloaded = player();
    await settled(loadSavedKeyboard(reloaded, choices, () => saved.typingFx.soundProfile));
    expect(reloaded.profile?.id).toBe(id);
  });

  it("plays one key per right letter including the final one; Space takes a space sample; no variant repeats within 8 strokes", async () => {
    const settings = loadSettings(null);
    const sounds = player();
    await settled(loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile));
    const driver = new TypingFxDriver([keyboardSink(sounds)]);
    for (let typed = 1; typed <= 3; typed++) driver.progress({ kind: typed === 3 ? "done" : "advance", word: 1, text: "cat", meaning: "", typed, combo: 1 });
    expect(ctx.sources).toHaveLength(3);
    expect(ctx.sources.every((s) => s.buffer?.url?.includes("/key-"))).toBe(true);
    const seen: string[] = [];
    // Three rounds of the default set's 80 keys: the shuffle's round boundaries too.
    for (let i = 0; i < 240; i++) {
      sounds.key(i);
      seen.push(ctx.sources.at(-1)!.buffer!.url!);
    }
    expect(new Set(seen).size).toBe((await packFiles(choice(DEFAULT_KEYBOARD_SOUND))).key.length);
    expect(seen.every((url, i) => !seen.slice(Math.max(0, i - 8), i).includes(url))).toBe(true);
    sounds.space();
    expect(ctx.sources.at(-1)?.buffer?.url).toContain("/space-");
  });

  it("uses Master × Keyboard volume at the destination, even when Effects is zero", async () => {
    const settings = loadSettings({ masterVolume: 0.5, sfxVolume: 0, typingFx: { volume: 0.4 } });
    const sounds = player();
    applyKeyboardLevels(sounds, settings);
    await settled(loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile));
    sounds.key(0);
    expect(sounds.stats.played).toBe(1);
    expect(ctx.gains[0]!.gain.value).toBeCloseTo(0.2);
    expect(ctx.gains[0]!.target).toBe(ctx.destination);
  });

  it.each(["off", "relay", "muted", "masterZero", "keyboardZero"])("silences the sampled player for %s", async (mode) => {
    const settings = loadSettings(null);
    const sounds = player();
    await settled(loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile));
    if (mode === "off" || mode === "relay") settings.typingFx.soundProfile = mode;
    if (mode === "muted") settings.muted = true;
    if (mode === "masterZero") settings.masterVolume = 0;
    if (mode === "keyboardZero") settings.typingFx.volume = 0;
    applyKeyboardLevels(sounds, settings);
    sounds.key(0);
    sounds.space();
    expect(sounds.stats.played).toBe(0);
    expect(ctx.sources).toHaveLength(0);
  });

  it.each(["warm-silk", "off"])("a late startup load cannot replace a newly selected %s, and its own set is released", async (id) => {
    const settings = loadSettings(null);
    const sounds = player();
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const fetch = globalThis.fetch;
    // Hold the saved (default) set's first sample, so the player picks another set mid-load.
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/" + DEFAULT_KEYBOARD_SOUND + "/key-01.ogg")) await gate;
      return fetch(url);
    });
    const loading = loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile);
    settings.typingFx.soundProfile = id;
    applyKeyboardLevels(sounds, settings);
    const preview = new KeyboardSoundPreview({ sounds, levels: () => ({ master: 1, keyboard: 1 }) });
    previews.push(preview);
    preview.select(choice(id));
    await settle();
    open();
    await settled(loading);
    expect(sounds.profile?.id ?? "off").toBe(id);
    expect(requests.some((url) => url.includes("/" + DEFAULT_KEYBOARD_SOUND + "/key-80.ogg"))).toBe(true);
    // The startup set finished decoding but is not kept: its buffers are gone.
    expect(sounds.use(DEFAULT_KEYBOARD_SOUND)).toBe(false);
  });

  it("startup is ready once the saved set's first batch is decoded: those samples play while the rest of the set loads", async () => {
    const settings = loadSettings(null);
    const sounds = player();
    const files = await packFiles(choice(DEFAULT_KEYBOARD_SOUND));
    const first = new Set(files.key.slice(0, KEYBOARD_DECODE_BATCH_SIZE));
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const fetch = globalThis.fetch;
    // Hold every file past the first batch: sixteen keys are in, the other 72 files are not.
    const rest = new Set([...files.key.slice(KEYBOARD_DECODE_BATCH_SIZE), ...files.space]);
    vi.stubGlobal("fetch", async (url: string) => {
      if (rest.has(url)) await gate;
      return fetch(url);
    });
    let ready = 0;
    let done = false;
    const loading = loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile, () => { ready += 1; }).then(() => { done = true; });
    await settle();
    expect(ready).toBe(1);
    expect(done).toBe(false);
    expect(sounds.profile?.id).toBe(DEFAULT_KEYBOARD_SOUND);
    for (let i = 0; i < KEYBOARD_DECODE_BATCH_SIZE; i++) {
      sounds.key(i);
      expect(first.has(ctx.sources.at(-1)!.buffer!.url!)).toBe(true);
    }
    // No space sample yet: a key stands in, never silence.
    sounds.space();
    expect(first.has(ctx.sources.at(-1)!.buffer!.url!)).toBe(true);
    open();
    await settled(loading);
    expect(done).toBe(true);
    expect(ready).toBe(1);
    expect(sounds.profile?.id).toBe(DEFAULT_KEYBOARD_SOUND);
    const later: string[] = [];
    for (let i = 0; i < files.key.length; i++) {
      sounds.key(i);
      later.push(ctx.sources.at(-1)!.buffer!.url!);
    }
    expect(later.some((url) => !first.has(url))).toBe(true);
    sounds.space();
    expect(ctx.sources.at(-1)?.buffer?.url).toContain("/space-");
  });

  it.each(["warm-silk", "off"])("a %s choice made once the startup set already plays still wins, and the startup set is released", async (id) => {
    const settings = loadSettings(null);
    const sounds = player();
    const files = await packFiles(choice(DEFAULT_KEYBOARD_SOUND));
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const fetch = globalThis.fetch;
    const rest = new Set([...files.key.slice(KEYBOARD_DECODE_BATCH_SIZE), ...files.space]);
    vi.stubGlobal("fetch", async (url: string) => {
      if (rest.has(url)) await gate;
      return fetch(url);
    });
    const loading = loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile);
    await settle();
    expect(sounds.profile?.id).toBe(DEFAULT_KEYBOARD_SOUND);
    settings.typingFx.soundProfile = id;
    applyKeyboardLevels(sounds, settings);
    const preview = new KeyboardSoundPreview({ sounds, levels: () => ({ master: 1, keyboard: 1 }) });
    previews.push(preview);
    preview.select(choice(id));
    await settle();
    open();
    await settled(loading);
    expect(sounds.profile?.id ?? "off").toBe(id);
    expect(sounds.use(DEFAULT_KEYBOARD_SOUND)).toBe(false);
  });

  it.each(["off", "relay", "missing"])("startup is ready at once when the saved choice has no set to decode (%s)", async (id) => {
    const list = id === "missing" ? [...choices, { value: "missing", label: "Missing", manifest: KEYS_BASE + "missing/keys-manifest.json" }] : choices;
    const sounds = player();
    let ready = 0;
    await settled(loadSavedKeyboard(sounds, list, () => id, () => { ready += 1; }));
    expect(ready).toBe(1);
    expect(sounds.profile).toBeNull();
    expect(requests.filter((url) => url.endsWith(".ogg"))).toHaveLength(0);
  });

  it("hover/focus previews use the same player, dwell 150 ms, play 1 s at Master × Keyboard and fade on leave", async () => {
    const sounds = player();
    const preview = new KeyboardSoundPreview({ sounds, levels: () => ({ master: 0.5, keyboard: 0.4 }) });
    previews.push(preview);
    preview.unlock();
    preview.preview(choice("deep"));
    await vi.advanceTimersByTimeAsync(149);
    expect(requests).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(requests).toEqual([KEYS_BASE + "deep/preview.ogg"]);
    const source = ctx.sources[0]!;
    expect(source.start).toHaveBeenCalledWith(0.15, 0, 1);
    expect(source.target!.gain.value).toBeCloseTo(0.2);
    expect(source.target!.target).toBe(ctx.destination);
    preview.stop();
    expect(source.target!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.18);
  });

  it("leaving during dwell or muting Master prevents preview playback", async () => {
    const levels = { master: 1, keyboard: 1, muted: false };
    const preview = new KeyboardSoundPreview({ sounds: player(), levels: () => levels });
    previews.push(preview);
    preview.preview(choice("deep"));
    preview.stop();
    await vi.advanceTimersByTimeAsync(200);
    levels.muted = true;
    preview.preview(choice("warm"));
    await vi.advanceTimersByTimeAsync(200);
    expect(ctx.sources).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });
});
