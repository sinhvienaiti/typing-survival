// First: the game's Interface motion setting answers prefers-reduced-motion.
import { motionReduced } from "../../ui/motion-preference";
import "@fontsource/exo-2/800.css";
import "@fontsource/exo-2/800-italic.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/800.css";
import "../view/survival.css";
import { runFrameLoop } from "../../platform/frame-loop";
import { safeLocalStorage } from "../../platform/safe-storage";
import { speakEnglish } from "../../speech";
import type { GameSettings } from "../../types";
import { FIELD, FOE_CAP, TIA, type Tier } from "../content/rules";
import { STAGE_S0 } from "../content/stage-s0";
import { hashHex } from "../sim/hash";
import { Combat } from "../view/combat";
import { Crowd } from "../view/crowd";
import { Hud } from "../view/hud";
import { Stage } from "../view/scene";
import { Ship, type Pilot } from "../view/ship";
import { installDevHandle } from "./dev";
import { ImeNotice, installAutoPause, installKeys } from "./input";
import { Session } from "./session";
import { loadVocab, type Word } from "./vocab";

/**
 * Sinh Tồn (survival.html), stage S0 "Bản thử dọc" (docs/survival/BUILD_S0.md):
 * the vocabulary loads, the world steps at 60 Hz in a session, the 3D stage
 * draws it, the combat view turns its events into feedback, the DOM HUD
 * shows the words; window.__survival lets the browser scenarios drive it.
 * Storage: only survival.* keys (the quality and pilot choices); the game's
 * own settings (volume, screen shake, pronunciation) are read, never written.
 */
const QUALITY_KEY = "survival.quality";
const PILOT_KEY = "survival.pilot";
const SETTINGS_KEY = "spaceTypingSettingsV1";
const SPEAK_GAP_MS = 3000;
const TIERS = Object.keys(FOE_CAP) as Tier[];

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("survival: missing #" + id);
  return element as T;
}

const params = new URLSearchParams(window.location.search);
const pick = <T extends string>(value: string | null, options: readonly T[]): T | null => (options.includes(value as T) ? (value as T) : null);
const tier: Tier = pick(params.get("q"), TIERS) ?? pick(safeLocalStorage.getItem(QUALITY_KEY), TIERS) ?? "high";
const pilot: Pilot = pick(params.get("pilot"), ["vanguard", "draconis"] as const) ?? pick(safeLocalStorage.getItem(PILOT_KEY), ["vanguard", "draconis"] as const) ?? "vanguard";
if (params.has("q")) safeLocalStorage.setItem(QUALITY_KEY, tier);
if (params.has("pilot")) safeLocalStorage.setItem(PILOT_KEY, pilot);
const seed = Number(params.get("seed") ?? "") >>> 0 || (Math.floor(Math.random() * 0x7fffffff) >>> 0) || 1;
const saved = (safeLocalStorage.readJson(SETTINGS_KEY) ?? {}) as Partial<GameSettings>;
const DEFAULTS: GameSettings = { sfxVolume: 0.7, musicVolume: 0.5, ambientVolume: 0.4, screenShake: true, visualQuality: "high", pronunciationEnabled: true, pronunciationRate: 0.9, pronunciationVolume: 1 };
const settings: GameSettings = { ...DEFAULTS, ...saved };
if (!Number.isFinite(settings.sfxVolume)) settings.sfxVolume = DEFAULTS.sfxVolume;

const hudRoot = byId("svHud");
let stage: Stage;
try {
  stage = new Stage(byId<HTMLCanvasElement>("svCanvas"), tier);
} catch {
  hudRoot.textContent = "Trình duyệt này không chạy được WebGL, nên Sinh Tồn không chơi được ở đây.";
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

type Mode = "start" | "play" | "paused" | "end";
let mode: Mode = "start";
const imeNotice = new ImeNotice();
const spoken = new Set<string>();
let lastSpeak = -1e9;
let clock = 0;

const combat = new Combat(stage, crowd, ship, pilot, tier, settings.sfxVolume, {
  stop: (ms) => session.stop(ms),
  wordDone(slot, index, perfect) {
    hud.finished(slot, index, perfect, clock);
    const word = wordOf(index);
    // Said the first time it is typed in this run, at most once every 3 s.
    if (settings.pronunciationEnabled && !spoken.has(word.en) && clock - lastSpeak >= SPEAK_GAP_MS) {
      spoken.add(word.en);
      lastSpeak = clock;
      speakEnglish(word.en, settings);
    }
  },
  hurt: () => hud.hurt(),
  ended: () => setMode("end"),
});
combat.trauma.scale = settings.screenShake && params.get("shake") !== "0" ? 1 : 0;
combat.trauma.reduced = motionReduced();

function overlay(html: string): void {
  hud.overlay.innerHTML = html;
  hud.overlay.classList.toggle("is-on", html !== "");
}

const choice = (key: string, value: string, label: string, on: boolean): string => {
  const next = new URLSearchParams(params);
  next.set(key, value);
  return '<a href="?' + next.toString() + '" class="' + (on ? "is-on" : "") + '">' + label + "</a>";
};
const escapeHtml = (text: string): string => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);

function setMode(next: Mode): void {
  mode = next;
  if (next === "start") {
    overlay(
      '<div class="sv-card sv-panel"><h1>SINH TỒN</h1><p>Bản thử S0 · giữ hành lang ' + STAGE_S0.seconds / 60 + " phút</p>" +
        "<p>Gõ từ trên ô súng để <b>nạp băng đạn</b>; súng tự bắn. Gõ không lỗi: đòn mạnh hơn. Gõ nhanh: bắn nhanh hơn.</p>" +
        '<div class="sv-choices">' + choice("pilot", "vanguard", "Vanguard", pilot === "vanguard") + choice("pilot", "draconis", "Draconis", pilot === "draconis") + "</div>" +
        '<div class="sv-choices">' + TIERS.map((t) => choice("q", t, { low: "Thấp", medium: "Vừa", high: "Cao", ultra: "Cực cao" }[t], t === tier)).join("") + "</div>" +
        '<span class="sv-key">Enter · Bắt đầu</span></div>',
    );
  } else if (next === "paused") overlay('<div class="sv-card sv-panel"><h1>TẠM DỪNG</h1><span class="sv-key">Esc · Tiếp tục</span></div>');
  else if (next === "end") {
    const s = world.stats;
    const keys = s.keysOk + s.keysBad;
    const T = world.typing;
    const seen = new Set<number>();
    const items: string[] = [];
    for (let k = Math.max(0, T.doneCount - T.done.length); k < T.doneCount; k += 1) {
      const index = T.done[k % T.done.length]!;
      if (seen.has(index)) continue;
      seen.add(index);
      const word = wordOf(index);
      items.push("<li><b>" + escapeHtml(word.en) + "</b>" + escapeHtml(word.vi) + "</li>");
    }
    const time = Math.min(world.seconds, world.time);
    overlay(
      '<div class="sv-card sv-panel"><h1>' + (world.phase === "won" ? "TRỤ VỮNG!" : "TÀU ĐÃ VỠ") + "</h1>" +
        '<div class="sv-stats"><div><b>' + Math.floor(time / 60) + ":" + String(Math.floor(time % 60)).padStart(2, "0") + "</b><small>Thời gian</small></div>" +
        "<div><b>" + s.kills + "</b><small>Hạ</small></div><div><b>" + (keys === 0 ? 100 : Math.round((s.keysOk / keys) * 100)) + "%</b><small>Độ chuẩn</small></div>" +
        "<div><b>" + s.words + "</b><small>Từ đã gõ</small></div></div>" +
        '<ul class="sv-words">' + items.join("") + '</ul><span class="sv-key">Enter · Chơi lại</span></div>',
    );
  } else overlay("");
}

function act(action: "pause" | "enter" | "repeat"): void {
  if (action === "enter") {
    if (mode === "start") setMode("play");
    else if (mode === "paused") setMode("play");
    else if (mode === "end") {
      const next = new URLSearchParams(params);
      next.set("autostart", "1");
      window.location.search = next.toString();
    }
  } else if (action === "pause") {
    if (mode === "play") setMode("paused");
    else if (mode === "paused") setMode("play");
  } else if (action === "repeat" && world.typing.lock >= 0) speakEnglish(wordOf(world.typing.word[world.typing.lock]!).en, settings);
}

for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, () => combat.audio.resume());
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
  // The floor glows red as the press reaches the ship (inside the guns' reach and closing).
  let near = 0;
  for (let s = 0; s < world.foes.top; s += 1) if (world.foes.alive[s] === 1 && world.foes.z[s]! < 9) near += 1;
  stage.threat = Math.min(1, near / 12);
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
  /** The run so far, read at one instant: what a Node replay needs (scripts/survival/replay.ts). */
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
