/**
 * The S0 trial's event trace (docs/BUILD_S1.md §14 R1 step 1): every event
 * of the kinds S0 had (1 … 19), folded into one FNV hash over (tick, kind,
 * slot, ref, x, z, dx, dz, value, flags) as the ring stores them, plus a
 * count per kind. New event kinds are output only and stay out, so the
 * trace says whether the S0 rules still play the same game. Command logs
 * are stored compactly: "<tick delta base36><letter or <>" tokens.
 */
import type { Command } from "../../src/sim/world";

export const S0_EVENT_KINDS = 19;

export type Trace = { hash: number; count: number; kinds: number[]; read: number };

export const newTrace = (): Trace => ({ hash: 0x811c9dc5, count: 0, kinds: new Array(S0_EVENT_KINDS + 1).fill(0), read: 0 });

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
const mix = (h: number, v: number): number => Math.imul(h ^ (v >>> 0), 0x01000193);
const mixF = (h: number, v: number): number => {
  f32[0] = v;
  return mix(h, u32[0]!);
};

type Ring = {
  readonly size: number; readonly written: number; readonly kind: ArrayLike<number>; readonly flags: ArrayLike<number>; readonly slot: ArrayLike<number>; readonly ref: ArrayLike<number>;
  readonly tick: ArrayLike<number>; readonly x: ArrayLike<number>; readonly z: ArrayLike<number>; readonly dx: ArrayLike<number>; readonly dz: ArrayLike<number>; readonly value: ArrayLike<number>;
};

/** Folds the events written since the last call (call after every step: the ring wraps). */
export function foldEvents(trace: Trace, R: Ring): void {
  if (R.written - trace.read > R.size) throw new Error("trace: the ring wrapped between reads");
  for (let i = trace.read; i < R.written; i += 1) {
    const k = i % R.size;
    const kind = R.kind[k]!;
    if (kind < 1 || kind > S0_EVENT_KINDS) continue;
    let h = trace.hash;
    h = mix(h, R.tick[k]!);
    h = mix(h, kind);
    h = mix(h, R.slot[k]!);
    h = mix(h, R.ref[k]!);
    h = mixF(h, R.x[k]!);
    h = mixF(h, R.z[k]!);
    h = mixF(h, R.dx[k]!);
    h = mixF(h, R.dz[k]!);
    h = mixF(h, R.value[k]!);
    h = mix(h, R.flags[k]!);
    trace.hash = h;
    trace.count += 1;
    trace.kinds[kind] = trace.kinds[kind]! + 1;
  }
  trace.read = R.written;
}

export function encodeLog(log: readonly Command[]): string {
  let tick = 0;
  const out: string[] = [];
  for (const command of log) {
    const delta = command.tick - tick;
    tick = command.tick;
    if (command.t === "key") out.push(delta.toString(36) + String.fromCharCode(97 + command.letter));
    else if (command.t === "back") out.push(delta.toString(36) + "<");
    else throw new Error("trace: only keys and Backspace are stored");
  }
  return out.join(",");
}

export function decodeLog(text: string): Command[] {
  if (text === "") return [];
  let tick = 0;
  return text.split(",").map((token) => {
    tick += parseInt(token.slice(0, -1), 36);
    const last = token.at(-1)!;
    return last === "<" ? { tick, t: "back" } : { tick, t: "key", letter: last.charCodeAt(0) - 97 };
  });
}
