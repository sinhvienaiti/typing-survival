/**
 * Steady grouped spawns (docs/BUILD_S0.md §4): the stage's rate
 * accrues foes owed; once a whole group (4–12, drawn ahead) is owed it walks
 * in above the gate as a block, wedge or line, scouts in its back rows. A
 * group that would pass the tier's crowd cap waits at the gate: never lost.
 */
import { FIELD, FOES, KIND, SCOUT, SPAWN } from "../content/rules";
import { spanAt } from "../content/stage-s0";
import { EV } from "./events";
import type { World } from "./world";

const SHAPES = 3;

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

function spawnGroup(w: World, n: number, shape: number): void {
  const rng = w.rng.spawn;
  let half = 0;
  for (let i = 0; i < n; i += 1) {
    slotOf(shape, i, n, place);
    half = Math.max(half, Math.abs(place[0]!) * SPAWN.spacing);
  }
  const room = FIELD.halfW - FIELD.wall - 1 - half;
  const cx = room > 0 ? (rng.float() * 2 - 1) * room : 0;
  const scouts = w.time >= SPAWN.scoutFromS ? Math.floor(n * SPAWN.scoutShare + rng.float()) : 0;
  for (let i = 0; i < n; i += 1) {
    slotOf(shape, i, n, place);
    const kind = i >= n - scouts ? KIND.scout : KIND.mine;
    const s = w.foes.add(kind, cx + place[0]! * SPAWN.spacing, FIELD.gateZ + 1 + place[1]! * SPAWN.spacing, FOES[kind].hp, rng.float());
    if (s < 0) break;
    if (kind === KIND.scout) {
      w.foes.holdZ[s] = SCOUT.holdMin + rng.float() * (SCOUT.holdMax - SCOUT.holdMin);
      w.foes.timer[s] = SCOUT.fireEvery * (0.3 + 0.4 * rng.float());
      w.foes.wait[s] = SCOUT.holdS;
    }
  }
  w.spawn.spawned += n;
  w.events.push(w.tick, EV.spawn, shape, n, cx, FIELD.gateZ, 0, 0, scouts, 0);
}

export function spawnStep(w: World, dt: number): void {
  if (w.spawn.size === 0) drawGroup(w);
  if (w.time < w.seconds) w.spawn.owed += spanAt(w.time).rate * dt;
  while (w.spawn.owed >= w.spawn.size) {
    if (w.foes.count + w.spawn.size > w.foeCap) {
      w.spawn.waiting = w.spawn.size;
      return;
    }
    w.spawn.owed -= w.spawn.size;
    spawnGroup(w, w.spawn.size, w.spawn.shape);
    drawGroup(w);
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
    w.foes.add(KIND.mine, x, z, FOES[KIND.mine].hp, rng.float());
  }
  w.spawn.spawned += count;
}
