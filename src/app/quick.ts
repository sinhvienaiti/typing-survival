/**
 * The quick panels (the kit's ui/quick-settings; parent docs/games/IN_GAME_SETTINGS.md,
 * TYPING_FEEDBACK_REVIEW.md §23): Settings (F1) and Sound (F2) in the HUD's
 * top-right corner on every screen. Opened from a fight they pause it and
 * freeze typing; closing counts 3-2-1 back in (no count off the fight).
 * Every change applies at once and goes into the save (main.ts owns the
 * values: settings.ts maps them). No icon art yet (Codex ticket 180): the
 * kit shows plain text buttons.
 */
import { QuickSettings, defaultSettingsRows, defaultSoundRows, type QuickChoiceOption, type QuickMount, type QuickRow, type QuickSettingsOptions, type QuickValue } from "../kit/ui";
import type { KeyboardSoundChoice, TypingSounds } from "../kit/feedback/typing-fx";
import { manifestJson, sampleBytes } from "./keyboard";

/**
 * The Settings rows: the kit's (typing effects with a preview, graphics; no
 * Learning switches: the meaning and the IPA always show), then the game's
 * own. Everything fits a 1280 × 720 view without scrolling.
 */
export function settingsRows(mountPreview: QuickMount): QuickRow[] {
  const rows = defaultSettingsRows({ mountPreview, gameRows: [{ kind: "toggle", id: "shake", label: "Screen shake", default: true }] });
  // A new graphics tier takes a new page: a fight keeps its own.
  const quality = rows.findIndex((row) => row.id === "quality");
  const row = rows[quality];
  if (row !== undefined && row.kind === "choice") rows[quality] = { ...row, label: "Quality (next run)" };
  return rows;
}

/**
 * The Sound rows: the kit's, with "Read words aloud" under Voice (the words
 * the game speaks). The keyboard row opens with the pending list (Off, Relay,
 * the saved set "Loading…") and takes the settled list from Typing Feel
 * through QuickSettings.setChoiceOptions (keyboard.ts, startKeyboard); the
 * saved id always stays in the list, so the row never repairs it on its own.
 */
export function soundRows(choices: readonly KeyboardSoundChoice[]): QuickRow[] {
  const rows = defaultSoundRows({ keyboardProfiles: choices });
  rows.splice(rows.findIndex((r) => r.id === "voice") + 1, 0, { kind: "toggle", id: "speak", label: "Read words aloud", default: true });
  return rows;
}

export type QuickHooks = {
  host: HTMLElement;
  values(): Record<string, QuickValue>;
  change(id: string, value: QuickValue): void;
  preview(group: string): void;
  /** The keyboard row's first list: pendingKeyboardChoices until the catalogue settles it. */
  keyboardChoices: readonly KeyboardSoundChoice[];
  keyboardSounds: TypingSounds;
  /** A set picked in the Sound panel cannot sound: Relay stands in for it (keyboard.ts pickFailed). */
  keyboardFail(choice: QuickChoiceOption): void;
  mountPreview: QuickMount;
  pause(): void;
  resume(): void;
  quit(): void;
  /** ms per countdown step (0: back at once). */
  countdown(): number;
};

/**
 * The panels' options. The keyboard row loads a picked set and every preview
 * through the startup's timed fetches (keyboard.ts: the manifest HTTP-cached
 * within 3 s, each file within 8 s), and reports a pick that cannot sound.
 */
export function quickOptions(hooks: QuickHooks): QuickSettingsOptions {
  return {
    host: hooks.host,
    getValues: hooks.values,
    onChange: hooks.change,
    onPreview: hooks.preview,
    keyboardSounds: hooks.keyboardSounds,
    keyboardFetch: { fetchJson: manifestJson, fetchBytes: sampleBytes },
    onKeyboardFail: hooks.keyboardFail,
    onPause: hooks.pause,
    onResume: hooks.resume,
    onQuit: hooks.quit,
    countdownMs: hooks.countdown,
    settingsRows: settingsRows(hooks.mountPreview),
    soundRows: soundRows(hooks.keyboardChoices),
    icons: {},
  };
}

export function createQuickSettings(hooks: QuickHooks): QuickSettings {
  return new QuickSettings(quickOptions(hooks));
}
