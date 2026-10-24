/**
 * The in-run balance (docs/games/BALANCE.md §3, §4.2, §5): the near zone's
 * pressure on the line, a FlowMeter fed from the world every FLOW_EVERY
 * ticks, and the PaceDirector judging it every 5 s against the mode's band,
 * its decisions mapped through this game's step table (content/balance.ts):
 *   spawn   the spawn interval of what comes next, ±7 % a step;
 *   elite   one Bọc Thép affix on the next plain pack (or off the next armoured one);
 *   peak    the coming surge 3 s earlier or later;
 *   lull    the coming lull 3 s shorter or longer;
 *   support a repair pod near defeat, once a wave.
 * It never touches a live foe's hit points, the typing or a word's scoring.
 * Meter and director keep integer state that goes into the world hash; every
 * step is a `pace` event in the director's log and the event ring.
 */
import { FlowMeter, PaceDirector, type FlowSnapshot, type PaceDecision, type PaceLever } from "../kit/balance";
import { FLOW_EVERY, WARMUP_TICKS, bandOf, type RunHeader } from "../content/balance";
import { FOES, KIND, PACK } from "../content/foes";
import { GUN, GUN_SPECS, XUNG } from "../content/guns";
import { DRAIN, ELITE, FIELD, NEAR, PATH, SUPPORT } from "../content/rules";
import { stageSeconds, type Stage } from "../content/stage-rules";
import { stageFoes } from "../content/stage-s0";
import { EV } from "./events";
import { movePeak, moveLull, waveAt } from "./plan";
import { xungRounds } from "./weapons";
import type { World } from "./world";

/** The kit's magazine near the line: the mean of its guns' (the unit of "words owed"); Xung's as the stage loads it. */
export function kitMagazine(guns: readonly number[], stage: { readonly chapter: number }): number {
  let sum = 0;
  for (const gun of guns) sum += gun === GUN.xung ? xungRounds(stage) * XUNG.damage : GUN_SPECS[gun]!.nominal;
  return guns.length > 0 ? sum / guns.length : GUN_SPECS[0]!.nominal;
}

const KILL_BUFFER = 1024;
const ELITE_QUEUE = 16;
export const LEVER_INDEX: Readonly<Record<PaceLever, number>> = { spawn: 0, elite: 1, peak: 2, lull: 3, support: 4 };
/**
 * The stage's W: foes it spawns at the run's rate × their mean hit points
 * (plain packs: mines and the stage's scouts; special packs by their share).
 */
export function stageWork(stage: Stage, scaleRate: number): number {
  const scouts = stage.scouts.share;
  const plain = FOES[KIND.mine]!.hp * (1 - scouts) + FOES[KIND.scout]!.hp * scouts;
  let special = 0;
  let share = 0;
  const brute = stage.packs.brute;
  if (brute !== undefined) {
    share += brute.share;
    special += (brute.share * (FOES[KIND.brute]!.hp + PACK.brute.follow * FOES[KIND.mine]!.hp)) / (1 + PACK.brute.follow);
  }
  const shield = stage.packs.shield;
  if (shield !== undefined) {
    share += shield.share;
    special += (shield.share * (FOES[KIND.shield]!.hp + FOES[KIND.shield]!.shield + PACK.shield.follow * FOES[KIND.mine]!.hp)) / (1 + PACK.shield.follow);
  }
  const splitter = stage.packs.splitter;
  if (splitter !== undefined) {
    share += splitter.share;
    special += splitter.share * (FOES[KIND.splitter]!.hp + 3 * FOES[KIND.shard]!.hp);
  }
  const mean = share > 0 ? plain * (1 - share) + special : plain;
  return stageFoes(stage, stageSeconds(stage)) * scaleRate * mean;
}

export function createPace(header: RunHeader, scaleRate: number, stage: Stage) {
  return {
    /** The wave the director was last told about. */
    wave: 0,
    /** Spawn interval scale from the director, ‰ of the stage's (1000: as tuned). */
    spawnScale: 1000,
    /** Elite steps waiting for a pack: ids and directions, in order (a ring). */
    eliteId: new Int32Array(ELITE_QUEUE),
    eliteDir: new Int8Array(ELITE_QUEUE),
    eliteHead: 0,
    eliteCount: 0,
    /** The stage's W (foe hit points it spawns, ≈), for the elite steps' real cost. */
    work: stageWork(stage, scaleRate),
    /** What happened since the last feed. */
    kills: new Float64Array(KILL_BUFFER),
    killCount: 0,
    damage: 0,
    drops: 0,
    fedTick: 0,
    /** The near zone now: foes' drain weight, their hit points, scout shots inside it. */
    nearWeight: 0,
    nearHp: 0,
    nearShots: 0,
    /** Drain owed and not yet taken off (below one point). */
    drainOwed: 0,
    director: header.director ? 1 : 0,
  };
}

export type Pace = ReturnType<typeof createPace>;

export function createMeter(): FlowMeter {
  return new FlowMeter();
}

export function createDirector(header: RunHeader, stage: Stage): PaceDirector {
  return new PaceDirector({ band: bandOf(header.mode), table: stage.pace, off: header.director ? null : "setting" });
}

/** A kill's path fraction (from the gate to the bottom line) for Q. */
export function noteKill(w: World, z: number): void {
  const P = w.pace;
  const t = (PATH.from - z) / (PATH.from - FIELD.bottomZ);
  if (P.killCount < KILL_BUFFER) P.kills[P.killCount++] = t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * The near zone: who is in it, and the armour it leaches (DRAIN). Whole
 * points come off as they add up, each an EV.drain at the foe nearest the line.
 */
export function pressure(w: World, dt: number): void {
  const F = w.foes;
  const P = w.pace;
  let weight = 0;
  let hp = 0;
  let nearest = -1;
  let leech = 0;
  const from = w.stage.drainFrom ?? DRAIN.from;
  const span = from - FIELD.bottomZ;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const z = F.z[s]!;
    if (z >= from) continue;
    if (F.reached[s]! < 0) F.reached[s] = w.time;
    const drain = FOES[F.kind[s]!]!.drain;
    leech += (drain * (from - z)) / span;
    if (nearest < 0 || z < F.z[nearest]!) nearest = s;
    if (z > NEAR.z) continue;
    weight += drain;
    hp += F.hp[s]!;
  }
  let shots = 0;
  for (let s = 0; s < w.shots.top; s += 1) if (w.shots.alive[s] === 1 && w.shots.z[s]! <= NEAR.z) shots += 1;
  P.nearWeight = weight;
  P.nearHp = hp;
  P.nearShots = shots;
  if (leech === 0 || w.phase !== "play" || w.objective.retreat >= 0) return;
  P.drainOwed += DRAIN.perFoe * (w.stage.drainRate ?? 1) * Math.min(leech, DRAIN.maxLeech) * w.scales.drain * dt;
  while (P.drainOwed >= 1 && w.hp > 0) {
    P.drainOwed -= 1;
    w.hp = Math.max(0, w.hp - 1);
    w.stats.drained += 1;
    w.stats.damageTaken += 1;
    w.events.push(w.tick, EV.drain, nearest, F.id[nearest]!, F.x[nearest]!, F.z[nearest]!, 0, -1, 1, 0);
  }
}

const snapshot: { -readonly [K in keyof FlowSnapshot]: FlowSnapshot[K] } & { kills: number[]; damage: { typed: number; other: number } } = {
  danger: false, hp: 1, live: 2, capped: false, backlog: 0, busy: false, kills: [], abandons: 0, damage: { typed: 0, other: 0 },
};

/**
 * The FlowMeter's snapshot of the world (BALANCE.md §3 for this game):
 * danger: a foe or a scout shot in the near zone (losing armour counts by
 * itself); live words: the bays whose gun can still take a magazine (a full
 * gun's word does nothing, so with every gun full and no word under way
 * there is nothing to do: idle); the bays never pile words up (never capped);
 * backlog: words owed at the line, the near zone's hit points in magazines
 * of the kit (the mean of its guns' near-line damage; S0's Xung and Tia
 * both count S0's Xung magazine); busy: a word under way; the kills' path
 * fractions, the locks dropped and the damage done since the last feed (all
 * of it typed: the guns fire only what words load).
 */
export function flowSnapshot(w: World): FlowSnapshot {
  const P = w.pace;
  const G = w.guns;
  snapshot.danger = P.nearWeight > 0 || P.nearShots > 0;
  snapshot.hp = w.hp / w.armourMax;
  let live = 0;
  for (let b = 0; b < G.mags.length; b += 1) if (G.gun[b]! >= 0 && G.mags[b]! < G.cap[b]!) live += 1;
  snapshot.live = live;
  snapshot.capped = false;
  snapshot.backlog = Math.floor(P.nearHp / w.magazine);
  snapshot.busy = w.typing.lock >= 0;
  snapshot.kills.length = 0;
  for (let k = 0; k < P.killCount; k += 1) snapshot.kills.push(P.kills[k]!);
  snapshot.abandons = P.drops;
  snapshot.damage.typed = P.damage;
  snapshot.damage.other = 0;
  return snapshot;
}

/** After each step: tells the director of a new wave, feeds the meter every FLOW_EVERY ticks (and at the end), and acts on a decision. */
export function paceStep(w: World): void {
  const P = w.pace;
  const wave = waveAt(w);
  if (wave !== P.wave) {
    P.wave = wave;
    w.director.beginWave(wave);
  }
  const ticks = w.tick + 1 - P.fedTick;
  if (ticks < FLOW_EVERY && w.phase === "play") return;
  if (ticks <= 0) return;
  w.meter.feed(flowSnapshot(w), ticks);
  if (P.fedTick < WARMUP_TICKS && w.tick + 1 >= WARMUP_TICKS) w.meter.resetWindow();
  P.fedTick = w.tick + 1;
  P.killCount = 0;
  P.damage = 0;
  P.drops = 0;
  if (w.phase !== "play") return;
  const decision = w.director.step(w.meter);
  if (decision !== null) applyPace(w, decision);
}

/** A decision through this game's step table (exported for the tests). */
export function applyPace(w: World, decision: PaceDecision): void {
  const P = w.pace;
  let applied = decision.amount;
  switch (decision.lever) {
    case "spawn":
      P.spawnScale = decision.spawnScale;
      break;
    case "elite": {
      const at = (P.eliteHead + P.eliteCount) % ELITE_QUEUE;
      if (P.eliteCount < ELITE_QUEUE) {
        P.eliteId[at] = decision.id;
        P.eliteDir[at] = decision.dir;
        P.eliteCount += 1;
      }
      break;
    }
    case "peak":
      applied = Math.round(movePeak(w, decision.amount) * 60);
      break;
    case "lull":
      applied = Math.round(moveLull(w, decision.amount) * 60);
      break;
    case "support":
      applied = Math.min(SUPPORT.hp, w.armourMax - w.hp);
      w.hp += applied;
      w.stats.supports += 1;
      w.events.push(w.tick, EV.support, -1, decision.id, 0, FIELD.muzzleZ, 0, 0, applied, 0);
      break;
  }
  w.events.push(w.tick, EV.pace, LEVER_INDEX[decision.lever], decision.id, decision.dir, decision.tension, decision.level, decision.spawnScale, applied, 0);
}

/**
 * A new plain pack's affix: every ELITE.every-th from ELITE.from s carries Bọc Thép;
 * the first waiting elite step adds it to a plain pack (+1) or takes it off
 * an armoured one (−1), and the director hears its real cost (‰ of W).
 */
export function packArmour(w: World, n: number): boolean {
  const P = w.pace;
  w.spawn.packs += 1;
  let armoured = w.time >= ELITE.from && w.spawn.packs % ELITE.every === 0;
  if (P.eliteCount > 0) {
    const dir = P.eliteDir[P.eliteHead]!;
    if ((dir > 0 && !armoured) || (dir < 0 && armoured)) {
      armoured = dir > 0;
      const cost = Math.round((dir * n * FOES[KIND.mine]!.hp * (ELITE.hp - 1) * 1000) / Math.max(1, P.work));
      w.director.report(P.eliteId[P.eliteHead]!, cost);
      P.eliteHead = (P.eliteHead + 1) % ELITE_QUEUE;
      P.eliteCount -= 1;
    }
  }
  return armoured;
}
