/**
 * Human-like bots for Tuyến Cuối (docs/games/BALANCE.md §6): the kit's
 * HumanTypist plans each word (recognition latency, log-normal speed with
 * spread CV, wrong keys at 1 − a, dropped locks), and the bot presses its
 * keys through the page's real input path: keydown events into installKeys
 * (src/app/input.ts), which sends commands to a Session, which logs them and
 * steps the world (a run is a replayable command log, as in the browser).
 *
 * Choices this game asks of a typist:
 *   which bay to type: the typist's target mix over the two slots (danger:
 *   the magazine the moment needs: Xung for foes pressing on the line and
 *   scout shots, Tia for the crowd in its reach; nearest: the gun
 *   with fewer magazines; first: the word seen first, the left bay, in
 *   reading order). A full gun's word loads nothing: a typist reading left
 *   first types it anyway. With both guns full the bot waits (idle).
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
import { FIELD, MAG_MAX, NEAR, TIA, XUNG } from "../../src/content/rules";
import type { World, WorldOptions } from "../../src/sim/world";

type Keydown = (event: object) => void;
/** For the danger pick: foes within Xung's range, within Tia's reach, and pressing on the line. */
const XUNG_Z = FIELD.muzzleZ + XUNG.range;
const REACH_Z = FIELD.muzzleZ + TIA.length + 1;
const CLOSE_Z = NEAR.z + 2;
/** How familiar the bots find the stage's words (content/balance.ts PACE_D matches). */
const FAMILIARITY = "known";
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

  constructor(readonly session: Session, readonly params: TypistParams, seed: number) {
    this.typist = new HumanTypist(params, new RngStream(seed));
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
   * The two bays as target options (index = slot). danger: how much the gun's
   * magazine is wanted now, times the magazines it lacks (a full gun: −1).
   * Xung guards the line (foes close in, scout shots flying); Tia is worth
   * most into a crowd within its ray's reach. nearest: fewest magazines.
   * first: the older word.
   */
  private options(w: World): TargetOption[] {
    let xung = 0;
    let tia = 0;
    let close = 0;
    let shots = 0;
    for (let s = 0; s < w.foes.top; s += 1) {
      if (w.foes.alive[s] === 0) continue;
      const z = w.foes.z[s]!;
      if (z <= XUNG_Z) xung += 1;
      if (z <= REACH_Z) tia += 1;
      if (z <= CLOSE_Z) close += 1;
    }
    for (let s = 0; s < w.shots.top; s += 1) if (w.shots.alive[s] === 1) shots += 1;
    const need = [1 + 2 * close + 2 * shots + xung / 2, 1 + tia / 2];
    // Reading order: the left bay (Xung) is the word seen first.
    return [0, 1].map((slot) => {
      const mags = w.guns.mags[slot]!;
      const danger = mags >= MAG_MAX ? -1 : need[slot]! * (MAG_MAX - mags);
      return { danger, distance: mags, shown: slot };
    });
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
      const text = w.deck[index]!.slice(T.lock === slot ? T.typed[slot]! : 0);
      const word = this.typist.word(text, { familiarity: FAMILIARITY, live: 2, minute: tick / 3600 });
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

/** The standard bot `id` (or full parameters) on a fresh session. */
export function typistBot(options: WorldOptions, bot: BotId | TypistParams, seed: number): { session: Session; bot: TypistBot } {
  const session = new Session(options);
  const params = typeof bot === "string" ? survivalParams(bot) : bot;
  return { session, bot: new TypistBot(session, params, seed) };
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
  const level = (n: number) => JSON.parse(readFileSync(new URL("../../../../shared/vocabulary/levels/" + String(n).padStart(3, "0") + ".json", import.meta.url), "utf8")).entries as { en: string }[];
  return buildDeck([level(1), level(2), level(3)]);
}
