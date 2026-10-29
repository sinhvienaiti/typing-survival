import { describe, expect, it } from "vitest";
import { KEYBOARD_CHOICES, settingsRows, soundRows } from "../src/app/quick";
import { BUILT_IN_KEYS, DEFAULTS, FX_DEFAULTS, applyQuick, loadSettings, quickValues, soundLevels, voiceLevel } from "../src/app/settings";
import { KEYBOARD_PROFILES } from "../src/kit/feedback/typing-fx";

/**
 * The quick panels' values (parent docs/games/IN_GAME_SETTINGS.md,
 * TYPING_FEEDBACK_REVIEW.md §20 item 5): the save loads field by field, the
 * typing feedback through the kit's sanitizer (Stamp, Large), every panel
 * row maps onto one setting, and the keyboard packs stay silent and
 * unselectable while Off and the game's own key sound stay choosable.
 */
const page = { quality: "high", reducedMotion: false };

describe("Last Line settings", () => {
  it("loads defaults from nothing: Stamp, Normal, Large, the game's own key sound at full level", () => {
    const s = loadSettings(null);
    expect(s).toEqual({ ...DEFAULTS, typingFx: { ...FX_DEFAULTS } });
    expect(s.typingFx).toEqual({ style: "stamp", intensity: "normal", size: "large", soundProfile: BUILT_IN_KEYS, volume: 1 });
    expect(soundLevels(s)).toEqual({ master: 1, muted: false, sfx: 0.7, music: 0.5, ui: 0.7, keys: 1, keysOn: true });
  });

  it("keeps an older save (no master, interface or typingFx) as it played, and drops broken fields one by one", () => {
    const old = loadSettings({ sfxVolume: 0.4, musicVolume: 0.2, screenShake: false, pronunciationEnabled: false, mode: "relax", paceAdapt: false });
    expect(old.uiVolume).toBe(0.4);
    expect(old.masterVolume).toBe(1);
    expect(old.typingFx.soundProfile).toBe(BUILT_IN_KEYS);
    expect(old.mode).toBe("relax");
    const broken = loadSettings({ sfxVolume: "loud", musicVolume: 3, muted: "yes", mode: "insane", typingFx: { style: "comic", intensity: "high", size: 9, volume: -1 } });
    expect(broken.sfxVolume).toBe(DEFAULTS.sfxVolume);
    expect(broken.musicVolume).toBe(1);
    expect(broken.muted).toBe(false);
    expect(broken.mode).toBe(DEFAULTS.mode);
    expect(broken.typingFx).toEqual({ ...FX_DEFAULTS, intensity: "high", volume: 0 });
  });

  it("maps every quick row both ways (volumes 0–100)", () => {
    const s = loadSettings(null);
    const changes: [string, number | string | boolean][] = [
      ["master", 80], ["muted", true], ["music", 30], ["effects", 55], ["voice", 40], ["ui", 25], ["keyboardVolume", 60],
      ["keyboard", "off"], ["fxStyle", "rune"], ["fxIntensity", "ultra"], ["fxSize", "huge"], ["speak", false], ["shake", false],
    ];
    for (const [id, value] of changes) expect(applyQuick(s, id, value), id).toBe(true);
    const values = quickValues(s, page);
    for (const [id, value] of changes) expect(values[id], id).toBe(value);
    expect(values.quality).toBe("high");
    expect(soundLevels(s)).toEqual({ master: 0.8, muted: true, sfx: 0.55, music: 0.3, ui: 0.25, keys: 0.6, keysOn: false });
    expect(voiceLevel(s)).toBe(0);
    expect(loadSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it("rejects what is not a setting, and leaves the settings as they were", () => {
    const s = loadSettings(null);
    const before = JSON.stringify(s);
    expect(applyQuick(s, "fxStyle", "comic")).toBe(false);
    expect(applyQuick(s, "fxSize", 3)).toBe(false);
    expect(applyQuick(s, "quality", "ultra")).toBe(false);
    expect(applyQuick(s, "reducedMotion", true)).toBe(false);
    expect(applyQuick(s, "nothing", 1)).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  });

  it("Off silences the keys; the built-in sound or any pack id keeps the game's own key sound", () => {
    const s = loadSettings(null);
    for (const [profile, on] of [["off", false], [BUILT_IN_KEYS, true], ["creamy", true], ["thock", true]] as const) {
      s.typingFx = { ...s.typingFx, soundProfile: profile };
      expect(soundLevels(s).keysOn, profile).toBe(on);
    }
    expect(voiceLevel({ ...s, masterVolume: 0.5, pronunciationVolume: 0.8 })).toBeCloseTo(0.4);
  });
});

describe("Last Line quick panels", () => {
  it("Keyboard sound offers Off and the game's relay; the five packs show as pending (owner 29/10: paused)", () => {
    expect(KEYBOARD_CHOICES.map((o) => o.value)).toEqual(["off", BUILT_IN_KEYS, ...KEYBOARD_PROFILES.map((p) => p.id)]);
    expect(KEYBOARD_CHOICES.filter((o) => o.disabled !== true).map((o) => o.value)).toEqual(["off", BUILT_IN_KEYS]);
    for (const option of KEYBOARD_CHOICES) expect(option.note).toBeUndefined();
  });

  it("Settings: typing effects with a preview, graphics (quality next run), the game's rows, Resume and Quit; Sound reads words aloud under Voice", () => {
    const rows = settingsRows(() => {});
    const ids = rows.map((row) => row.id);
    expect(ids).toEqual(["typingHeading", "fxStyle", "fxIntensity", "fxSize", "fxPreview", "graphicsHeading", "quality", "reducedMotion", "gameHeading", "shake", "resume", "quit"]);
    expect(soundRows().map((row) => row.id)).toEqual(["master", "music", "effects", "keyboard", "keyboardVolume", "voice", "speak", "ui"]);
    const quality = rows.find((row) => row.id === "quality");
    expect(quality?.kind === "choice" && quality.label).toBe("Quality (next run)");
    expect(quality?.kind === "choice" && quality.options.map((o) => o.value)).toEqual(["low", "medium", "high", "ultra"]);
  });
});
