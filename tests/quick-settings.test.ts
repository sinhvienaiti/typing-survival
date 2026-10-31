import { beforeAll, describe, expect, it } from "vitest";
import { settingsRows, soundRows } from "../src/app/quick";
import { BUILT_IN_KEYS, DEFAULT_KEYBOARD_SOUND, DEFAULTS, FX_DEFAULTS, applyQuick, loadSettings, quickValues, soundLevels, storedSettings, voiceLevel } from "../src/app/settings";
import { pendingKeyboardChoices, type KeyboardSoundChoice } from "../src/kit/feedback/typing-fx";
import { readRowValues } from "../src/kit/ui/quick-settings/logic";
import { RELAY, requestKeyboardCatalogue } from "../src/app/keyboard";
import { catalogue, FEEL_BASE, SAMPLE_FAMILIES, SAMPLE_SETS, serve } from "./feel-fixture";

/** The sample Typing Feel catalogue (tests/feel-fixture.ts), read without the network. */
let choices: readonly KeyboardSoundChoice[];
beforeAll(async () => {
  const root = catalogue();
  choices = (await requestKeyboardCatalogue(FEEL_BASE, async (url) => JSON.parse(serve(url, root).text ?? "null")).catalog).options;
});

/**
 * The quick panels' values (parent docs/games/IN_GAME_SETTINGS.md,
 * TYPING_FEEDBACK_REVIEW.md §20 item 5): the save loads field by field, the
 * typing feedback through the kit's sanitizer (Stamp, Large), every panel
 * row maps onto one setting, and the Firefly catalogue sits beside Off and Relay.
 */
const page = { quality: "high", reducedMotion: false };

describe("Last Line settings", () => {
  it("loads defaults from nothing: Stamp, Normal, Large, Bright Clack at full keyboard level", () => {
    const s = loadSettings(null);
    expect(s).toEqual({ ...DEFAULTS, typingFx: { ...FX_DEFAULTS } });
    expect(s.typingFx).toEqual({ style: "stamp", intensity: "normal", size: "large", soundProfile: DEFAULT_KEYBOARD_SOUND, volume: 1 });
    expect(soundLevels(s)).toEqual({ master: 1, muted: false, sfx: 0.7, music: 0.5, ui: 0.7, keys: 1, keysOn: false });
  });

  it("keeps an older save (no master, interface or typingFx) as it played, and drops broken fields one by one", () => {
    const old = loadSettings({ sfxVolume: 0.4, musicVolume: 0.2, screenShake: false, pronunciationEnabled: false, mode: "relax", paceAdapt: false });
    expect(old.uiVolume).toBe(0.4);
    expect(old.masterVolume).toBe(1);
    expect(old.typingFx.soundProfile).toBe(DEFAULT_KEYBOARD_SOUND);
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

  it("only Relay enables the game's key synth", () => {
    const s = loadSettings(null);
    for (const [profile, on] of [["off", false], [BUILT_IN_KEYS, true], ["deep", false], ["warm", false], ["creamy", false]] as const) {
      s.typingFx = { ...s.typingFx, soundProfile: profile };
      expect(soundLevels(s).keysOn, profile).toBe(on);
    }
    expect(voiceLevel({ ...s, masterVolume: 0.5, pronunciationVolume: 0.8 })).toBeCloseTo(0.4);
  });

  it("Relay also plays while it stands in for the chosen set, and only for that set", () => {
    const s = loadSettings({ typingFx: { soundProfile: "hail-stone" } });
    expect(soundLevels(s, "hail-stone").keysOn).toBe(true);
    expect(soundLevels(s, "deep").keysOn).toBe(false);
    expect(soundLevels(s, null).keysOn).toBe(false);
    s.typingFx = { ...s.typingFx, soundProfile: "off" };
    expect(soundLevels(s, "off").keysOn).toBe(false);
  });

  it("the save holds the keyboard sound only once it owns one; the rest of the settings always", () => {
    const s = loadSettings({ sfxVolume: 0.4, typingFx: { style: "rune" } });
    s.typingFx = { ...s.typingFx, soundProfile: BUILT_IN_KEYS };
    const unowned = JSON.parse(JSON.stringify(storedSettings(s, false))) as { sfxVolume: number; typingFx: Record<string, unknown> };
    expect(unowned.sfxVolume).toBe(0.4);
    expect(unowned.typingFx).toEqual({ style: "rune", intensity: "normal", size: "large", volume: 1 });
    // The next page fills the hard default in and lets the catalogue settle it.
    expect(loadSettings(unowned).typingFx.soundProfile).toBe(DEFAULT_KEYBOARD_SOUND);
    expect(storedSettings(s, true)).toBe(s);
    expect(s.typingFx.soundProfile).toBe(BUILT_IN_KEYS);
  });
});

describe("Last Line quick panels", () => {
  it("Keyboard sound uses Off, Relay and the Typing Feel catalogue's sets, each with its family for the kit's headings", () => {
    expect(choices.slice(0, 2).map((o) => o.value)).toEqual(["off", BUILT_IN_KEYS]);
    expect(choices).toHaveLength(2 + SAMPLE_SETS.length);
    expect(choices.every((o) => !o.disabled && !o.note)).toBe(true);
    expect([...new Set(choices.slice(2).map((o) => o.family))]).toEqual(SAMPLE_FAMILIES);
    const keyboard = soundRows(choices).find((row) => row.id === "keyboard");
    // The row hands the kit's picker the same choices, family included.
    expect(keyboard?.kind === "choice" && keyboard.options).toBe(choices);
  });

  it("the Sound panel opens before the catalogue with Off, Relay and the saved set \"Loading…\", and keeps the saved id (no repair, no save)", () => {
    for (const saved of ["hail-stone", DEFAULT_KEYBOARD_SOUND, BUILT_IN_KEYS, "off"]) {
      const s = loadSettings({ typingFx: { soundProfile: saved } });
      const pending = pendingKeyboardChoices(s.typingFx.soundProfile, RELAY);
      const firefly = saved !== BUILT_IN_KEYS && saved !== "off";
      expect(pending.map((o) => [o.value, o.label, o.disabled === true]), saved).toEqual([["off", "Off", false], [BUILT_IN_KEYS, "Relay", false], ...(firefly ? [[saved, "Loading…", true]] : [])]);
      // What QuickSettings reads when it is built: the saved id itself, so onChange never fires.
      expect(readRowValues(soundRows(pending), quickValues(s, page)).keyboard, saved).toBe(saved);
    }
  });

  it("Settings: typing effects with a preview, graphics (quality next run), the game's rows, Resume and Quit; Sound reads words aloud under Voice", () => {
    const rows = settingsRows(() => {});
    const ids = rows.map((row) => row.id);
    expect(ids).toEqual(["typingHeading", "fxStyle", "fxIntensity", "fxSize", "fxPreview", "graphicsHeading", "quality", "reducedMotion", "gameHeading", "shake", "resume", "quit"]);
    expect(soundRows(choices).map((row) => row.id)).toEqual(["master", "music", "effects", "keyboard", "keyboardVolume", "voice", "speak", "ui"]);
    const quality = rows.find((row) => row.id === "quality");
    expect(quality?.kind === "choice" && quality.label).toBe("Quality (next run)");
    expect(quality?.kind === "choice" && quality.options.map((o) => o.value)).toEqual(["low", "medium", "high", "ultra"]);
  });
});
