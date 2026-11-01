/** AL-14 (the quick panels and the countdown): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-14 edits this file. */
import { row, type CoverageRow } from "./types";

const OWNER = "AL-14";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "screen.quick-settings", ["M018", "M020", "M152"], ["fx.panel.open", "fx.panel.preview"], ["panel.open", "panel.close"], "k"),
  row(OWNER, "screen.quick-sound", ["M019", "M152"], ["fx.panel.open", "fx.panel.meter"], ["panel.open", "panel.close"], "k"),
  row(OWNER, "screen.quick-countdown", ["M021"], ["fx.countdown.number"], ["countdown.tick", "countdown.go"], "k", "code"),
  row(OWNER, "ui.slider.drag", ["M152"], ["fx.slider.fill"], ["ui.value"], "k"),
  row(OWNER, "ui.toggle", ["M152"], ["fx.toggle.slide"], ["ui.toggle"], "k"),
  row(OWNER, "ui.mute", ["M152"], ["fx.mute.icon"], ["ui.mute"], "k"),
  row(OWNER, "ui.panel.open", ["M018", "M019"], ["fx.panel.open"], ["panel.open"], "k"),
  row(OWNER, "ui.panel.close", ["M018", "M019"], ["fx.panel.close"], ["panel.close"], "k"),
  row(OWNER, "ui.countdown", ["M021"], ["fx.countdown.number", "fx.countdown.go"], ["countdown.tick", "countdown.go"], "k", "code"),
];
