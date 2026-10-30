// First: the motion setting decides reduced motion before anything reads it.
import { motionPreference, motionReduced, setMotion, type MotionPreference } from "./motion";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/800.css";
import "../view/theme.css";
import "../view/survival.css";
import { runFrameLoop, safeLocalStorage, safeSessionStorage } from "../kit/platform";
import { speakEnglish } from "../kit/speech";
import { hordeIntensity } from "../audio/music";
import { ThemeAudio } from "../audio/theme-audio";
import { MODES, MODE_SPECS, TRIAL_KIT, isMode, lengthFor, stageHeader, type RunPace } from "../content/balance";
import { CHAPTER_1, stageById } from "../content/chapter-1";
import { GUN_KEYS, GUN_SPECS } from "../content/guns";
import { FIELD, FOE_CAP, type Tier } from "../content/rules";
import { LEARN_RULES } from "../content/stage-rules";
import { STAGE_S0 } from "../content/stage-s0";
import { peakAt } from "../sim/plan";
import { hashHex } from "../sim/hash";
import { Combat } from "../view/combat";
import { Crowd } from "../view/crowd";
import { Hud } from "../view/hud";
import { Stage } from "../view/scene";
import { renderScreen, type ScreenView } from "../view/screens";
import { renderJourney, starRow } from "../view/screens-journey";
import { Ship, type Pilot } from "../view/ship";
import { foesOnScreen, shipProbe } from "../view/probes";
import { TypeFeel } from "../view/typing-feel";
import { GUN_ACCENT, TypeFx } from "../view/type-fx";
import { TypeFxPreview, type PreviewWord } from "../view/type-fx-preview";
import { warmPrograms } from "../view/warm";
import { QUICK_COUNTDOWN_STEP_MS, type QuickValue } from "../kit/ui";
import { FrameCosts, bays, devHandleWanted, eventCounts, installDevHandle, numberBoxes, runState, snapshot } from "./dev";
import { Journey, NEXT_KEY, introKey, objectiveText, recordStage, starsOf, takeChoice, type RunChoice } from "./journey";
import { adviceText, countedText, profileView, runStats, runWords } from "./results";
import { ImeNotice, installAutoPause, installKeys, type KeyAction } from "./input";
import { reportWord } from "./learning";
import { blendSkill, type SkillUpdate } from "../kit/balance";
import { Menu, cycle, stepVolume, type MenuItem } from "./menu";
import { createQuickSettings } from "./quick";
import { KEYBOARD_UNAVAILABLE, RELAY, applyKeyboardLevels, requestKeyboardCatalogue, savedKeyboardId, startKeyboard } from "./keyboard";
import { pendingKeyboardChoices, type KeyboardCatalog } from "../kit/feedback/typing-fx";
import { Session } from "./session";
import { applyQuick, loadSettings, quickValues, soundLevels, storedSettings, voiceLevel, type Settings } from "./settings";
import { SEEN_KEY, WordHistory, emptyTally, headerFor, loadProfile, recordRun, runSample, saveProfile, skillReport, tallyWord } from "./skill";
import { loadVocab, type Word } from "./vocab";

/**
 * Tuyến Cuối (index.html), stage S0 "Bản thử dọc" (docs/BUILD_S0.md), theme
 * "Vành Chân Trời" (docs/changelog/2026-10-23-theme.md): the vocabulary
 * loads, the title screen waits (keyboard first: Bắt đầu, Chơi tiếp, Cài đặt,
 * Kho súng · Học từ), the world steps at 60 Hz in a session, the 3D stage
 * draws it, the combat view turns its events into feedback and the theme's
 * sound, the DOM HUD shows the words, the kit's focus strip the word being
 * typed (type-fx.ts), the quick panels (quick.ts: Settings F1, Sound F2)
 * pause the fight over it; window.__survival lets browser scenarios
 * drive it in dev or with ?debug=1. Storage: only survival.* keys (quality, ship and the
 * settings' volumes, shake, pronunciation, typing effects, mode and "Nhịp tự điều": settings.ts),
 * the skill profile (survival.skill, the kit's key) and the words finished
 * here (survival.seen). Each typed word goes to the portal's learning record
 * as "typing-survival". Balance (docs/changelog/2026-10-23-balance.md): the
 * mode and the profile set the run header (pace k, E, director) before the
 * world is made; the profile learns from every run.
 */
const QUALITY_KEY = "survival.quality";
const PILOT_KEY = "survival.pilot";
const SETTINGS_KEY = "survival.settings";
const SPEAK_GAP_MS = 3000;
/** The run's end shows on the field first (a banner over the stilled fight), then its card. */
const END_BEAT_MS = 900;
/** How long "Keyboard sounds unavailable" shows once the Typing Feel host failed (page clock, ms). */
const KEYBOARD_NOTICE_MS = 6000;
const TIERS = Object.keys(FOE_CAP) as Tier[];
const PILOTS = ["vanguard", "draconis"] as const satisfies readonly Pilot[];
const TIER_NAMES: Record<Tier, string> = { low: "Low", medium: "Medium", high: "High", ultra: "Ultra" };
const PILOT_NAMES: Record<Pilot, string> = { vanguard: "Vanguard", draconis: "Draconis" };
const MOTIONS = ["full", "system", "reduced"] as const satisfies readonly MotionPreference[];
const MOTION_NAMES: Record<MotionPreference, string> = { full: "Off", system: "System", reduced: "On" };

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("survival: missing #" + id);
  return element as T;
}

const params = new URLSearchParams(window.location.search);
const pick = <T extends string>(value: string | null, options: readonly T[]): T | null => (options.includes(value as T) ? (value as T) : null);
const tier: Tier = pick(params.get("q"), TIERS) ?? pick(safeLocalStorage.getItem(QUALITY_KEY), TIERS) ?? "high";
const pilot: Pilot = pick(params.get("pilot"), PILOTS) ?? pick(safeLocalStorage.getItem(PILOT_KEY), PILOTS) ?? "vanguard";
if (params.has("q")) safeLocalStorage.setItem(QUALITY_KEY, tier);
if (params.has("pilot")) safeLocalStorage.setItem(PILOT_KEY, pilot);
const seed = Number(params.get("seed") ?? "") >>> 0 || (Math.floor(Math.random() * 0x7fffffff) >>> 0) || 1;
const savedSettings = safeLocalStorage.readJson(SETTINGS_KEY);
const settings: Settings = loadSettings(savedSettings);
/** The save's own keyboard sound, read before the hard default (Bright Clack) fills it in: the Typing Feel catalogue settles it (keyboard.ts). */
const savedKeyboard = savedKeyboardId(savedSettings);
/** Whether the save holds a keyboard sound: only then is it written (storedSettings; a repair or the player's pick makes it so). */
let keyboardOwned = savedKeyboard !== null;
/** The saved set Relay stands in for this session (it cannot sound); null: none. Never saved. */
let keyboardStandIn: string | null = null;
/** Aborts once the player picks a keyboard sound: the startup load then leaves the player alone. */
const keyboardStartup = new AbortController();
/** The keyboard catalogue loads beside everything else; nothing waits on it (parent TYPING_FEEL_SERVICE.md §5.1–5.2). */
const keyboardFeed = requestKeyboardCatalogue();
const urlMode = params.get("mode");
if (isMode(urlMode)) settings.mode = urlMode;
if (params.has("adapt")) settings.paceAdapt = params.get("adapt") !== "0";
if (isMode(urlMode) || params.has("adapt")) safeLocalStorage.writeJson(SETTINGS_KEY, storedSettings(settings, keyboardOwned));
const speech = { enabled: settings.pronunciationEnabled, rate: settings.pronunciationRate, volume: voiceLevel(settings) };
const shakeAllowed = params.get("shake") !== "0";

const hudRoot = byId("svHud");
let stage: Stage;
try {
  stage = new Stage(byId<HTMLCanvasElement>("svCanvas"), tier);
} catch {
  hudRoot.textContent = "This browser does not support WebGL. Last Line cannot run here.";
  throw new Error("survival: no WebGL");
}
const vocab = await loadVocab();
/** The run header (content/balance.ts): from the mode and the stored skill profile; ?pace= and ?director=0 pin it (scenarios). */
let profile = loadProfile(safeLocalStorage, settings.mode);
const history = new WordHistory(safeLocalStorage.getItem(SEEN_KEY));
const pageMode = settings.mode;
const pageAdapt = settings.paceAdapt;
let runHeader: RunPace = headerFor(profile, pageMode, pageAdapt);
const pinnedPace = Number(params.get("pace"));
if (params.has("pace") && pinnedPace > 0) runHeader = { ...runHeader, pace: Math.round(Math.max(0.75, Math.min(1.3, pinnedPace)) * 1000) / 1000 };
if (params.get("director") === "0") runHeader = { ...runHeader, director: false };
/** The stage this page plays: the journey's choice (survival.next, or ?stage=&guns=), else the trial. */
const choice = takeChoice(safeSessionStorage, params);
const level = stageById(choice?.stage ?? "s0");
const session = new Session({ seed, deck: vocab.deck, tier, ...stageHeader(runHeader, level, choice?.guns ?? TRIAL_KIT.guns, blendSkill({ ...profile, mode: pageMode })) });
const world = session.world;
/** The first run of a play session (the fatigue base of the profile). */
const SESSION_KEY = "survival.session";
const firstOfSession = safeSessionStorage.getItem(SESSION_KEY) === null;
safeSessionStorage.setItem(SESSION_KEY, "1");
const tally = emptyTally();
let settled: SkillUpdate | null = null;
const wordOf = (index: number): Word => vocab.words.get(world.deck[index]!) ?? { en: world.deck[index] ?? "", vi: "", ipa: "" };
const hud = new Hud(hudRoot, wordOf, world);
const crowd = new Crowd(stage.scene);
const ship = new Ship(stage.scene, pilot, motionReduced());
const loading = Promise.all([crowd.load(), ship.load(stage.scene)]);
let loaded = false;
void loading.then(() => (loaded = true));
const audio = new ThemeAudio({ sfx: settings.sfxVolume, music: settings.musicVolume });
audio.setLevels(soundLevels(settings));

/** "intro": the stage card of a page that came from the journey or a replay; the fight waits for a key (it opens the audio). */
type Mode = "start" | "intro" | "play" | "paused" | "end";
/** What the overlay shows: a menu screen, or nothing in a running fight. */
type Screen = "title" | "settings" | "armory" | "profile" | "pause" | "end" | "intro" | "none";
let mode: Mode = "start";
let screen: Screen = "none";
/** A quick panel (or its 3-2-1 back in) holds the fight still and types nothing. */
let frozen = false;
/** Where settings, the armory and the typing profile go back to. */
let back: Screen = "title";
let menu = new Menu([]);
/** A run has begun: the title then offers "Chơi tiếp", and the ship and quality wait for the next page. */
let started = false;
/** Models in, programs warmed, a frame drawn: the world steps only from then (it used to run ~4 s while a page loaded). */
let live = false;
/** The ship and quality the settings screen picked (they take a new page). */
const chosen = { pilot, tier };
const imeNotice = new ImeNotice();
const spoken = new Set<string>();
let lastSpeak = -1e9;
let clock = 0;
let lastPeak = 0;
/** When the end card opens (−1: no run ending). */
let endAt = -1;

const combat = new Combat(stage, crowd, ship, pilot, tier, audio, {
  stop: (ms) => session.stop(ms),
  wordDone(slot, index, perfect, seconds, recognize, errors) {
    const word = wordOf(index);
    const text = world.deck[index] ?? "";
    tallyWord(tally, history.finished(text), text.length, seconds, recognize, errors === 0);
    if (vocab.source === "vocabulary") reportWord(word, perfect);
    // Said the first time it is typed in this run, at most once every 3 s.
    if (settings.pronunciationEnabled && speech.volume > 0 && !spoken.has(word.en) && clock - lastSpeak >= SPEAK_GAP_MS) {
      spoken.add(word.en);
      lastSpeak = clock;
      speakEnglish(word.en, speech);
    }
  },
  hurt: () => hud.hurt(),
  repaired: (hp) => hud.showBanner("REPAIR +" + Math.round(hp) + " HULL", clock),
  ended: () => {
    settle(world.phase === "won" ? "won" : "lost");
    if (level.id !== "s0") {
      const s = world.stats;
      stars = starsOf(level, world.phase === "won", world.hp, world.armourMax, s.keysOk / Math.max(1, s.keysOk + s.keysBad));
      recordStage(safeLocalStorage, world.header.mode, level.id, stars);
      if (stars.some(Boolean)) audio.gun("star.get", 0, clock);
    }
    const won = world.phase === "won";
    hud.showBanner(level.id === "s0" ? (won ? "LINE HELD!" : "LINE LOST") : won ? "STAGE CLEAR!" : "STAGE LOST", clock);
    endAt = clock + END_BEAT_MS;
  },
});
// Every program of the fight compiled once the horde, the ship and the bolts are in (warm.ts).
void Promise.allSettled([loading, combat.loading]).then(() => {
  warmPrograms(stage, [combat.sprites]);
  combat.warmed = true;
});

/** A stage run's stars when it ended; the journey's screens. */
let stars: boolean[] | null = null;
const journey = new Journey({ mode: () => settings.mode, store: safeLocalStorage, sound: (kind) => audio.ui(kind), draw: () => drawScreen(), start: (next) => reload(true, next), back: () => (mode === "end" ? reload(false) : show("title")) });

/** The run into the skill profile, once: after the end, or as a quit when a new run replaces it. */
function settle(outcome: "won" | "lost" | "quit"): void {
  if (settled !== null || (outcome === "quit" && !started)) return;
  const sample = runSample(world, world.meter.summary(outcome), outcome, firstOfSession, tally);
  settled = recordRun(profile, sample);
  profile = settled.profile;
  saveProfile(safeLocalStorage, profile);
  safeLocalStorage.setItem(SEEN_KEY, JSON.stringify(history));
}
const applyShake = (): void => {
  combat.trauma.scale = settings.screenShake && shakeAllowed ? 1 : 0;
};
applyShake();
combat.trauma.reduced = hud.reduced = motionReduced();
// The word line is the kit's focus strip; the old plate keeps only its streak LED, rift countdown and near-foe ticks.
const typeFx = new TypeFx(hud.fxRoot, stage, ship, audio, settings.typingFx, motionReduced());
applyKeyboardLevels(typeFx.sounds, settings);
// The fight waits for the saved set's first decoded batch (it plays from then on), at most 1.5 s (startKeyboard below).
let keyboardReady = false;
hud.strip.attach(typeFx);
hudRoot.classList.add("is-tfx");
const typing = (combat.typing = new TypeFeel(hud, stage, ship, combat.glows, combat.strips, combat.sparks, audio, typeFx, (index) => wordOf(index).vi));

/** The Settings panel's preview while it is open. */
let preview: TypeFxPreview | null = null;
/** A few short words of the run's deck for the preview. */
function previewWords(): PreviewWord[] {
  const out: PreviewWord[] = [];
  for (let k = 0; k < world.deck.length && out.length < 4; k += 1) if (world.deck[k]!.length >= 4 && world.deck[k]!.length <= 7) out.push(wordOf(k));
  return out.length > 0 ? out : [wordOf(0)];
}
const quick = createQuickSettings({
  host: hudRoot,
  values: () => quickValues(settings, { quality: chosen.tier, reducedMotion: motionReduced() }),
  change: quickChange,
  preview: quickPreview,
  // Off, Relay and the saved set "Loading…" until the catalogue settles the list (startKeyboard below).
  keyboardChoices: pendingKeyboardChoices(settings.typingFx.soundProfile, RELAY),
  keyboardSounds: typeFx.sounds,
  mountPreview: (host) => {
    const bay = world.typing.lock >= 0 ? world.typing.lock : 0;
    preview = new TypeFxPreview(host, settings.typingFx, motionReduced(), GUN_ACCENT[world.guns.gun[bay] ?? 0] ?? GUN_ACCENT[0], () => typeFx.strip.fontSize, previewWords());
    return () => {
      preview?.dispose();
      preview = null;
    };
  },
  pause: () => {
    frozen = true;
  },
  resume: () => {
    frozen = false;
  },
  quit: quitToTitle,
  countdown: () => (mode === "play" ? QUICK_COUNTDOWN_STEP_MS : 0),
});
const quickBar = quick.root.querySelector<HTMLElement>(".kit-qs__bar");

/** Typing Feel's keyboard sounds as the page saw them (performance.now() times, −1: not yet), for the dev handle. */
const keyboardProbe = { state: "loading" as KeyboardCatalog["state"] | "loading", revision: "", sets: 0, startAt: performance.now(), readyAt: -1, pageReadyAt: -1, liveAt: -1, noticeUntil: -1 };
void keyboardFeed.catalog.then((catalog) => {
  keyboardProbe.state = catalog.state;
  keyboardProbe.revision = catalog.revision ?? "";
  keyboardProbe.sets = catalog.options.filter((choice) => choice.manifest !== undefined).length;
});
// The catalogue settles the saved choice when it comes (a host that failed keeps it), then the set loads; the fight waits for it 1.5 s at most.
void startKeyboard(typeFx.sounds, keyboardFeed, savedKeyboard, {
  current: () => settings.typingFx.soundProfile,
  choose: (id, save) => {
    settings.typingFx = { ...settings.typingFx, soundProfile: id };
    if (save) keyboardOwned = true;
    applyAudio();
    if (save) safeLocalStorage.writeJson(SETTINGS_KEY, storedSettings(settings, keyboardOwned));
  },
  list: (options) => {
    quick.setChoiceOptions("keyboard", options);
  },
  unavailable: () => {
    keyboardProbe.noticeUntil = clock + KEYBOARD_NOTICE_MS;
  },
  standIn: (id) => {
    keyboardStandIn = id;
    applyAudio();
  },
  playable: () => {
    keyboardReady = true;
    keyboardProbe.readyAt = performance.now();
  },
}, { signal: keyboardStartup.signal });

const percent = (value: number): string => Math.round(value * 100) + "%";
const onOff = (on: boolean): string => (on ? "On" : "Off");
/** During a run, a new mode or "Nhịp tự điều" waits for the next one. */
const nextRun = (): string | undefined => (started ? "Applies next run" : undefined);

function items(which: Screen): MenuItem[] {
  switch (which) {
    case "title":
      return [
        { id: "journey", label: "Campaign", note: "Chapter 1 · stages 1–" + CHAPTER_1.length + " · pick stage and guns", enabled: true },
        { id: "start", label: started ? "New trial" : "Trial", note: started ? "Abandon " + (level.id === "s0" ? "this run" : "Stage " + level.index) + " for a new trial" : "Pulse Gun and Heat Beam · hold for " + STAGE_S0.seconds / 60 + " min", enabled: true },
        { id: "continue", label: "Resume", note: started ? "Back to your paused run" : "No run to resume", enabled: started },
        { id: "mode", label: "Mode", value: MODE_SPECS[settings.mode].label, note: nextRun() ?? MODE_SPECS[settings.mode].note, enabled: true },
        { id: "profile", label: "Profile", note: "Speed, accuracy, advice", enabled: true },
        { id: "settings", label: "Options", note: "Audio, shake, pace, ship, graphics", enabled: true },
        { id: "armory", label: "Armory · Learning", note: "5 guns: ammo, range; how learning works", enabled: true },
      ];
    case "settings": {
      const later = started ? "End your run to change this" : undefined;
      return [
        { id: "sfx", label: "Effects", value: percent(settings.sfxVolume), level: settings.sfxVolume, enabled: true },
        { id: "music", label: "Music", value: percent(settings.musicVolume), level: settings.musicVolume, enabled: true },
        { id: "shake", label: "Screen shake", value: onOff(settings.screenShake), note: shakeAllowed ? undefined : "Disabled by ?shake=0", enabled: true },
        { id: "motion", label: "Reduce motion", value: MOTION_NAMES[motionPreference()], note: "No ship drift or lunges; no letter bounce", enabled: true },
        { id: "speak", label: "Read words aloud", value: onOff(settings.pronunciationEnabled), enabled: true },
        { id: "adapt", label: "Adapt pace to your typing", value: onOff(settings.paceAdapt), note: nextRun() ?? (settings.paceAdapt ? "Swarm density follows your profile" : "Fixed pace throughout the run"), enabled: true },
        { id: "pilot", label: "Ship", value: PILOT_NAMES[chosen.pilot], note: later, enabled: !started },
        { id: "quality", label: "Graphics", value: TIER_NAMES[chosen.tier], note: later, enabled: !started },
        { id: "done", label: "Done", enabled: true },
      ];
    }
    case "armory":
    case "profile":
      return [{ id: "back", label: "Back", enabled: true }];
    case "pause":
      return [
        { id: "resume", label: "Resume", note: "Esc", enabled: true },
        { id: "settings", label: "Options", note: "Audio, shake, speech", enabled: true },
        { id: "title", label: "Main menu", note: "Your run stays paused", enabled: true },
      ];
    case "end": {
      const next = world.phase === "won" ? CHAPTER_1[level.index] : undefined;
      const list: MenuItem[] = [
        ...(next !== undefined ? [{ id: "next", label: "Stage " + next.index, note: next.name, enabled: true }] : []),
        { id: "replay", label: level.id === "s0" ? "Retry" : "Retry stage", enabled: true },
        ...(level.id === "s0" ? [] : [{ id: "stages", label: "Stages", note: "Campaign", enabled: true }]),
        { id: "title", label: "Main menu", note: "Esc", enabled: true },
      ];
      // Enter takes the first item (the one selected): the key is named there.
      list[0] = { ...list[0]!, note: (list[0]!.note ? list[0]!.note + " · " : "") + "Enter" };
      return list;
    }
    default:
      return [];
  }
}

function view(which: Screen): ScreenView | null {
  switch (which) {
    case "title":
      return {
        kind: "title",
        menu,
        lead: "The Black Hole Horde is coming. Type words to reload your guns; they fire on their own. Flawless words pierce armor and crit.",
        status: "SHIP " + PILOT_NAMES[pilot].toUpperCase() + " · GFX " + TIER_NAMES[tier].toUpperCase() + " · " + MODE_SPECS[settings.mode].label.toUpperCase(),
      };
    case "profile":
      return { kind: "profile", menu, ...profileView(profile, settings.mode, settings.paceAdapt) };
    case "settings":
      return { kind: "settings", menu, note: started ? "" : "Changing ships or graphics reloads the page when you press Done." };
    case "armory":
      return {
        kind: "armory",
        menu,
        guns: GUN_SPECS.map((gun) => ({ kind: gun.key, name: gun.name, title: gun.title, text: gun.magazine + (gun.trial ? " (" + gun.trial + ")" : "") + ", range " + gun.range + (gun.heavy ? ", words up to 1 letter longer" : "") + "." })),
        learning: [
          "Flawless words pierce armor (it blocks only 75%) and crit more often; in the Trial they hit 6% harder.",
          "Every word you finish goes into the portal's shared learning log (typing-survival).",
        ],
      };
    case "pause":
      return { kind: "pause", menu };
    case "intro":
      return {
        kind: "intro",
        title: level.id === "s0" ? "TRIAL" : "STAGE " + level.index + " · " + level.name.toUpperCase(),
        lines: [level.id === "s0" ? "Hold the lane for " + STAGE_S0.seconds / 60 + " min" : objectiveText(level), world.header.kit.guns.map((gun) => GUN_SPECS[gun]!.name).join(" · ")],
        ready: live,
      };
    case "end": {
      const report = skillReport(profile, settings.mode);
      return {
        kind: "end",
        menu,
        stage: level.id === "s0" ? "" : "Stage " + level.index + " · " + level.name,
        stars: stars === null ? "" : starRow(stars, LEARN_RULES[level.learn].starAccuracy),
        mode: MODE_SPECS[world.header.mode].label,
        advice: adviceText(report, settled, world.phase === "won"),
        note: [countedText(settled, report), report.suggestionText].filter(Boolean).join(" "),
        won: world.phase === "won",
        stats: runStats(world),
        words: runWords(world, wordOf),
      };
    }
    default:
      return null;
  }
}

/** Shows `which` with a fresh menu (or redraws it in place, keeping the selection); `focus` selects that item. */
function show(which: Screen, keep = false, focus?: string): void {
  const list = items(which);
  menu = new Menu(list, keep && which === screen ? menu.index : 0);
  if (which === "title" && started && !keep) menu.select("continue");
  if (focus !== undefined) menu.select(focus);
  screen = which;
  drawScreen();
}

function drawScreen(): void {
  const shown = journey.active ? null : view(screen);
  hud.overlay.innerHTML = journey.active ? renderJourney(journey) : shown === null ? "" : renderScreen(shown);
  hud.overlay.classList.toggle("is-on", journey.active || shown !== null);
  hud.overlay.dataset.screen = journey.active ? "journey-" + journey.screen : screen;
  hud.root.dataset.mode = mode;
}

function setMode(next: Mode): void {
  mode = next;
  if (next === "play") {
    started = true;
    show("none");
  } else show(next === "paused" ? "pause" : next === "end" || next === "intro" ? next : "title");
}

/** A new page: `autostart` straight into a fight (a journey stage when `run` is given); the settings' ship, quality and mode go in its address. */
function reload(autostart: boolean, run?: RunChoice): void {
  if (started && mode !== "end") settle("quit");
  safeSessionStorage.setItem(NEXT_KEY, run === undefined ? "" : JSON.stringify({ stage: run.stage, guns: run.guns.map((gun) => GUN_KEYS[gun]) }));
  const next = new URLSearchParams(params);
  for (const key of ["stage", "guns"]) next.delete(key);
  if (params.has("mode")) next.set("mode", settings.mode);
  if (params.has("adapt")) next.set("adapt", settings.paceAdapt ? "1" : "0");
  for (const key of ["autostart", "card"]) if (autostart) next.set(key, "1");
  else next.delete(key);
  if (chosen.pilot !== pilot || params.has("pilot")) next.set("pilot", chosen.pilot);
  if (chosen.tier !== tier || params.has("q")) next.set("q", chosen.tier);
  window.location.search = next.toString();
}

function saveSettings(): void {
  safeLocalStorage.writeJson(SETTINGS_KEY, storedSettings(settings, keyboardOwned));
  safeLocalStorage.setItem(PILOT_KEY, chosen.pilot);
  safeLocalStorage.setItem(QUALITY_KEY, chosen.tier);
}

/** A setting's value one step on (`delta` ±1). */
function adjust(id: string, delta: number): void {
  if (id === "sfx") settings.sfxVolume = stepVolume(settings.sfxVolume, delta);
  else if (id === "music") settings.musicVolume = stepVolume(settings.musicVolume, delta);
  else if (id === "shake") settings.screenShake = !settings.screenShake;
  else if (id === "speak") settings.pronunciationEnabled = !settings.pronunciationEnabled;
  else if (id === "adapt") settings.paceAdapt = !settings.paceAdapt;
  else if (id === "motion") {
    setMotion(cycle(MOTIONS, motionPreference(), delta));
    applyMotion();
  }
  else if (id === "mode") settings.mode = cycle(MODES, settings.mode, delta);
  else if (id === "pilot") chosen.pilot = cycle(PILOTS, chosen.pilot, delta);
  else if (id === "quality") chosen.tier = cycle(TIERS, chosen.tier, delta);
  else return;
  applyAudio();
  applyShake();
  saveSettings();
  audio.ui("move");
  show(screen === "title" ? "title" : "settings", true);
}

function applyAudio(): void {
  audio.setLevels(soundLevels(settings, keyboardStandIn));
  applyKeyboardLevels(typeFx.sounds, settings);
  speech.enabled = settings.pronunciationEnabled;
  speech.volume = voiceLevel(settings);
}

function applyMotion(): void {
  const reduced = motionReduced();
  combat.trauma.reduced = hud.reduced = ship.reduced = reduced;
  typeFx.setReduced(reduced);
  preview?.setReduced(reduced);
}

/** A quick panel's change: applied at once and saved; the Options screen under it redrawn. */
function quickChange(id: string, value: QuickValue): void {
  if (id === "quality") {
    // Taken by the next page (a new run or the title's Trial), as the Options screen's.
    if (typeof value !== "string" || !(TIERS as readonly string[]).includes(value)) return;
    chosen.tier = value as Tier;
  } else if (id === "reducedMotion") {
    setMotion(value === true ? "reduced" : "full");
    applyMotion();
  } else if (!applyQuick(settings, id, value)) return;
  if (id === "keyboard") {
    // The player's own keyboard sound: it goes into the save, ends Relay's stand-in and stops the startup load.
    keyboardOwned = true;
    keyboardStandIn = null;
    keyboardStartup.abort();
  }
  if (id === "fxStyle" || id === "fxIntensity" || id === "fxSize") {
    typeFx.configure(settings.typingFx);
    preview?.configure(settings.typingFx);
    if (id === "fxSize") resize();
  }
  applyShake();
  applyAudio();
  saveSettings();
  if (screen === "settings") show("settings", true);
}

/** A short sample of a sound group while its row moves (the kit throttles it). */
function quickPreview(group: string): void {
  audio.resume();
  if (group === "effects") audio.xung(0, true);
  else if (group === "keyboard") {
    if (soundLevels(settings, keyboardStandIn).keysOn) audio.key(1, 0, false);
    else typeFx.sounds.key(0);
  }
  else if (group === "voice") speakEnglish("ready", { ...speech, enabled: speech.volume > 0 });
  else if (group !== "music") audio.ui(group === "ui" ? "move" : "select");
}

/** "Quit to title" in a quick panel: as the pause screen's "Main menu" (a run stays paused and can be resumed). */
function quitToTitle(): void {
  frozen = false;
  if (mode === "end") return reload(false);
  audio.ui("back");
  journey.close();
  mode = "start";
  show("title");
}

function leaveSettings(): void {
  audio.ui("back");
  if (!started && (chosen.pilot !== pilot || chosen.tier !== tier)) reload(false);
  else show(back, false, "settings");
}

/** Enter (or a click) on the selected item. */
function take(): void {
  const item = menu.current;
  if (item === undefined || !item.enabled) return;
  if (screen === "settings") {
    if (item.id === "done") leaveSettings();
    else adjust(item.id, 1);
    return;
  }
  if (item.id === "mode") {
    adjust("mode", 1);
    return;
  }
  audio.ui("select");
  switch (item.id) {
    case "start":
      // A run's header is fixed when its world is made: another mode or "Nhịp tự điều" (or ship, or graphics from the quick panel) takes a new page.
      if (started || settings.mode !== pageMode || settings.paceAdapt !== pageAdapt || chosen.pilot !== pilot || chosen.tier !== tier) reload(true);
      else setMode("play");
      break;
    case "continue":
    case "resume":
      setMode("play");
      break;
    case "settings":
    case "armory":
    case "profile":
      back = screen;
      show(item.id);
      break;
    case "back":
      show(back, false, screen);
      break;
    case "title":
      if (mode === "end") reload(false);
      else {
        mode = "start";
        show("title");
      }
      break;
    case "replay":
      reload(true, level.id === "s0" ? undefined : { stage: level.id, guns: world.header.kit.guns });
      break;
    case "journey":
    case "stages":
      journey.open(level.id === "s0" ? undefined : level.id);
      break;
    case "next":
      journey.picked = world.header.kit.guns.slice();
      journey.brief(CHAPTER_1[level.index]!);
      break;
  }
}

function act(action: KeyAction): void {
  // The stage card takes its own keys below; an open quick panel takes them all.
  if (mode === "intro" || quick.blocking) return;
  if (action === "repeat") {
    if (mode === "play" && world.typing.lock >= 0) speakEnglish(wordOf(world.typing.word[world.typing.lock]!).en, speech);
    return;
  }
  if (mode === "play") {
    if (action === "pause") setMode("paused");
    return;
  }
  if (journey.act(action)) return;
  const valued = menu.current?.value !== undefined;
  if (action === "up" || action === "down" || ((action === "left" || action === "right") && screen !== "settings" && !valued)) {
    if (menu.move(action === "up" || action === "left" ? -1 : 1)) {
      audio.ui("move");
      drawScreen();
    }
  } else if (action === "left" || action === "right") {
    const item = menu.current;
    if (item?.enabled && item.value !== undefined) adjust(item.id, action === "left" ? -1 : 1);
  } else if (action === "enter") take();
  else if (action === "pause") {
    // Esc: back out of a screen; from the pause screen, back into the fight.
    if (screen === "settings") leaveSettings();
    else if (screen === "armory" || screen === "profile") {
      audio.ui("back");
      show(back, false, screen);
    } else if (screen === "pause") setMode("play");
    else if (screen === "end") {
      audio.ui("back");
      reload(false);
    }
  }
}

// A pointer can hover and click the menu items too (the journey's items, cards and start button as well).
hud.overlay.addEventListener("pointermove", (event) => {
  if (journey.active) {
    const hit = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-index], [data-card], [data-start]");
    const at = Number(hit?.dataset.index ?? -1);
    const cursor = hit?.dataset.card !== undefined ? Number(hit.dataset.card) : hit?.dataset.start !== undefined ? GUN_KEYS.length : -1;
    if (at >= 0 && at !== journey.menu.index && journey.menu.items[at]?.enabled) journey.menu.index = at;
    else if (cursor >= 0 && cursor !== journey.cursor && journey.screen === "loadout") journey.cursor = cursor;
    else return;
    audio.ui("move");
    drawScreen();
    return;
  }
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-index]");
  const index = Number(target?.dataset.index ?? -1);
  if (index >= 0 && index !== menu.index && menu.items[index]?.enabled) {
    menu.index = index;
    audio.ui("move");
    drawScreen();
  }
});
hud.overlay.addEventListener("click", (event) => {
  if (mode === "intro") {
    enterFight();
    return;
  }
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-index], [data-card], [data-start]");
  const index = Number(target?.dataset.index ?? -1);
  if (journey.active) {
    if (target?.dataset.card !== undefined) journey.pick(Number(target.dataset.card) + 1);
    else if (target?.dataset.start !== undefined) journey.begin();
    else if (index >= 0 && journey.menu.items[index]?.enabled) {
      journey.menu.index = index;
      journey.take();
    }
    return;
  }
  if (index < 0 || !menu.items[index]?.enabled) return;
  menu.index = index;
  take();
});

for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, (event) => {
  if (mode === "intro" && type === "keydown" && (event as KeyboardEvent).code === "Escape") return;
  audio.resume();
});
// Keep the card's origin across the reload, once and for this exact run choice.
const CARD_FROM_KEY = "survival.cardFrom";
const introFrom = (() => {
  const raw = safeSessionStorage.getItem(CARD_FROM_KEY);
  safeSessionStorage.setItem(CARD_FROM_KEY, "");
  try {
    const saved = JSON.parse(raw ?? "null") as { from?: unknown; choice?: unknown } | null;
    const next = JSON.stringify({ stage: level.id, guns: world.header.kit.guns.map((gun) => GUN_KEYS[gun]) });
    if ((saved?.from === "loadout" || saved?.from === "journey") && saved.choice === next) return saved.from;
  } catch {
    // A broken marker leaves a directly opened card in place.
  }
  return "direct";
})();
window.addEventListener("pagehide", () => {
  const from = journey.screen === "loadout" ? "loadout" : journey.active || screen === "end" ? "journey" : null;
  const next = safeSessionStorage.getItem(NEXT_KEY);
  safeSessionStorage.setItem(CARD_FROM_KEY, from === null || !next ? "" : JSON.stringify({ from, choice: next }));
});
// Consume the card's key before the typing listener, including Esc on a direct URL.
window.addEventListener("keydown", (event) => {
  if (mode !== "intro" || quick.blocking || event.repeat || !(event.isTrusted || params.get("untrusted") === "1")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const action = introKey(event.code, introFrom);
  if (action === "enter") enterFight();
  else if (action === "back") {
    setMode("start");
    journey.stage = level;
    journey.picked = world.header.kit.guns.slice();
    if (introFrom === "loadout") journey.loadout();
    else journey.open(level.id);
  }
});

/** From the stage card into the fight (once the page is ready): its name as a banner, a sound. */
function enterFight(): void {
  if (mode !== "intro" || !live) return;
  setMode("play");
  hud.showBanner(level.id === "s0" ? "HOLD THE LINE!" : "STAGE " + level.index + " · " + level.name.toUpperCase(), clock);
  audio.ui("select");
}
installKeys(window, {
  // Only a running fight takes letters: keys while paused, under a quick panel (or its countdown) or between runs type nothing.
  send: (command) => {
    if (mode === "play" && !quick.blocking) session.send(command);
  },
  act,
  onVietnamese: () => imeNotice.note(clock),
  allowUntrusted: params.get("untrusted") === "1",
  pick: (n) => {
    if (mode !== "play" && !quick.blocking) journey.pick(n);
  },
  space: () => {
    if (mode === "play" && live && !quick.blocking) typeFx.sounds.space();
  },
});
installAutoPause(window, document, () => {
  if (mode === "play") setMode("paused");
});

function resize(): void {
  const [width, height] = [window.innerWidth, window.innerHeight];
  const ui = Math.max(0.8, Math.min(1.6, Math.min(width / 1280, height / 720)));
  document.documentElement.style.setProperty("--ui", ui.toFixed(3));
  stage.resize(width, height);
  hud.layout(stage, ui);
  // The HUD's top row keeps clear of the quick panels' buttons in the top-right corner (damage numbers too).
  const bar = quickBar?.getBoundingClientRect();
  hudRoot.style.setProperty("--qs-room", bar !== undefined && bar.width > 0 ? Math.round(width - bar.left) + "px" : "0px");
  const keep = bar !== undefined && bar.width > 0 ? [{ x: bar.left - 6, y: bar.top - 6, w: bar.width + 12, h: bar.height + 12 }] : [];
  combat.resize(height, [...hud.protectedRects(), ...keep]);
}
window.addEventListener("resize", resize);
// The buttons' size follows the view (the kit sets it after a resize): place the HUD again when they change.
if (quickBar !== null && typeof ResizeObserver === "function") new ResizeObserver(() => resize()).observe(quickBar);
resize();
void document.fonts?.ready.then(resize);

/** Frame costs (ms) of the last frames: steps + events + HUD, and the draw; frame intervals. */
const costs = new FrameCosts();
let lastDraw = -1;
let lastRaf = -1;
let held = false;
let painted = false;
let calls = 0;
let triangles = 0;
const aim = new Float64Array(2);

function update(now: number): void {
  const start = performance.now();
  if (!live && painted && loaded && combat.ready) {
    if (keyboardProbe.pageReadyAt < 0) keyboardProbe.pageReadyAt = performance.now();
    if (keyboardReady) {
      live = true;
      keyboardProbe.liveAt = performance.now();
      if (mode === "intro") drawScreen();
    }
  }
  session.paused = mode !== "play" || !live || frozen;
  session.frame(now);
  if (endAt >= 0 && now >= endAt && !frozen) {
    endAt = -1;
    setMode("end");
  }
  combat.read(world, now);
  typeFx.tick(now, mode === "play" && live && !frozen);
  typing.read(world, now);
  hud.update(world, combat.killsWithin(now, 3000), now);
  typing.land(now);
  typeFx.update();
  hud.setNotice(imeNotice.on(now) ? "Switch to an English keyboard" : vocab.source === "fallback" ? "Offline word list (server words unavailable)" : now < keyboardProbe.noticeUntil ? KEYBOARD_UNAVAILABLE : "");
  // The floor glows red as the press reaches the ship (inside the guns' reach and closing); the music rises with the horde.
  let near = 0;
  let shown = 0;
  for (let s = 0; s < world.foes.top; s += 1) {
    if (world.foes.alive[s] !== 1) continue;
    const z = world.foes.z[s]!;
    if (z < 9) near += 1;
    if (z <= FIELD.gateZ + 4) shown += 1;
  }
  stage.threat = Math.min(1, near / 12);
  const peak = peakAt(world);
  if (peak !== lastPeak) {
    lastPeak = peak;
    if (peak > 0 && mode === "play") audio.siren();
  }
  const running = mode === "play" && !frozen;
  audio.setMusic(mode === "play" ? hordeIntensity(shown, peak > 0) : 0, running ? 1 : mode === "paused" || mode === "play" ? 0.45 : 0.8);
  // Tia's arc and Ray's armed hum hold only while the fight runs (not under the pause or end screens, nor a quick panel).
  audio.live = running;
  costs.update[costs.at] = performance.now() - start;
}

function draw(now: number): void {
  const start = performance.now();
  // Paused, the effects hold still with the world (the clock itself runs on for the HUD).
  const dt = lastDraw < 0 || mode === "paused" || frozen ? 0 : Math.min(0.05, Math.max(0, (now - lastDraw) / 1000));
  lastDraw = now;
  const seconds = now / 1000;
  const trauma = combat.trauma;
  trauma.update(dt, stage.height);
  stage.shakeX = trauma.offsetX;
  stage.shakeY = trauma.offsetY;
  stage.roll = trauma.roll;
  const lead = mode === "play" ? session.lead() : 0;
  stage.setTitle(mode === "start");
  // The ship drifts, turns and kicks (ship.ts); with no blow to turn to, along the bay firing now (the Tia ray when only it burns).
  combat.aim(world, aim);
  ship.update(dt, world, aim, stage.camera.position);
  crowd.update(world, seconds, lead);
  combat.draw(world, dt, seconds, lead);
  stage.update(seconds);
  stage.render();
  combat.sprites.render(stage.renderer);
  calls = stage.renderer.info.render.calls;
  triangles = stage.renderer.info.render.triangles;
  costs.draw[costs.at] = performance.now() - start;
  costs.n += 1;
  painted = true;
}

runFrameLoop({
  update(raf) {
    if (lastRaf >= 0) costs.interval[costs.at] = raf - lastRaf;
    if (!held) clock += lastRaf < 0 ? 0 : Math.min(100, raf - lastRaf);
    lastRaf = raf;
    update(clock);
  },
  draw() {
    draw(clock);
  },
  onError() {
    if (mode === "play") setMode("paused");
  },
});

setMode(params.get("autostart") === "1" ? (params.get("card") === "1" ? "intro" : "play") : "start");
stage.setTitle(mode === "start", true);
document.title = "Last Line";

/** Foes the camera shows: on the field and the gate's queue just above it. */
function onScreen(): number {
  let n = 0;
  for (let s = 0; s < world.foes.top; s += 1) if (world.foes.alive[s] === 1 && world.foes.z[s]! <= FIELD.gateZ + 4) n += 1;
  return n;
}

if (devHandleWanted(import.meta.env.DEV, location.search)) installDevHandle({
  ready: () => painted && loaded && combat.ready && keyboardReady,
  models: () => ({ mine: crowd.loaded[0], scout: crowd.loaded[1], brute: crowd.loaded[2], shield: crowd.loaded[3], splitter: crowd.loaded[4], ship: ship.loaded }),
  start: () => (mode === "start" || mode === "intro") && setMode("play"),
  mode: () => mode,
  flags: () => ({ seed: world.seed, tier, pilot, deck: vocab.hash, vocabulary: vocab.source, ...world.header }),
  /** The run header (mode, pace k, E, director) and the in-run balance: the pace log, the FlowMeter's window and stage so far. */
  header: () => ({ ...world.header }),
  pace: () => ({ log: world.director.log.slice(), window: world.meter.window(), flow: world.meter.summary(world.phase === "won" ? "won" : "lost"), spawnScale: world.pace.spawnScale, wave: world.pace.wave, tide: world.plan.tide, strength: Array.from(world.plan.strength) }),
  /** The stored skill profile, blended (what the "Hồ sơ gõ" panel shows). */
  profile: () => ({ runs: profile.trend.stages, report: skillReport(profile, settings.mode), settled }),
  send: (command: Parameters<Session["send"]>[0]) => session.send(command),
  flood: (n: number) => session.send({ t: "flood", n }),
  hash: () => hashHex(world),
  /** The run so far, read at one instant: what a Node replay needs (scripts/replay.ts). */
  snapshot: () => snapshot(session, { tier, deck: vocab.hash, vocabulary: vocab.source }),
  state: () => runState(session, onScreen),
  slots: () => bays(session),
  /** The journey's screen and choices; a foe placed by a logged command (effects scenarios). */
  journey: () => ({ screen: journey.screen, stage: journey.stage.id, picked: journey.picked.slice(), cursor: journey.cursor, ready: journey.ready, stars }),
  place: (kind: number, x: number, z: number) => session.send({ t: "place", kind, x, z }),
  events: () => eventCounts(session),
  costs: () => costs.read(),
  /** Typing Feel's keyboard sounds: the keys base (null: off), the catalogue, the chosen and the saved id, whether the save owns it, Relay's stand-in, the set playing, the gate's times. */
  keyboard: () => ({ base: keyboardFeed.base, ...keyboardProbe, id: settings.typingFx.soundProfile, saved: savedKeyboard, owned: keyboardOwned, standIn: keyboardStandIn, profile: typeFx.sounds.profile?.id ?? null, stats: { ...typeFx.sounds.stats }, ready: keyboardReady, live }),
  /** Sounds started so far by id (docs/audio/THEME_SOUND_LIST.md), and whether audio runs. */
  sounds: () => ({ ready: audio.ready, played: Object.fromEntries(audio.played) }),
  screen: () => screen,
  /** The quick panels: which is open, whether keys are held back, whether the fight is frozen. */
  quick: () => ({ panel: quick.panel, blocking: quick.blocking, frozen }),
  /** The word line (the kit's focus strip): the word shown, its plate, its size and counts, the settings. */
  typefx: () => ({ word: typeFx.driver.word, typed: typeFx.driver.typed, rect: typeFx.rect(), widest: typeFx.widest(), font: typeFx.strip.fontSize, time: typeFx.time, stats: { ...typeFx.strip.stats }, settings: { ...typeFx.strip.current }, readout: typeFx.strip.readout() }),
  info: () => ({ calls, triangles, geometries: stage.renderer.info.memory.geometries, textures: stage.renderer.info.memory.textures, programs: stage.renderer.info.programs?.length ?? 0, drawn: crowd.drawn(), glows: combat.glows.count, sparks: combat.sparks.count, debris: combat.debris.live, numbers: combat.numbers.live, stops: combat.stopsAsked, feel: typing.probe(), ...combat.probe() }),
  numbers: () => numberBoxes(combat.numbers),
  /** The ship's pose (cheap enough for every frame); live foes on screen with their body radius (CSS px; the balance pass's wash-out). */
  ship: () => shipProbe(stage, ship),
  foes: () => foesOnScreen(stage, world),
  rects: () => hud.protectedRects(),
  /** The shake settings and the camera's shake offset now (px). */
  motion: () => ({ scale: combat.trauma.scale, reduced: combat.trauma.reduced, trauma: combat.trauma.trauma, offset: Math.hypot(stage.shakeX, stage.shakeY) }),
  hold: (on: boolean) => {
    held = on;
  },
  advance: (ms: number) => {
    for (let t = 0; t < ms - 0.01; t += 1000 / 60) {
      clock += 1000 / 60;
      update(clock);
      draw(clock);
    }
  },
  forceStops: (on: boolean) => {
    combat.forceStops = on;
  },
});
