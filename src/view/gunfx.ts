/**
 * The S1 guns' sounds (docs/BUILD_S1.md §12), fed by Combat from the sim's
 * events: Tán's volley, Ray's charge and shot, Pháo Sao's launch and burst.
 * Pháo Sao's bursts close together chain, each a semitone higher. The guns'
 * looks are ShotFx's (shots.ts, the feel pass); the foes' events are
 * foe-fx.ts's and the stage's stage-fx.ts's (split by ALIVE_PLAN AL-00).
 */
import { FIELD } from "../content/rules";
import { EV } from "../sim/events";
import type { Ring } from "../sim/events";
import type { ThemeAudio } from "../audio/theme-audio";

/** Pháo Sao's bursts this close (ms) chain: each a semitone higher, at most 4 steps. */
const CHAIN_MS = 70;

export type GunFxParts = { audio: ThemeAudio };

export class GunFx {
  private burstAt = -1e9;
  private chain = 0;

  constructor(private readonly p: GunFxParts) {}

  /** A gun's event (Combat hands every kind from EV.volley on): its sound; `now` in ms. Other kinds pass. */
  event(R: Ring, i: number, now: number, pan: number): void {
    const a = this.p.audio;
    switch (R.kind[i]) {
      case EV.volley:
        return a.gun("gun.tan.fire", pan, now);
      case EV.charge:
        return a.gun("gun.ray.charge", pan, now);
      case EV.rail:
        return a.gun("gun.ray.fire", pan, now);
      case EV.launch:
        return a.gun("gun.phao.launch", pan, now);
      case EV.burst:
        this.chain = now - this.burstAt <= CHAIN_MS ? Math.min(4, this.chain + 1) : 0;
        this.burstAt = now;
        return a.gun("gun.phao.burst", R.x[i]! / FIELD.halfW, now, 2 ** (this.chain / 12));
    }
  }
}
