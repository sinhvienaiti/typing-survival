/**
 * The ship's motion (docs/FEEL_PASS_S1.md §5), pure so tests/ship-motion.test.ts
 * holds it: where it drifts (a quarter of the near horde's weighted centre,
 * at most ±1.6 m, a slow wander when nothing is near), the springs it moves
 * on, its hover, the recoil per gun and the lunge on a load, which blow it
 * turns to, how hard the engines burn. View only: the sim keeps the ship and
 * its muzzles at (0; 1.7) (§5.5), so nothing here reaches it.
 */
import { KIND, isBig } from "../content/foes";

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * §5.3: foes within `reach` m weigh (1 − z/16)², × 3 a big one, × 2 more a
 * Đầu Đàn; the ship aims for `share` of their weighted x, clamped ±`max`, on a
 * spring (ω, ζ, speed ≤ vmax) and banks −vx × 7° (±14°). Under `minWeight`
 * it wanders ±`idle` m at `idleHz`. The hand-over from the horde to the
 * wander ramps over Σw `fade` (0.3 → 0.7) so a pack crossing 0.5 does not
 * flip the target.
 */
export const DRIFT = { reach: 16, share: 0.25, max: 1.6, minWeight: 0.5, fade: [0.3, 0.7], omega: 2.6, zeta: 0.85, vmax: 2.4, bank: 7 * DEG, bankMax: 14 * DEG, idle: 0.25, idleHz: 0.15, big: 3, leader: 2 } as const;

/** A foe's threat weight at depth z (sim m); 0 beyond `reach`. */
export function threatWeight(z: number, kind: number): number {
  if (z > DRIFT.reach) return 0;
  const k = 1 - Math.max(0, z) / DRIFT.reach;
  return k * k * (isBig(kind) ? DRIFT.big : 1) * (kind === KIND.leader ? DRIFT.leader : 1);
}

/** The near horde's sums (Σw·x, Σw·z, Σw) over a foe store's live slots. */
export function threatSums(foes: { top: number; alive: ArrayLike<number>; x: ArrayLike<number>; z: ArrayLike<number>; kind: ArrayLike<number> }, out: { wx: number; wz: number; w: number }): { wx: number; wz: number; w: number } {
  let wx = 0;
  let wz = 0;
  let w = 0;
  for (let s = 0; s < foes.top; s += 1) {
    if (foes.alive[s] !== 1) continue;
    const k = threatWeight(foes.z[s]!, foes.kind[s]!);
    wx += k * foes.x[s]!;
    wz += k * foes.z[s]!;
    w += k;
  }
  out.wx = wx;
  out.wz = wz;
  out.w = w;
  return out;
}

/** The ship's drift target (m) for the horde's sums at `time` s. */
export function driftTarget(wx: number, w: number, time: number): number {
  const wander = DRIFT.idle * Math.sin(2 * Math.PI * DRIFT.idleHz * time);
  if (w <= DRIFT.fade[0]) return wander;
  const toward = clamp((DRIFT.share * wx) / w, -DRIFT.max, DRIFT.max);
  const k = clamp((w - DRIFT.fade[0]) / (DRIFT.fade[1] - DRIFT.fade[0]), 0, 1);
  return wander + (toward - wander) * k;
}

/** The bank (rad, roll about the nose) for a sideways speed vx (m/s): into the move, ±14° at most. */
export const driftBank = (vx: number): number => -clamp(vx * DRIFT.bank, -DRIFT.bankMax, DRIFT.bankMax);

/**
 * One step of a damped spring toward `target`: state s[o] position, s[o + 1]
 * speed (capped ±vmax). Sub-stepped at 240 Hz so a long frame stays stable.
 */
export function springStep(s: Float64Array, o: number, target: number, omega: number, zeta: number, vmax: number, dt: number): void {
  if (dt <= 0) return;
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  let x = s[o]!;
  let v = s[o + 1]!;
  for (let k = 0; k < n; k += 1) {
    v += (omega * omega * (target - x) - 2 * zeta * omega * v) * h;
    v = clamp(v, -vmax, vmax);
    x += v * h;
  }
  s[o] = x;
  s[o + 1] = v;
}

/** §5.4: the hover: a bob 0.07 m at 0.55 Hz, a roll ±1.5° at 0.37 Hz, a pitch ±1° at 0.43 Hz (three frequencies apart: no even repeat). */
export const HOVER = { bob: 0.07, bobHz: 0.55, roll: 1.5 * DEG, rollHz: 0.37, pitch: 1 * DEG, pitchHz: 0.43 } as const;

export function hover(time: number, out: { y: number; roll: number; pitch: number }): { y: number; roll: number; pitch: number } {
  out.y = HOVER.bob * Math.sin(2 * Math.PI * HOVER.bobHz * time);
  out.roll = HOVER.roll * Math.sin(2 * Math.PI * HOVER.rollHz * time + 1.1);
  out.pitch = HOVER.pitch * Math.sin(2 * Math.PI * HOVER.pitchHz * time + 2.3);
  return out;
}

/**
 * §5.2: per action, the move along the ship's axis (m; + back, − forward),
 * down (m), the pitch (rad; + nose up), the rise and the return (s). A shot's
 * kick is on in one frame; the lunge of a load takes 120 ms.
 */
export const KICK = {
  xung: { back: 0.05, down: 0, pitch: 1.2 * DEG, rise: 0.016, ret: 0.08 },
  tan: { back: 0.28, down: 0, pitch: 4 * DEG, rise: 0.016, ret: 0.18 },
  ray: { back: 0.4, down: 0, pitch: 5 * DEG, rise: 0.016, ret: 0.26 },
  phao: { back: 0, down: 0.08, pitch: -3 * DEG, rise: 0.03, ret: 0.22 },
  load: { back: -0.35, down: 0, pitch: -3 * DEG, rise: 0.12, ret: 0.6 },
} as const;
export type KickName = keyof typeof KICK;
export const KICKS = Object.keys(KICK) as KickName[];

/** A kick's level `age` s after it: up in `rise` (eased out), back to 0 over `ret` (eased in and out). */
export function kickLevel(age: number, rise: number, ret: number): number {
  if (age < 0) return 0;
  if (age < rise) {
    const u = age / rise;
    return 1 - (1 - u) * (1 - u);
  }
  const u = (age - rise) / ret;
  return u >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u);
}

/**
 * §5.2 held states: Ray charging (a 30 Hz shake 0.015 m, 0.04 m down) and
 * Tia burning (0.06 m back, a 12 Hz shake 0.02 m, let go over 150 ms); each
 * eases in over `rise` s and out over `fall` s.
 */
export const HOLD = {
  charge: { shake: 0.015, hz: 30, down: 0.04, back: 0, rise: 0.03, fall: 0.08 },
  tia: { shake: 0.02, hz: 12, down: 0, back: 0.06, rise: 0.05, fall: 0.15 },
} as const;

/** A held state's level stepped toward on (1) or off (0). */
export const holdStep = (level: number, on: boolean, rise: number, fall: number, dt: number): number =>
  on ? Math.min(1, level + dt / rise) : Math.max(0, level - dt / fall);

/** The nose never passes sim z 2.1 m (the bottom line is at 2.4, the word line's foot at ≈ 2.6). */
export const NOSE_MAX_Z = 2.1;

/**
 * §5.1: the ship turns its whole body to the heaviest blow of the last 0.3 s
 * (Ray charging or firing 5 > Pháo Sao 4 > Tán 3 > Xung 2 > Tia 1), at most
 * ±50°, on a spring with ζ 0.7 (a slight overshoot: it snaps onto Ray's
 * aim), at most 7 rad/s. Xung's rounds rock it ±0.6° by muzzle. With no
 * blow it faces the near horde's weighted centre (from Σw 0.3, the drift's
 * hand-over), else along the sim's last aim (§5.1 leaves the idle ship open:
 * aimed from its drifted place at the corridor's middle it looked away from
 * the pack it drifted toward).
 */
export const AIM = { max: 0.87, omega: 14, zeta: 0.7, speed: 7, hold: 0.3, wobble: 0.6 * DEG, wobbleRet: 0.08, reach: 10 } as const;
export const AIM_PRIO = { tia: 1, xung: 2, tan: 3, phao: 4, ray: 5 } as const;
export const AIM_LEVELS = 6;

/** The priority to aim at now: the highest one cued within `hold` s (0: none, use the fallback). */
export function pickAim(cuedAt: ArrayLike<number>, now: number): number {
  for (let p = AIM_LEVELS - 1; p >= 1; p -= 1) if (now - cuedAt[p]! <= AIM.hold && now >= cuedAt[p]!) return p;
  return 0;
}

/** The yaw (rad; + turns the nose to −x) that points from (fromX, fromZ) to (toX, toZ) (sim m), clamped ±50°. */
export function yawTo(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return clamp(Math.atan2(-(toX - fromX), Math.max(0.5, toZ - fromZ)), -AIM.max, AIM.max);
}

/**
 * §5.4: the engines: a halo 0.35 m (radius) at 0.7, flickering ±10 % at 18
 * Hz; with thrust (sideways faster than 0.5 m/s, a lunge, a kick back) the
 * halo × 1.6 and a flame 0.6 → 1.4 m long streams back.
 */
export const ENGINE = { halo: 0.35, alpha: 0.7, flicker: 0.1, flickerHz: 18, boost: 1.6, flame: [0.6, 1.4], fast: 0.5, full: 1 } as const;

/** Thrust 0 … 1 from the sideways speed (m/s) and the kicks' push (0 … 1). */
export const thrust = (vx: number, push: number): number => clamp(Math.max((Math.abs(vx) - ENGINE.fast) / (ENGINE.full - ENGINE.fast), push), 0, 1);

/** Reduced motion (§1.5): no drift, lunge or hover; recoil × 0.3. */
export const REDUCED = { recoil: 0.3 } as const;
