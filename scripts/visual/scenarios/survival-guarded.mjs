// Runs another scenario after the audits' DevTools guard (alive/lib.mjs guard:
// Chrome's own free port, a lone about:blank first page).
//   SCENARIO=scripts/visual/scenarios/survival-s1-stage.mjs node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-guarded.mjs --width=1280 --height=720
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { guard } from "./alive/lib.mjs";

export default async function (page) {
  const target = process.env.SCENARIO;
  if (!target) throw new Error("guarded: set SCENARIO to a scenario file");
  const checked = await guard(page);
  const scenario = (await import(pathToFileURL(resolve(target)).href)).default;
  return { guard: checked, scenario: target, result: await scenario(page) };
}
