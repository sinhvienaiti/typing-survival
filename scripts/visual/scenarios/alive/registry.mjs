// The scene registry of survival-alive.mjs (docs/ALIVE_PLAN.md §3.0, AL-00):
// every package adds its scenes in its own file here, al<nn>.mjs, exporting
// SCENES = [{ id, mode: "idle" | "flow" | "events", note, run(page, { dir, size }) }].
// No package edits another's file or the runner. tests/registries.test.ts
// loads the registry: ids unique, modes known, each scene runnable.
import { readdirSync } from "node:fs";

export const MODES = ["idle", "flow", "events"];
const here = new URL("./", import.meta.url);

/** Every package's scenes, in file order, each with the file it came from. */
export async function loadScenes() {
  const files = readdirSync(here).filter((name) => /^al\d\d\.mjs$/.test(name)).sort();
  const scenes = [];
  for (const file of files) {
    const { SCENES } = await import(new URL(file, here).href);
    if (!Array.isArray(SCENES)) throw new Error("alive: " + file + " exports no SCENES list");
    for (const scene of SCENES) {
      if (typeof scene.id !== "string" || !MODES.includes(scene.mode) || typeof scene.note !== "string" || typeof scene.run !== "function") throw new Error("alive: a scene in " + file + " lacks an id, a mode (" + MODES.join(", ") + "), a note or run(): " + scene.id);
      scenes.push({ ...scene, from: file });
    }
  }
  const ids = scenes.map((scene) => scene.id);
  const twice = ids.filter((id, k) => ids.indexOf(id) !== k);
  if (twice.length) throw new Error("alive: a scene id is registered twice: " + twice.join(", "));
  return scenes;
}
