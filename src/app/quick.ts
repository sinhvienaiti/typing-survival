/**
 * The quick panels (the kit's ui/quick-settings; parent docs/games/IN_GAME_SETTINGS.md,
 * TYPING_FEEDBACK_REVIEW.md §23): Settings (F1) and Sound (F2) in the HUD's
 * top-right corner on every screen. Opened from a fight they pause it and
 * freeze typing; closing counts 3-2-1 back in (no count off the fight).
 * Every change applies at once and goes into the save (main.ts owns the
 * values: settings.ts maps them). The corner buttons are the gear and the
 * speakers of ticket 180 (quickIcons), with the Sound rows' icons; the
 * sliders are skinned with the groove and knob of ticket 225 (quickSkin).
 * The panels' frames, buttons and choices are survival.css's nine-slice
 * rules on the ticket 127 frames, not the kit's stretched skin.panel and
 * skin.button; the groove is lit up to the knob from --v (paintRanges).
 */
import { QuickSettings, defaultSettingsRows, defaultSoundRows, type QuickChoiceOption, type QuickMount, type QuickRow, type QuickSettingsOptions, type QuickSkin, type QuickValue } from "../kit/ui";
import type { KeyboardSoundChoice, TypingSounds } from "../kit/feedback/typing-fx";
import { artUrl, quickIcons } from "../view/ui-art";
import { manifestJson, sampleBytes } from "./keyboard";

/**
 * The sliders' art (ticket 225), through the UI art table: the kit draws the
 * groove 10 px tall and up to 290 px wide, the knob 22 px (× its scale, 1.5
 * at 1080p), so the 1024 × 64 groove and the 128 px knob stay sharp at 2×.
 * survival.css clears the kit's flat colours under both, so only the art
 * shows. A part without art stays the kit's plain slider.
 */
export function quickSkin(): QuickSkin {
  const track = artUrl("slider-track", 290);
  const thumb = artUrl("slider-thumb", 22);
  return { ...(track !== null ? { sliderTrack: track } : {}), ...(thumb !== null ? { sliderThumb: thumb } : {}) };
}

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
  // The kit leaves "Keyboard volume" without an icon: it takes the keyboard row's key cap (UI pass 3).
  const volume = rows.findIndex((r) => r.id === "keyboardVolume");
  const row = rows[volume];
  if (row !== undefined && row.kind === "slider" && row.icon === undefined) rows[volume] = { ...row, icon: "vol-keyboard" };
  return rows;
}

/**
 * Each slider's value as --v (0–100) on its input: survival.css darkens the
 * groove past the knob, so 50 and 100 read apart (UI pass 2; the kit draws
 * the groove whole and has no fill layer yet).
 */
export function paintRanges(host: { querySelectorAll?: (selector: string) => ArrayLike<Element> } | null | undefined): void {
  if (typeof host?.querySelectorAll !== "function") return;
  for (const input of Array.from(host.querySelectorAll(".kit-qs__range")) as HTMLInputElement[]) {
    const min = Number(input.min || 0), max = Number(input.max || 100), value = Number(input.value);
    const v = max > min ? Math.round(((value - min) / (max - min)) * 1000) / 10 : 0;
    input.style.setProperty("--v", String(v));
  }
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
  // The kit sets each slider's value right after it reads the values or takes a change: light the grooves then.
  const relight = (): void => queueMicrotask(() => paintRanges(hooks.host));
  return {
    host: hooks.host,
    getValues: () => {
      relight();
      return hooks.values();
    },
    onChange: (id, value) => {
      hooks.change(id, value);
      relight();
    },
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
    icons: quickIcons(),
    skin: quickSkin(),
  };
}

export function createQuickSettings(hooks: QuickHooks): QuickSettings {
  return new QuickSettings(quickOptions(hooks));
}
