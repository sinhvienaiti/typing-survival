// First: the motion setting decides reduced motion before anything reads it.
import { motionReduced } from "./motion";
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
import { DEFAULT_MODE, MODES, MODE_SPECS, TRIAL_KIT, isMode, lengthFor, stageHeader, type Mode as Difficulty, type RunPace } from "../content/balance";
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
import { FrameCosts, bays, eventCounts, installDevHandle, numberBoxes, runState, snapshot } from "./dev";
import { Journey, NEXT_KEY, recordStage, starsOf, takeChoice, type RunChoice } from "./journey";
import { countedText, profileView, runStats, runWords } from "./results";
import { ImeNotice, installAutoPause, installKeys, type KeyAction } from "./input";
import { reportWord } from "./learning";
import { blendSkill, type SkillUpdate } from "../kit/balance";
import { Menu, cycle, stepVolume, type MenuItem } from "./menu";
import { Session } from "./session";
import { SEEN_KEY, WordHistory, emptyTally, headerFor, loadProfile, recordRun, runSample, saveProfile, skillReport, tallyWord } from "./skill";
import { loadVocab, type Word } from "./vocab";

/**
 * Tuyến Cuối (index.html), stage S0 "Bản thử dọc" (docs/BUILD_S0.md), theme
 * "Vành Chân Trời" (docs/changelog/2026-10-23-theme.md): the vocabulary
 * loads, the title screen waits (keyboard first: Bắt đầu, Chơi tiếp, Cài đặt,
 * Kho súng · Học từ), the world steps at 60 Hz in a session, the 3D stage
 * draws it, the combat view turns its events into feedback and the theme's
 * sound, the DOM HUD shows the words; window.__survival lets the browser
 * scenarios drive it. Storage: only survival.* keys (quality, ship and the
 * settings screen's volumes, shake, pronunciation, mode and "Nhịp tự điều"),
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
const TIERS = Object.keys(FOE_CAP) as Tier[];
const PILOTS = ["vanguard", "draconis"] as const satisfies readonly Pilot[];
const TIER_NAMES: Record<Tier, string> = { low: "Thấp", medium: "Vừa", high: "Cao", ultra: "Cực cao" };
const PILOT_NAMES: Record<Pilot, string> = { vanguard: "Vanguard", draconis: "Draconis" };

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
type Settings = {
  sfxVolume: number; musicVolume: number; screenShake: boolean; pronunciationEnabled: boolean; pronunciationRate: number; pronunciationVolume: number;
  /** The mode (Thư giãn, Cân bằng, Thử thách) and "Nhịp tự điều theo cách bạn gõ". */
  mode: Difficulty; paceAdapt: boolean;
};
const saved = (safeLocalStorage.readJson(SETTINGS_KEY) ?? {}) as Partial<Settings>;
const DEFAULTS: Settings = { sfxVolume: 0.7, musicVolume: 0.5, screenShake: true, pronunciationEnabled: true, pronunciationRate: 0.9, pronunciationVolume: 1, mode: DEFAULT_MODE, paceAdapt: true };
const settings: Settings = { ...DEFAULTS, ...saved };
for (const key of ["sfxVolume", "musicVolume"] as const) if (!Number.isFinite(settings[key])) settings[key] = DEFAULTS[key];
if (!isMode(settings.mode)) settings.mode = DEFAULT_MODE;
if (typeof settings.paceAdapt !== "boolean") settings.paceAdapt = DEFAULTS.paceAdapt;
const urlMode = params.get("mode");
if (isMode(urlMode)) settings.mode = urlMode;
if (params.has("adapt")) settings.paceAdapt = params.get("adapt") !== "0";
if (isMode(urlMode) || params.has("adapt")) safeLocalStorage.writeJson(SETTINGS_KEY, settings);
const speech = { enabled: settings.pronunciationEnabled, rate: settings.pronunciationRate, volume: settings.pronunciationVolume };
const shakeAllowed = params.get("shake") !== "0";

const hudRoot = byId("svHud");
let stage: Stage;
try {
  stage = new Stage(byId<HTMLCanvasElement>("svCanvas"), tier);
} catch {
  hudRoot.textContent = "Trình duyệt này không chạy được WebGL, nên Tuyến Cuối không chơi được ở đây.";
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
const ship = new Ship(stage.scene, pilot);
const loading = Promise.all([crowd.load(), ship.load(stage.scene)]);
let loaded = false;
void loading.then(() => (loaded = true));
const audio = new ThemeAudio({ sfx: settings.sfxVolume, music: settings.musicVolume });

type Mode = "start" | "play" | "paused" | "end";
/** What the overlay shows: a menu screen, or nothing in a running fight. */
type Screen = "title" | "settings" | "armory" | "profile" | "pause" | "end" | "none";
let mode: Mode = "start";
let screen: Screen = "none";
/** Where settings, the armory and the typing profile go back to. */
let back: Screen = "title";
let menu = new Menu([]);
/** A run has begun: the title then offers "Chơi tiếp", and the ship and quality wait for the next page. */
let started = false;
/** The ship and quality the settings screen picked (they take a new page). */
const chosen = { pilot, tier };
const imeNotice = new ImeNotice();
const spoken = new Set<string>();
let lastSpeak = -1e9;
let clock = 0;
let lastPeak = 0;

const combat = new Combat(stage, crowd, ship, pilot, tier, audio, {
  stop: (ms) => session.stop(ms),
  wordDone(slot, index, perfect, seconds, recognize, errors) {
    hud.finished(slot, index, perfect, clock);
    const word = wordOf(index);
    const text = world.deck[index] ?? "";
    tallyWord(tally, history.finished(text), text.length, seconds, recognize, errors === 0);
    if (vocab.source === "vocabulary") reportWord(word, perfect);
    // Said the first time it is typed in this run, at most once every 3 s.
    if (settings.pronunciationEnabled && !spoken.has(word.en) && clock - lastSpeak >= SPEAK_GAP_MS) {
      spoken.add(word.en);
      lastSpeak = clock;
      speakEnglish(word.en, speech);
    }
  },
  hurt: () => hud.hurt(),
  repaired: (hp) => hud.showBanner("TIẾP TẾ +" + Math.round(hp) + " GIÁP", clock),
  ended: () => {
    settle(world.phase === "won" ? "won" : "lost");
    if (level.id !== "s0") {
      const s = world.stats;
      stars = starsOf(level, world.phase === "won", world.hp, world.armourMax, s.keysOk / Math.max(1, s.keysOk + s.keysBad));
      recordStage(safeLocalStorage, world.header.mode, level.id, stars);
      if (stars.some(Boolean)) audio.gun("star.get", 0, clock);
    }
    setMode("end");
  },
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
combat.trauma.reduced = motionReduced();

const percent = (value: number): string => Math.round(value * 100) + " %";
const onOff = (on: boolean): string => (on ? "Bật" : "Tắt");
const fixed = (value: number, digits: number): string => value.toFixed(digits).replace(".", ",");
/** During a run, a new mode or "Nhịp tự điều" waits for the next one. */
const nextRun = (): string | undefined => (started ? "Áp dụng từ trận sau" : undefined);

function items(which: Screen): MenuItem[] {
  switch (which) {
    case "title":
      return [
        { id: "journey", label: "Hành trình", note: "Chương 1 · ải 1–" + CHAPTER_1.length + " · chọn ải, nạp súng", enabled: true },
        { id: "start", label: started ? "Trận thử lại" : "Trận thử", note: started ? "Bỏ trận đang dở, vào trận thử mới" : "Xung và Tia · giữ hành lang " + STAGE_S0.seconds / 60 + " phút", enabled: true },
        { id: "continue", label: "Chơi tiếp", note: started ? "Về trận đang tạm dừng" : "Chưa có trận đang dở", enabled: started },
        { id: "mode", label: "Chế độ", value: MODE_SPECS[settings.mode].label, note: nextRun() ?? MODE_SPECS[settings.mode].note, enabled: true },
        { id: "profile", label: "Hồ sơ gõ", note: "Tốc độ, độ chính xác, lời khuyên", enabled: true },
        { id: "settings", label: "Cài đặt", note: "Âm thanh, rung, nhịp, tàu, chất lượng hình", enabled: true },
        { id: "armory", label: "Kho súng · Học từ", note: "5 súng, khắc chế, học từ", enabled: true },
      ];
    case "settings": {
      const later = started ? "Đổi ở màn chính, trước khi vào trận" : undefined;
      return [
        { id: "sfx", label: "Âm hiệu ứng", value: percent(settings.sfxVolume), level: settings.sfxVolume, enabled: true },
        { id: "music", label: "Nhạc", value: percent(settings.musicVolume), level: settings.musicVolume, enabled: true },
        { id: "shake", label: "Rung màn hình", value: onOff(settings.screenShake), note: shakeAllowed ? undefined : "Đang tắt bởi ?shake=0", enabled: true },
        { id: "speak", label: "Đọc từ tiếng Anh", value: onOff(settings.pronunciationEnabled), enabled: true },
        { id: "adapt", label: "Nhịp tự điều theo cách bạn gõ", value: onOff(settings.paceAdapt), note: nextRun() ?? (settings.paceAdapt ? "Bầy dày thưa theo hồ sơ gõ của bạn" : "Nhịp chuẩn cố định, không điều trong trận"), enabled: true },
        { id: "pilot", label: "Tàu", value: PILOT_NAMES[chosen.pilot], note: later, enabled: !started },
        { id: "quality", label: "Chất lượng hình", value: TIER_NAMES[chosen.tier], note: later, enabled: !started },
        { id: "done", label: "Xong", enabled: true },
      ];
    }
    case "armory":
    case "profile":
      return [{ id: "back", label: "Quay lại", enabled: true }];
    case "pause":
      return [
        { id: "resume", label: "Chơi tiếp", note: "Esc", enabled: true },
        { id: "settings", label: "Cài đặt", note: "Âm thanh, rung, đọc từ", enabled: true },
        { id: "title", label: "Về màn chính", note: "Trận giữ nguyên, chơi tiếp được", enabled: true },
      ];
    case "end": {
      const next = world.phase === "won" ? CHAPTER_1[level.index] : undefined;
      return [
        ...(next !== undefined ? [{ id: "next", label: "Ải " + next.index, note: next.name, enabled: true }] : []),
        { id: "replay", label: level.id === "s0" ? "Chơi lại" : "Chơi lại ải", note: "Enter", enabled: true },
        ...(level.id === "s0" ? [] : [{ id: "stages", label: "Chọn ải", note: "Hành trình", enabled: true }]),
        { id: "title", label: "Màn chính", note: "Esc", enabled: true },
      ];
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
        lead: "Bầy Hố Đen tràn ra từ mép hố đen. Gõ từ trên hai bến súng để nạp đạn; súng tự bắn. Gõ không lỗi thì đòn mạnh hơn.",
        status: "TÀU " + PILOT_NAMES[pilot].toUpperCase() + " · HÌNH " + TIER_NAMES[tier].toUpperCase() + " · " + MODE_SPECS[settings.mode].label.toUpperCase(),
      };
    case "profile":
      return { kind: "profile", menu, ...profileView(profile, settings.mode, settings.paceAdapt) };
    case "settings":
      return { kind: "settings", menu, note: started ? "" : "Đổi tàu hoặc chất lượng hình thì trang tải lại khi bấm Xong." };
    case "armory":
      return {
        kind: "armory",
        menu,
        guns: GUN_SPECS.map((gun) => ({ kind: gun.key, name: gun.name, title: gun.title, text: gun.magazine + ", tầm " + gun.range + (gun.heavy ? ", từ dài hơn 1 chữ" : "") + "." })),
        learning: [
          "Gõ không lỗi: đòn mạnh hơn, dễ chí mạng, và xuyên Vỏ (Vỏ chỉ chặn 75 %).",
          "Mỗi từ gõ xong được ghi vào sổ học chung của portal (mã typing-survival).",
        ],
      };
    case "pause":
      return { kind: "pause", menu };
    case "end": {
      const report = skillReport(profile, settings.mode);
      return {
        kind: "end",
        menu,
        stage: level.id === "s0" ? "" : "Ải " + level.index + " · " + level.name,
        stars: stars === null ? "" : starRow(stars, LEARN_RULES[level.learn].starAccuracy),
        mode: MODE_SPECS[world.header.mode].label,
        advice: report.advice,
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
  } else if (next === "paused") show("pause");
  else if (next === "end") show("end");
  else show("title");
}

/** A new page: `autostart` straight into a fight (a journey stage when `run` is given); the settings' ship, quality and mode go in its address. */
function reload(autostart: boolean, run?: RunChoice): void {
  if (started && mode !== "end") settle("quit");
  safeSessionStorage.setItem(NEXT_KEY, run === undefined ? "" : JSON.stringify({ stage: run.stage, guns: run.guns.map((gun) => GUN_KEYS[gun]) }));
  const next = new URLSearchParams(params);
  next.delete("stage");
  next.delete("guns");
  if (params.has("mode")) next.set("mode", settings.mode);
  if (params.has("adapt")) next.set("adapt", settings.paceAdapt ? "1" : "0");
  if (autostart) next.set("autostart", "1");
  else next.delete("autostart");
  if (chosen.pilot !== pilot || params.has("pilot")) next.set("pilot", chosen.pilot);
  if (chosen.tier !== tier || params.has("q")) next.set("q", chosen.tier);
  window.location.search = next.toString();
}

function saveSettings(): void {
  safeLocalStorage.writeJson(SETTINGS_KEY, settings);
  safeLocalStorage.setItem(PILOT_KEY, chosen.pilot);
  safeLocalStorage.setItem(QUALITY_KEY, chosen.tier);
}

/** A setting's value one step on (`delta` ±1). */
function adjust(id: string, delta: number): void {
  if (id === "sfx") settings.sfxVolume = stepVolume(settings.sfxVolume, delta);
  else if (id === "music") settings.musicVolume = stepVolume(settings.musicVolume, delta);
  else if (id === "shake") settings.screenShake = !settings.screenShake;
  else if (id === "speak") settings.pronunciationEnabled = speech.enabled = !settings.pronunciationEnabled;
  else if (id === "adapt") settings.paceAdapt = !settings.paceAdapt;
  else if (id === "mode") settings.mode = cycle(MODES, settings.mode, delta);
  else if (id === "pilot") chosen.pilot = cycle(PILOTS, chosen.pilot, delta);
  else if (id === "quality") chosen.tier = cycle(TIERS, chosen.tier, delta);
  else return;
  audio.setVolumes(settings.sfxVolume, settings.musicVolume);
  applyShake();
  saveSettings();
  audio.ui("move");
  show(screen === "title" ? "title" : "settings", true);
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
      // A run's header is fixed when its world is made: another mode or "Nhịp tự điều" takes a new page.
      if (started || settings.mode !== pageMode || settings.paceAdapt !== pageAdapt) reload(true);
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

// A pointer can hover and click the menu items too.
hud.overlay.addEventListener("pointermove", (event) => {
  if (journey.active) return;
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-index]");
  const index = Number(target?.dataset.index ?? -1);
  if (index >= 0 && index !== menu.index && menu.items[index]?.enabled) {
    menu.index = index;
    audio.ui("move");
    drawScreen();
  }
});
hud.overlay.addEventListener("click", (event) => {
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

for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, () => audio.resume());
installKeys(window, {
  // Only a running fight takes letters: keys while paused or between runs type nothing.
  send: (command) => {
    if (mode === "play") session.send(command);
  },
  act,
  onVietnamese: () => imeNotice.note(clock),
  allowUntrusted: params.get("untrusted") === "1",
  pick: (n) => {
    if (mode !== "play") journey.pick(n);
  },
});
installAutoPause(window, document, () => {
  if (mode === "play") setMode("paused");
});

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  document.documentElement.style.setProperty("--ui", Math.max(0.8, Math.min(1.6, Math.min(width / 1280, height / 720))).toFixed(3));
  stage.resize(width, height);
  combat.resize(height, hud.protectedRects());
}
window.addEventListener("resize", resize);
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
  session.paused = mode !== "play";
  session.frame(now);
  combat.read(world, now);
  hud.update(world, combat.killsWithin(now, 3000), now);
  hud.setNotice(imeNotice.on(now) ? "Tắt bộ gõ tiếng Việt để gõ" : vocab.source === "fallback" ? "Từ dự phòng (máy chủ không có từ vựng)" : "");
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
  audio.setMusic(mode === "play" ? hordeIntensity(shown, peak > 0) : 0, mode === "play" ? 1 : mode === "paused" ? 0.45 : 0.8);
  costs.update[costs.at] = performance.now() - start;
}

function draw(now: number): void {
  const start = performance.now();
  // Paused, the effects hold still with the world (the clock itself runs on for the HUD).
  const dt = lastDraw < 0 || mode === "paused" ? 0 : Math.min(0.05, Math.max(0, (now - lastDraw) / 1000));
  lastDraw = now;
  const seconds = now / 1000;
  const trauma = combat.trauma;
  trauma.update(dt, stage.height);
  stage.shakeX = trauma.offsetX;
  stage.shakeY = trauma.offsetY;
  stage.roll = trauma.roll;
  const lead = mode === "play" ? session.lead() : 0;
  stage.setTitle(mode === "start");
  // The ship turns with the bay firing now (the Tia ray when only it burns).
  combat.aim(world, aim);
  ship.update(dt, seconds, aim[0]!, aim[1]!, stage.camera.position);
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

setMode(params.get("autostart") === "1" ? "play" : "start");
stage.setTitle(mode === "start", true);
document.title = "Tuyến Cuối";

/** Foes the camera shows: on the field and the gate's queue just above it. */
function onScreen(): number {
  let n = 0;
  for (let s = 0; s < world.foes.top; s += 1) if (world.foes.alive[s] === 1 && world.foes.z[s]! <= FIELD.gateZ + 4) n += 1;
  return n;
}

installDevHandle({
  ready: () => painted && loaded,
  models: () => ({ mine: crowd.loaded[0], scout: crowd.loaded[1], brute: crowd.loaded[2], shield: crowd.loaded[3], splitter: crowd.loaded[4], ship: ship.loaded }),
  start: () => mode === "start" && setMode("play"),
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
  /** Sounds started so far by id (docs/audio/THEME_SOUND_LIST.md), and whether audio runs. */
  sounds: () => ({ ready: audio.ready, played: Object.fromEntries(audio.played) }),
  screen: () => screen,
  info: () => ({ calls, triangles, geometries: stage.renderer.info.memory.geometries, textures: stage.renderer.info.memory.textures, drawn: crowd.drawn(), glows: combat.glows.count, sparks: combat.sparks.count, debris: combat.debris.live, numbers: combat.numbers.live, stops: combat.stopsAsked }),
  numbers: () => numberBoxes(combat.numbers),
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
