/**
 * Xung rounds in flight (each step a segment, tested through the grid
 * against scout shots and foes, the earlier touch wins), scout shots flying
 * at the ship, and the damage that both guns deal.
 */
import { FIELD, KIND, SCOUT, XUNG } from "../content/rules";
import { EV, FLAG } from "./events";
import { firstFoeHit, firstShotHit, hitT } from "./hits";
import { RADIUS } from "./move";
import { noteKill } from "./pace";
import type { World } from "./world";

/** Deals `damage` to foe `s`; `dx, dz` is the blow's direction (for the recoil and the numbers). */
export function damageFoe(w: World, s: number, damage: number, flags: number, dx: number, dz: number): void {
  const F = w.foes;
  const dealt = Math.min(damage, Math.max(0, F.hp[s]!));
  F.hp[s] = F.hp[s]! - damage;
  w.stats.damageDealt += dealt;
  w.pace.damage += dealt;
  const scout = F.kind[s] === KIND.scout ? FLAG.scout : 0;
  const elite = F.elite[s] === 1 ? FLAG.elite : 0;
  const kill = F.hp[s]! <= 0 ? FLAG.kill : 0;
  w.events.push(w.tick, EV.hit, s, F.id[s]!, F.x[s]!, F.z[s]!, dx, dz, damage, flags | scout | kill | elite);
  if (kill === 0) return;
  w.stats.kills += 1;
  if (scout !== 0) w.stats.scoutKills += 1;
  if (elite !== 0) w.stats.eliteKills += 1;
  w.stats.lifeSum += w.time - (F.reached[s]! >= 0 ? F.reached[s]! : F.born[s]!);
  noteKill(w, F.z[s]!);
  w.events.push(w.tick, EV.kill, s, F.id[s]!, F.x[s]!, F.z[s]!, dx, dz, F.maxHp[s]!, flags | scout | elite);
  F.remove(s);
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
    const shot = w.shots.count > 0 ? firstShotHit(w.grid, w.shots, x0, z0, x1, z1, reach) : -1;
    const shotT = shot >= 0 ? hitT : 2;
    const foe = firstFoeHit(w.grid, w.foes, RADIUS, x0, z0, x1, z1, XUNG.radius);
    if (shot >= 0 && (foe < 0 || shotT <= hitT)) {
      shootDown(w, shot, B.flags[b]!);
      release(w, b);
      continue;
    }
    if (foe >= 0) {
      const speed = Math.sqrt(B.vx[b]! * B.vx[b]! + B.vz[b]! * B.vz[b]!) || 1;
      const damage = B.damage[b]!;
      const flags = B.flags[b]!;
      const dx = B.vx[b]! / speed;
      const dz = B.vz[b]! / speed;
      release(w, b);
      damageFoe(w, foe, damage, flags, dx, dz);
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
