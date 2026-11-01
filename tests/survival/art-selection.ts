/**
 * The UI art selection as one list (ALIVE_PLAN AL-00 split
 * scripts/ui-art/selection.json by area into selection-<area>.json; the
 * entries in prepare.mjs AREAS order, each area's in its own order).
 */
import screens from "../../scripts/ui-art/selection-screens.json";
import intro from "../../scripts/ui-art/selection-intro.json";
import results from "../../scripts/ui-art/selection-results.json";
import journey from "../../scripts/ui-art/selection-journey.json";
import hud from "../../scripts/ui-art/selection-hud.json";
import bays from "../../scripts/ui-art/selection-bays.json";
import strip from "../../scripts/ui-art/selection-strip.json";
import quick from "../../scripts/ui-art/selection-quick.json";

export type SelectionEntry = { role: string; kind: string; source: string | null; accepted: boolean; ticket: string; verdict: string; alt: string; fill?: number; crop?: string; slice?: number[]; provisional?: boolean };
export const SELECTION_AREAS = { screens, intro, results, journey, hud, bays, strip, quick } as const;
export const selection: { version: number; entries: SelectionEntry[] } = {
  version: screens.version,
  entries: Object.values(SELECTION_AREAS).flatMap((part) => part.entries as SelectionEntry[]),
};
