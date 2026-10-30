import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applyKeyboardLevels, defaultKeyboard, keyboardSink, KEYS_BASE, loadKeyboardChoices, loadSavedKeyboard, restoreKeyboardChoice } from "../src/app/keyboard";
import { applyQuick, DEFAULT_KEYBOARD_SOUND, loadSettings } from "../src/app/settings";
import { KEYBOARD_DECODE_BATCH_SIZE, KEYBOARD_FIRST_BATCH_SPACES, keyboardFiles, KeyboardSoundPreview, TypingFxDriver, TypingSounds, type KeyboardSoundChoice } from "../src/kit/feedback/typing-fx";
import { ThemeAudio } from "../src/audio/theme-audio";

// Read the shipped media through fetch's interface; these tests never use the network.
const json = async (url: string): Promise<unknown> => JSON.parse(readFileSync("public" + url, "utf8"));
/** The shipped root catalogue (owner 30/10: 34 Firefly sets in seven families). */
const CATALOGUE = (JSON.parse(readFileSync("public" + KEYS_BASE + "keys-manifest.json", "utf8")) as { profiles: { id: string; name: string; family: string; score: number | null; ownerPick?: boolean; order: number }[] }).profiles;
const IDS = [...CATALOGUE].sort((a, b) => a.order - b.order).map((p) => p.id);
const FAMILIES = ["Deep", "Warm", "Rounded", "Solid", "Crisp", "Clear", "Bright Clack"];
const FAMILY_SIZES = { Deep: 3, Warm: 6, Rounded: 1, Solid: 3, Crisp: 7, Clear: 4, "Bright Clack": 10 };
/**
 * Owner 30/10: owner picks with no score (the 218 metric penalises the long
 * tails the owner wants), 8 spaces each, stereo 48 kHz, natural tails up to
 * 450 ms (spaces up to 535 ms). Raindrop Tile, the 33rd set, sits in Crisp
 * after Crisp Silk; Hail Stone, the 34th, in Solid after Solid Amber.
 */
const OWNER_PICKS = [
  { id: "hail-stone", name: "Hail Stone", family: "Solid", order: 12, keys: 25, after: "solid-amber", next: "crisp" },
  { id: "raindrop-tile", name: "Raindrop Tile", family: "Crisp", order: 19, keys: 17, after: "crisp-silk", next: "clear" },
] as const;
const PICK_IDS: readonly string[] = OWNER_PICKS.map((p) => p.id);
/** An Ogg Vorbis file's channels and length: its identification header, and the last page's granule over the sample rate. */
const ogg = (data: Buffer): { channels: number; rate: number; seconds: number } => {
  const id = data.indexOf("\x01vorbis", 0, "latin1");
  const rate = data.readUInt32LE(id + 12);
  return { channels: data[id + 11]!, rate, seconds: Number(data.readBigInt64LE(data.lastIndexOf("OggS") + 6)) / rate };
};
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
  it("reads one root catalogue, offers Off + Relay + 34 sets in seven families, and resolves all 2,710 samples and 34 previews", async () => {
    const result = await loadKeyboardChoices();
    expect(result.map((c) => c.value)).toEqual(["off", "relay", ...IDS]);
    expect(IDS).toHaveLength(34);
    expect(new Set(IDS).size).toBe(34);
    expect(CATALOGUE.map((p) => p.order).sort((a, b) => a - b)).toEqual([...Array(34).keys()]);
    expect(requests).toEqual([KEYS_BASE + "keys-manifest.json"]);
    let count = 0;
    for (const pack of result.filter((c) => c.manifest)) {
      const files = await packFiles(pack);
      // Exactly the files the set's own manifest lists, by set.
      const own = (await json(pack.manifest!) as { files: { file: string; set: string }[] }).files;
      for (const set of ["key", "space"] as const) expect(files[set], pack.value).toEqual(own.filter((f) => f.set === set).map((f) => KEYS_BASE + pack.value + "/" + f.file).sort());
      const pick = OWNER_PICKS.find((p) => p.id === pack.value);
      if (pick) expect(files.key, pack.value).toHaveLength(pick.keys);
      else {
        expect(files.key.length, pack.value).toBeGreaterThanOrEqual(70);
        expect(files.key.length, pack.value).toBeLessThanOrEqual(80);
      }
      expect(files.space, pack.value).toHaveLength(8);
      for (const url of [...files.key, ...files.space, pack.preview!]) {
        expect(url).toMatch(new RegExp("^" + KEYS_BASE + pack.value + "/(key|space)-\\d{2}\\.ogg$|/preview\\.ogg$"));
        expect(readFileSync("public" + url).subarray(0, 4).toString()).toBe("OggS");
      }
      count += files.key.length + files.space.length;
    }
    expect(count).toBe(2710);
  });

  it.each(OWNER_PICKS)("$name, an owner pick with no score, joins $family right after $after and before $next", (pick) => {
    expect(CATALOGUE.find((p) => p.id === pick.id)).toMatchObject({ name: pick.name, family: pick.family, score: null, ownerPick: true, order: pick.order });
    expect(IDS.indexOf(pick.id)).toBe(pick.order);
    expect(IDS.slice(IDS.indexOf(pick.after), IDS.indexOf(pick.after) + 3)).toEqual([pick.after, pick.id, pick.next]);
    // No score is invented: the choice carries none, and nothing disables or annotates it.
    expect(choice(pick.id)).toEqual({ value: pick.id, label: pick.name, family: pick.family, manifest: KEYS_BASE + pick.id + "/keys-manifest.json", preview: KEYS_BASE + pick.id + "/preview.ogg" });
    expect(choices.filter((c) => c.manifest && !PICK_IDS.includes(c.value)).every((c) => typeof c.score === "number")).toBe(true);
  });

  it("Hail Stone closes Solid (Solid Velvet, Solid Amber, Hail Stone) and Crisp follows it", () => {
    const solid = choices.filter((c) => c.family === "Solid");
    expect(solid.map((c) => [c.value, c.label])).toEqual([["solid", "Solid Velvet"], ["solid-amber", "Solid Amber"], ["hail-stone", "Hail Stone"]]);
    const at = choices.indexOf(solid.at(-1)!);
    expect(choices.slice(at - 2, at + 2).map((c) => c.family)).toEqual(["Solid", "Solid", "Solid", "Crisp"]);
    expect(choices[at + 1]?.value).toBe("crisp");
  });

  it("passes each set's family through for the kit's grouped list: Off and Relay first with none, then one contiguous run per family", () => {
    expect(choices.slice(0, 2).map((c) => [c.value, c.family])).toEqual([["off", undefined], ["relay", undefined]]);
    const sets = choices.slice(2);
    expect(sets.every((c) => typeof c.family === "string" && c.manifest && c.preview)).toBe(true);
    const runs = sets.filter((c, i) => i === 0 || sets[i - 1]!.family !== c.family);
    expect(runs.map((c) => c.family)).toEqual(FAMILIES);
    expect(runs.map((c) => c.value)).toEqual(FIRST_OF_FAMILY);
    expect(sets.map((c) => c.family)).toEqual([...CATALOGUE].sort((a, b) => a.order - b.order).map((p) => p.family));
    expect(Object.fromEntries(FAMILIES.map((f) => [f, sets.filter((c) => c.family === f).length]))).toEqual(FAMILY_SIZES);
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

  it.each(OWNER_PICKS)("selecting $name loads exactly its manifest, its preview and its $keys keys and 8 spaces (stereo 48 kHz), and plays only those", async (pick) => {
    const sounds = player();
    const preview = new KeyboardSoundPreview({ sounds, levels: () => ({ master: 1, keyboard: 1 }) });
    previews.push(preview);
    preview.select(choice(pick.id));
    await settle();
    const dir = KEYS_BASE + pick.id + "/";
    const numbered = (set: string, n: number): string[] => Array.from({ length: n }, (_, i) => dir + set + "-" + String(i + 1).padStart(2, "0") + ".ogg");
    const samples = [...numbered("key", pick.keys), ...numbered("space", 8)];
    expect([...requests].sort()).toEqual([dir + "keys-manifest.json", dir + "preview.ogg", ...samples].sort());
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(pick.keys + 8 + 1);
    for (const url of [...samples, dir + "preview.ogg"]) expect(ogg(readFileSync("public" + url)), url).toMatchObject({ channels: 2, rate: 48000 });
    expect(sounds.profile?.id).toBe(pick.id);
    const keys = new Set<string>();
    for (let i = 0; i < pick.keys * 3; i++) {
      sounds.key(i);
      keys.add(ctx.sources.at(-1)!.buffer!.url!);
    }
    expect([...keys].sort()).toEqual(numbered("key", pick.keys));
    const spaces = new Set<string>();
    for (let i = 0; i < 24; i++) {
      sounds.space();
      spaces.add(ctx.sources.at(-1)!.buffer!.url!);
    }
    expect([...spaces].sort()).toEqual(numbered("space", 8));
  });

  it.each(OWNER_PICKS)("$name's natural tails (keys to 450 ms, spaces to 535 ms) play whole at 10 letters a second: no voice cut, no stop, no length cap", async (pick) => {
    // Decode each file to its own length, read from the Ogg file itself.
    ctx.decodeAudioData = vi.fn(async (bytes: ArrayBuffer) => {
      const url = ctx.bytes.get(bytes)!;
      return { duration: ogg(readFileSync("public" + url)).seconds, url } as unknown as AudioBuffer;
    });
    const files = await packFiles(choice(pick.id));
    const length = (urls: string[]): number => Math.max(...urls.map((url) => ogg(readFileSync("public" + url)).seconds));
    expect(length(files.key)).toBeCloseTo(0.45, 3);
    expect(length(files.space)).toBeCloseTo(0.535, 3);
    const sounds = player();
    await settled(loadSavedKeyboard(sounds, choices, () => pick.id));
    expect(sounds.profile?.id).toBe(pick.id);
    // Four words of four letters and a space, then more: a letter every 100 ms.
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 4) sounds.space();
      else sounds.key(i);
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(sounds.stats.played).toBe(60);
    expect(sounds.stolen).toBe(0);
    expect(ctx.sources.every((s) => s.stop.mock.calls.length === 0)).toBe(true);
    // Each sample starts with no offset or duration: it runs to its own end.
    expect(ctx.sources.every((s) => s.start.mock.calls.every((args) => args.length === 1))).toBe(true);
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
    // The kit's first batch: twelve keys and four spaces (parent TYPING_FEEL_SERVICE.md §4.6).
    const firstKeys = KEYBOARD_DECODE_BATCH_SIZE - KEYBOARD_FIRST_BATCH_SPACES;
    const first = new Set([...files.key.slice(0, firstKeys), ...files.space.slice(0, KEYBOARD_FIRST_BATCH_SPACES)]);
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const fetch = globalThis.fetch;
    // Hold every file past the first batch: its sixteen files are in, the other 72 are not.
    const rest = new Set([...files.key.slice(firstKeys), ...files.space.slice(KEYBOARD_FIRST_BATCH_SPACES)]);
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
    // The first batch's spaces already sound the spacebar: no key stands in for it.
    sounds.space();
    expect(first.has(ctx.sources.at(-1)!.buffer!.url!)).toBe(true);
    expect(ctx.sources.at(-1)?.buffer?.url).toContain("/space-");
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
    const firstKeys = KEYBOARD_DECODE_BATCH_SIZE - KEYBOARD_FIRST_BATCH_SPACES;
    const rest = new Set([...files.key.slice(firstKeys), ...files.space.slice(KEYBOARD_FIRST_BATCH_SPACES)]);
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
