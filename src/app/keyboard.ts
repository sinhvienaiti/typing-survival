/**
 * Keyboard sounds from Typing Feel (parent docs/games/TYPING_FEEL_SERVICE.md
 * §5.1–5.3): the catalogue and the sets are read at run time from the build's
 * VITE_TYPING_FEEL_ORIGIN, never copied into the game. Startup never waits on
 * that host: the Sound panel opens at once with pendingKeyboardChoices, the
 * catalogue settles the saved choice when it arrives (a host that fails keeps
 * the player's set), and the fight waits at most KEYBOARD_GATE_MS for the
 * set's first decoded batch. A saved set that cannot sound this session has
 * Relay stand in for it (host.standIn), unsaved. The kit owns variants and
 * panel previews.
 */
import {
  KEYBOARD_CATALOG_TIMEOUT_MS, KEYBOARD_DECODE_BATCH_SIZE, keyboardPreviewGain, loadKeyboardCatalog, settleKeyboardChoice, timedJson, typingFeelKeysBase, TypingSounds,
  type KeyboardCatalog, type KeyboardLoad, type KeyboardSettlement, type KeyboardSoundChoice, type TypingFxSink,
} from "../kit/feedback/typing-fx";
import { BUILT_IN_KEYS, DEFAULT_KEYBOARD_SOUND, type Settings } from "./settings";

/** `<origin>/v1/keys/` from the build, or null: no origin, so Typing Feel is off (no network; Off and Relay only). */
export const KEYS_BASE: string | null = typingFeelKeysBase(import.meta.env.VITE_TYPING_FEEL_ORIGIN);

/** The game's own key sound (ThemeAudio's synth), right after Off with no family (so no heading above it). */
export const RELAY: KeyboardSoundChoice = { value: BUILT_IN_KEYS, label: "Relay" };

/** The fight waits this long at most for the saved set's first decoded batch, then starts without it (§5.1 step 6, §8.4). */
export const KEYBOARD_GATE_MS = 1500;

/** What the page shows once an origin is set and its catalogue did not load (§5.3). */
export const KEYBOARD_UNAVAILABLE = "Keyboard sounds unavailable";

/** The catalogue revalidates on every load (no-cache) and gives up after 3 s. */
export const catalogueJson = timedJson(KEYBOARD_CATALOG_TIMEOUT_MS);
/** A set manifest's URL is versioned (immutable): the HTTP cache may answer; a hung host fails it after 3 s. */
export const manifestJson = timedJson(KEYBOARD_CATALOG_TIMEOUT_MS, { cache: "default" });

/** A sample file the host has not delivered in this long is given up (it counts as missing), so a set's load always ends (§8.1). */
export const KEYBOARD_SAMPLE_TIMEOUT_MS = 8000;

/**
 * Sample bytes with a time limit: rejects on a non-OK status and after
 * `timeoutMs` (aborting the request), so a host that stalls mid-set ends the
 * load with those files missing instead of holding it for the session. The
 * timer is cleared however the fetch ends.
 */
export function timedBytes(timeoutMs: number = KEYBOARD_SAMPLE_TIMEOUT_MS): (url: string) => Promise<ArrayBuffer> {
  return (url: string): Promise<ArrayBuffer> => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Only rejects once the timer fires; Promise.race below always handles it.
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${url}: no answer in ${timeoutMs} ms`));
        abort.abort();
      }, timeoutMs);
    });
    const read = (async (): Promise<ArrayBuffer> => {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error(url + ": " + response.status);
      return response.arrayBuffer();
    })();
    return Promise.race([read, expired]).finally(() => clearTimeout(timer));
  };
}
/** The game's sample fetch, startup and Sound panel alike. */
export const sampleBytes = timedBytes();

/**
 * The gameplay player. Set manifests load through manifestJson and samples
 * through sampleBytes unless the caller passes its own fetchers: the kit's
 * Sound panel passes none (its KeyboardSoundPreview takes no fetcher through
 * QuickSettings), and the kit's default fetches have no time limit (and the
 * manifest's skips the HTTP cache).
 */
export class FeelSounds extends TypingSounds {
  override loadKeyboardManifest(
    url: string,
    id: string,
    name: string = id,
    fetchJson: (url: string) => Promise<unknown> = manifestJson,
    fetchBytes: (url: string) => Promise<ArrayBuffer> = sampleBytes,
    activate = false,
    signal?: AbortSignal,
  ): Promise<KeyboardLoad> {
    return super.loadKeyboardManifest(url, id, name, fetchJson, fetchBytes, activate, signal);
  }
}

/** A catalogue request started with the page: its base (null: Typing Feel off) and the catalogue it settles to (never rejects). */
export type KeyboardFeed = { readonly base: string | null; readonly catalog: Promise<KeyboardCatalog> };

/**
 * Starts reading the root catalogue; samples and previews stay lazy. Off and
 * Relay come first, then the sets in catalogue order, each with its `family`
 * (the kit's picker draws one heading per family run). No base: nothing is
 * fetched and the catalogue is "missing" (Off and Relay).
 */
export function requestKeyboardCatalogue(base: string | null = KEYS_BASE, fetchJson: (url: string) => Promise<unknown> = catalogueJson): KeyboardFeed {
  return { base, catalog: loadKeyboardCatalog(base, { extra: [RELAY], fallback: [], fetchJson }) };
}

/** The save's own keyboard field (`typingFx.soundProfile`), read before the hard default fills it; null when the save has none. */
export function savedKeyboardId(raw: unknown): string | null {
  const fx = raw !== null && typeof raw === "object" ? (raw as { typingFx?: unknown }).typingFx : undefined;
  const id = fx !== null && typeof fx === "object" ? (fx as { soundProfile?: unknown }).soundProfile : undefined;
  return typeof id === "string" ? id : null;
}

/**
 * The kit's rule (settleKeyboardChoice) with Last Line's sounds: a catalogue
 * that loaded without the saved id moves it to the catalogue's default, then
 * Bright Clack, then the first set, then Relay, and asks for a save; one that
 * did not load keeps the saved id ("Saved sound · unavailable").
 */
export function settleKeyboard(saved: string | null, catalog: KeyboardCatalog): KeyboardSettlement {
  return settleKeyboardChoice(saved, catalog, RELAY, DEFAULT_KEYBOARD_SOUND);
}

/** What startKeyboard asks of the page. */
export type KeyboardHost = {
  /** The page's keyboard id now (settings.typingFx.soundProfile). */
  current(): string;
  /** The catalogue settled the choice: take `id`; `save` only when it repaired the save. */
  choose(id: string, save: boolean): void;
  /** The Sound panel's keyboard row takes the settled list (QuickSettings.setChoiceOptions), open or not. */
  list(options: readonly KeyboardSoundChoice[]): void;
  /** An origin is set and its catalogue did not load (404, HTML, no answer in 3 s, CORS, no usable set). */
  unavailable(): void;
  /**
   * The saved set `id` cannot sound this session (Typing Feel is off or
   * failed, so it is "Saved sound · unavailable", or its load gave no sample):
   * Relay plays in its place (§5.1 step 5, §5.3) until the player picks a
   * keyboard sound. The page keeps `id` and never saves the stand-in.
   */
  standIn(id: string): void;
  /** Once, when the fight may start. */
  playable(): void;
};

/**
 * Settles the saved choice once `feed`'s catalogue is in, then loads that set;
 * the page never waits on it. `saved` is the save's own field (savedKeyboardId).
 * A choice the player made while the catalogue loaded (Off or Relay: the
 * pending list has nothing else) stands and is not saved again here.
 * `signal` aborts once the player picks a keyboard sound: the startup load
 * then stops and leaves the player (and the Sound panel's own load) alone.
 * host.playable() runs once: when the set's first batch is in, when the load
 * ends without one, or `gateMs` (KEYBOARD_GATE_MS) after this call, whichever
 * comes first. Never rejects.
 */
export async function startKeyboard(
  sounds: TypingSounds,
  feed: KeyboardFeed,
  saved: string | null,
  host: KeyboardHost,
  options: {
    readonly gateMs?: number;
    readonly fetchJson?: (url: string) => Promise<unknown>;
    readonly fetchBytes?: (url: string) => Promise<ArrayBuffer>;
    readonly signal?: AbortSignal;
  } = {},
): Promise<void> {
  const pending = host.current();
  let told = false;
  const tell = (): void => {
    if (told) return;
    told = true;
    host.playable();
  };
  const timer = setTimeout(tell, options.gateMs ?? KEYBOARD_GATE_MS);
  try {
    const catalog = await feed.catalog;
    const now = host.current();
    const picked = options.signal?.aborted === true || now !== pending;
    const settled = settleKeyboard(picked ? now : saved, catalog);
    host.choose(settled.id, settled.repaired);
    host.list(settled.options);
    if (feed.base !== null && catalog.state !== "ready") host.unavailable();
    const outcome = await loadSavedKeyboard(sounds, settled.options, () => host.current(), tell, options.fetchJson, options.fetchBytes, options.signal);
    if (outcome === "silent") host.standIn(settled.id);
  } catch { /* A hook threw: the fight starts without keyboard sounds. */ }
  finally {
    clearTimeout(timer);
    tell();
  }
}

/** Samples go straight to the shared context's destination, outside Effects and Relay's bus. */
export function applyKeyboardLevels(sounds: TypingSounds, s: Settings): void {
  const gain = keyboardPreviewGain({ master: s.masterVolume, keyboard: s.typingFx.volume, muted: s.muted });
  sounds.muted = gain === 0 || s.typingFx.soundProfile === "off" || s.typingFx.soundProfile === BUILT_IN_KEYS;
  sounds.setVolume(gain);
  if (s.typingFx.soundProfile === "off" || s.typingFx.soundProfile === BUILT_IN_KEYS) sounds.use("off");
}

/**
 * How a startup load ended: "playing" (the set sounds), "silent" (the player
 * is still on a set that cannot sound: unavailable, no manifest, no sample
 * decoded) or "other" (Off, Relay, or the player moved on).
 */
export type SavedKeyboardLoad = "playing" | "silent" | "other";

/**
 * Restore without a preview; a late startup load cannot undo a new selection.
 * `playable` runs once, when the fight may start: as soon as the set's first
 * decode batch is in (those samples play while the rest of the set loads),
 * or when the load ends without one (Off, Relay, an unavailable or missing
 * set, blocked audio). The manifest loads through manifestJson and the
 * samples through sampleBytes by default. A first batch whose every file
 * fails ends the load (the set counts as broken, §5.3). Once `signal` aborts
 * (the player picked a keyboard sound) the load stops and touches nothing.
 */
export async function loadSavedKeyboard(
  sounds: TypingSounds,
  choices: readonly KeyboardSoundChoice[],
  current: () => string,
  playable: () => void = () => {},
  fetchJson: (url: string) => Promise<unknown> = manifestJson,
  fetchBytes: (url: string) => Promise<ArrayBuffer> = sampleBytes,
  signal?: AbortSignal,
): Promise<SavedKeyboardLoad> {
  let told = false;
  const tell = (): void => {
    if (told) return;
    told = true;
    playable();
  };
  const id = current();
  const stop = new AbortController();
  const follow = (): void => stop.abort();
  signal?.addEventListener("abort", follow, { once: true });
  // The player moved on (a pick, or another id): their choice owns the player now.
  const left = (): boolean => signal?.aborted === true || current() !== id;
  try {
    if (signal?.aborted) return "other";
    const choice = choices.find((c) => c.value === id);
    if (!choice?.manifest || choice.disabled) return id === "off" || id === BUILT_IN_KEYS ? "other" : "silent";
    let requested = 0;
    let failed = 0;
    // The kit requests batch n + 1 only once batch n has decoded, so the first
    // request past one batch means a batch is in: play it unless the player moved on.
    const counted = (url: string): Promise<ArrayBuffer> => {
      const n = requested++;
      if (n === KEYBOARD_DECODE_BATCH_SIZE) {
        if (!left()) sounds.use(id);
        tell();
      }
      const bytes = fetchBytes(url);
      // Every file of the first batch failed: the host is broken for this set, stop asking.
      if (n < KEYBOARD_DECODE_BATCH_SIZE) void bytes.catch(() => { if (++failed === KEYBOARD_DECODE_BATCH_SIZE) stop.abort(); });
      return bytes;
    };
    const result = await sounds.loadKeyboardManifest(choice.manifest, id, choice.label, fetchJson, counted, false, stop.signal);
    if (signal?.aborted) return "other";
    if (current() !== id) {
      // The player chose another set while this one decoded: drop its buffers.
      if (sounds.profile?.id !== id) sounds.release(id);
      return "other";
    }
    if (result.state === "pending") {
      sounds.use("off");
      return "silent";
    }
    sounds.use(id);
    return "playing";
  } catch {
    // Blocked audio leaves this pack silent; selecting it again retries through the kit.
    return left() ? "other" : "silent";
  } finally {
    signal?.removeEventListener("abort", follow);
    tell();
  }
}

/** One sample per letter; word completion already has the game's magazine cue. */
export function keyboardSink(sounds: TypingSounds): TypingFxSink {
  return { key: (index) => sounds.key(index), wrong: () => sounds.wrong(), stray: () => sounds.stray() };
}
