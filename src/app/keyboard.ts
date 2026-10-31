/**
 * Keyboard sounds from Typing Feel (parent docs/games/TYPING_FEEL_SERVICE.md
 * §5.1–5.3): the catalogue and the sets are read at run time from the build's
 * VITE_TYPING_FEEL_ORIGIN, never copied into the game. Startup never waits on
 * that host: the Sound panel opens at once with pendingKeyboardChoices, the
 * catalogue settles the saved choice when it arrives (a host that fails keeps
 * the player's set), and the fight waits at most KEYBOARD_GATE_MS for the
 * set's first decoded batch. A saved set that cannot sound this session has
 * Relay stand in for it (host.standIn), unsaved; so does a set the player
 * picks in the Sound panel (pickFailed). Startup and the panel load through
 * the same timed fetches (manifestJson, sampleBytes; quick.ts passes them to
 * QuickSettings). The kit owns variants and panel previews.
 */
import {
  KEYBOARD_CATALOG_TIMEOUT_MS, KEYBOARD_DECODE_BATCH_SIZE, KEYBOARD_SAMPLE_TIMEOUT_MS, keyboardPreviewGain, loadKeyboardCatalog, settleKeyboardChoice, timedBytes, timedJson, typingFeelKeysBase,
  type KeyboardCatalog, type KeyboardSettlement, type KeyboardSoundChoice, type TypingFxSink, type TypingSounds,
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

/**
 * Sample and preview bytes, startup and Sound panel alike: a file the host has
 * not delivered in 8 s (the kit's KEYBOARD_SAMPLE_TIMEOUT_MS) is given up and
 * counts as missing, so a set's load always ends (§8.1).
 */
export const sampleBytes = timedBytes(KEYBOARD_SAMPLE_TIMEOUT_MS);

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
   * failed, so it is "Saved sound · unavailable", or its load gave no sample),
   * or the set `id` picked in the Sound panel cannot (pickFailed): Relay plays
   * in its place (§5.1 step 5, §5.3) until the player picks a keyboard sound.
   * The page keeps `id` and never saves the stand-in.
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

/**
 * QuickSettings' onKeyboardFail (quick.ts): the set the player picked in the
 * Sound panel cannot sound this session (no sample came, or its load failed).
 * While it is still the page's keyboard sound, Relay stands in for it
 * (host.standIn), unsaved, as for a saved set at startup; the save keeps the
 * pick, and the player's next pick ends the stand-in (main.ts quickChange).
 * True: Relay stands in.
 */
export function pickFailed(choice: { readonly value: string }, host: Pick<KeyboardHost, "current" | "standIn">): boolean {
  if (choice.value === "off" || choice.value === BUILT_IN_KEYS || choice.value !== host.current()) return false;
  host.standIn(choice.value);
  return true;
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
 * samples through sampleBytes by default. A first batch that decodes nothing
 * ends the load (the kit's TypingSounds.load: the set counts as broken, §5.3),
 * here and in the Sound panel alike. Once `signal` aborts (the player picked
 * a keyboard sound) the load stops and touches nothing.
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
  // The player moved on (a pick, or another id): their choice owns the player now.
  const left = (): boolean => signal?.aborted === true || current() !== id;
  try {
    if (signal?.aborted) return "other";
    const choice = choices.find((c) => c.value === id);
    if (!choice?.manifest || choice.disabled) return id === "off" || id === BUILT_IN_KEYS ? "other" : "silent";
    let requested = 0;
    // The kit asks for the second batch only once the first has settled with a
    // sample decoded (it stops otherwise), so the first request past one batch
    // means a batch is in: play it unless the player moved on.
    const counted = (url: string): Promise<ArrayBuffer> => {
      if (requested++ === KEYBOARD_DECODE_BATCH_SIZE) {
        if (!left()) sounds.use(id);
        tell();
      }
      return fetchBytes(url);
    };
    const result = await sounds.loadKeyboardManifest(choice.manifest, id, choice.label, fetchJson, counted, false, signal);
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
    tell();
  }
}

/** One sample per letter; word completion already has the game's magazine cue. */
export function keyboardSink(sounds: TypingSounds): TypingFxSink {
  return { key: (index) => sounds.key(index), wrong: () => sounds.wrong(), stray: () => sounds.stray() };
}
