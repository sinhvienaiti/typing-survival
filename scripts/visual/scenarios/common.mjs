// Source: games/space-typing/scripts/visual/scenarios/common.mjs (trimmed to what the survival-s0 scenarios use)
import { join, resolve } from "node:path";

/** The dev server (window.__survival exists only there). */
export const DEV_URL = process.env.URL ?? "http://127.0.0.1:3007/";
/** Output folder (Git ignores tmp/). */
export const OUT_DIR = resolve(process.env.OUT_DIR ?? "tmp/visual");

export const out = (name) => join(OUT_DIR, name);
