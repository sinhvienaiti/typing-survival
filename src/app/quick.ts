/**
 * The quick panels (the kit's ui/quick-settings; parent docs/games/IN_GAME_SETTINGS.md,
 * TYPING_FEEDBACK_REVIEW.md §23): Settings (F1) and Sound (F2) in the HUD's
 * top-right corner on every screen. Opened from a fight they pause it and
 * freeze typing; closing counts 3-2-1 back in (no count off the fight).
 * Every change applies at once and goes into the save (main.ts owns the
 * values: settings.ts maps them). The corner buttons are the gear (ticket
 * 243) and the speakers of ticket 180 (quickIcons), with every row's icon;
 * the sliders are the kit's fill layer on the 225 groove and knob with the
 * 244 fill (quickSkin); the keyboard sound rows are the ticket 127 button
 * plates. The panels' frames, buttons and choices are survival.css's
 * nine-slice rules on the ticket 127 frames, not the kit's stretched
 * skin.panel and skin.button.
 */
import { QuickSettings, defaultSettingsRows, defaultSoundRows, type QuickChoiceOption, type QuickContext, type QuickMount, type QuickNineSlice, type QuickRow, type QuickSettingsOptions, type QuickSkin, type QuickValue } from "../kit/ui";
import type { KeyboardSoundChoice, TypingSounds } from "../kit/feedback/typing-fx";
import { artUrl, framePlate, quickIcons } from "../view/ui-art";
import { manifestJson, sampleBytes } from "./keyboard";

/**
 * The keyboard sound rows' plate edges (CSS px at scale 1: top, right, bottom,
 * left), as survival.css draws the ticket 127 button: 9 px bands, 10 px sides.
 */
export const ROW_EDGE = [9, 10, 9, 10] as const;

/**
 * The sliders' and list rows' art, through the UI art table. The kit's fill
 * layer draws the 225 groove (1024 × 64) as the empty part and the 244 fill
 * left of the knob, clipped at its centre (survival.css cuts both so their
 * ends meet); the 128 px knob of 225. Keyboard sound rows are the ticket 127
 * button plate, the chosen row the lit button-active plate. A part without
 * art stays the kit's plain look; a missing fill leaves the groove lit by the
 * kit's filter.
 */
export function quickSkin(): QuickSkin {
  const track = artUrl("slider-track", 290);
  const fill = artUrl("slider-fill", 290);
  const thumb = artUrl("slider-thumb", 22);
  const plate = (role: "frame-button" | "frame-button-active"): QuickNineSlice | null => {
    const art = framePlate(role);
    return art === null ? null : { ...art, edge: [...ROW_EDGE] };
  };
  const row = plate("frame-button"), active = plate("frame-button-active");
  return {
    ...(track !== null ? { sliderTrack: track, sliderEmpty: track } : {}),
    ...(fill !== null ? { sliderFill: fill } : {}),
    ...(thumb !== null ? { sliderThumb: thumb } : {}),
    ...(row !== null ? { listRow: row } : {}),
    ...(active !== null ? { listRowActive: active } : {}),
  };
}

/**
 * The keyboard rows' plate at the panel's scale: survival.css scales the
 * kit's 34 px rows by --kit-qs-s, so their edges and the label's inset scale
 * too (the kit's own values are these at scale 1).
 */
const scaled = (n: number): string => `calc(${n}px * var(--kit-qs-s))`;
export const LIST_ROW_VARS: Readonly<Record<string, string>> = {
  "--kit-qs-list-edge": ROW_EDGE.map(scaled).join(" "),
  "--kit-qs-list-active-edge": ROW_EDGE.map(scaled).join(" "),
  "--kit-qs-list-text-x": scaled(Math.max(...ROW_EDGE) + 6),
};

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
  /** "title" off a run's screens (no Resume, no Quit to title); unset: always "play". */
  context?(): QuickContext;
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
    context: () => hooks.context?.() ?? "play",
    settingsRows: settingsRows(hooks.mountPreview),
    soundRows: soundRows(hooks.keyboardChoices),
    icons: quickIcons(),
    skin: quickSkin(),
  };
}

export function createQuickSettings(hooks: QuickHooks): QuickSettings {
  const quick = new QuickSettings(quickOptions(hooks));
  // After the kit's skin (it sets the plates' unscaled edges on the layer).
  for (const [name, value] of Object.entries(LIST_ROW_VARS)) quick.root.style.setProperty(name, value);
  return quick;
}
