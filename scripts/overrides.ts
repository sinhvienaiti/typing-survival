/**
 * Runtime overrides of the content numbers for tuning rounds (docs/BUILD_S1.md
 * §11.3): `--set=RAY.damage=110,TAN.shield=0.8,c1-s1.drainRate=2,c1-s4.packs.shield.share*=0.8`.
 * A key is a dotted path into an exported content constant (guns, foes,
 * rules, balance, stage rules) or into a stage by its id; `=` sets a number,
 * `*=` multiplies it. Only numeric leaves that exist change, except a
 * stage's optional `drainRate` and `drainFrom`.
 *
 * Import this module before anything from src/sim: modules that read a
 * number when they load (tan.ts's pellet life, phao.ts's grid) then see the
 * new one. Fields derived inside guns.ts itself (GUN_SPECS: names, nominal
 * magazine damage) keep their committed values. Nothing here is used by the
 * game; a committed number change goes into src/content.
 */
import * as balance from "../src/content/balance";
import { stageById, isStageId } from "../src/content/chapter-1";
import * as foes from "../src/content/foes";
import * as guns from "../src/content/guns";
import * as rules from "../src/content/rules";
import * as stageRules from "../src/content/stage-rules";

type Node = Record<string, unknown>;
const ROOTS: Record<string, unknown> = { ...balance, ...foes, ...guns, ...rules, ...stageRules };
const STAGE_OPTIONAL = ["drainRate", "drainFrom"];

/** Applies `spec` (comma-separated `path=value` or `path*=value`); returns one "path old→new" line each and an undo. */
export function applySet(spec: string): { lines: string[]; undo: () => void } {
  const undo: (() => void)[] = [];
  const lines: string[] = [];
  for (const item of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const match = /^([\w.-]+?)(\*?=)(-?[\d.]+)$/.exec(item);
    if (match === null) throw new Error("--set: cannot read " + item);
    const [, path, op, text] = match;
    const value = Number(text);
    if (!Number.isFinite(value)) throw new Error("--set: not a number in " + item);
    const keys = path!.split(".");
    const head = keys.shift()!;
    const stage = isStageId(head);
    let node = (stage ? stageById(head) : ROOTS[head]) as Node | undefined;
    if (node === undefined || typeof node !== "object") throw new Error("--set: unknown " + head);
    const leaf = keys.pop();
    if (leaf === undefined) throw new Error("--set: no field in " + item);
    for (const key of keys) {
      const next = node[key];
      if (next === null || typeof next !== "object") throw new Error("--set: no " + key + " in " + item);
      node = next as Node;
    }
    const had = Object.prototype.hasOwnProperty.call(node, leaf);
    const old = node[leaf];
    if (!(typeof old === "number" || (!had && stage && keys.length === 0 && STAGE_OPTIONAL.includes(leaf)))) throw new Error("--set: " + item + " is not a number field");
    const before = typeof old === "number" ? old : 1;
    const target = node;
    target[leaf] = op === "*=" ? before * value : value;
    lines.push(path + " " + (had ? String(old) : "—") + "→" + String(target[leaf]));
    undo.push(() => {
      if (had) target[leaf] = old;
      else delete target[leaf];
    });
  }
  return { lines, undo: () => undo.reverse().forEach((f) => f()) };
}

const spec = process.argv.find((a) => a.startsWith("--set="))?.slice(6);
if (spec !== undefined && spec !== "") console.error("--set: " + applySet(spec).lines.join(", "));
