/**
 * The world hash: every rule number of the world folded into 32 bits, floats
 * by their bit pattern (as Typing Defense). Two runs with the same seed, deck,
 * run header and command log match tick by tick, on Node and in Chrome. The
 * header, the run's timeline, the FlowMeter and the pace director are state
 * too. Events are output, not state, and stay out.
 */
import { rngState } from "../kit/platform/rng";
import { modeIndex, type World } from "./world";

const PRIME = 0x01000193;
const float = new Float64Array(1);
const words = new Uint32Array(float.buffer);
const mix = (hash: number, value: number): number => Math.imul(hash ^ value, PRIME);

function mixNumber(hash: number, value: number): number {
  float[0] = value;
  return mix(mix(hash, words[0]!), words[1]!);
}

/** Every typed array and number of `object` (whole arrays: dead slots are deterministic too). */
function mixObject(hash: number, object: object): number {
  let h = hash;
  for (const [key, value] of Object.entries(object)) {
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      const array = value as unknown as ArrayLike<number>;
      h = mix(h, array.length);
      for (let index = 0; index < array.length; index += 1) h = mixNumber(h, array[index]!);
    } else if (typeof value === "number") h = mixNumber(mix(h, key.length), value);
  }
  return h;
}

export function hashWorld(w: World): number {
  let h = 0x811c9dc5;
  for (const value of [w.tick, w.time, w.scale, w.slowTicks, w.hp, w.foeCap, w.bulletCap, w.expected, ["play", "won", "lost"].indexOf(w.phase)]) h = mixNumber(h, value);
  for (const value of [modeIndex(w), w.header.pace, w.header.director ? 1 : 0, w.scales.rate, w.scales.surge, w.scales.speed, w.scales.drain]) h = mixNumber(h, value);
  for (const value of rngState(w.rng)) h = mix(h, value);
  for (const part of [w.spawn, w.plan, w.pace, w.foes, w.bullets, w.shots, w.guns, w.typing, w.measure, w.stats]) h = mixObject(h, part);
  for (const value of w.meter.state()) h = mixNumber(h, value);
  for (const value of w.director.state()) h = mixNumber(h, value);
  return h >>> 0;
}

export const hashHex = (w: World): string => hashWorld(w).toString(16).padStart(8, "0");
