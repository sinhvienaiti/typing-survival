/** AL-12 (title and menus): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-12 edits this file. */
import { row, type CoverageRow } from "./types";

const OWNER = "AL-12";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "screen.title", ["M008", "M009", "M010", "M011", "M012", "M013", "M014"], ["fx.title.parallax", "fx.title.logo", "fx.menu.focus"], ["title.sting", "ui.move", "ui.select"], "k"),
  row(OWNER, "screen.settings", ["M015"], ["fx.options.meter", "fx.menu.focus"], ["ui.value", "ui.move"], "k", "code"),
  row(OWNER, "screen.armory", ["M016"], ["fx.armory.gun"], ["ui.move", "ui.select"], "k"),
  row(OWNER, "screen.profile", ["M017"], ["fx.profile.count"], ["stat.tick"], "k"),
  row(OWNER, "screen.pause", ["M025"], ["fx.pause.in", "fx.pause.out"], ["pause.in", "pause.out"], "k"),
  row(OWNER, "ui.focus.move", ["M010", "M023"], ["fx.menu.focus"], ["ui.move"], "k"),
  row(OWNER, "ui.select", ["M010", "M023"], ["fx.menu.press"], ["ui.select"], "k"),
  row(OWNER, "ui.back", ["M023"], ["fx.menu.back"], ["ui.back"], "k"),
  row(OWNER, "ui.value.change", ["M011", "M015"], ["fx.value.slide"], ["ui.value"], "k"),
  row(OWNER, "ui.autopause", ["M025"], ["fx.pause.in"], ["pause.in"], "k"),
];
