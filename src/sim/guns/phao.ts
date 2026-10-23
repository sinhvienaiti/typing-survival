/**
 * Pháo Sao (docs/BUILD_S1.md §5.1): 6 shells a magazine in 3 s, each flying
 * PHAO.flight s to the heaviest cluster (hit points still standing once the
 * shells already in the air land) whose body reaches the band 8–24 m out;
 * it lands where the cluster will be, on a point of the band, and bursts
 * PHAO.radius m round: PHAO.damage at the centre falling evenly to PHAO.edge
 * at the rim (from a foe's body edge). Shells fall from above: shields do
 * not stop them. Nobody in the band: the magazine waits.
 */
import { FOES } from "../../content/foes";
import { CRIT_MULT, PHAO } from "../../content/guns";
import { FIELD } from "../../content/rules";
import { EV, FLAG } from "../events";
import { collectNear, nearList } from "../hits";
import { damageFoe } from "../projectiles";
import { firing, nextMagazine } from "../weapons";
import type { World } from "../world";

const NEAR = FIELD.muzzleZ + PHAO.near;
const FAR = FIELD.muzzleZ + PHAO.far;
const COLS = Math.ceil((FIELD.halfW * 2) / PHAO.cell);
const ROWS = Math.ceil((FAR - NEAR + 2 * 2) / PHAO.cell);
const weight = new Float64Array(COLS * ROWS);
const sumX = new Float64Array(COLS * ROWS);
const sumZ = new Float64Array(COLS * ROWS);
const sumVx = new Float64Array(COLS * ROWS);
const sumVz = new Float64Array(COLS * ROWS);

export function firePhao(w: World, bay: number, dt: number): void {
  const G = w.guns;
  G.cooldown[bay] = G.cooldown[bay]! - dt;
  while (G.cooldown[bay]! <= 0 && G.left[bay]! > 0) {
    if (!launch(w, bay)) {
      G.cooldown[bay] = 0;
      return;
    }
    G.left[bay] = G.left[bay]! - 1;
    G.cooldown[bay] = G.cooldown[bay]! + PHAO.seconds / PHAO.shells / G.rate[firing(bay)]!;
    if (G.left[bay] === 0 && nextMagazine(G, bay)) G.left[bay] = PHAO.shells;
  }
  if (G.mags[bay] === 0) G.cooldown[bay] = 0;
}

/** A shell's blow at distance `d` from its centre (to a body's edge): centre to rim, falling evenly. */
export const burstDamage = (base: number, d: number): number => (d <= 0 ? base : base * (1 - ((1 - PHAO.edge / PHAO.damage) * d) / PHAO.radius));

/** What the shells in the air will take off foe `s` when they land. */
function pending(w: World, s: number): number {
  const L = w.shells;
  let total = 0;
  for (let k = 0; k < L.top; k += 1) {
    if (L.alive[k] === 0) continue;
    const dx = w.foes.x[s]! - L.x[k]!;
    const dz = w.foes.z[s]! - L.z[k]!;
    const d = Math.sqrt(dx * dx + dz * dz) - FOES[w.foes.kind[s]!]!.radius;
    if (d <= PHAO.radius) total += burstDamage(L.damage[k]!, d);
  }
  return total;
}

/** Where to aim: the cluster with the most hit points left in the band (into AIM), false when the band is empty. */
const AIM = new Float64Array(2);
export function phaoAim(w: World): boolean {
  const F = w.foes;
  weight.fill(0);
  sumX.fill(0);
  sumZ.fill(0);
  sumVx.fill(0);
  sumVz.fill(0);
  const shells = w.shells.count > 0;
  let any = false;
  for (let s = 0; s < F.top; s += 1) {
    if (F.alive[s] === 0) continue;
    const r = FOES[F.kind[s]!]!.radius;
    const z = F.z[s]!;
    if (z + r < NEAR || z - r > FAR) continue;
    const hp = F.hp[s]! - (shells ? pending(w, s) : 0);
    if (hp <= 0) continue;
    const col = Math.max(0, Math.min(COLS - 1, Math.floor((F.x[s]! + FIELD.halfW) / PHAO.cell)));
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor((z - NEAR + 2) / PHAO.cell)));
    const c = row * COLS + col;
    weight[c] = weight[c]! + hp;
    sumX[c] = sumX[c]! + F.x[s]! * hp;
    sumZ[c] = sumZ[c]! + z * hp;
    sumVx[c] = sumVx[c]! + F.vx[s]! * hp;
    sumVz[c] = sumVz[c]! + F.vz[s]! * hp;
    any = true;
  }
  if (!any) return false;
  let best = 0;
  for (let c = 1; c < weight.length; c += 1) if (weight[c]! > weight[best]!) best = c;
  const total = weight[best]!;
  // Where the cluster will be when the shell lands, on a point of the band.
  AIM[0] = (sumX[best]! + sumVx[best]! * PHAO.flight) / total;
  AIM[1] = Math.max(NEAR, Math.min(FAR, (sumZ[best]! + sumVz[best]! * PHAO.flight) / total));
  return true;
}

function launch(w: World, bay: number): boolean {
  if (!phaoAim(w)) return false;
  const G = w.guns;
  const i = firing(bay);
  const crit = w.rng.crit.chance(G.crit[i]!);
  const damage = PHAO.damage * G.damage[i]! * (crit ? CRIT_MULT : 1);
  const flags = FLAG.phao | (crit ? FLAG.crit : 0) | (G.perfect[i] === 1 ? FLAG.perfect : 0);
  const x = AIM[0]!;
  const z = AIM[1]!;
  const k = w.shells.add(x, z, PHAO.flight, damage, G.pierce[i]!, flags, bay);
  if (k < 0) return true;
  const dx = x;
  const dz = z - FIELD.muzzleZ;
  const length = Math.sqrt(dx * dx + dz * dz) || 1;
  G.aimX[bay] = dx / length;
  G.aimZ[bay] = dz / length;
  w.events.push(w.tick, EV.launch, bay, w.shells.id[k]!, x, z, 0, 0, PHAO.flight, flags);
  return true;
}

/** Shells in the air: each lands when its time is up and bursts. */
export function moveShells(w: World, dt: number): void {
  const L = w.shells;
  const F = w.foes;
  for (let k = 0; k < L.top; k += 1) {
    if (L.alive[k] === 0) continue;
    L.left[k] = L.left[k]! - dt;
    if (L.left[k]! > 0) continue;
    const x = L.x[k]!;
    const z = L.z[k]!;
    const damage = L.damage[k]!;
    const flags = L.flags[k]!;
    const pierce = L.pierce[k]!;
    let struck = 0;
    const near = collectNear(w.grid, F, x - PHAO.radius, z - PHAO.radius, x + PHAO.radius, z + PHAO.radius);
    for (let n = 0; n < near; n += 1) {
      const s = nearList[n]!;
      if (F.alive[s] === 0) continue;
      const dx = F.x[s]! - x;
      const dz = F.z[s]! - z;
      const centre = Math.sqrt(dx * dx + dz * dz);
      const d = centre - FOES[F.kind[s]!]!.radius;
      if (d > PHAO.radius) continue;
      struck += 1;
      damageFoe(w, s, burstDamage(damage, d), flags, centre > 1e-6 ? dx / centre : 0, centre > 1e-6 ? dz / centre : 1, pierce);
    }
    w.events.push(w.tick, EV.burst, L.bay[k]!, struck, x, z, 0, 0, PHAO.radius, flags);
    L.remove(k);
  }
}
