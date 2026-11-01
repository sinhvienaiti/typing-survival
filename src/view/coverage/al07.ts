/** AL-07 (the HUD): its rows of the coverage table (ALIVE_PLAN §2, §2.16). Only AL-07 edits this file. */
import { NO_SOUND, row, type CoverageRow } from "./types";

const OWNER = "AL-07";

export const ROWS: readonly CoverageRow[] = [
  row(OWNER, "ev.support", ["M078", "M111"], ["fx.repair.ring", "fx.repair.hud"], ["support.repair"], "k"),
  row(OWNER, "ev.objective", ["M073", "M076"], ["fx.objective.plate", "fx.leader.down"], ["leader.down", "objective.tick"], "k"),
  row(OWNER, "screen.hud", ["M044", "M045", "M046", "M047", "M048", "M049", "M050", "M051", "M052", "M053", "M054", "M055", "M056", "M057", "M058", "M059", "M060", "M061", "M062", "M063", "M064", "M065", "M066", "M067", "M068", "M069", "M070", "M071", "M072", "M073", "M074", "M075", "M076", "M077", "M078", "M079", "M080"], ["fx.hud.enter"], ["\u2014"], "y"),
  row(OWNER, "screen.notice", ["M077", "M151"], ["fx.notice.slide"], ["notice.warn"], "k"),
  row(OWNER, "ui.combo.up", ["M064"], ["fx.combo.tier"], ["streak.up", "combo.tier"], "k"),
  row(OWNER, "ui.combo.break", ["M065"], ["fx.combo.break"], ["streak.break"], "k"),
  row(OWNER, "ui.banner", ["M069", "M070", "M071"], ["fx.banner.slam"], ["banner.swish"], "k"),
  row(OWNER, "ui.newfoe.card", ["M072"], ["fx.newfoe.card"], ["newfoe.sting"], "k"),
  row(OWNER, "ui.objective", ["M073"], ["fx.objective.plate"], ["objective.tick"], "k"),
  row(OWNER, "ui.clock.last10", ["M076"], ["fx.clock.urgent"], ["clock.tick"], "k"),
  row(OWNER, "ui.hull.low", ["M063"], ["fx.hull.low"], ["lowhull.loop"], "y"),
  row(OWNER, "ui.notice", ["M151", "M077"], ["fx.notice.slide"], ["notice.warn"], "k"),
];
