/**
 * The icons and parts wired on 31/10 (tickets 149–153, their retries 237–240,
 * the sliders of 225): each role, the art-src source Claude accepted and the
 * ticket whose pick it is. Where a retry won, the canonical file holds the
 * retry's pick (237–240 reports: backed up, then overwritten in place).
 */
export const ICONS: Readonly<Record<string, { source: string; ticket: string }>> = {
  // 149 HUD
  "icon-armour": { source: "ui/icons/armour", ticket: "149" },
  "icon-clock": { source: "ui/icons/clock", ticket: "149" },
  "icon-kills": { source: "ui/icons/kills", ticket: "149" },
  "icon-surge": { source: "ui/icons/surge", ticket: "149" },
  "icon-repair-pod": { source: "ui/icons/repair-pod", ticket: "149" },
  "icon-keyboard": { source: "ui/icons/keyboard", ticket: "237" },
  "icon-check": { source: "ui/icons/check", ticket: "149" },
  "icon-bay-full": { source: "ui/icons/bay-full", ticket: "237" },
  "icon-streak": { source: "ui/icons/streak", ticket: "237" },
  "icon-lock": { source: "ui/icons/lock", ticket: "149" },
  // 150 stage card and loadout
  "icon-objective": { source: "ui/icons/objective", ticket: "238" },
  "icon-hazard": { source: "ui/icons/hazard", ticket: "150" },
  "icon-learning-rule": { source: "ui/icons/learning-rule", ticket: "150" },
  "icon-equipment": { source: "ui/icons/equipment", ticket: "150" },
  "icon-warning": { source: "ui/icons/warning", ticket: "150" },
  "icon-new-badge": { source: "ui/icons/new-badge", ticket: "150" },
  "icon-station-crest": { source: "ui/icons/station-crest", ticket: "240" },
  "icon-chapter-crest": { source: "ui/icons/chapter-crest", ticket: "150" },
  "icon-load-guns": { source: "ui/icons/load-guns", ticket: "150" },
  "icon-back": { source: "ui/icons/back", ticket: "150" },
  // 151 menu and results
  "icon-menu-play": { source: "ui/icons/menu-play", ticket: "151" },
  "icon-menu-journey": { source: "ui/icons/menu-journey", ticket: "239" },
  "icon-menu-mode": { source: "ui/icons/menu-mode", ticket: "151" },
  "icon-menu-armory": { source: "ui/icons/menu-armory", ticket: "239" },
  "icon-menu-settings": { source: "ui/icons/menu-settings", ticket: "151" },
  "icon-menu-profile": { source: "ui/icons/menu-profile", ticket: "151" },
  "icon-star-lit": { source: "ui/icons/star-lit", ticket: "151" },
  "icon-star-unlit": { source: "ui/icons/star-unlit", ticket: "151" },
  "icon-retry": { source: "ui/icons/retry", ticket: "151" },
  "icon-next-stage": { source: "ui/icons/next-stage", ticket: "239" },
  "icon-stat-time": { source: "ui/icons/stat-time", ticket: "151" },
  "icon-stat-accuracy": { source: "ui/icons/stat-accuracy", ticket: "151" },
  // 152 settings, profile, Rift
  "icon-sfx": { source: "ui/icons/sfx", ticket: "152" },
  "icon-music": { source: "ui/icons/music", ticket: "152" },
  "icon-shake": { source: "ui/icons/shake", ticket: "240" },
  "icon-reduced-motion": { source: "ui/icons/reduced-motion", ticket: "240" },
  "icon-read-aloud": { source: "ui/icons/read-aloud", ticket: "152" },
  "icon-pace-director": { source: "ui/icons/pace-director.v2", ticket: "152" },
  "icon-quality": { source: "ui/icons/quality", ticket: "152" },
  "icon-stat-wpm": { source: "ui/icons/stat-wpm.v2", ticket: "152" },
  "icon-stat-new-word": { source: "ui/icons/stat-new-word", ticket: "152" },
  "icon-stat-evenness": { source: "ui/icons/stat-evenness", ticket: "240" },
  "icon-rift": { source: "ui/icons/rift", ticket: "152" },
  // 153 small parts
  "part-keycap": { source: "ui/parts/keycap", ticket: "153" },
  "part-keycap-active": { source: "ui/parts/keycap-active", ticket: "153" },
  "part-led-on": { source: "ui/parts/led-on", ticket: "153" },
  "part-led-off": { source: "ui/parts/led-off", ticket: "153" },
  "part-mag-empty": { source: "ui/parts/mag-empty", ticket: "240" },
  "part-mag-full": { source: "ui/parts/mag-full", ticket: "153" },
  "part-arrow": { source: "ui/parts/arrow", ticket: "153" },
  // 225 the quick panels' sliders
  "slider-thumb": { source: "ui/quick-settings/sliders/slider-thumb", ticket: "225" },
  "slider-track": { source: "ui/quick-settings/sliders/slider-track", ticket: "225" },
};
export const WIRED: readonly string[] = Object.keys(ICONS);
