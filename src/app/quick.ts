/**
 * The quick panels (the kit's ui/quick-settings; parent docs/games/IN_GAME_SETTINGS.md,
 * TYPING_FEEDBACK_REVIEW.md §23): Settings (F1) and Sound (F2) in the HUD's
 * top-right corner on every screen. Opened from a fight they pause it and
 * freeze typing; closing counts 3-2-1 back in (no count off the fight).
 * Every change applies at once and goes into the save (main.ts owns the
 * values: settings.ts maps them). No icon art yet (Codex ticket 180): the
 * kit shows plain text buttons.
 */
import { DEFAULT_KEYBOARD_PROFILES, QuickSettings, defaultSettingsRows, defaultSoundRows, type QuickChoiceOption, type QuickMount, type QuickRow, type QuickValue } from "../kit/ui";
import { BUILT_IN_KEYS } from "./settings";

/**
 * Keyboard sound: Off, the game's own relay (so Off can be undone), and the
 * five packs, shown but not selectable ("pending": the owner paused
 * keyboard sounds, 29/10).
 */
export const KEYBOARD_CHOICES: readonly QuickChoiceOption[] = [
  { value: "off", label: "Off" },
  { value: BUILT_IN_KEYS, label: "Relay" },
  ...DEFAULT_KEYBOARD_PROFILES.filter((option) => option.value !== "off").map((option) => ({ ...option, disabled: true })),
];

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

/** The Sound rows: the kit's, with "Read words aloud" under Voice (the words the game speaks). */
export function soundRows(): QuickRow[] {
  const rows = defaultSoundRows({ keyboardProfiles: KEYBOARD_CHOICES });
  rows.splice(rows.findIndex((r) => r.id === "voice") + 1, 0, { kind: "toggle", id: "speak", label: "Read words aloud", default: true });
  return rows;
}

export type QuickHooks = {
  host: HTMLElement;
  values(): Record<string, QuickValue>;
  change(id: string, value: QuickValue): void;
  preview(group: string): void;
  mountPreview: QuickMount;
  pause(): void;
  resume(): void;
  quit(): void;
  /** ms per countdown step (0: back at once). */
  countdown(): number;
};

export function createQuickSettings(hooks: QuickHooks): QuickSettings {
  return new QuickSettings({
    host: hooks.host,
    getValues: hooks.values,
    onChange: hooks.change,
    onPreview: hooks.preview,
    onPause: hooks.pause,
    onResume: hooks.resume,
    onQuit: hooks.quit,
    countdownMs: hooks.countdown,
    settingsRows: settingsRows(hooks.mountPreview),
    soundRows: soundRows(),
    icons: {},
  });
}
