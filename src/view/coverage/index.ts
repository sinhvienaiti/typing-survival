/**
 * The coverage table in code (docs/ALIVE_PLAN.md AL-00, M143): every sim
 * event the screen shows (src/sim/events.ts; `plan` is the planner's own),
 * every strip step of the kit's focus strip (TypingFxKind, and the host's
 * hidden letters), every screen and every UI event, each with its VFX and
 * SFX ids, its owner and its §2 rows. Each package edits only its own
 * al<nn>.ts. The debt (sounds made in code or silent, no look, art drawn in
 * code or missing) is derived from the rows; tests/coverage.test.ts keeps
 * the AL-00 snapshot (tests/golden/coverage-debt.txt) from growing for the
 * rows it lists, and fails when an event, a Screen or a TypingFxKind has no
 * row. Nothing here runs in the game.
 */
import { SOUND_IDS } from "../../audio/theme-audio";
import { NO_SOUND, type CoverageRow, type Debt } from "./types";
import { ROWS as AL01 } from "./al01";
import { ROWS as AL02 } from "./al02";
import { ROWS as AL03 } from "./al03";
import { ROWS as AL04 } from "./al04";
import { ROWS as AL05 } from "./al05";
import { ROWS as AL06 } from "./al06";
import { ROWS as AL07 } from "./al07";
import { ROWS as AL08 } from "./al08";
import { ROWS as AL09 } from "./al09";
import { ROWS as AL10 } from "./al10";
import { ROWS as AL11 } from "./al11";
import { ROWS as AL12 } from "./al12";
import { ROWS as AL13 } from "./al13";
import { ROWS as AL14 } from "./al14";
import { ROWS as AL15 } from "./al15";
import { ROWS as AL16 } from "./al16";
import { ROWS as AL17 } from "./al17";

export { NO_SOUND, PACKAGES, row, type CoverageRow, type Debt, type Package } from "./types";

/** Every row, in package order. */
export const COVERAGE: readonly CoverageRow[] = [...AL01, ...AL02, ...AL03, ...AL04, ...AL05, ...AL06, ...AL07, ...AL08, ...AL09, ...AL10, ...AL11, ...AL12, ...AL13, ...AL14, ...AL15, ...AL16, ...AL17];
/** Each package's rows (the file it may edit). */
export const COVERAGE_BY_PACKAGE: Readonly<Record<string, readonly CoverageRow[]>> = { "AL-01": AL01, "AL-02": AL02, "AL-03": AL03, "AL-04": AL04, "AL-05": AL05, "AL-06": AL06, "AL-07": AL07, "AL-08": AL08, "AL-09": AL09, "AL-10": AL10, "AL-11": AL11, "AL-12": AL12, "AL-13": AL13, "AL-14": AL14, "AL-15": AL15, "AL-16": AL16, "AL-17": AL17 };

/** Sim events that never reach the screen (the planner's own step). */
export const INTERNAL_EV: readonly string[] = ["plan"];
/** The host's own strip step beside the kit's TypingFxKind: Missing letters' hidden letters. */
export const HOST_TYPING: readonly string[] = ["mask"];
/** Screens that are not one (a running fight's overlay is empty). */
export const NO_SCREEN: readonly string[] = ["none"];
/** Screens outside main.ts's Screen: the loader, the journey's three, the kit's quick panels and countdown, the HUD layer, the in-fight notice, the Trial's start. */
export const OTHER_SCREENS: readonly string[] = ["loader", "journey-stages", "journey-briefing", "journey-loadout", "quick-settings", "quick-sound", "quick-countdown", "hud", "notice", "trial"];
/** The UI events every screen package answers (AL-00 step 2). */
export const UI_EVENTS: readonly string[] = [
  "screen.enter", "screen.exit", "focus.move", "select", "back", "deny", "value.change", "slider.drag", "toggle", "mute", "panel.open", "panel.close",
  "countdown", "star", "count.up", "newbest", "stage.unlock", "gun.equip", "bay.lock", "bay.release", "key.back", "letter.mask", "letter.reveal",
  "word.perfect", "bay.full", "key.stray", "combo.up", "combo.break", "banner", "newfoe.card", "objective", "clock.last10", "hull.low", "notice", "autopause",
];

/** What the game has today that needs a row: the EV names, Screen values, journey screens, TypingFxKind values. */
export type CoverageSources = { ev: Readonly<Record<string, number>>; screens: readonly string[]; journey: readonly string[]; typing: readonly string[] };

/** The keys with no row, or a row with an empty cell (no VFX id, no SFX id, no §2 row): [] when the table is whole. */
export function coverageGaps(sources: CoverageSources, rows: readonly CoverageRow[] = COVERAGE): string[] {
  const keys = new Set(rows.map((entry) => entry.key));
  const need = [
    ...Object.keys(sources.ev).filter((name) => !INTERNAL_EV.includes(name)).map((name) => "ev." + name),
    ...[...sources.typing, ...HOST_TYPING].map((kind) => "typing." + kind),
    ...sources.screens.filter((name) => !NO_SCREEN.includes(name)).map((name) => "screen." + name),
    ...sources.journey.map((name) => "screen.journey-" + name),
    ...OTHER_SCREENS.map((name) => "screen." + name),
    ...UI_EVENTS.map((name) => "ui." + name),
  ];
  const gaps = need.filter((key) => !keys.has(key));
  for (const entry of rows) if (entry.vfx.length === 0 || entry.sfx.length === 0 || entry.rows.length === 0) gaps.push(entry.key + " (empty cell)");
  return gaps;
}

const coded = new Set<string>(SOUND_IDS);

/** The debt the rows carry today: each sound id made in code or not made yet, each row with no look, art drawn in code or missing. */
export function coverageDebt(rows: readonly CoverageRow[] = COVERAGE): Debt[] {
  const out: Debt[] = [];
  for (const entry of rows) {
    for (const id of entry.sfx) if (id !== NO_SOUND) out.push({ key: entry.key, kind: coded.has(id) ? "sfx-code" : "sfx-none", id, owner: entry.owner });
    if (entry.look === "k") for (const id of entry.vfx) out.push({ key: entry.key, kind: "vfx-none", id, owner: entry.owner });
    if (entry.art !== undefined) out.push({ key: entry.key, kind: entry.art === "code" ? "art-code" : "art-none", id: entry.key, owner: entry.owner });
  }
  return out;
}

/** A debt line as the snapshot keeps it. */
export const debtLine = (debt: Debt): string => debt.owner + " " + debt.key + " " + debt.kind + " " + debt.id;
