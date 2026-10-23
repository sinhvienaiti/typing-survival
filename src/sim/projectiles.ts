/**
 * Rounds in flight (Xung rounds and Tán pellets: each step a segment,
 * tested through the grid against shields, scout shots and foes, the
 * earlier touch wins), scout shots flying at the ship, and the damage every
 * gun deals: Vỏ off each blow (at least 1 left; a clean magazine meets less
 * of it), Tán's knock-back, a Tách breaking into shards (spawned after the
 * guns have fired, so no blow of this step meets them).
 */
import { FOES, KIND, SHIELD, SPLIT } from "../content/foes";
import { TAN, XUNG } from "../content/guns";
import { FIELD, SCOUT } from "../content/rules";
import { EV, FLAG } from "./events";
import { firstFoeHit, firstShotHit, hitT } from "./hits";
import { RADIUS } from "./move";
import { noteKill } from "./pace";
import { noteLeaderDown } from "./stage";
import { MARK, ROUND } from "./stores";
import type { World } from "./world";

/**
 * Deals `damage` to foe `s`; `dx, dz` is the blow's direction (for the
 * recoil and the numbers); `pierce` × the foe's Vỏ comes off the blow.
 */
export function damageFoe(w: World, s: number, damage: number, flags: number, dx: number, dz: number, pierce = 1): void {
  const F = w.foes;
  const kind = F.kind[s]!;
  const armour = FOES[kind]!.armour;
  let blow = damage;
  if (armour > 0) {
    const kept = damage - armour * pierce;
    blow = kept > 1 ? kept : 1;
    flags |= FLAG.armour | (pierce < 1 ? FLAG.pierce : 0) | FLAG.big;
  }
  const dealt = Math.min(blow, Math.max(0, F.hp[s]!));
  F.hp[s] = F.hp[s]! - blow;
  w.stats.damageDealt += dealt;
  w.pace.damage += dealt;
  const scout = kind === KIND.scout ? FLAG.scout : 0;
  const elite = F.elite[s] === 1 ? FLAG.elite : 0;
  const kill = F.hp[s]! <= 0 ? FLAG.kill : 0;
  w.events.push(w.tick, EV.hit, s, F.id[s]!, F.x[s]!, F.z[s]!, dx, dz, blow, flags | scout | kill | elite);
  if (kill === 0) return;
  w.stats.kills += 1;
  if (scout !== 0) w.stats.scoutKills += 1;
  if (elite !== 0) w.stats.eliteKills += 1;
  w.stats.lifeSum += w.time - (F.reached[s]! >= 0 ? F.reached[s]! : F.born[s]!);
  noteKill(w, F.z[s]!);
  w.events.push(w.tick, EV.kill, s, F.id[s]!, F.x[s]!, F.z[s]!, dx, dz, F.maxHp[s]!, (flags & ~(FLAG.kill | FLAG.knock)) | scout | elite);
  if (kind === KIND.splitter) queueSplit(w, s);
  else if (kind === KIND.leader) noteLeaderDown(w, s);
  if (F.shield[s]! >= 0) dropShield(w, s, dx, dz);
  F.remove(s);
}

/** A pellet's knock-back: the foe is pushed along the blow (never the heavy kinds). */
function knock(w: World, s: number, dx: number, dz: number): boolean {
  const F = w.foes;
  if (!FOES[F.kind[s]!]!.knock) return false;
  F.x[s] = F.x[s]! + dx * TAN.knock;
  F.z[s] = F.z[s]! + dz * TAN.knock;
  return true;
}

/** Splits waiting for the end of the step: x, z, Bọc Thép. */
const SPLIT_MAX = 64;
export function createSplits() {
  return { x: new Float64Array(SPLIT_MAX), z: new Float64Array(SPLIT_MAX), elite: new Uint8Array(SPLIT_MAX), count: 0 };
}

function queueSplit(w: World, s: number): void {
  const P = w.splits;
  if (P.count >= SPLIT_MAX) return;
  P.x[P.count] = w.foes.x[s]!;
  P.z[P.count] = w.foes.z[s]!;
  P.elite[P.count] = w.foes.elite[s]!;
  P.count += 1;
}

/** The step's dead Tách break: SPLIT.shards Mảnh across SPLIT.spread m, inside the walls. */
export function breakSplits(w: World): void {
  const P = w.splits;
  const spec = FOES[KIND.shard]!;
  const edge = FIELD.halfW - FIELD.wall - spec.radius;
  for (let k = 0; k < P.count; k += 1) {
    const x = P.x[k]!;
    const z = P.z[k]!;
    for (let i = 0; i < SPLIT.shards; i += 1) {
      const across = SPLIT.shards > 1 ? (i / (SPLIT.shards - 1)) * 2 - 1 : 0;
      const sx = Math.max(-edge, Math.min(edge, x + across * SPLIT.spread));
      const s = w.foes.add(KIND.shard, sx, z + (i === 1 ? 0.5 : 0), spec.hp, w.rng.spawn.float(), 0, w.time);
      if (s < 0) break;
      w.spawn.spawned += 1;
    }
    w.events.push(w.tick, EV.split, -1, 0, x, z, 0, 0, SPLIT.shards, 0);
  }
  P.count = 0;
}

/** A shield goes (broken, or with its bearer). */
export function dropShield(w: World, s: number, dx: number, dz: number): void {
  const F = w.foes;
  const k = F.shield[s]!;
  if (k < 0) return;
  const H = w.shields;
  if (H.alive[k] === 1 && H.ownerId[k] === F.id[s]) {
    w.events.push(w.tick, EV.shieldBreak, s, F.id[s]!, H.x[k]!, H.z[k]!, dx, dz, 0, 0);
    H.remove(k);
  }
  F.shield[s] = -1;
  F.mark[s] = F.mark[s]! | MARK.shieldGone;
}

/** Deals `damage` to shield `k` (Tia burns it); it breaks at 0. */
export function damageShield(w: World, k: number, damage: number, dx: number, dz: number, x: number, z: number): void {
  const H = w.shields;
  H.hp[k] = H.hp[k]! - damage;
  const s = H.owner[k]!;
  w.events.push(w.tick, EV.shieldHit, s, H.ownerId[k]!, x, z, dx, dz, Math.max(0, H.hp[k]! / H.maxHp[k]!), 0);
  if (H.hp[k]! <= 0) dropShield(w, s, dx, dz);
}

/**
 * Where along p0 → p1 (0 … 1) a segment meets a shield wall from its front
 * (moving against the shield's face), or 2; `hitShield` gets the wall's slot.
 */
export let hitShield = -1;
export function firstShieldHit(w: World, x0: number, z0: number, x1: number, z1: number): number {
  const H = w.shields;
  hitShield = -1;
  let best = 2;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const half = SHIELD.width / 2;
  for (let k = 0; k < H.top; k += 1) {
    if (H.alive[k] === 0) continue;
    const nx = H.nx[k]!;
    const nz = H.nz[k]!;
    // Moving into the face: against its normal.
    const into = dx * nx + dz * nz;
    if (into >= 0) continue;
    // The segment's crossing of the wall's line, then along the wall.
    const t = ((H.x[k]! - x0) * nx + (H.z[k]! - z0) * nz) / into;
    if (t < 0 || t > 1 || t >= best) continue;
    const px = x0 + dx * t - H.x[k]!;
    const pz = z0 + dz * t - H.z[k]!;
    if (Math.abs(px * nz - pz * nx) > half) continue;
    best = t;
    hitShield = k;
  }
  return best;
}

export function shootDown(w: World, s: number, flags: number): void {
  w.stats.shotsDown += 1;
  w.events.push(w.tick, EV.shotDown, s, w.shots.id[s]!, w.shots.x[s]!, w.shots.z[s]!, 0, 0, 0, flags);
  w.shots.remove(s);
}

/** A round leaves: what it was meant for is free to be aimed at again. */
function release(w: World, b: number): void {
  const B = w.bullets;
  const target = B.target[b]!;
  if (target >= 0) {
    if (w.foes.alive[target] === 1 && w.foes.id[target] === B.targetId[b]) w.foes.incoming[target] = Math.max(0, w.foes.incoming[target]! - B.damage[b]!);
  } else if (target <= -2) {
    const s = -2 - target;
    if (w.shots.alive[s] === 1 && w.shots.id[s] === B.targetId[b]) w.shots.marked[s] = 0;
  }
  B.remove(b);
}

export function moveBullets(w: World, dt: number): void {
  const B = w.bullets;
  const reach = XUNG.radius + SCOUT.shotRadius;
  for (let b = 0; b < B.top; b += 1) {
    if (B.alive[b] === 0) continue;
    const x0 = B.x[b]!;
    const z0 = B.z[b]!;
    const x1 = x0 + B.vx[b]! * dt;
    const z1 = z0 + B.vz[b]! * dt;
    const pellet = B.kind[b] === ROUND.pellet;
    const wallT = w.shields.count > 0 ? firstShieldHit(w, x0, z0, x1, z1) : 2;
    const wall = hitShield;
    const shot = !pellet && w.shots.count > 0 ? firstShotHit(w.grid, w.shots, x0, z0, x1, z1, reach) : -1;
    const shotT = shot >= 0 ? hitT : 2;
    const foe = firstFoeHit(w.grid, w.foes, RADIUS, x0, z0, x1, z1, pellet ? TAN.radius : XUNG.radius);
    const foeT = foe >= 0 ? hitT : 2;
    if (wall >= 0 && wallT <= shotT && wallT <= foeT) {
      // Stopped by the shield's face: no damage.
      const H = w.shields;
      const speed = Math.sqrt(B.vx[b]! * B.vx[b]! + B.vz[b]! * B.vz[b]!) || 1;
      w.events.push(w.tick, EV.shieldHit, H.owner[wall]!, H.ownerId[wall]!, x0 + (x1 - x0) * wallT, z0 + (z1 - z0) * wallT, B.vx[b]! / speed, B.vz[b]! / speed, H.hp[wall]! / H.maxHp[wall]!, B.flags[b]!);
      release(w, b);
      continue;
    }
    if (shot >= 0 && (foe < 0 || shotT <= foeT)) {
      shootDown(w, shot, B.flags[b]!);
      release(w, b);
      continue;
    }
    if (foe >= 0) {
      const speed = Math.sqrt(B.vx[b]! * B.vx[b]! + B.vz[b]! * B.vz[b]!) || 1;
      const damage = B.damage[b]!;
      let flags = B.flags[b]!;
      const dx = B.vx[b]! / speed;
      const dz = B.vz[b]! / speed;
      const pierce = B.pierce[b]!;
      release(w, b);
      if (pellet && w.foes.hp[foe]! > damage && knock(w, foe, dx, dz)) flags |= FLAG.knock;
      damageFoe(w, foe, damage, flags, dx, dz, pierce);
      continue;
    }
    B.x[b] = x1;
    B.z[b] = z1;
    B.life[b] = B.life[b]! - dt;
    if (B.life[b]! <= 0 || z1 > FIELD.gateZ + 8 || x1 > FIELD.halfW || x1 < -FIELD.halfW) release(w, b);
  }
}

export function moveShots(w: World, dt: number): void {
  const S = w.shots;
  const hitZ = FIELD.muzzleZ - 0.6;
  for (let s = 0; s < S.top; s += 1) {
    if (S.alive[s] === 0) continue;
    S.x[s] = S.x[s]! + S.vx[s]! * dt;
    S.z[s] = S.z[s]! + S.vz[s]! * dt;
    S.life[s] = S.life[s]! - dt;
    const dx = S.x[s]!;
    const dz = S.z[s]! - hitZ;
    if (dx * dx + dz * dz <= 1.3 * 1.3) {
      w.hp = Math.max(0, w.hp - SCOUT.shotDamage);
      w.stats.damageTaken += SCOUT.shotDamage;
      w.stats.shotDamage += SCOUT.shotDamage;
      w.events.push(w.tick, EV.playerHit, s, S.id[s]!, S.x[s]!, S.z[s]!, S.vx[s]! / SCOUT.shotSpeed, S.vz[s]! / SCOUT.shotSpeed, SCOUT.shotDamage, 0);
      S.remove(s);
    } else if (S.life[s]! <= 0 || S.z[s]! < FIELD.minZ + 1) S.remove(s);
  }
}
