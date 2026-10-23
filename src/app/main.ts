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
import { runFrameLoop, safeLocalStorage } from "../kit/platform";
import { speakEnglish } from "../kit/speech";
import { hordeIntensity } from "../audio/music";
import { ThemeAudio } from "../audio/theme-audio";
import { FIELD, FOE_CAP, TIA, XUNG, type Tier } from "../content/rules";
import { STAGE_S0, spanAt } from "../content/stage-s0";
import { hashHex } from "../sim/hash";
import { Combat } from "../view/combat";
import { Crowd } from "../view/crowd";
import { Hud } from "../view/hud";
import { Stage } from "../view/scene";
import { renderScreen, type ScreenView } from "../view/screens";
import { Ship, type Pilot } from "../view/ship";
import { installDevHandle } from "./dev";
import { ImeNotice, installAutoPause, installKeys, type KeyAction } from "./input";
import { reportWord } from "./learning";
import { Menu, cycle, stepVolume, type MenuItem } from "./menu";
import { Session } from "./session";
import { loadVocab, type Word } from "./vocab";

/**
 * Tuyến Cuối (index.html), stage S0 "Bản thử dọc" (docs/BUILD_S0.md), theme
 * "Vành Chân Trời" (docs/changelog/2026-10-23-theme.md): the vocabulary
 * loads, the title screen waits (keyboard first: Bắt đầu, Chơi tiếp, Cài đặt,
 * Kho súng · Học từ), the world steps at 60 Hz in a session, the 3D stage
 * draws it, the combat view turns its events into feedback and the theme's
 * sound, the DOM HUD shows the words; window.__survival lets the browser
 * scenarios drive it. Storage: only survival.* keys (quality, ship and the
 * settings screen's volumes, shake and pronunciation). Each typed word goes
 * to the portal's learning record as "typing-survival".
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
type Settings = { sfxVolume: number; musicVolume: number; screenShake: boolean; pronunciationEnabled: boolean; pronunciationRate: number; pronunciationVolume: number };
const saved = (safeLocalStorage.readJson(SETTINGS_KEY) ?? {}) as Partial<Settings>;
const DEFAULTS: Settings = { sfxVolume: 0.7, musicVolume: 0.5, screenShake: true, pronunciationEnabled: true, pronunciationRate: 0.9, pronunciationVolume: 1 };
const settings: Settings = { ...DEFAULTS, ...saved };
for (const key of ["sfxVolume", "musicVolume"] as const) if (!Number.isFinite(settings[key])) settings[key] = DEFAULTS[key];
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
const session = new Session({ seed, deck: vocab.deck, tier });
const world = session.world;
const wordOf = (index: number): Word => vocab.words.get(world.deck[index]!) ?? { en: world.deck[index] ?? "", vi: "", ipa: "" };
const hud = new Hud(hudRoot, wordOf);
const crowd = new Crowd(stage.scene);
const ship = new Ship(stage.scene, pilot);
const loading = Promise.all([crowd.load(), ship.load(stage.scene)]);
let loaded = false;
void loading.then(() => (loaded = true));
const audio = new ThemeAudio({ sfx: settings.sfxVolume, music: settings.musicVolume });

type Mode = "start" | "play" | "paused" | "end";
/** What the overlay shows: a menu screen, or nothing in a running fight. */
type Screen = "title" | "settings" | "armory" | "pause" | "end" | "none";
let mode: Mode = "start";
let screen: Screen = "none";
/** Where settings and the armory go back to. */
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
  wordDone(slot, index, perfect) {
    hud.finished(slot, index, perfect, clock);
    const word = wordOf(index);
    if (vocab.source === "vocabulary") reportWord(word, perfect);
    // Said the first time it is typed in this run, at most once every 3 s.
    if (settings.pronunciationEnabled && !spoken.has(word.en) && clock - lastSpeak >= SPEAK_GAP_MS) {
      spoken.add(word.en);
      lastSpeak = clock;
      speakEnglish(word.en, speech);
    }
  },
  hurt: () => hud.hurt(),
  ended: () => setMode("end"),
});
const applyShake = (): void => {
  combat.trauma.scale = settings.screenShake && shakeAllowed ? 1 : 0;
};
applyShake();
combat.trauma.reduced = motionReduced();

const decimal = (value: number): string => String(value).replace(".", ",");
const percent = (value: number): string => Math.round(value * 100) + " %";
const onOff = (on: boolean): string => (on ? "Bật" : "Tắt");

function items(which: Screen): MenuItem[] {
  switch (which) {
    case "title":
      return [
        { id: "start", label: started ? "Bắt đầu lại" : "Bắt đầu", note: started ? "Bỏ trận đang dở, vào trận mới" : "Trận mới · giữ hành lang " + STAGE_S0.seconds / 60 + " phút", enabled: true },
        { id: "continue", label: "Chơi tiếp", note: started ? "Về trận đang tạm dừng" : "Chưa có trận đang dở", enabled: started },
        { id: "settings", label: "Cài đặt", note: "Âm thanh, rung, tàu, chất lượng hình", enabled: true },
        { id: "armory", label: "Kho súng · Học từ", note: "Sắp có", enabled: true },
      ];
    case "settings": {
      const later = started ? "Đổi ở màn chính, trước khi vào trận" : undefined;
      return [
        { id: "sfx", label: "Âm hiệu ứng", value: percent(settings.sfxVolume), level: settings.sfxVolume, enabled: true },
        { id: "music", label: "Nhạc", value: percent(settings.musicVolume), level: settings.musicVolume, enabled: true },
        { id: "shake", label: "Rung màn hình", value: onOff(settings.screenShake), note: shakeAllowed ? undefined : "Đang tắt bởi ?shake=0", enabled: true },
        { id: "speak", label: "Đọc từ tiếng Anh", value: onOff(settings.pronunciationEnabled), enabled: true },
        { id: "pilot", label: "Tàu", value: PILOT_NAMES[chosen.pilot], note: later, enabled: !started },
        { id: "quality", label: "Chất lượng hình", value: TIER_NAMES[chosen.tier], note: later, enabled: !started },
        { id: "done", label: "Xong", enabled: true },
      ];
    }
    case "armory":
      return [{ id: "back", label: "Quay lại", enabled: true }];
    case "pause":
      return [
        { id: "resume", label: "Chơi tiếp", note: "Esc", enabled: true },
        { id: "settings", label: "Cài đặt", note: "Âm thanh, rung, đọc từ", enabled: true },
        { id: "title", label: "Về màn chính", note: "Trận giữ nguyên, chơi tiếp được", enabled: true },
      ];
    case "end":
      return [
        { id: "replay", label: "Chơi lại", note: "Enter", enabled: true },
        { id: "title", label: "Màn chính", note: "Esc", enabled: true },
      ];
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
        status: "TÀU " + PILOT_NAMES[pilot].toUpperCase() + " · HÌNH " + TIER_NAMES[tier].toUpperCase() + " · HÀNH LANG 24 × " + FIELD.gateZ + " M",
      };
    case "settings":
      return { kind: "settings", menu, note: started ? "" : "Đổi tàu hoặc chất lượng hình thì trang tải lại khi bấm Xong." };
    case "armory":
      return {
        kind: "armory",
        menu,
        guns: [
          { kind: "xung", name: "XUNG", title: "pháo xung liên thanh", text: XUNG.rounds + " viên một băng, bắn hết trong " + decimal(XUNG.seconds) + " s vào con gần vạch nhất, tầm " + XUNG.range + " m. Gõ không lỗi: đòn mạnh hơn, dễ chí mạng." },
          { kind: "tia", name: "TIA", title: "tia nhiệt quét", text: "Một băng cháy " + decimal(TIA.seconds) + " s, dài " + TIA.length + " m, cắt qua cả đám và quét về cụm dày." },
        ],
        learning: [
          "Mỗi từ gõ xong được ghi vào sổ học chung của portal (mã typing-survival).",
          "Sắp có: nâng cấp súng, súng mới, ôn lại từ giữa các trận.",
        ],
      };
    case "pause":
      return { kind: "pause", menu };
    case "end": {
      const s = world.stats;
      const keys = s.keysOk + s.keysBad;
      const T = world.typing;
      const seen = new Set<number>();
      const words: { en: string; vi: string }[] = [];
      for (let k = Math.max(0, T.doneCount - T.done.length); k < T.doneCount; k += 1) {
        const index = T.done[k % T.done.length]!;
        if (seen.has(index)) continue;
        seen.add(index);
        const word = wordOf(index);
        words.push({ en: word.en, vi: word.vi });
      }
      const time = Math.min(world.seconds, world.time);
      return {
        kind: "end",
        menu,
        won: world.phase === "won",
        stats: [
          { value: Math.floor(time / 60) + ":" + String(Math.floor(time % 60)).padStart(2, "0"), label: "Thời gian" },
          { value: String(s.kills), label: "Hạ" },
          { value: (keys === 0 ? 100 : Math.round((s.keysOk / keys) * 100)) + "%", label: "Độ chuẩn" },
          { value: String(s.words), label: "Từ đã gõ" },
        ],
        words,
      };
    }
    default:
      return null;
  }
}

/** Shows `which` with a fresh menu (or redraws it in place, keeping the selection); `focus` selects that item. */
function show(which: Screen, keep = false, focus?: string): void {
  const list = items(which);
  menu = new Menu(list, keep && which === screen ? menu.index : which === "title" && started ? 1 : 0);
  if (focus !== undefined) menu.select(focus);
  screen = which;
  drawScreen();
}

function drawScreen(): void {
  const shown = view(screen);
  hud.overlay.innerHTML = shown === null ? "" : renderScreen(shown);
  hud.overlay.classList.toggle("is-on", shown !== null);
  hud.overlay.dataset.screen = screen;
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

/** A new page: `autostart` straight into a fight; the settings' ship and quality go in its address. */
function reload(autostart: boolean): void {
  const next = new URLSearchParams(params);
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
  else if (id === "pilot") chosen.pilot = cycle(PILOTS, chosen.pilot, delta);
  else if (id === "quality") chosen.tier = cycle(TIERS, chosen.tier, delta);
  else return;
  audio.setVolumes(settings.sfxVolume, settings.musicVolume);
  applyShake();
  saveSettings();
  audio.ui("move");
  show("settings", true);
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
  audio.ui("select");
  switch (item.id) {
    case "start":
      if (started) reload(true);
      else setMode("play");
      break;
    case "continue":
    case "resume":
      setMode("play");
      break;
    case "settings":
    case "armory":
      back = screen;
      show(item.id);
      break;
    case "back":
      show(back, false, "armory");
      break;
    case "title":
      if (mode === "end") reload(false);
      else {
        mode = "start";
        show("title");
      }
      break;
    case "replay":
      reload(true);
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
  if (action === "up" || action === "down" || ((action === "left" || action === "right") && screen !== "settings")) {
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
    else if (screen === "armory") {
      audio.ui("back");
      show(back, false, "armory");
    } else if (screen === "pause") setMode("play");
    else if (screen === "end") {
      audio.ui("back");
      reload(false);
    }
  }
}

// A pointer can hover and click the menu items too.
hud.overlay.addEventListener("pointermove", (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-index]");
  const index = Number(target?.dataset.index ?? -1);
  if (index >= 0 && index !== menu.index && menu.items[index]?.enabled) {
    menu.index = index;
    audio.ui("move");
    drawScreen();
  }
});
hud.overlay.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-index]");
  const index = Number(target?.dataset.index ?? -1);
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

/** Frame costs (ms) of the last 1200 frames: steps + events + HUD, and the draw; frame intervals. */
const RING = 1200;
const costs = { update: new Float32Array(RING), draw: new Float32Array(RING), interval: new Float32Array(RING), n: 0 };
let lastDraw = -1;
let lastRaf = -1;
let held = false;
let painted = false;
let calls = 0;
let triangles = 0;

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
  const peak = spanAt(world.time).peak;
  if (peak !== lastPeak) {
    lastPeak = peak;
    if (peak > 0 && mode === "play") audio.siren();
  }
  audio.setMusic(mode === "play" ? hordeIntensity(shown, peak > 0) : 0, mode === "play" ? 1 : mode === "paused" ? 0.45 : 0.8);
  costs.update[costs.n % RING] = performance.now() - start;
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
  // The ship turns with Xung, or with the Tia ray while Xung is empty.
  const G = world.guns;
  const ray = G.beamOn === 1 && G.mags[0] === 0;
  const norm = ray ? Math.hypot(G.beamX, TIA.length) : 1;
  ship.update(dt, seconds, ray ? G.beamX / norm : G.aimX, ray ? TIA.length / norm : G.aimZ, stage.camera.position);
  crowd.update(world, seconds, lead);
  combat.draw(world, dt, seconds, lead);
  stage.update(seconds);
  stage.render();
  combat.sprites.render(stage.renderer);
  calls = stage.renderer.info.render.calls;
  triangles = stage.renderer.info.render.triangles;
  costs.draw[costs.n % RING] = performance.now() - start;
  costs.n += 1;
  painted = true;
}

runFrameLoop({
  update(raf) {
    if (lastRaf >= 0) costs.interval[costs.n % RING] = raf - lastRaf;
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
  models: () => ({ mine: crowd.loaded[0], scout: crowd.loaded[1], ship: ship.loaded }),
  start: () => mode === "start" && setMode("play"),
  mode: () => mode,
  flags: () => ({ seed: world.seed, tier, pilot, deck: vocab.hash, vocabulary: vocab.source, expected: world.expected }),
  send: (command: Parameters<Session["send"]>[0]) => session.send(command),
  flood: (n: number) => session.send({ t: "flood", n }),
  hash: () => hashHex(world),
  /** The run so far, read at one instant: what a Node replay needs (scripts/replay.ts). */
  snapshot: () => ({ seed: world.seed, tier, deck: vocab.hash, vocabulary: vocab.source, expected: world.expected, tick: world.tick, hash: hashHex(world), log: session.log.slice() }),
  state: () => ({
    tick: world.tick, time: world.time, phase: world.phase, hp: world.hp, foes: world.foes.count, onScreen: onScreen(), bullets: world.bullets.count, shots: world.shots.count,
    mags: Array.from(world.guns.mags), beam: world.guns.beamOn === 1 ? world.guns.beamX : null, stats: { ...world.stats }, spawned: world.spawn.spawned, waiting: world.spawn.waiting,
  }),
  slots: () => [0, 1].map((s) => ({ text: world.deck[world.typing.word[s]!]!, typed: world.typing.lock === s ? world.typing.typed[s]! : 0, locked: world.typing.lock === s, mags: world.guns.mags[s]! })),
  costs: () => {
    const n = Math.min(costs.n, RING);
    const take = (list: Float32Array) => Array.from({ length: n }, (_, k) => list[(costs.n - n + k) % RING]!);
    return { update: take(costs.update), draw: take(costs.draw), interval: take(costs.interval) };
  },
  /** Sounds started so far by id (docs/audio/THEME_SOUND_LIST.md), and whether audio runs. */
  sounds: () => ({ ready: audio.ready, played: Object.fromEntries(audio.played) }),
  screen: () => screen,
  info: () => ({ calls, triangles, geometries: stage.renderer.info.memory.geometries, textures: stage.renderer.info.memory.textures, drawn: crowd.drawn(), glows: combat.glows.count, sparks: combat.sparks.count, debris: combat.debris.live, numbers: combat.numbers.live, stops: combat.stopsAsked }),
  numbers: () => {
    const N = combat.numbers;
    const boxes: { x: number; y: number; w: number; h: number; text: string }[] = [];
    for (let i = 0; i < N.alive.length; i += 1) if (N.alive[i] === 1) boxes.push({ ...N.box(i, { x: 0, y: 0, w: 0, h: 0 }), text: N.text(i) });
    return { live: N.live, overlaps: N.overlaps(), dropped: N.dropped, rects: N.protected.slice(), boxes };
  },
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
