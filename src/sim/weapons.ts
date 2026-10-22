/**
 * The two guns (docs/survival/BUILD_S0.md §5): a finished word loads one
 * magazine (two at most, the firing one included) with the word's quality,
 * and the gun empties it by itself. Xung streams rounds at the foe nearest
 * the bottom in a 50° cone round its aim (a scout shot near the ship first);
 * Tia burns a 1.4 m wide ray from the muzzle into the densest cluster,
 * sweeping toward the next; with nothing in its reach it goes out and keeps
 * the rest of its time.
 */
import { CRIT_MULT, FIELD, MAG_MAX, QUALITY, SCOUT, TIA, WEAPON, XUNG } from "../content/rules";
import { EV, FLAG } from "./events";
import { MAX_RADIUS, colOf, rowOf } from "./hits";
import { RADIUS } from "./move";
import { damageFoe, shootDown } from "./projectiles";
import type { World } from "./world";

export function createGuns() {
  return {
    /** Magazines held per gun (0 … 2), the firing one included. */
    mags: new Int32Array(2),
    /** Per gun × [firing, queued]: damage and fire-rate multipliers, crit chance, perfect (1). */
    damage: new Float64Array(4),
    rate: new Float64Array(4),
    crit: new Float64Array(4),
    perfect: new Uint8Array(4),
    rounds: 0,
    cooldown: 0,
    aimX: 0,
    aimZ: 1,
    beamOn: 0,
    beamLeft: 0,
    beamX: 0,
    beamTo: 0,
    beamPulse: 0,
  };
}

export type Guns = ReturnType<typeof createGuns>;

/** A finished word loads gun `gun`; false when it already holds two. */
export function loadMagazine(w: World, gun: number, clean: boolean, fast: boolean): boolean {
  const G = w.guns;
  const k = G.mags[gun]!;
  if (k >= MAG_MAX) return false;
  const i = gun * 2 + k;
  G.damage[i] = clean ? QUALITY.cleanDamage : 1;
  G.crit[i] = (gun === WEAPON.xung ? XUNG.crit : TIA.crit) + (clean ? QUALITY.cleanCrit : 0);
  G.rate[i] = fast ? QUALITY.fastRate : 1;
  G.perfect[i] = clean && fast ? 1 : 0;
  G.mags[gun] = k + 1;
  if (k === 0) {
    if (gun === WEAPON.xung) G.rounds = XUNG.rounds;
    else G.beamLeft = TIA.seconds;
  }
  return true;
}

/** The firing magazine is spent: the queued one moves up. */
function nextMagazine(G: Guns, gun: number): boolean {
  const i = gun * 2;
  G.damage[i] = G.damage[i + 1]!;
  G.rate[i] = G.rate[i + 1]!;
  G.crit[i] = G.crit[i + 1]!;
  G.perfect[i] = G.perfect[i + 1]!;
  G.mags[gun] = G.mags[gun]! - 1;
  return G.mags[gun]! > 0;
}

export function fireGuns(w: World, dt: number): void {
  const G = w.guns;
  if (G.mags[WEAPON.xung]! > 0) fireXung(w, dt);
  if (G.mags[WEAPON.tia]! > 0) fireTia(w, dt);
}

function fireXung(w: World, dt: number): void {
  const G = w.guns;
  G.cooldown -= dt;
  while (G.cooldown <= 0 && G.rounds > 0) {
    if (!shootXung(w)) {
      G.cooldown = 0;
      return;
    }
    G.rounds -= 1;
    G.cooldown += XUNG.seconds / XUNG.rounds / G.rate[0]!;
    if (G.rounds === 0 && nextMagazine(G, WEAPON.xung)) G.rounds = XUNG.rounds;
  }
  if (G.mags[WEAPON.xung] === 0) G.cooldown = 0;
}

/** One round at the best target; false when there is none (the gun holds its fire). */
function shootXung(w: World): boolean {
  const F = w.foes;
  const S = w.shots;
  const G = w.guns;
  const mz = FIELD.muzzleZ;
  let target = -1;
  let tx = 0;
  let tz = 0;
  let vx = 0;
  let vz = 0;
  // A scout shot close to the ship comes first.
  let lowest = mz + XUNG.shotGuard;
  for (let s = 0; s < S.top; s += 1) {
    if (S.alive[s] === 0 || S.marked[s] === 1 || S.z[s]! >= lowest) continue;
    lowest = S.z[s]!;
    target = -2 - s;
  }
  if (target <= -2) {
    const s = -2 - target;
    tx = S.x[s]!;
    tz = S.z[s]!;
    vx = S.vx[s]!;
    vz = S.vz[s]!;
  } else {
    let inCone = false;
    lowest = Infinity;
    for (let s = 0; s < F.top; s += 1) {
      if (F.alive[s] === 0 || F.z[s]! > mz + XUNG.range || F.hp[s]! - F.incoming[s]! <= 0) continue;
      const dx = F.x[s]!;
      const dz = F.z[s]! - mz;
      const cone = dx * G.aimX + dz * G.aimZ >= XUNG.coneCos * Math.sqrt(dx * dx + dz * dz);
      if ((cone && !inCone) || (cone === inCone && F.z[s]! < lowest)) {
        inCone = cone;
        lowest = F.z[s]!;
        target = s;
      }
    }
    if (target < 0) return false;
    tx = F.x[target]!;
    tz = F.z[target]!;
    vx = F.vx[target]!;
    vz = F.vz[target]!;
  }
  // Lead the target by the round's flight time.
  let dx = tx;
  let dz = tz - mz;
  const t = Math.sqrt(dx * dx + dz * dz) / XUNG.speed;
  dx += vx * t;
  dz += vz * t;
  let length = Math.sqrt(dx * dx + dz * dz) || 1;
  dx /= length;
  dz /= length;
  G.aimX = dx;
  G.aimZ = dz;
  // Spread: a little off the line, across it.
  const off = (w.rng.combat.float() * 2 - 1) * XUNG.spread;
  dx -= dz * off;
  dz += G.aimX * off;
  length = Math.sqrt(dx * dx + dz * dz);
  dx /= length;
  dz /= length;
  const crit = w.rng.crit.chance(G.crit[0]!);
  const damage = XUNG.damage * G.damage[0]! * (crit ? CRIT_MULT : 1);
  const flags = (crit ? FLAG.crit : 0) | (G.perfect[0] === 1 ? FLAG.perfect : 0);
  const id = target >= 0 ? F.id[target]! : S.id[-2 - target]!;
  const b = w.bullets.count < w.bulletCap ? w.bullets.add(dx * 0.9, mz + dz * 0.9, dx * XUNG.speed, dz * XUNG.speed, damage, XUNG.life, flags, target, id) : -1;
  if (b < 0) return true;
  if (target >= 0) F.incoming[target] = F.incoming[target]! + damage;
  else S.marked[-2 - target] = 1;
  w.events.push(w.tick, EV.shot, WEAPON.xung, b, 0, mz, dx, dz, damage, flags);
  return true;
}

/**
 * Tia is a ray from the muzzle, `length` m long, aimed at (beamX, muzzleZ +
 * length): beamX, the aim on that far line, sweeps at `sweep` m/s. Foes are
 * bucketed by the aim that would cross them (their x seen from the muzzle,
 * on the far line), up to ±AIM_MAX (≈ 72° off the corridor's axis).
 */
const AIM_MAX = 3 * TIA.length;
const STRIPS = Math.ceil((AIM_MAX * 2) / TIA.strip);
const weight = new Float64Array(STRIPS);

/** The aim (far-line x) whose ray crosses (x, z), or NaN when the point is out of the ray's reach (`r`: its radius). */
export function aimOf(x: number, z: number, r: number): number {
  const dz = z - FIELD.muzzleZ;
  const reach = TIA.length + r;
  if (dz < 0.3 || x * x + dz * dz > reach * reach) return NaN;
  const aim = (x * TIA.length) / dz;
  return aim < -AIM_MAX ? -AIM_MAX : aim > AIM_MAX ? AIM_MAX : aim;
}

/** The far end of the ray aimed at `aim` (sim x, z), into `out`. */
export function beamEnd(aim: number, out: Float64Array): Float64Array {
  const length = Math.sqrt(aim * aim + TIA.length * TIA.length);
  out[0] = (aim / length) * TIA.length;
  out[1] = FIELD.muzzleZ + (TIA.length / length) * TIA.length;
  return out;
}

/** The centre of the densest strip of aims (foes near the ship weigh more), at least `away` from `from`; NaN when no foe is in reach. */
export function densest(w: World, from: number, away: number): number {
  const F = w.foes;
  weight.fill(0);
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const aim = aimOf(F.x[s]!, F.z[s]!, RADIUS[F.kind[s]!]!);
    if (aim !== aim) continue;
    const strip = Math.min(STRIPS - 1, Math.max(0, Math.floor((aim + AIM_MAX) / TIA.strip)));
    weight[strip] = weight[strip]! + 1 + (FIELD.gateZ - F.z[s]!) / 30;
  }
  let best = -1;
  for (let strip = 0; strip < STRIPS; strip += 1) {
    const x = -AIM_MAX + (strip + 0.5) * TIA.strip;
    if (weight[strip] === 0 || Math.abs(x - from) < away) continue;
    if (best < 0 || weight[strip]! > weight[best]!) best = strip;
  }
  return best < 0 ? NaN : -AIM_MAX + (best + 0.5) * TIA.strip;
}

function fireTia(w: World, dt: number): void {
  const G = w.guns;
  if (G.beamOn === 0) {
    const start = densest(w, 0, -1);
    if (start !== start) return; // nobody in reach: the magazine waits
    G.beamOn = 1;
    G.beamX = start;
    const next = densest(w, start, TIA.away);
    G.beamTo = next === next ? next : start;
    G.beamPulse = 0;
    beamEnd(start, END);
    w.events.push(w.tick, EV.beamStart, WEAPON.tia, 0, END[0]!, END[1]!, 0, 0, start, G.perfect[2] === 1 ? FLAG.perfect : 0);
  }
  const gap = G.beamTo - G.beamX;
  const move = TIA.sweep * dt;
  if (Math.abs(gap) <= move) {
    G.beamX = G.beamTo;
    const next = densest(w, G.beamX, TIA.away);
    if (next === next) G.beamTo = next;
  } else G.beamX += gap > 0 ? move : -move;
  G.beamPulse -= dt;
  while (G.beamPulse <= 0) {
    G.beamPulse += TIA.pulse / G.rate[2]!;
    // Nothing left in reach: the ray goes out and keeps its time for the next foes.
    const any = densest(w, 0, -1);
    if (any !== any) {
      G.beamOn = 0;
      beamEnd(G.beamX, END);
      w.events.push(w.tick, EV.beamEnd, WEAPON.tia, 0, END[0]!, END[1]!, 0, 0, G.beamX, 0);
      return;
    }
    pulse(w, gap >= 0 ? 1 : -1);
  }
  G.beamLeft -= dt;
  if (G.beamLeft <= 0) {
    if (nextMagazine(G, WEAPON.tia)) G.beamLeft += TIA.seconds;
    else {
      G.beamOn = 0;
      G.beamLeft = 0;
      beamEnd(G.beamX, END);
      w.events.push(w.tick, EV.beamEnd, WEAPON.tia, 0, END[0]!, END[1]!, 0, 0, G.beamX, 0);
    }
  }
}

const END = new Float64Array(2);

/** Along the ray (0 … length) and off it (signed, m) of point (x, z), into `out`. */
function rayCoords(ux: number, uz: number, x: number, z: number, out: Float64Array): void {
  const dz = z - FIELD.muzzleZ;
  out[0] = x * ux + dz * uz;
  out[1] = x * uz - dz * ux;
}
const RAY = new Float64Array(2);

/** One Tia pulse: every foe and scout shot the ray crosses. */
function pulse(w: World, side: number): void {
  const F = w.foes;
  const S = w.shots;
  const G = w.guns;
  const grid = w.grid;
  const half = TIA.width / 2;
  const L = TIA.length;
  const norm = Math.sqrt(G.beamX * G.beamX + L * L);
  const ux = G.beamX / norm;
  const uz = L / norm;
  const ex = ux * L;
  const ez = FIELD.muzzleZ + uz * L;
  const perfect = G.perfect[2] === 1 ? FLAG.perfect : 0;
  w.events.push(w.tick, EV.beamPulse, WEAPON.tia, 0, ex, ez, side, 0, G.beamX, perfect);
  // The blow: along the ray and toward the sweep.
  const bx = ux * 0.6 + uz * side * 0.8;
  const bz = uz * 0.6 - ux * side * 0.8;
  const pad = half + MAX_RADIUS;
  const c0 = colOf((ex < 0 ? ex : 0) - pad);
  const c1 = colOf((ex > 0 ? ex : 0) + pad);
  const r0 = rowOf(FIELD.muzzleZ - pad);
  const r1 = rowOf(ez + pad);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const cell = row * FIELD.cols + col;
      for (let s = grid.head[cell]!; s >= 0; s = grid.next[s]!) {
        if (F.alive[s] === 0) continue;
        const r = RADIUS[F.kind[s]!]!;
        rayCoords(ux, uz, F.x[s]!, F.z[s]!, RAY);
        if (RAY[0]! < 0 || RAY[0]! > L + r || Math.abs(RAY[1]!) > half + r) continue;
        const crit = w.rng.crit.chance(G.crit[2]!);
        const damage = TIA.damage * G.damage[2]! * (crit ? CRIT_MULT : 1);
        damageFoe(w, s, damage, FLAG.tia | perfect | (crit ? FLAG.crit : 0), bx, bz);
      }
      for (let s = grid.shotHead[cell]!; s >= 0; s = grid.shotNext[s]!) {
        if (S.alive[s] === 0) continue;
        rayCoords(ux, uz, S.x[s]!, S.z[s]!, RAY);
        if (RAY[0]! >= 0 && RAY[0]! <= L + SCOUT.shotRadius && Math.abs(RAY[1]!) <= half + SCOUT.shotRadius) shootDown(w, s, FLAG.tia);
      }
    }
  }
}
