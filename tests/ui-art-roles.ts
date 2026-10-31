/**
 * The icons and parts wired on 31/10 (tickets 149–153, their retries 237–240,
 * the sliders of 225): each role, the art-src source Claude accepted and the
 * ticket whose pick it is. Where a retry won, the canonical file holds the
 * retry's pick (237–240 reports: backed up, then overwritten in place).
 * Ticket 242 (accepted 31/10 17:05, graded at real size): seven icons
 * redrawn as bold silhouettes (`.r2` sources) and the new Words stat.
 * Ticket 243 (accepted 31/10 17:40, at real size): the menu's Options gear
 * redrawn, the Options Ship row's icon and the three typing-effect rows' of
 * the quick Settings panel; 244 (18:00): the slider's lit fill.
 */
export const ICONS: Readonly<Record<string, { source: string; ticket: string }>> = {
  // 149 HUD
  "icon-armour": { source: "ui/icons/armour", ticket: "149" },
  "icon-clock": { source: "ui/icons/clock.r2", ticket: "242" },
  "icon-kills": { source: "ui/icons/kills.r2", ticket: "242" },
  "icon-surge": { source: "ui/icons/surge", ticket: "149" },
  "icon-repair-pod": { source: "ui/icons/repair-pod", ticket: "149" },
  "icon-keyboard": { source: "ui/icons/keyboard.r2", ticket: "242" },
  "icon-check": { source: "ui/icons/check", ticket: "149" },
  "icon-bay-full": { source: "ui/icons/bay-full.r2", ticket: "242" },
  "icon-streak": { source: "ui/icons/streak", ticket: "237" },
  "icon-lock": { source: "ui/icons/lock", ticket: "149" },
  // 150 stage card and loadout
  "icon-objective": { source: "ui/icons/objective", ticket: "238" },
  "icon-hazard": { source: "ui/icons/hazard.r2", ticket: "242" },
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
  "icon-menu-settings": { source: "ui/icons/menu-settings.r2", ticket: "243" },
  "icon-menu-profile": { source: "ui/icons/menu-profile", ticket: "151" },
  "icon-star-lit": { source: "ui/icons/star-lit", ticket: "151" },
  "icon-star-unlit": { source: "ui/icons/star-unlit", ticket: "151" },
  "icon-retry": { source: "ui/icons/retry", ticket: "151" },
  "icon-next-stage": { source: "ui/icons/next-stage.r2", ticket: "242" },
  "icon-stat-time": { source: "ui/icons/stat-time", ticket: "151" },
  "icon-stat-accuracy": { source: "ui/icons/stat-accuracy.r2", ticket: "242" },
  "icon-stat-words": { source: "ui/icons/stat-words", ticket: "242" },
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
  // 243 Options and the quick Settings rows
  "icon-ship": { source: "ui/icons/ship", ticket: "243" },
  "icon-letter-style": { source: "ui/icons/letter-style", ticket: "243" },
  "icon-effect-strength": { source: "ui/icons/effect-strength", ticket: "243" },
  "icon-word-size": { source: "ui/icons/word-size", ticket: "243" },
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
  // 244 the groove's lit fill (the kit's fill layer)
  "slider-fill": { source: "ui/quick-settings/sliders/slider-fill", ticket: "244" },
};
/**
 * UI pass 2 (31/10): the ticket 127 frames, drawn as nine-slice borders, and
 * the ticket 180 gear, speakers and Sound row icons. Both were wired before
 * their tickets closed (each verdict says so); the frames are cropped to
 * their painted part with slice lines in source pixels. Ticket 243 redrew the
 * corner gear (it read as a flower) and the Effects and Interface rows' icons.
 */
export const FRAMES: Readonly<Record<string, { source: string; ticket: string }>> = {
  "frame-panel": { source: "ui/frames-epic/panel-large.alpha", ticket: "127" },
  "frame-card": { source: "ui/frames-epic/bay-card.alpha", ticket: "127" },
  "frame-word": { source: "ui/frames-epic/word-plate.alpha", ticket: "127" },
  "frame-plate": { source: "ui/frames-epic/plate-long.alpha", ticket: "127" },
  "frame-button": { source: "ui/frames-epic/button.alpha", ticket: "127" },
  "frame-button-active": { source: "ui/frames-epic/button-active.alpha", ticket: "127" },
  "frame-banner": { source: "ui/frames-epic/banner.alpha", ticket: "127" },
};
const REDRAWN_243 = ["hud-settings", "vol-effects", "vol-interface"];
export const QUICK: Readonly<Record<string, { source: string; ticket: string }>> = Object.fromEntries(
  ["hud-settings", "hud-sound", "hud-sound-muted", "vol-master", "vol-music", "vol-effects", "vol-keyboard", "vol-voice", "vol-interface"].map((role) =>
    [role, REDRAWN_243.includes(role) ? { source: "ui/quick-settings/selected/" + role + ".r2", ticket: "243" } : { source: "ui/quick-settings/selected/" + role, ticket: "180" }]),
);
/**
 * Ticket 245 (accepted 31/10 23:55, at real size): the quick panels' round
 * Close and the six foes' silhouettes for 40 px or less (`<foe>.small`).
 */
export const SILHOUETTES = ["swarm", "scout", "brute", "pack-leader", "shield-guard", "splitter"] as const;
export const WIRED_245: Readonly<Record<string, { source: string; ticket: string }>> = {
  "quick-close": { source: "ui/frames-epic/close", ticket: "245" },
  ...Object.fromEntries(SILHOUETTES.map((foe) => ["foe-" + foe + "-small", { source: "ui/foes/" + foe + ".small", ticket: "245" }])),
};
export const WIRED: readonly string[] = [...Object.keys(ICONS), ...Object.keys(FRAMES), ...Object.keys(QUICK), ...Object.keys(WIRED_245)];
