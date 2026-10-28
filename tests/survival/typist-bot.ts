/**
 * Human-like bots for Tuyến Cuối (docs/games/BALANCE.md §6): the kit's
 * HumanTypist plans each word (recognition latency, log-normal speed with
 * spread CV, wrong keys at 1 − a, dropped locks), and the bot presses its
 * keys through the page's real input path: keydown events into installKeys
 * (src/app/input.ts), which sends commands to a Session, which logs them and
 * steps the world (a run is a replayable command log, as in the browser).
 *
 * Choices this game asks of a typist:
 *   which bay to type: the typist's target mix over the bays (danger: what
 *   a magazine of the bay's gun is worth now, gunNeed: Xung for foes
 *   pressing on the line and scout shots, Tia for the crowd in its reach,
 *   Tán for foes at the line, Ray for the big ones and its line, Pháo Sao
 *   for the crowd in its band, Đầu Đàn ×4, Vỏ and shields counted; times
 *   the magazines it lacks; nearest: the gun with fewer magazines; first:
 *   the word seen first, the left bay, in reading order). A full gun's word
 *   loads nothing: a typist reading left first types it anyway. With every
 *   gun full the bot waits (idle).
 *   recall (docs/BUILD_S1.md §11.2): on a Thiếu chữ stage each hidden letter
 *   is misremembered at `recall` (Chuẩn 0.2, Mới 0.3, Trẻ em 0.4): one wrong
 *   key, the letter shows, the bot goes on. Its own seeded draws, so a
 *   standard stage plays exactly as without the rule.
 *   Backspace after a wrong key: in Tuyến Cuối a wrong key never enters the
 *   word (the key counts as an error and the word stays), so there is
 *   nothing to erase: the bots' Backspace chance is 0 here (survivalParams)
 *   and the typist goes straight on with the right key (pressing Backspace
 *   would erase a right letter). A dropped lock is Backspace to zero, as a
 *   player lets a word go.
 *   familiarity: the stage's words are the vocabulary's first three levels
 *   (good, water, house…), read as "known" (0.35–0.6 s to the first key),
 *   the same d k uses (content/balance.ts PACE_D).
 */
import { readFileSync } from "node:fs";
import { HumanTypist, KeyPlayer, botParams, type BotId, type TargetOption, type TypistParams } from "../../src/kit/balance";
import { RngStream } from "../../src/kit/platform/rng";
import { installKeys } from "../../src/app/input";
import { Session } from "../../src/app/session";
import { buildDeck } from "../../src/content/deck";
import { FOES, KIND } from "../../src/content/foes";
import { GUN, GUN_SPECS, PHAO, RAY, TAN, TIA, XUNG, tiaDamage } from "../../src/content/guns";
import { FIELD, NEAR } from "../../src/content/rules";
import { LEARN_RULES } from "../../src/content/stage-rules";
import type { World, WorldOptions } from "../../src/sim/world";

type Keydown = (event: object) => void;
/** For the danger pick: foes within Xung's range, within Tia's reach, and pressing on the line. */
const XUNG_Z = FIELD.muzzleZ + XUNG.range;
const REACH_Z = FIELD.muzzleZ + TIA.length + 1;
const CLOSE_Z = NEAR.z + 2;
const BAND = [FIELD.muzzleZ + PHAO.near, FIELD.muzzleZ + PHAO.far] as const;
/** A blow's base damage by gun (how much of it Vỏ leaves); Tia's is the stage's (gunNeeds sets it). */
const BASE: number[] = [XUNG.damage, TIA.damage, TAN.damage, RAY.damage, PHAO.damage];
/** Misremembered hidden letters by bot (Thiếu chữ), the standard bot's for the rest. */
const RECALL: Readonly<Record<string, number>> = { standard: 0.2, novice: 0.3, child: 0.4 };

/** The share of a gun's blow a foe of `kind` lets through (Vỏ), 0 behind a shield for Xung and Tán. */
function through(gun: number, kind: number, shielded: boolean): number {
  if (shielded && (gun === GUN.xung || gun === GUN.tan)) return 0;
  const armour = FOES[kind]!.armour * GUN_SPECS[gun]!.armour;
  if (armour <= 0) return 1;
  return Math.max(1, BASE[gun]! - armour) / BASE[gun]!;
}

/**
 * What a magazine of each gun is worth now (BUILD_S1 §11.2 gunValue), in S0's units: Xung and Tia
 * exactly as S0's bot (1 + 2·close + 2·shots + in range / 2; 1 + in reach / 2) when nothing has Vỏ
 * or a shield; Đầu Đàn count ×4 everywhere.
 */
export function gunNeeds(w: World, out: Float64Array): Float64Array {
  BASE[GUN.tia] = tiaDamage(w.stage);
  const F = w.foes;
  let xung = 0;
  let tia = 0;
  let close = 0;
  let tanNear = 0;
  let tanClose = 0;
  let ray = 0;
  let phao = 0;
  let shots = 0;
  const mz = FIELD.muzzleZ;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const kind = F.kind[s]!;
    const z = F.z[s]!;
    const x = F.x[s]!;
    const r = FOES[kind]!.radius;
    const shielded = F.shield[s]! >= 0;
    const weight = kind === KIND.leader ? 4 : 1;
    if (z <= XUNG_Z) xung += weight * through(GUN.xung, kind, shielded);
    if (z <= REACH_Z) tia += weight * through(GUN.tia, kind, shielded);
    if (z <= CLOSE_Z) {
      close += weight * through(GUN.xung, kind, shielded);
      tanClose += weight * through(GUN.tan, kind, shielded);
    }
    const dz = z - mz;
    if (x * x + dz * dz <= (TAN.range + r) * (TAN.range + r)) tanNear += weight * through(GUN.tan, kind, shielded);
    if (z - r <= mz + RAY.range && z >= mz + 1) ray += weight * through(GUN.ray, kind, false) * (kind === KIND.brute || kind === KIND.shield || kind === KIND.leader ? 4 : 0.5);
    if (z + r >= BAND[0] && z - r <= BAND[1]) phao += weight * through(GUN.phao, kind, false);
  }
  for (let s = 0; s < w.shots.top; s += 1) if (w.shots.alive[s] === 1) shots += 1;
  out[GUN.xung] = 1 + 2 * close + 2 * shots + xung / 2;
  // Tia on duty (no Xung in the kit) holds the line and hunts scouts: the bot counts that as Xung's work.
  out[GUN.tia] = w.guns.tiaDuty === 1 ? 1 + 2 * close + 2 * shots + tia / 2 : 1 + tia / 2;
  out[GUN.tan] = 1 + 2 * tanClose + tanNear / 2;
  out[GUN.ray] = 1 + ray / 2;
  out[GUN.phao] = 1 + phao / 2;
  return out;
}
/** A bot with nothing worth typing looks again after this many ticks. */
const LOOK_AGAIN = 15;

type Plan = { slot: number; index: number; player: KeyPlayer };

export class TypistBot {
  readonly typist: HumanTypist;
  /** Keys pressed and Backspaces pressed, for checks. */
  pressed = 0;
  backs = 0;
  private plan: Plan | null = null;
  private waitUntil = 0;
  private backsLeft = 0;
  private nextBackAt = 0;
  private readonly keydown: Keydown;
  private readonly backTicks: number;
  private readonly needs = new Float64Array(5);
  /** The bot's own draws for recalling hidden letters (never the typist's). */
  private readonly memory: RngStream;
  /** Chance a hidden letter is misremembered. */
  recall = 0.2;

  constructor(readonly session: Session, readonly params: TypistParams, seed: number) {
    this.typist = new HumanTypist(params, new RngStream(seed));
    this.memory = new RngStream((seed ^ 0x5f3759df) >>> 0);
    let listener: Keydown = () => {};
    const target = { addEventListener: (type: string, handler: Keydown) => (type === "keydown" ? (listener = handler) : undefined) };
    installKeys(target as unknown as Window, { send: (command) => session.send(command), act: () => {}, onVietnamese: () => {}, allowUntrusted: false });
    this.keydown = (event) => listener(event);
    // Backspaces at the typist's own key rate.
    this.backTicks = params.wpm > 0 ? Math.max(1, Math.round((12 / params.wpm) * 60)) : 6;
  }

  private press(letter: string): void {
    this.pressed += 1;
    this.keydown({ key: letter, code: "Key" + letter.toUpperCase(), isTrusted: true, repeat: false, preventDefault() {} });
  }

  private backspace(): void {
    this.backs += 1;
    this.keydown({ key: "Backspace", code: "Backspace", isTrusted: true, repeat: false, preventDefault() {} });
  }

  /**
   * The bays as target options (index = bay). danger: what the gun's
   * magazine is worth now (gunNeeds), times the magazines it lacks (a full
   * gun: −1). nearest: fewest magazines. first: reading order, left to right.
   */
  private options(w: World): TargetOption[] {
    const need = gunNeeds(w, this.needs);
    const G = w.guns;
    const out: TargetOption[] = [];
    for (let bay = 0; bay < G.gun.length; bay += 1) {
      const mags = G.mags[bay]!;
      const gun = G.gun[bay]!;
      const danger = gun < 0 || mags >= G.cap[bay]! ? -1 : need[gun]! * (G.cap[bay]! - mags);
      out.push({ danger, distance: mags, shown: bay });
    }
    return out;
  }

  /** Thiếu chữ: misremembered hidden letters become a wrong key before the right one (the letter then shows). */
  private recallWord(w: World, slot: number, word: ReturnType<HumanTypist["word"]>, from: number): ReturnType<HumanTypist["word"]> {
    const hidden = w.typing.hidden[slot]!;
    if (hidden === 0 || this.recall <= 0) return word;
    const key = Math.max(1, Math.round((12 / Math.max(1, this.params.wpm)) * 60));
    const events: (typeof word.events)[number][] = [];
    let shift = 0;
    let position = from;
    let errors = word.errors;
    for (const event of word.events) {
      if (event.kind === "key" && event.correct && (hidden & (1 << position)) !== 0 && this.memory.chance(this.recall)) {
        const wrong = String.fromCharCode(97 + ((event.key.charCodeAt(0) - 97 + 1 + this.memory.int(0, 23)) % 26));
        events.push({ at: event.at + shift, kind: "key", key: wrong, correct: false });
        shift += key;
        errors += 1;
      }
      events.push({ ...event, at: event.at + shift });
      if (event.kind === "key" && event.correct) position += 1;
    }
    return { ...word, events, errors, ticks: word.ticks + shift };
  }

  /** Presses this tick's keys (call before the session steps). */
  act(w: World): void {
    if (w.phase !== "play" || !(this.params.wpm > 0)) return;
    const tick = w.tick;
    const T = w.typing;
    if (this.backsLeft > 0) {
      if (tick >= this.nextBackAt) {
        this.backspace();
        this.backsLeft -= 1;
        this.nextBackAt = tick + this.backTicks;
      }
      return;
    }
    if (this.plan !== null && this.plan.player.done) {
      // Finished: the slot shows a new word. Otherwise a wrong first key locked
      // the other bay (or the word is stuck): let go and look again.
      if (T.word[this.plan.slot] === this.plan.index && T.lock >= 0) {
        this.backsLeft = T.typed[T.lock]!;
        this.nextBackAt = tick;
      }
      this.plan = null;
      return;
    }
    if (this.plan === null) {
      if (tick < this.waitUntil) return;
      const options = this.options(w);
      if (T.lock < 0 && options.every((option) => option.danger < 0)) {
        this.waitUntil = tick + LOOK_AGAIN;
        return;
      }
      const slot = T.lock >= 0 ? T.lock : this.typist.choose(options);
      const index = T.word[slot]!;
      const from = T.lock === slot ? T.typed[slot]! : 0;
      const text = w.deck[index]!.slice(from);
      const familiarity = LEARN_RULES[w.stage.learn].familiarity;
      const word = this.recallWord(w, slot, this.typist.word(text, { familiarity, live: T.word.length, minute: tick / 3600 }), from);
      this.plan = { slot, index, player: new KeyPlayer(word, tick) };
    }
    for (const event of this.plan.player.due(tick)) {
      if (event.kind === "key") this.press(event.key);
      else if (event.kind === "abandon") {
        this.backsLeft = T.lock >= 0 ? T.typed[T.lock]! : 0;
        this.nextBackAt = tick + this.backTicks;
        this.plan = null;
        return;
      }
      // "backspace" (only with a custom chance above 0): nothing to erase in this game.
    }
  }
}

/**
 * A standard bot's parameters for this game: nothing to erase after a wrong
 * key (it never enters the word), so the typist goes straight on with the
 * right key; a dropped lock is still Backspace to zero.
 */
export function survivalParams(bot: BotId, overrides: Partial<TypistParams> = {}): TypistParams {
  return botParams(bot, { backspace: 0, ...overrides });
}

/** The standard bot `id` (or full parameters) on a fresh session; `recall` its misremembering (default by bot id, the standard bot's). */
export function typistBot(options: WorldOptions, bot: BotId | TypistParams, seed: number, id?: string): { session: Session; bot: TypistBot } {
  const session = new Session(options);
  const params = typeof bot === "string" ? survivalParams(bot) : bot;
  const typist = new TypistBot(session, params, seed);
  typist.recall = RECALL[id ?? (typeof bot === "string" ? bot : "standard")] ?? RECALL.standard!;
  return { session, bot: typist };
}

/** Plays the stage to its end (or `maxTicks`): bot keys, then a step, each tick. */
export function playOut(session: Session, bot: TypistBot, maxTicks = 60 * 400, each?: (w: World) => void): World {
  const w = session.world;
  while (w.phase === "play" && w.tick < maxTicks) {
    bot.act(w);
    session.tick();
    each?.(w);
  }
  // One more step records the end in the meter (and nothing else changes).
  return w;
}

/** Levels 1–3 of the shared vocabulary, as the page builds its deck. */
export function sharedDeck(): string[] {
  const level = (n: number) => JSON.parse(readFileSync(new URL("../../public/vocabulary/levels/" + String(n).padStart(3, "0") + ".json", import.meta.url), "utf8")).entries as { en: string }[];
  return buildDeck([level(1), level(2), level(3)]);
}
