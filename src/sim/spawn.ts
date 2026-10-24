/**
 * Steady grouped spawns (docs/BUILD_S0.md §4, docs/BUILD_S1.md §8): the
 * stage's rate (sim/plan.ts: calm, surge or lull, times the mode, pace k
 * and ρ, over the director's spawn interval scale) accrues foes owed; once a
 * whole group (4–12, drawn ahead) is owed it walks in above the gate as a
 * block, wedge or line, scouts in its back rows, the Bọc Thép affix on some
 * plain packs (sim/pace.ts). Special packs (a Trâu or a Khiên leading mines,
 * a group of Tách) take their share of the foes from their `from` time,
 * dealt evenly with no draw: a pack's credit grows with every foe spawned
 * and the pack comes once it covers its size (the first one at `from`).
 * Đầu Đàn walk in at the hunt's times with their escort. A group that would
 * pass the tier's crowd cap waits at the gate: never lost.
 */
import { FOES, KIND, PACK, SHIELD } from "../content/foes";
import { ELITE, FIELD, SCOUT, SPAWN } from "../content/rules";
import type { SpecialPack } from "../content/stage-rules";
import { EV, FLAG, TELEGRAPH } from "./events";
import { packArmour } from "./pace";
import { rateAt } from "./plan";
import type { World } from "./world";

const SHAPES = 3;
/** Special pack kinds, in the order they are checked. */
export const SPECIALS: readonly SpecialPack[] = ["brute", "shield", "splitter"];
const SPECIAL_SIZE: Readonly<Record<SpecialPack, number>> = { brute: 1 + PACK.brute.follow, shield: 1 + PACK.shield.follow, splitter: PACK.splitter.size };

export function createSpawn() {
  return { owed: 0, size: 0, shape: 0, spawned: 0, waiting: 0, packs: 0, credit: new Float64Array(SPECIALS.length), open: new Uint8Array(SPECIALS.length) };
}

function drawGroup(w: World): void {
  w.spawn.size = w.rng.spawn.int(SPAWN.groupMin, SPAWN.groupMax);
  w.spawn.shape = w.rng.spawn.int(0, SHAPES - 1);
}

/** Offsets (across, back) of member i of n in a shape, in spacings; row 0 is the front. */
function slotOf(shape: number, i: number, n: number, out: Float64Array): void {
  if (shape === 0) {
    const cols = Math.min(n, Math.ceil(Math.sqrt(n) * 1.3));
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    out[0] = (i % cols) - (inRow - 1) / 2;
    out[1] = row;
  } else if (shape === 1) {
    // A wedge pointing at the ship: row r holds r + 1.
    let row = 0;
    while (((row + 1) * (row + 2)) / 2 <= i) row += 1;
    const k = i - (row * (row + 1)) / 2;
    out[0] = k - row / 2;
    out[1] = row * 0.85;
  } else {
    const perRow = n > 8 ? Math.ceil(n / 2) : n;
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    out[0] = ((i % perRow) - (inRow - 1) / 2) * 1.25;
    out[1] = row * 1.2;
  }
}

const place = new Float64Array(2);

/** Half the width of a shape of n (m). */
function halfWidth(shape: number, n: number): number {
  let half = 0;
  for (let i = 0; i < n; i += 1) {
    slotOf(shape, i, n, place);
    half = Math.max(half, Math.abs(place[0]!) * SPAWN.spacing);
  }
  return half;
}

function spawnGroup(w: World, n: number, shape: number, front: number = FIELD.gateZ + 1): void {
  const rng = w.rng.spawn;
  const half = halfWidth(shape, n);
  const room = FIELD.halfW - FIELD.wall - 1 - half;
  const cx = room > 0 ? (rng.float() * 2 - 1) * room : 0;
  const scouts = w.time >= w.stage.scouts.from ? Math.floor(n * w.stage.scouts.share + rng.float()) : 0;
  const elite = packArmour(w, n) ? 1 : 0;
  const hpScale = elite === 1 ? ELITE.hp : 1;
  for (let i = 0; i < n; i += 1) {
    slotOf(shape, i, n, place);
    const kind = i >= n - scouts ? KIND.scout : KIND.mine;
    const s = w.foes.add(kind, cx + place[0]! * SPAWN.spacing, front + place[1]! * SPAWN.spacing, FOES[kind]!.hp * hpScale, rng.float(), elite, w.time);
    if (s < 0) break;
    if (kind === KIND.scout) {
      w.foes.holdZ[s] = SCOUT.holdMin + rng.float() * (SCOUT.holdMax - SCOUT.holdMin);
      w.foes.timer[s] = SCOUT.fireEvery * (0.3 + 0.4 * rng.float());
      w.foes.wait[s] = SCOUT.holdS;
    }
  }
  w.spawn.spawned += n;
  w.events.push(w.tick, EV.spawn, shape, n, cx, front - 1, 0, 0, scouts, elite === 1 ? FLAG.elite : 0);
}

/** A foe of `kind` at (x, z), its shield with it (Khiên). */
function spawnOne(w: World, kind: number, x: number, z: number, hpScale = 1, elite = 0): number {
  const s = w.foes.add(kind, x, z, FOES[kind]!.hp * hpScale, w.rng.spawn.float(), elite, w.time);
  if (s < 0) return -1;
  const shield = FOES[kind]!.shield;
  if (shield > 0) {
    const k = w.shields.add(s, w.foes.id[s]!, x, z - SHIELD.ahead, shield);
    w.foes.shield[s] = k;
  }
  return s;
}

/**
 * A special pack: a Trâu (block of 5 mines behind it) or a Khiên (a wedge of
 * 6 behind its shield) in front, or a group of Tách (plain: it may carry
 * Bọc Thép).
 */
function spawnSpecial(w: World, type: number): number {
  const rng = w.rng.spawn;
  const front = FIELD.gateZ + 1;
  const name = SPECIALS[type]!;
  if (name === "splitter") {
    const n = PACK.splitter.size;
    const half = halfWidth(0, n);
    const room = FIELD.halfW - FIELD.wall - 1 - half;
    const cx = room > 0 ? (rng.float() * 2 - 1) * room : 0;
    const elite = packArmour(w, n) ? 1 : 0;
    for (let i = 0; i < n; i += 1) {
      slotOf(0, i, n, place);
      spawnOne(w, KIND.splitter, cx + place[0]! * SPAWN.spacing * 1.1, front + place[1]! * SPAWN.spacing * 1.1, elite === 1 ? ELITE.hp : 1, elite);
    }
    w.spawn.spawned += n;
    w.events.push(w.tick, EV.spawn, 0, n, cx, front - 1, KIND.splitter, 0, 0, elite === 1 ? FLAG.elite : 0);
    return n;
  }
  const pack = name === "brute" ? PACK.brute : PACK.shield;
  const n = 1 + pack.follow;
  const half = Math.max(FOES[pack.lead]!.radius, halfWidth(pack.shape, pack.follow));
  const room = FIELD.halfW - FIELD.wall - 1 - half;
  const cx = room > 0 ? (rng.float() * 2 - 1) * room : 0;
  spawnOne(w, pack.lead, cx, front);
  const back = front + FOES[pack.lead]!.radius + 1.2;
  for (let i = 0; i < pack.follow; i += 1) {
    slotOf(pack.shape, i, pack.follow, place);
    spawnOne(w, KIND.mine, cx + place[0]! * SPAWN.spacing, back + place[1]! * SPAWN.spacing);
  }
  w.spawn.spawned += n;
  w.events.push(w.tick, EV.spawn, pack.shape, n, cx, front - 1, pack.lead, 0, 0, 0);
  return n;
}

/**
 * A Đầu Đàn and its escort walk in: 8 mines ahead (× the mode and k, 4–12),
 * the leader behind them with its hit points × the mode and k (R1 review:
 * a child in Thư giãn met the full leader), its horn a telegraph.
 */
function spawnLeader(w: World): void {
  const rng = w.rng.spawn;
  const front = FIELD.gateZ + 1;
  const n = Math.max(SPAWN.groupMin, Math.min(SPAWN.groupMax, Math.round(PACK.leader.escort * w.scales.rate)));
  const half = halfWidth(2, n);
  const room = FIELD.halfW - FIELD.wall - 1.5 - half;
  const cx = room > 0 ? (rng.float() * 2 - 1) * room : 0;
  for (let i = 0; i < n; i += 1) {
    slotOf(2, i, n, place);
    spawnOne(w, KIND.mine, cx + place[0]! * SPAWN.spacing, front + place[1]! * SPAWN.spacing);
  }
  const z = front + 2 * SPAWN.spacing + FOES[KIND.leader]!.radius + 0.6;
  const s = spawnOne(w, KIND.leader, cx, z, w.scales.rate);
  w.spawn.spawned += n + 1;
  w.events.push(w.tick, EV.telegraph, TELEGRAPH.horn, s, cx, z, 0, 0, 2, 0);
  w.events.push(w.tick, EV.leader, s, s >= 0 ? w.foes.id[s]! : 0, cx, z, 0, 0, w.objective.next, 0);
}

/** The stage's vanguard, before the first step's spawns (sizes × the mode and k, 4–12). */
function vanguard(w: World): void {
  for (const pack of w.stage.vanguard) {
    const n = Math.max(SPAWN.groupMin, Math.min(SPAWN.groupMax, Math.round(pack.n * w.scales.rate)));
    const shape = w.rng.spawn.int(0, SHAPES - 1);
    if (w.foes.count + n <= w.foeCap) spawnGroup(w, n, shape, pack.z);
  }
}

/** Special packs open at their `from` time with credit for one pack: the first comes at once. */
function openPacks(w: World): void {
  const S = w.spawn;
  for (let t = 0; t < SPECIALS.length; t += 1) {
    const share = w.stage.packs[SPECIALS[t]!];
    if (share === undefined || S.open[t] === 1 || w.time < share.from) continue;
    S.open[t] = 1;
    S.credit[t] = S.credit[t]! + SPECIAL_SIZE[SPECIALS[t]!];
  }
}

/** The special pack whose credit covers it (−1: a plain group). */
function dueSpecial(w: World): number {
  const S = w.spawn;
  for (let t = 0; t < SPECIALS.length; t += 1) if (S.open[t] === 1 && S.credit[t]! >= SPECIAL_SIZE[SPECIALS[t]!]) return t;
  return -1;
}

function credit(w: World, n: number): void {
  const S = w.spawn;
  for (let t = 0; t < SPECIALS.length; t += 1) if (S.open[t] === 1) S.credit[t] = S.credit[t]! + w.stage.packs[SPECIALS[t]!]!.share * n;
}

export function spawnStep(w: World, dt: number): void {
  if (w.tick === 0 && w.spawn.packs === 0) vanguard(w);
  if (w.objective.retreat >= 0) return;
  if (w.stage.objective.kind === "hunt") {
    const times = w.stage.objective.leaders;
    while (w.objective.next < times.length && w.time >= times[w.objective.next]!) {
      spawnLeader(w);
      w.objective.next += 1;
    }
  }
  openPacks(w);
  if (w.spawn.size === 0) drawGroup(w);
  if (w.time < w.seconds) w.spawn.owed += ((rateAt(w) * 1000) / w.pace.spawnScale) * dt;
  for (;;) {
    const special = dueSpecial(w);
    const size = special >= 0 ? SPECIAL_SIZE[SPECIALS[special]!] : w.spawn.size;
    if (w.spawn.owed < size) break;
    if (w.foes.count + size > w.foeCap) {
      w.spawn.waiting = size;
      return;
    }
    w.spawn.owed -= size;
    if (special >= 0) {
      w.spawn.credit[special] = w.spawn.credit[special]! - size;
      spawnSpecial(w, special);
    } else {
      spawnGroup(w, w.spawn.size, w.spawn.shape);
      drawGroup(w);
    }
    credit(w, size);
  }
  w.spawn.waiting = 0;
}

/** The load test (__survival.flood): n mines over the field's far two thirds, under the cap. */
export function flood(w: World, n: number): void {
  const rng = w.rng.spawn;
  const count = Math.max(0, Math.min(n, w.foeCap - w.foes.count));
  const near = FIELD.gateZ / 3;
  for (let i = 0; i < count; i += 1) {
    const x = (rng.float() * 2 - 1) * (FIELD.halfW - FIELD.wall - 0.5);
    const z = near + rng.float() * (FIELD.gateZ - near);
    w.foes.add(KIND.mine, x, z, FOES[KIND.mine]!.hp, rng.float(), 0, w.time);
  }
  w.spawn.spawned += count;
}

/** A test and scenario handle: one foe of `kind` at (x, z) (its shield with it). */
export function placeFoe(w: World, kind: number, x: number, z: number): number {
  const s = spawnOne(w, kind, x, z);
  if (s >= 0) w.spawn.spawned += 1;
  return s;
}
