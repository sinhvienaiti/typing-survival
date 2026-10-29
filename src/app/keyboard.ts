/** Firefly catalogue and gameplay startup; the kit owns variants and panel previews. */
import { keyboardPreviewGain, loadKeyboardCatalog, type KeyboardSoundChoice, type TypingSounds, type TypingFxSink } from "../kit/feedback/typing-fx";
import { BUILT_IN_KEYS, DEFAULT_KEYBOARD_SOUND, type Settings } from "./settings";

export const KEYS_BASE = "/assets/typing-survival/audio/keys/";

export async function loadKeyboardChoices(fetchJson?: (url: string) => Promise<unknown>): Promise<readonly KeyboardSoundChoice[]> {
  const catalog = await loadKeyboardCatalog(KEYS_BASE, { extra: [{ value: BUILT_IN_KEYS, label: "Relay" }], fallback: [], fetchJson });
  return [catalog.options[0]!, catalog.options.find((c) => c.value === BUILT_IN_KEYS)!, ...catalog.options.filter((c) => c.value !== "off" && c.value !== BUILT_IN_KEYS)];
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

/** Restore without a preview; a late startup load cannot undo a new selection. */
export async function loadSavedKeyboard(sounds: TypingSounds, choices: readonly KeyboardSoundChoice[], current: () => string): Promise<void> {
  const id = current();
  const choice = choices.find((c) => c.value === id);
  if (!choice?.manifest) return;
  try {
    const result = await sounds.loadKeyboardManifest(choice.manifest, id, choice.label);
    if (current() === id) sounds.use(result.state === "pending" ? "off" : id);
  } catch { /* Blocked audio leaves this pack silent; selecting it again retries through the kit. */ }
}

/** One sample per letter; word completion already has the game's magazine cue. */
export function keyboardSink(sounds: TypingSounds): TypingFxSink {
  return { key: (index) => sounds.key(index), wrong: () => sounds.wrong(), stray: () => sounds.stray() };
}
