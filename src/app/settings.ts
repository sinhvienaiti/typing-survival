/**
 * The player's settings (key survival.settings): what the Options screen
 * and the quick panels (quick.ts) change, read back whole or field by field
 * so an old, partial or broken save still loads. The typing feedback lives
 * under the kit's field name (`typingFx`, sanitizeTypingFx). No DOM here:
 * tests/quick-settings.test.ts runs it in Node.
 */
import type { SoundLevels } from "../audio/theme-audio";
import { DEFAULT_MODE, isMode, type Mode } from "../content/balance";
import { DEFAULT_TYPING_FX, sanitizeTypingFx, type TypingFxSettings } from "../kit/feedback/typing-fx";
import type { QuickValue } from "../kit/ui";

/** The game's own key sound (theme-audio.ts), the Keyboard sound choice until the keyboard packs arrive. */
export const BUILT_IN_KEYS = "relay";

/** Last Line's typing feedback defaults: the kit's (Stamp, Normal, Large), its own key sound at full level (as before the Sound panel). */
export const FX_DEFAULTS: Readonly<TypingFxSettings> = Object.freeze({ ...DEFAULT_TYPING_FX, soundProfile: BUILT_IN_KEYS, volume: 1 });

export type Settings = {
  /** Effects (guns, hits, kills, alarms) and music, 0 … 1. */
  sfxVolume: number;
  musicVolume: number;
  /** Over every sound; `muted` silences them all. */
  masterVolume: number;
  muted: boolean;
  /** Menus and panels. */
  uiVolume: number;
  screenShake: boolean;
  pronunciationEnabled: boolean;
  pronunciationRate: number;
  pronunciationVolume: number;
  /** The mode (Relaxed, Balanced, Challenge) and "Adapt pace to your typing". */
  mode: Mode;
  paceAdapt: boolean;
  /** Letter style, strength, word size, keyboard sound and its volume. */
  typingFx: TypingFxSettings;
};

export const DEFAULTS: Readonly<Settings> = Object.freeze({
  sfxVolume: 0.7,
  musicVolume: 0.5,
  masterVolume: 1,
  muted: false,
  uiVolume: 0.7,
  screenShake: true,
  pronunciationEnabled: true,
  pronunciationRate: 0.9,
  pronunciationVolume: 1,
  mode: DEFAULT_MODE,
  paceAdapt: true,
  typingFx: FX_DEFAULTS,
});

const level = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback);
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);

/** A stored value (anything) as settings; each bad field falls back on its own. */
export function loadSettings(raw: unknown): Settings {
  const s = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sfx = level(s.sfxVolume, DEFAULTS.sfxVolume);
  return {
    sfxVolume: sfx,
    musicVolume: level(s.musicVolume, DEFAULTS.musicVolume),
    masterVolume: level(s.masterVolume, DEFAULTS.masterVolume),
    muted: flag(s.muted, DEFAULTS.muted),
    // An older save had the interface on the effects level: it keeps it.
    uiVolume: level(s.uiVolume, sfx),
    screenShake: flag(s.screenShake, DEFAULTS.screenShake),
    pronunciationEnabled: flag(s.pronunciationEnabled, DEFAULTS.pronunciationEnabled),
    pronunciationRate: typeof s.pronunciationRate === "number" && Number.isFinite(s.pronunciationRate) ? Math.max(0.5, Math.min(1.5, s.pronunciationRate)) : DEFAULTS.pronunciationRate,
    pronunciationVolume: level(s.pronunciationVolume, DEFAULTS.pronunciationVolume),
    mode: isMode(s.mode) ? s.mode : DEFAULT_MODE,
    paceAdapt: flag(s.paceAdapt, DEFAULTS.paceAdapt),
    typingFx: sanitizeTypingFx(s.typingFx, FX_DEFAULTS),
  };
}

/** The levels ThemeAudio plays at. Keyboard sound "Off" silences the keys; any other choice keeps the game's own. */
export function soundLevels(s: Settings): SoundLevels {
  return { master: s.masterVolume, muted: s.muted, sfx: s.sfxVolume, music: s.musicVolume, ui: s.uiVolume, keys: s.typingFx.volume, keysOn: s.typingFx.soundProfile !== "off" };
}

/** The spoken word's volume: its own level under master; nothing when muted. */
export function voiceLevel(s: Settings): number {
  return s.muted ? 0 : s.pronunciationVolume * s.masterVolume;
}

/** What the page holds outside the save: the graphics tier and reduced motion. */
export type PageValues = { quality: string; reducedMotion: boolean };

const percent = (value: number): number => Math.round(value * 100);

/** The quick panels' values by row id (volumes 0–100). */
export function quickValues(s: Settings, page: PageValues): Record<string, QuickValue> {
  return {
    master: percent(s.masterVolume),
    muted: s.muted,
    music: percent(s.musicVolume),
    effects: percent(s.sfxVolume),
    voice: percent(s.pronunciationVolume),
    ui: percent(s.uiVolume),
    keyboard: s.typingFx.soundProfile,
    keyboardVolume: percent(s.typingFx.volume),
    fxStyle: s.typingFx.style,
    fxIntensity: s.typingFx.intensity,
    fxSize: s.typingFx.size,
    quality: page.quality,
    reducedMotion: page.reducedMotion,
    speak: s.pronunciationEnabled,
    shake: s.screenShake,
  };
}

const FX_FIELD: Readonly<Record<string, keyof TypingFxSettings>> = { keyboard: "soundProfile", fxStyle: "style", fxIntensity: "intensity", fxSize: "size" };

/**
 * A quick panel's change into the settings (in place). Returns false for an
 * id the save does not hold (quality, reduced motion: the page's) or a value
 * of the wrong kind.
 */
export function applyQuick(s: Settings, id: string, value: QuickValue): boolean {
  if (typeof value === "number") {
    const v = level(value / 100, 0);
    if (id === "master") s.masterVolume = v;
    else if (id === "music") s.musicVolume = v;
    else if (id === "effects") s.sfxVolume = v;
    else if (id === "voice") s.pronunciationVolume = v;
    else if (id === "ui") s.uiVolume = v;
    else if (id === "keyboardVolume") s.typingFx = { ...s.typingFx, volume: v };
    else return false;
    return true;
  }
  if (typeof value === "boolean") {
    if (id === "muted") s.muted = value;
    else if (id === "speak") s.pronunciationEnabled = value;
    else if (id === "shake") s.screenShake = value;
    else return false;
    return true;
  }
  const field = FX_FIELD[id];
  if (field === undefined) return false;
  const next = sanitizeTypingFx({ ...s.typingFx, [field]: value }, FX_DEFAULTS);
  if (next[field] !== value) return false;
  s.typingFx = next;
  return true;
}
