// The "alive" measure (docs/ALIVE_PLAN.md §1.3, AL-00 step 6): a registry of
// scenes, one file a package in scripts/visual/scenarios/alive/<package>.mjs
// (alive/registry.mjs loads them), run in one Chrome after the audits'
// DevTools guard (Chrome's own free port, a lone about:blank first page).
// MODE= picks modes (idle,flow,events; all by default), SCENES= picks scene
// ids. Each scene's numbers go to <OUT_DIR>/alive/<size>/<scene>.json and its
// frames into a contact sheet <scene>.jpg beside it; prune the raw frames
// after (tools/capture-prune in the parent repo). Needs the scenarios' handle:
// the dev server, or a production build with PAGE_QUERY="&debug=1".
//   URL=http://127.0.0.1:3007/ node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-alive.mjs --width=1280 --height=720
import { join } from "node:path";
import { out } from "./common.mjs";
import { guard, save, sheet } from "./alive/lib.mjs";
import { loadScenes } from "./alive/registry.mjs";

const modes = (process.env.MODE ?? "idle,flow,events").split(",");
const only = process.env.SCENES ? process.env.SCENES.split(",") : null;

export default async function (page) {
  const checked = await guard(page);
  const size = page.width + "x" + page.height;
  const result = { guard: checked, size, scenes: {} };
  for (const scene of await loadScenes()) {
    if (!modes.includes(scene.mode) || (only && !only.includes(scene.id))) continue;
    const dir = out(join("alive", size, scene.id));
    const started = Date.now();
    try {
      const { sheet: rows = [], ...numbers } = await scene.run(page, { dir, size });
      const picture = rows.length ? sheet(rows, out(join("alive", size, scene.id + ".jpg")), Math.min(6, rows.length)) : null;
      result.scenes[scene.id] = { mode: scene.mode, from: scene.from, note: scene.note, seconds: Math.round((Date.now() - started) / 100) / 10, sheet: picture, ...numbers };
    } catch (error) {
      result.scenes[scene.id] = { mode: scene.mode, from: scene.from, error: String(error?.message ?? error) };
    }
    save(out(join("alive", size)), scene.id, result.scenes[scene.id]);
  }
  save(out(join("alive", size)), "summary", result);
  return result;
}
