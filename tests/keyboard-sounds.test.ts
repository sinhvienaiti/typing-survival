import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyKeyboardLevels, KEYBOARD_GATE_MS, keyboardSink, loadSavedKeyboard, manifestJson, pickFailed, RELAY, requestKeyboardCatalogue, sampleBytes, savedKeyboardId, settleKeyboard, startKeyboard,
  type KeyboardHost,
} from "../src/app/keyboard";
import { quickOptions, soundRows, type QuickHooks } from "../src/app/quick";
import { applyQuick, BUILT_IN_KEYS, DEFAULT_KEYBOARD_SOUND, loadSettings, soundLevels, storedSettings, type Settings } from "../src/app/settings";
import type { QuickChoiceOption, QuickValue } from "../src/kit/ui";
import {
  KEYBOARD_DECODE_BATCH_SIZE, KEYBOARD_FIRST_BATCH_SPACES, KEYBOARD_SAMPLE_TIMEOUT_MS, KeyboardSoundPreview, pendingKeyboardChoices, TypingFxDriver, TypingSounds,
  type KeyboardCatalog, type KeyboardPreviewLevels, type KeyboardSoundChoice,
} from "../src/kit/feedback/typing-fx";
import { readChoice } from "../src/kit/ui/quick-settings/logic";
import type { QuickChoiceRow } from "../src/kit/ui";
import { ThemeAudio } from "../src/audio/theme-audio";
import { catalogue, FEEL_BASE, SAMPLE_FAMILIES, SAMPLE_IDS, SAMPLE_SETS, sampleFiles, serve, setDir, type Reply } from "./feel-fixture";

/**
 * Keyboard sounds from Typing Feel (parent docs/games/TYPING_FEEL_SERVICE.md
 * §5.1–5.3, §8.1): the catalogue and the sets come from a sample host in
 * tests/feel-fixture.ts through a stubbed fetch; no network, no parent repo.
 */
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
/** Every fetch: its URL and the cache mode it asked for. */
let calls: { url: string; cache: RequestCache | undefined }[];
/** The catalogue the sample host answers with. */
let root: Record<string, unknown>;
const players: TypingSounds[] = [];
const previews: KeyboardSoundPreview[] = [];
const urls = (): string[] => calls.map((call) => call.url);
const flush = async (): Promise<void> => { for (let i = 0; i < 400; i++) await Promise.resolve(); };
/** A set decodes in batches of 16 with a macrotask between them: run the fake clock dry. */
const settle = async (): Promise<void> => { await flush(); await vi.runAllTimersAsync(); await flush(); };
const settled = async <T>(work: Promise<T>): Promise<T> => { await settle(); return work; };
/** While a test holds a file: run the macrotasks between decode batches, well short of the samples' 8 s limit. */
const tick = async (): Promise<void> => { await flush(); await vi.advanceTimersByTimeAsync(50); await flush(); };
/** A fetch answer as timedJson and the kit read it. */
function respond(url: string, reply: Reply): Response {
  return {
    ok: reply.status >= 200 && reply.status < 300,
    status: reply.status,
    headers: new Headers(reply.type ? { "content-type": reply.type } : {}),
    text: async () => reply.text ?? "",
    json: async () => JSON.parse(reply.text ?? ""),
    arrayBuffer: async () => {
      const bytes = new TextEncoder().encode("OggS " + url).buffer as ArrayBuffer;
      ctx.bytes.set(bytes, url);
      return bytes;
    },
  } as unknown as Response;
}
/** The sample host behind fetch; `route` may answer first (a failing host, a held file). */
function host(route?: (url: string) => Promise<Response> | Response | undefined): void {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, cache: init?.cache });
    const routed = route?.(url);
    return routed !== undefined ? routed : respond(url, serve(url, root));
  }));
}
const player = (): TypingSounds => {
  const sounds = new TypingSounds({ context: ctx as unknown as AudioContext, random: () => 0.5 });
  players.push(sounds);
  return sounds;
};
/** main.ts's quick hooks, inert but for `keyboardFail`. */
const quickHooks = (keyboardFail: (choice: QuickChoiceOption) => void = () => {}): QuickHooks => ({
  host: {} as HTMLElement, values: () => ({}), change: () => {}, preview: () => {}, keyboardChoices: [], keyboardSounds: new TypingSounds(),
  mountPreview: () => {}, pause: () => {}, resume: () => {}, quit: () => {}, countdown: () => 0, keyboardFail,
});
/**
 * The Sound panel's keyboard preview as QuickSettings builds it from Last
 * Line's options (quick.ts quickOptions): the gameplay player, the game's
 * fetchers (keyboardFetch) and its fail hook (onKeyboardFail).
 */
function panelPreview(sounds: TypingSounds, levels: () => KeyboardPreviewLevels = () => ({ master: 1, keyboard: 1 }), keyboardFail?: (choice: QuickChoiceOption) => void): KeyboardSoundPreview {
  const options = quickOptions(quickHooks(keyboardFail));
  const preview = new KeyboardSoundPreview({
    sounds, levels, fetchJson: options.keyboardFetch?.fetchJson, fetchBytes: options.keyboardFetch?.fetchBytes, onLoad: options.onKeyboardLoad, onFail: options.onKeyboardFail,
  });
  previews.push(preview);
  return preview;
}
const catalogueOf = async (rootJson: Record<string, unknown> = catalogue()): Promise<KeyboardCatalog> => {
  root = rootJson;
  const catalog = await requestKeyboardCatalogue(FEEL_BASE).catalog;
  calls.length = 0;
  return catalog;
};
let choices: readonly KeyboardSoundChoice[];
const choice = (id: string): KeyboardSoundChoice => choices.find((c) => c.value === id)!;

/**
 * QuickSettings' keyboard row as main.ts drives it, without a DOM: it opens
 * with a list, setChoiceOptions swaps the list and reads the values again,
 * and a value the list lacks is repaired through onChange, which saves (the
 * kit's readValues and readChoice). A pick is the player's choice (quickChange).
 */
class Panel {
  repairs: string[] = [];
  constructor(public options: readonly KeyboardSoundChoice[], private readonly raw: () => string, private readonly change: (id: string, value: QuickValue) => void) {
    this.read();
  }
  setChoiceOptions(options: readonly KeyboardSoundChoice[]): void {
    this.options = options;
    this.read();
  }
  pick(value: string): void {
    expect(this.options.find((c) => c.value === value)?.disabled).not.toBe(true);
    this.change("keyboard", value);
  }
  private read(): void {
    const raw = this.raw();
    const row = soundRows(this.options).find((r) => r.id === "keyboard") as QuickChoiceRow;
    const value = readChoice(row, raw);
    if (value === raw) return;
    this.repairs.push(value);
    this.change("keyboard", value);
  }
}

/**
 * A page as main.ts builds it from a stored save: the settings, the raw
 * keyboard field, whether the save owns a keyboard sound, the Sound panel at
 * once, quickChange (`change`), the startup signal and the hooks.
 */
function page(stored: unknown) {
  const raw = JSON.parse(JSON.stringify(stored ?? null)) as unknown;
  const settings = loadSettings(raw);
  const saved = savedKeyboardId(raw);
  let owned = saved !== null;
  const startup = new AbortController();
  /** The keyboard id of each write to the save (null: written without one). */
  const saves: (string | null)[] = [];
  /** The save as the page last wrote it (JSON). */
  let storage = JSON.stringify(stored ?? null);
  const store = (): void => {
    storage = JSON.stringify(storedSettings(settings, owned));
    saves.push(savedKeyboardId(JSON.parse(storage)));
  };
  const seen = { playable: [] as number[], unavailable: 0, chosen: [] as string[], standIn: null as string | null };
  /** main.ts quickChange: applied, then saved; a keyboard sound is the player's own (owned, no stand-in, the startup load stops). */
  const change = (id: string, value: QuickValue): void => {
    expect(applyQuick(settings, id, value)).toBe(true);
    if (id === "keyboard") {
      owned = true;
      seen.standIn = null;
      startup.abort();
    }
    store();
  };
  const panel = new Panel(pendingKeyboardChoices(settings.typingFx.soundProfile, RELAY), () => settings.typingFx.soundProfile, change);
  const hooks: KeyboardHost = {
    current: () => settings.typingFx.soundProfile,
    choose: (id, save) => {
      settings.typingFx = { ...settings.typingFx, soundProfile: id };
      seen.chosen.push(id);
      if (save) owned = true;
      if (save) store();
    },
    list: (options) => panel.setChoiceOptions(options),
    unavailable: () => { seen.unavailable += 1; },
    standIn: (id) => { seen.standIn = id; },
    playable: () => { seen.playable.push(Date.now()); },
  };
  /** Relay's key synth as ThemeAudio gets it now. */
  const relayOn = (): boolean => soundLevels(settings, seen.standIn).keysOn;
  return { settings, saved, saves, panel, seen, hooks, change, relayOn, signal: startup.signal, storage: () => storage };
}
const savedSound = (id: string): KeyboardSoundChoice => ({ value: id, label: "Saved sound", note: "unavailable", disabled: true });

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  ctx = new Context();
  calls = [];
  root = catalogue();
  vi.stubGlobal("GainNode", Gain);
  vi.stubGlobal("AudioBufferSourceNode", Source);
  host();
  choices = (await catalogueOf()).options;
});
afterEach(() => {
  for (const preview of previews.splice(0)) preview.destroy();
  for (const sounds of players.splice(0)) sounds.dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Last Line keyboard catalogue from Typing Feel", () => {
  it("reads one catalogue from the feel origin (no-cache): Off, Relay, then the sets in catalogue order, one run per family, files resolved under each set's folder", async () => {
    const feed = requestKeyboardCatalogue(FEEL_BASE);
    const catalog = await feed.catalog;
    expect(feed.base).toBe(FEEL_BASE);
    expect(calls).toEqual([{ url: FEEL_BASE + "keys-manifest.json", cache: "no-cache" }]);
    expect(catalog).toMatchObject({ state: "ready", revision: "r-test", defaultId: "bright-clack" });
    expect(catalog.options.map((c) => c.value)).toEqual(["off", BUILT_IN_KEYS, ...SAMPLE_IDS]);
    expect(catalog.options.slice(0, 2)).toEqual([{ value: "off", label: "Off" }, RELAY]);
    for (const set of SAMPLE_SETS) {
      expect(catalog.options.find((c) => c.value === set.id)).toEqual({
        value: set.id, label: set.name, family: set.family, manifest: setDir(set.id) + "keys-manifest.json", preview: setDir(set.id) + "preview.ogg",
        // An owner pick has no score; none is invented.
        ...(set.score === null ? {} : { score: set.score }),
      });
    }
    const sets = catalog.options.slice(2);
    expect(sets.filter((c, i) => i === 0 || sets[i - 1]!.family !== c.family).map((c) => c.family)).toEqual(SAMPLE_FAMILIES);
  });

  it("settles a save without a keyboard field to the catalogue's default, then Bright Clack, then the first set, then Relay; none of them is saved", async () => {
    expect(settleKeyboard(null, await catalogueOf(catalogue({ default: "solid" })))).toMatchObject({ id: "solid", repaired: false });
    expect(settleKeyboard(null, await catalogueOf(catalogue({ default: null })))).toMatchObject({ id: DEFAULT_KEYBOARD_SOUND, repaired: false });
    expect(settleKeyboard(null, await catalogueOf(catalogue({ default: null, sets: SAMPLE_SETS.filter((s) => s.id !== DEFAULT_KEYBOARD_SOUND) })))).toMatchObject({ id: "deep", repaired: false });
    // A catalogue that lists no usable set is "invalid", not ready: Relay, and nothing repaired.
    const empty = await catalogueOf(catalogue({ sets: [] }));
    expect(empty.state).toBe("invalid");
    expect(settleKeyboard(null, empty)).toMatchObject({ id: BUILT_IN_KEYS, repaired: false });
    expect(settleKeyboard("hail-stone", empty)).toMatchObject({ id: "hail-stone", repaired: false });
  });

  it("reads the save's own keyboard field before the hard default fills it in", () => {
    expect(savedKeyboardId(null)).toBeNull();
    expect(savedKeyboardId({ sfxVolume: 0.5 })).toBeNull();
    expect(savedKeyboardId({ typingFx: { style: "rune" } })).toBeNull();
    expect(savedKeyboardId({ typingFx: { soundProfile: 3 } })).toBeNull();
    expect(savedKeyboardId({ typingFx: { soundProfile: "hail-stone" } })).toBe("hail-stone");
    expect(savedKeyboardId({ typingFx: { soundProfile: "Bad Id" } })).toBe("Bad Id");
    // loadSettings fills the hard default in: the raw field is what tells "no choice yet" from Bright Clack.
    expect(loadSettings({ typingFx: { style: "rune" } }).typingFx.soundProfile).toBe(DEFAULT_KEYBOARD_SOUND);
  });

  it("no origin (a clone, CI): nothing is fetched; Off and Relay; a saved Firefly set stays in the save as \"Saved sound · unavailable\" while Relay stands in for it; no notice; play at once", async () => {
    const p = page({ typingFx: { soundProfile: "hail-stone", volume: 0.4 } });
    const sounds = player();
    const done = startKeyboard(sounds, requestKeyboardCatalogue(null), p.saved, p.hooks, { signal: p.signal });
    await flush();
    expect(p.seen.playable).toEqual([0]);
    await settled(done);
    expect(calls).toEqual([]);
    expect(p.seen).toEqual({ playable: [0], unavailable: 0, chosen: ["hail-stone"], standIn: "hail-stone" });
    expect(p.panel.options).toEqual([{ value: "off", label: "Off" }, RELAY, savedSound("hail-stone")]);
    expect(p.panel.repairs).toEqual([]);
    expect(p.saves).toEqual([]);
    expect(loadSettings(JSON.parse(JSON.stringify(p.settings))).typingFx).toMatchObject({ soundProfile: "hail-stone", volume: 0.4 });
    expect(sounds.profile).toBeNull();
    // Relay's synth plays the keys, the save still names Hail Stone, and an unrelated change keeps it.
    expect(p.relayOn()).toBe(true);
    p.change("muted", true);
    expect(p.saves).toEqual(["hail-stone"]);
    // Off and Relay stay choosable; the player's pick ends the stand-in and is saved as ever.
    p.panel.pick("off");
    expect(p.seen.standIn).toBeNull();
    expect(p.relayOn()).toBe(false);
    p.panel.pick(BUILT_IN_KEYS);
    expect(p.relayOn()).toBe(true);
    expect(p.saves).toEqual(["hail-stone", "off", BUILT_IN_KEYS]);
  });

  it("no origin and no save: Relay plays, Off and Relay are the whole list, nothing is saved", async () => {
    const p = page(null);
    await settled(startKeyboard(player(), requestKeyboardCatalogue(null), p.saved, p.hooks));
    expect(calls).toEqual([]);
    expect(p.settings.typingFx.soundProfile).toBe(BUILT_IN_KEYS);
    expect(p.panel.options.map((c) => c.value)).toEqual(["off", BUILT_IN_KEYS]);
    expect(p.saves).toEqual([]);
    expect(p.seen.unavailable).toBe(0);
    // Relay is the choice itself here, not a stand-in.
    expect(p.seen.standIn).toBeNull();
    expect(p.relayOn()).toBe(true);
  });

  const FAILURES: [string, (url: string) => Promise<Response> | Response][] = [
    ["404", (url) => respond(url, { status: 404, type: "text/html", text: "<h1>404</h1>" })],
    ["HTML with status 200 (an SPA fallback)", (url) => respond(url, { status: 200, type: "text/html", text: "<!doctype html><html><body>app</body></html>" })],
    ["text that is not JSON, status 200", (url) => respond(url, { status: 200, type: "application/json", text: "<!doctype html>" })],
    ["CORS (fetch rejects)", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["no answer (hung for 10 s and more)", () => new Promise<Response>(() => {})],
  ];
  it.each(FAILURES)("a host that fails (%s): the saved set is kept, play starts within 1.5 s, Off and Relay (standing in for the set), the notice once, nothing left pending", async (kind, fail) => {
    host(fail);
    const p = page({ typingFx: { soundProfile: "hail-stone" } });
    const sounds = player();
    const done = startKeyboard(sounds, requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks, { signal: p.signal });
    await vi.advanceTimersByTimeAsync(KEYBOARD_GATE_MS - 1);
    const hung = kind.startsWith("no answer");
    // A quick failure lets play start at once; a hung host, at the gate.
    expect(p.seen.playable).toEqual(hung ? [] : [0]);
    await vi.advanceTimersByTimeAsync(1);
    expect(p.seen.playable).toHaveLength(1);
    expect(p.seen.playable[0]).toBeLessThanOrEqual(KEYBOARD_GATE_MS);
    // The catalogue gives up after 3 s at most.
    await vi.advanceTimersByTimeAsync(3000 - KEYBOARD_GATE_MS);
    await flush();
    expect(p.seen.unavailable).toBe(1);
    await expect(settled(done)).resolves.toBeUndefined();
    expect(p.seen.chosen).toEqual(["hail-stone"]);
    expect(p.panel.options).toEqual([{ value: "off", label: "Off" }, RELAY, savedSound("hail-stone")]);
    expect(p.panel.repairs).toEqual([]);
    expect(p.saves).toEqual([]);
    expect(p.settings.typingFx.soundProfile).toBe("hail-stone");
    expect(urls()).toEqual([FEEL_BASE + "keys-manifest.json"]);
    expect(sounds.profile).toBeNull();
    // §5.1 step 5, §5.3: Relay plays in the set's place, unsaved.
    expect(p.seen.standIn).toBe("hail-stone");
    expect(p.relayOn()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a catalogue without the saved set moves it to the catalogue's default and saves once; the panel takes the list without repairing again", async () => {
    const p = page({ typingFx: { soundProfile: "thock", style: "rune" } });
    expect(p.panel.options.map((c) => c.value)).toEqual(["off", BUILT_IN_KEYS, "thock"]);
    root = catalogue({ default: "solid" });
    await settled(startKeyboard(player(), requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks));
    expect(p.seen.chosen).toEqual(["solid"]);
    expect(p.saves).toEqual(["solid"]);
    expect(p.panel.repairs).toEqual([]);
    expect(p.panel.options.map((c) => c.value)).toEqual(["off", BUILT_IN_KEYS, ...SAMPLE_IDS]);
    expect(p.settings.typingFx).toMatchObject({ soundProfile: "solid", style: "rune" });
    expect(p.seen.unavailable).toBe(0);
  });

  it("an id that can never name a set is repaired even before the catalogue loads; a save without the field follows the catalogue's default unsaved", async () => {
    const bad = page({ typingFx: { soundProfile: "Bad Id" } });
    await settled(startKeyboard(player(), requestKeyboardCatalogue(FEEL_BASE), bad.saved, bad.hooks));
    expect(bad.saves).toEqual(["bright-clack"]);
    root = catalogue({ default: "raindrop-tile" });
    const fresh = page({ sfxVolume: 0.5 });
    await settled(startKeyboard(player(), requestKeyboardCatalogue(FEEL_BASE), fresh.saved, fresh.hooks));
    expect(fresh.seen.chosen).toEqual(["raindrop-tile"]);
    expect(fresh.saves).toEqual([]);
    expect(fresh.panel.repairs).toEqual([]);
  });

  it("a late catalogue: the open Sound panel shows Off, Relay and the saved set \"Loading…\", then takes the full list; Relay picked meanwhile stands and is not overwritten", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    host((url) => (url === FEEL_BASE + "keys-manifest.json" ? gate.then(() => respond(url, serve(url, root))) : undefined));
    const p = page({ typingFx: { soundProfile: "hail-stone" } });
    expect(p.panel.options).toEqual([{ value: "off", label: "Off" }, RELAY, { value: "hail-stone", label: "Loading…", note: "", disabled: true }]);
    expect(p.panel.repairs).toEqual([]);
    const done = startKeyboard(player(), requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks);
    await vi.advanceTimersByTimeAsync(500);
    p.panel.pick(BUILT_IN_KEYS);
    expect(p.saves).toEqual([BUILT_IN_KEYS]);
    open();
    await settled(done);
    expect(p.panel.options.map((c) => c.value)).toEqual(["off", BUILT_IN_KEYS, ...SAMPLE_IDS]);
    expect(p.seen.chosen).toEqual([BUILT_IN_KEYS]);
    expect(p.saves).toEqual([BUILT_IN_KEYS]);
    expect(p.panel.repairs).toEqual([]);
    expect(p.settings.typingFx.soundProfile).toBe(BUILT_IN_KEYS);
    // The saved set the player left is never fetched.
    expect(urls().filter((url) => url.includes("/hail-stone/"))).toEqual([]);
  });

  it("a late catalogue: Off picked meanwhile stands too; no set loads", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    host((url) => (url === FEEL_BASE + "keys-manifest.json" ? gate.then(() => respond(url, serve(url, root))) : undefined));
    const p = page(null);
    expect(p.panel.options.map((c) => c.value)).toEqual(["off", BUILT_IN_KEYS, DEFAULT_KEYBOARD_SOUND]);
    const sounds = player();
    const done = startKeyboard(sounds, requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks);
    p.panel.pick("off");
    await vi.advanceTimersByTimeAsync(KEYBOARD_GATE_MS);
    expect(p.seen.playable).toEqual([KEYBOARD_GATE_MS]);
    open();
    await settled(done);
    expect(p.seen.chosen).toEqual(["off"]);
    expect(p.saves).toEqual(["off"]);
    expect(urls()).toEqual([FEEL_BASE + "keys-manifest.json"]);
    expect(sounds.profile).toBeNull();
  });

  it("the saved set loads from the feel origin: its manifest HTTP-cached through a 3 s limit, then its samples; play starts once the first batch is in", async () => {
    const p = page({ typingFx: { soundProfile: "raindrop-tile" } });
    const sounds = player();
    await settled(startKeyboard(sounds, requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks));
    const files = sampleFiles("raindrop-tile");
    expect(calls.slice(0, 2)).toEqual([{ url: FEEL_BASE + "keys-manifest.json", cache: "no-cache" }, { url: setDir("raindrop-tile") + "keys-manifest.json", cache: "default" }]);
    expect(urls().slice(2).sort()).toEqual([...files.key, ...files.space].sort());
    expect(p.seen.playable).toEqual([0]);
    expect(sounds.profile?.id).toBe("raindrop-tile");
    expect(p.saves).toEqual([]);
  });

  it("a set whose samples hang: play starts at 1.5 s; each sample is given up after 8 s, a first batch that all failed stops the set, and Relay stands in", async () => {
    host((url) => (url.endsWith(".ogg") ? new Promise<Response>(() => {}) : undefined));
    const p = page({ typingFx: { soundProfile: "deep" } });
    const sounds = player();
    let ended = false;
    void startKeyboard(sounds, requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks, { signal: p.signal }).then(() => { ended = true; });
    await vi.advanceTimersByTimeAsync(KEYBOARD_GATE_MS);
    expect(p.seen.playable).toEqual([KEYBOARD_GATE_MS]);
    expect(sounds.profile).toBeNull();
    expect(p.seen.standIn).toBeNull();
    await vi.advanceTimersByTimeAsync(KEYBOARD_SAMPLE_TIMEOUT_MS - KEYBOARD_GATE_MS);
    await flush();
    expect(ended).toBe(true);
    // One batch was asked for, never the rest of the set.
    expect(urls().filter((url) => url.endsWith(".ogg"))).toHaveLength(KEYBOARD_DECODE_BATCH_SIZE);
    expect(p.seen.standIn).toBe("deep");
    expect(p.relayOn()).toBe(true);
    expect(sounds.profile).toBeNull();
    expect(p.saves).toEqual([]);
    expect(p.settings.typingFx.soundProfile).toBe("deep");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a set whose samples all 404 stops after its first batch and Relay stands in; one good file in that batch keeps the set loading", async () => {
    host((url) => (url.endsWith(".ogg") ? respond(url, { status: 404 }) : undefined));
    const p = page({ typingFx: { soundProfile: "solid" } });
    await settled(startKeyboard(player(), requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks, { signal: p.signal }));
    expect(urls().filter((url) => url.endsWith(".ogg"))).toHaveLength(KEYBOARD_DECODE_BATCH_SIZE);
    expect(p.seen.standIn).toBe("solid");
    calls.length = 0;
    const good = sampleFiles("solid").key[3]!;
    host((url) => (url.endsWith(".ogg") && url !== good ? respond(url, { status: 404 }) : undefined));
    const q = page({ typingFx: { soundProfile: "solid" } });
    const sounds = player();
    await settled(startKeyboard(sounds, requestKeyboardCatalogue(FEEL_BASE), q.saved, q.hooks, { signal: q.signal }));
    const files = sampleFiles("solid");
    expect(urls().filter((url) => url.endsWith(".ogg"))).toHaveLength(files.key.length + files.space.length);
    expect(q.seen.standIn).toBeNull();
    expect(sounds.profile?.id).toBe("solid");
  });

  it("a set whose manifest hangs is given up after 3 s: play starts at 1.5 s, no sample is asked for, Relay stands in, the save keeps the set", async () => {
    host((url) => (url.endsWith("/keys-manifest.json") && url !== FEEL_BASE + "keys-manifest.json" ? new Promise<Response>(() => {}) : undefined));
    const q = page({ typingFx: { soundProfile: "solid" } });
    const silent = player();
    const done = startKeyboard(silent, requestKeyboardCatalogue(FEEL_BASE), q.saved, q.hooks, { signal: q.signal });
    await vi.advanceTimersByTimeAsync(3000);
    await expect(settled(done)).resolves.toBeUndefined();
    expect(q.seen.playable).toEqual([KEYBOARD_GATE_MS]);
    expect(silent.profile).toBeNull();
    expect(urls().filter((url) => url.endsWith(".ogg"))).toEqual([]);
    expect(q.seen.standIn).toBe("solid");
    expect(q.relayOn()).toBe(true);
    expect(q.saves).toEqual([]);
  });

  it("a save without a keyboard sound stays without one through unrelated changes: Relay while the host is down, the catalogue's default once it is back", async () => {
    host((url) => respond(url, { status: 404 }));
    const down = page({ sfxVolume: 0.5 });
    // A change while the catalogue loads writes no keyboard sound (not the hard default either).
    down.change("muted", true);
    await settled(startKeyboard(player(), requestKeyboardCatalogue(FEEL_BASE), down.saved, down.hooks, { signal: down.signal }));
    expect(down.settings.typingFx.soundProfile).toBe(BUILT_IN_KEYS);
    expect(down.seen.standIn).toBeNull();
    down.change("muted", false);
    expect(down.saves).toEqual([null, null]);
    const stored = JSON.parse(down.storage()) as { typingFx: Record<string, unknown> };
    expect(stored).toMatchObject({ sfxVolume: 0.5, muted: false, typingFx: { style: "stamp", volume: 1 } });
    expect(stored.typingFx).not.toHaveProperty("soundProfile");
    host();
    root = catalogue({ default: "raindrop-tile" });
    const up = page(stored);
    expect(up.saved).toBeNull();
    await settled(startKeyboard(player(), requestKeyboardCatalogue(FEEL_BASE), up.saved, up.hooks, { signal: up.signal }));
    expect(up.settings.typingFx.soundProfile).toBe("raindrop-tile");
    expect(up.saves).toEqual([]);
    // The player's own pick is saved from then on, and stays through unrelated changes.
    up.panel.pick("deep");
    up.change("muted", true);
    expect(up.saves).toEqual(["deep", "deep"]);
  });

  it("re-picking the saved set while its startup load runs hands it to the Sound panel's load: the startup load stops and never silences it", async () => {
    let openFirst!: () => void;
    const first = new Promise<void>((resolve) => { openFirst = resolve; });
    let openSecond!: () => void;
    const second = new Promise<void>((resolve) => { openSecond = resolve; });
    const asked = new Set<string>();
    // The startup load's samples wait for `first`; the same files asked again (the panel's load) wait for `second`.
    host((url) => {
      if (!url.endsWith(".ogg")) return undefined;
      const again = asked.has(url);
      asked.add(url);
      return (again ? second : first).then(() => respond(url, serve(url, root)));
    });
    const p = page({ typingFx: { soundProfile: "hail-stone" } });
    const sounds = player();
    let ended = false;
    void startKeyboard(sounds, requestKeyboardCatalogue(FEEL_BASE), p.saved, p.hooks, { signal: p.signal }).then(() => { ended = true; });
    await tick();
    expect(urls().filter((url) => url.endsWith(".ogg"))).toHaveLength(KEYBOARD_DECODE_BATCH_SIZE);
    // quickChange, then the kit's select (QuickSettings' onSelect order).
    const preview = panelPreview(sounds);
    p.panel.pick("hail-stone");
    preview.select(choice("hail-stone"), false);
    await tick();
    openFirst();
    await tick();
    expect(ended).toBe(true);
    expect(sounds.profile?.id).toBe("hail-stone");
    expect(p.seen.standIn).toBeNull();
    openSecond();
    await settle();
    expect(sounds.profile?.id).toBe("hail-stone");
    sounds.key(0);
    expect(ctx.sources.at(-1)?.buffer?.url).toMatch(/\/hail-stone\/[0-9a-f]{12}\/key-\d{2}\.ogg$/);
    expect(p.saves).toEqual(["hail-stone"]);
  });
});

describe("Last Line Sound panel picks (QuickSettings keyboardFetch and onKeyboardFail)", () => {
  const manifest = (id: string): string => setDir(id) + "keys-manifest.json";

  it("the Sound panel hands the kit Last Line's timed fetchers and its fail hook: no TypingSounds subclass", () => {
    const fail = vi.fn();
    const options = quickOptions(quickHooks(fail));
    expect(options.keyboardFetch).toEqual({ fetchJson: manifestJson, fetchBytes: sampleBytes });
    expect(options.onKeyboardFail).toBe(fail);
    expect(Object.getPrototypeOf(player())).toBe(TypingSounds.prototype);
  });

  it("a set picked in the panel whose manifest 404s: Relay stands in for it, the save keeps the pick, the next pick ends it", async () => {
    host((url) => (url === manifest("solid") ? respond(url, { status: 404 }) : undefined));
    const p = page({ typingFx: { soundProfile: "deep" } });
    // The catalogue is in: the panel lists every set.
    p.panel.setChoiceOptions(choices);
    const sounds = player();
    const preview = panelPreview(sounds, undefined, (picked) => pickFailed(picked, p.hooks));
    p.panel.pick("solid");
    preview.select(choice("solid"));
    await settle();
    expect(calls.find((call) => call.url === manifest("solid"))?.cache).toBe("default");
    expect(p.seen.standIn).toBe("solid");
    expect(p.relayOn()).toBe(true);
    expect(sounds.profile).toBeNull();
    expect(p.settings.typingFx.soundProfile).toBe("solid");
    expect(p.saves).toEqual(["solid"]);
    p.panel.pick("deep");
    preview.select(choice("deep"));
    await settle();
    expect(p.seen.standIn).toBeNull();
    expect(p.relayOn()).toBe(false);
    expect(sounds.profile?.id).toBe("deep");
    expect(p.saves).toEqual(["solid", "deep"]);
  });

  it("a picked set whose samples hang: Relay stands in after one 8 s sample timeout, with one batch asked for, not every batch in turn; no timer is left", async () => {
    host((url) => (url.startsWith(setDir("solid")) && url.endsWith(".ogg") ? new Promise<Response>(() => {}) : undefined));
    const p = page({ typingFx: { soundProfile: "deep" } });
    // The catalogue is in: the panel lists every set.
    p.panel.setChoiceOptions(choices);
    const sounds = player();
    const preview = panelPreview(sounds, undefined, (picked) => pickFailed(picked, p.hooks));
    const files = sampleFiles("solid");
    // More than one batch: without the first-batch rule the second would cost another 8 s.
    expect(files.key.length + files.space.length).toBeGreaterThan(KEYBOARD_DECODE_BATCH_SIZE);
    p.panel.pick("solid");
    preview.select(choice("solid"));
    await vi.advanceTimersByTimeAsync(KEYBOARD_SAMPLE_TIMEOUT_MS - 1);
    expect(p.seen.standIn).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(p.seen.standIn).toBe("solid");
    expect(urls().filter((url) => /\/(key|space)-\d+\.ogg$/.test(url))).toHaveLength(KEYBOARD_DECODE_BATCH_SIZE);
    await settle();
    expect(p.relayOn()).toBe(true);
    expect(sounds.profile).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a pick the player left before it failed never stands in", async () => {
    let answer!: () => void;
    host((url) => (url === manifest("solid") ? new Promise<Response>((resolve) => { answer = () => resolve(respond(url, { status: 404 })); }) : undefined));
    const p = page({ typingFx: { soundProfile: "deep" } });
    p.panel.setChoiceOptions(choices);
    const preview = panelPreview(player(), undefined, (picked) => pickFailed(picked, p.hooks));
    p.panel.pick("solid");
    preview.select(choice("solid"));
    await tick();
    p.panel.pick("off");
    preview.select(choice("off"));
    answer();
    await settle();
    expect(p.seen.standIn).toBeNull();
    expect(p.relayOn()).toBe(false);
  });

  it("pickFailed stands Relay in only for the page's current keyboard sound, never for Off or Relay", () => {
    const standIn = vi.fn();
    expect(pickFailed({ value: "deep" }, { current: () => "warm", standIn })).toBe(false);
    expect(pickFailed({ value: "off" }, { current: () => "off", standIn })).toBe(false);
    expect(pickFailed(RELAY, { current: () => BUILT_IN_KEYS, standIn })).toBe(false);
    expect(standIn).not.toHaveBeenCalled();
    expect(pickFailed({ value: "deep" }, { current: () => "deep", standIn })).toBe(true);
    expect(standIn).toHaveBeenCalledWith("deep");
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

  it.each(SAMPLE_IDS)("selects %s in the Sound panel into the gameplay player (manifest HTTP-cached), saves it, and restores it on reload", async (id) => {
    const settings = loadSettings(null);
    const sounds = player();
    const preview = panelPreview(sounds);
    expect(applyQuick(settings, "keyboard", id)).toBe(true);
    applyKeyboardLevels(sounds, settings);
    preview.select(choice(id));
    await settle();
    expect(sounds.profile?.id).toBe(id);
    const files = sampleFiles(id);
    // The panel loads through Last Line's fetchers (quickOptions keyboardFetch): the manifest bounded and HTTP-cached.
    expect(calls.find((call) => call.url === setDir(id) + "keys-manifest.json")?.cache).toBe("default");
    expect(urls().filter((url) => /\/(key|space)-\d+\.ogg$/.test(url)).sort()).toEqual([...files.key, ...files.space].sort());
    expect(urls().every((url) => url.startsWith(setDir(id)))).toBe(true);
    sounds.key(0);
    expect(ctx.sources.at(-1)?.buffer?.url).toMatch(new RegExp("/" + id + "/[0-9a-f]{12}/key-\\d{2}\\.ogg$"));
    sounds.space();
    expect(ctx.sources.at(-1)?.buffer?.url).toMatch(new RegExp("/" + id + "/[0-9a-f]{12}/space-\\d{2}\\.ogg$"));
    const saved = loadSettings(JSON.parse(JSON.stringify(settings)));
    const reloaded = player();
    await settled(loadSavedKeyboard(reloaded, choices, () => saved.typingFx.soundProfile));
    expect(reloaded.profile?.id).toBe(id);
  });

  it("natural tails (keys to 450 ms, spaces to 535 ms) play whole at 10 letters a second: no voice cut, no stop, no length cap", async () => {
    ctx.decodeAudioData = vi.fn(async (bytes: ArrayBuffer) => {
      const url = ctx.bytes.get(bytes)!;
      return { duration: url.includes("/space-") ? 0.535 : 0.45, url } as unknown as AudioBuffer;
    });
    const sounds = player();
    await settled(loadSavedKeyboard(sounds, choices, () => "hail-stone"));
    expect(sounds.profile?.id).toBe("hail-stone");
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
    const keys = sampleFiles(DEFAULT_KEYBOARD_SOUND).key.length;
    // Three rounds of the default set's keys: the shuffle's round boundaries too.
    for (let i = 0; i < keys * 3; i++) {
      sounds.key(i);
      seen.push(ctx.sources.at(-1)!.buffer!.url!);
    }
    expect(new Set(seen).size).toBe(keys);
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

  it.each(["deep-amber", "off"])("a late startup load cannot replace a newly selected %s, and its own set is released", async (id) => {
    const settings = loadSettings(null);
    const sounds = player();
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    // Hold the saved (default) set's first sample, so the player picks another set mid-load.
    host((url) => (url === sampleFiles(DEFAULT_KEYBOARD_SOUND).key[0] ? gate.then(() => respond(url, serve(url, root))) : undefined));
    const loading = loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile);
    settings.typingFx.soundProfile = id;
    applyKeyboardLevels(sounds, settings);
    const preview = panelPreview(sounds);
    preview.select(choice(id));
    await tick();
    open();
    await settled(loading);
    expect(sounds.profile?.id ?? "off").toBe(id);
    expect(urls()).toContain(sampleFiles(DEFAULT_KEYBOARD_SOUND).key.at(-1));
    // The startup set finished decoding but is not kept: its buffers are gone.
    expect(sounds.use(DEFAULT_KEYBOARD_SOUND)).toBe(false);
  });

  it("startup is ready once the saved set's first batch is decoded: those samples play while the rest of the set loads", async () => {
    const settings = loadSettings(null);
    const sounds = player();
    const files = sampleFiles(DEFAULT_KEYBOARD_SOUND);
    // The kit's first batch: twelve keys and four spaces (parent TYPING_FEEL_SERVICE.md §4.6).
    const firstKeys = KEYBOARD_DECODE_BATCH_SIZE - KEYBOARD_FIRST_BATCH_SPACES;
    const first = new Set([...files.key.slice(0, firstKeys), ...files.space.slice(0, KEYBOARD_FIRST_BATCH_SPACES)]);
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    // Hold every file past the first batch: its sixteen files are in, the others are not.
    const rest = new Set([...files.key.slice(firstKeys), ...files.space.slice(KEYBOARD_FIRST_BATCH_SPACES)]);
    host((url) => (rest.has(url) ? gate.then(() => respond(url, serve(url, root))) : undefined));
    let ready = 0;
    let done = false;
    const loading = loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile, () => { ready += 1; }).then(() => { done = true; });
    await tick();
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

  it.each(["deep-amber", "off"])("a %s choice made once the startup set already plays still wins, and the startup set is released", async (id) => {
    const settings = loadSettings(null);
    const sounds = player();
    const files = sampleFiles(DEFAULT_KEYBOARD_SOUND);
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    const firstKeys = KEYBOARD_DECODE_BATCH_SIZE - KEYBOARD_FIRST_BATCH_SPACES;
    const rest = new Set([...files.key.slice(firstKeys), ...files.space.slice(KEYBOARD_FIRST_BATCH_SPACES)]);
    host((url) => (rest.has(url) ? gate.then(() => respond(url, serve(url, root))) : undefined));
    const loading = loadSavedKeyboard(sounds, choices, () => settings.typingFx.soundProfile);
    await tick();
    expect(sounds.profile?.id).toBe(DEFAULT_KEYBOARD_SOUND);
    settings.typingFx.soundProfile = id;
    applyKeyboardLevels(sounds, settings);
    const preview = panelPreview(sounds);
    preview.select(choice(id));
    await tick();
    open();
    await settled(loading);
    expect(sounds.profile?.id ?? "off").toBe(id);
    expect(sounds.use(DEFAULT_KEYBOARD_SOUND)).toBe(false);
  });

  it.each([["off", "other"], ["relay", "other"], ["missing", "silent"], ["unavailable", "silent"]])("startup is ready at once when the saved choice has no set to decode (%s: %s)", async (id, outcome) => {
    const list = id === "missing" ? [...choices, { value: "missing", label: "Missing", manifest: FEEL_BASE + "sets/missing/000000000000/keys-manifest.json" }] : id === "unavailable" ? [...choices, savedSound("unavailable")] : choices;
    const sounds = player();
    let ready = 0;
    await expect(settled(loadSavedKeyboard(sounds, list, () => id, () => { ready += 1; }))).resolves.toBe(outcome);
    expect(ready).toBe(1);
    expect(sounds.profile).toBeNull();
    expect(urls().filter((url) => url.endsWith(".ogg"))).toHaveLength(0);
  });

  it("hover/focus previews use the same player, dwell 150 ms, play 1 s at Master × Keyboard and fade on leave", async () => {
    const sounds = player();
    const preview = panelPreview(sounds, () => ({ master: 0.5, keyboard: 0.4 }));
    preview.unlock();
    preview.preview(choice("deep"));
    await vi.advanceTimersByTimeAsync(149);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(urls()).toEqual([setDir("deep") + "preview.ogg"]);
    const source = ctx.sources[0]!;
    expect(source.start).toHaveBeenCalledWith(0.15, 0, 1);
    expect(source.target!.gain.value).toBeCloseTo(0.2);
    expect(source.target!.target).toBe(ctx.destination);
    preview.stop();
    expect(source.target!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.18);
  });

  it("leaving during dwell or muting Master prevents preview playback", async () => {
    const levels = { master: 1, keyboard: 1, muted: false };
    const preview = panelPreview(player(), () => levels);
    preview.preview(choice("deep"));
    preview.stop();
    await vi.advanceTimersByTimeAsync(200);
    levels.muted = true;
    preview.preview(choice("deep-amber"));
    await vi.advanceTimersByTimeAsync(200);
    expect(ctx.sources).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });
});
