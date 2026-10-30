/** Firefly catalogue and gameplay startup; the kit owns variants and panel previews. */
import { KEYBOARD_DECODE_BATCH_SIZE, keyboardPreviewGain, loadKeyboardCatalog, type KeyboardSoundChoice, type TypingSounds, type TypingFxSink } from "../kit/feedback/typing-fx";
import { BUILT_IN_KEYS, DEFAULT_KEYBOARD_SOUND, type Settings } from "./settings";

export const KEYS_BASE = "/assets/typing-survival/audio/keys/";

/**
 * Off and Relay first, with no family (so no heading above them), then the 34
 * Firefly sets in catalogue order. Each set keeps its `family` (Deep, Warm,
 * Rounded, Solid, Crisp, Clear, Bright Clack): the kit's picker draws one
 * heading per family run and PageUp/PageDown jump between them.
 */
export async function loadKeyboardChoices(fetchJson?: (url: string) => Promise<unknown>): Promise<readonly KeyboardSoundChoice[]> {
  const catalog = await loadKeyboardCatalog(KEYS_BASE, { extra: [{ value: BUILT_IN_KEYS, label: "Relay" }], fallback: [], fetchJson });
  const off = catalog.options[0]!;
  const relay = catalog.options.find((c) => c.value === BUILT_IN_KEYS)!;
  return [off, relay, ...catalog.options.filter((c) => c !== off && c !== relay)];
}

export function defaultKeyboard(choices: readonly KeyboardSoundChoice[]): string {
  return choices.find((c) => c.value === DEFAULT_KEYBOARD_SOUND && c.manifest)?.value ?? choices.find((c) => c.manifest && !c.disabled)?.value ?? BUILT_IN_KEYS;
}

/** Repair an obsolete save before constructing the panels, and persist it in the game. */
export function restoreKeyboardChoice(s: Settings, choices: readonly KeyboardSoundChoice[]): boolean {
  if (choices.some((c) => c.value === s.typingFx.soundProfile && !c.disabled)) return false;
  s.typingFx = { ...s.typingFx, soundProfile: defaultKeyboard(choices) };
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
 * Restore without a preview; a late startup load cannot undo a new selection.
 * `playable` runs once, when the fight may start: as soon as the set's first
 * decode batch is in (those samples play while the rest of the set loads),
 * or when the load ends without one (Off, Relay, a missing set, blocked audio).
 */
export async function loadSavedKeyboard(sounds: TypingSounds, choices: readonly KeyboardSoundChoice[], current: () => string, playable: () => void = () => {}): Promise<void> {
  let told = false;
  const tell = (): void => {
    if (told) return;
    told = true;
    playable();
  };
  try {
    const id = current();
    const choice = choices.find((c) => c.value === id);
    if (!choice?.manifest) return;
    let requested = 0;
    // The kit requests batch n + 1 only once batch n has decoded, so the first
    // request past one batch means a batch is in: play it unless the player moved on.
    const fetchBytes = (url: string): Promise<ArrayBuffer> => {
      if (requested++ === KEYBOARD_DECODE_BATCH_SIZE) {
        if (current() === id) sounds.use(id);
        tell();
      }
      return fetchSample(url);
    };
    const result = await sounds.loadKeyboardManifest(choice.manifest, id, choice.label, undefined, fetchBytes);
    if (current() === id) sounds.use(result.state === "pending" ? "off" : id);
    // The player chose another set while this one decoded: drop its 25–88 buffers.
    else if (sounds.profile?.id !== id) sounds.release(id);
  } catch { /* Blocked audio leaves this pack silent; selecting it again retries through the kit. */ }
  finally { tell(); }
}

async function fetchSample(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url + ": " + response.status);
  return response.arrayBuffer();
}

/** One sample per letter; word completion already has the game's magazine cue. */
export function keyboardSink(sounds: TypingSounds): TypingFxSink {
  return { key: (index) => sounds.key(index), wrong: () => sounds.wrong(), stray: () => sounds.stray() };
}
