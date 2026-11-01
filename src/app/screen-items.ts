/**
 * What each screen over the fight shows (moved from main.ts by ALIVE_PLAN
 * AL-00 so the screen packages of waves 3–4 do not edit main.ts): items()
 * lists a screen's menu items, view() the data screens.ts draws. They read
 * the page's state through ScreenState (main.ts hands it getters), never
 * change it.
 */
import { MODE_SPECS } from "../content/balance";
import { CHAPTER_1, type stageById } from "../content/chapter-1";
import { GUN_SPECS } from "../content/guns";
import type { Tier } from "../content/rules";
import { LEARN_RULES } from "../content/stage-rules";
import { STAGE_S0 } from "../content/stage-s0";
import type { World } from "../sim/world";
import type { SkillProfile, SkillUpdate } from "../kit/balance";
import type { ScreenView } from "../view/screens";
import { starRow } from "../view/screens-journey";
import type { Pilot } from "../view/pilot";
import { objectiveText } from "./journey";
import type { Menu, MenuItem } from "./menu";
import { motionPreference, type MotionPreference } from "./motion";
import { adviceText, countedText, profileView, runStats, runWords } from "./results";
import type { Settings } from "./settings";
import { skillReport } from "./skill";
import type { Word } from "./vocab";

/** What the overlay shows: a menu screen, or nothing in a running fight. */
export type Screen = "title" | "settings" | "armory" | "profile" | "pause" | "end" | "intro" | "none";
/** Every Screen (the coverage table, src/view/coverage, has a row for each but "none"). */
export const SCREENS = ["title", "settings", "armory", "profile", "pause", "end", "intro", "none"] as const satisfies readonly Screen[];

export const TIER_NAMES: Record<Tier, string> = { low: "Low", medium: "Medium", high: "High", ultra: "Ultra" };
export const PILOT_NAMES: Record<Pilot, string> = { vanguard: "Vanguard", draconis: "Draconis" };
const MOTION_NAMES: Record<MotionPreference, string> = { full: "Off", system: "System", reduced: "On" };

/** The page's state the screens read (main.ts: getters over its own variables). */
export type ScreenState = {
  readonly menu: Menu;
  /** A run has begun (the title offers "Resume"; ship and quality wait for the next page). */
  readonly started: boolean;
  /** Models in, programs warmed, a frame drawn. */
  readonly live: boolean;
  readonly level: ReturnType<typeof stageById>;
  readonly world: World;
  readonly settings: Settings;
  readonly profile: SkillProfile;
  readonly settled: SkillUpdate | null;
  /** A stage run's stars when it ended. */
  readonly stars: boolean[] | null;
  /** The ship and quality this page plays, and the ones Options picked for the next. */
  readonly pilot: Pilot;
  readonly tier: Tier;
  readonly chosen: { readonly pilot: Pilot; readonly tier: Tier };
  readonly shakeAllowed: boolean;
  wordOf(index: number): Word;
  /** Deck words finished for the first time ever in this run (the results' new badge). */
  readonly firstTime: ReadonlySet<number>;
};

const percent = (value: number): string => Math.round(value * 100) + "%";
const onOff = (on: boolean): string => (on ? "On" : "Off");

export function items(which: Screen, state: ScreenState): MenuItem[] {
  const { started, level, settings, chosen, shakeAllowed, world } = state;
  const nextRun = (): string | undefined => (started ? "Applies next run" : undefined);
  switch (which) {
    case "title":
      return [
        { id: "journey", icon: "icon-menu-journey", label: "Campaign", note: "Chapter 1 · stages 1–" + CHAPTER_1.length + " · pick stage and guns", enabled: true },
        { id: "start", icon: "icon-clock", label: started ? "New trial" : "Trial", note: started ? "Abandon " + (level.id === "s0" ? "this run" : "Stage " + level.index) + " for a new trial" : "Pulse Gun and Heat Beam · hold for " + STAGE_S0.seconds / 60 + " min", enabled: true },
        { id: "continue", icon: "icon-menu-play", label: "Resume", note: started ? "Back to your paused run" : "No run to resume", enabled: started },
        { id: "mode", icon: "icon-menu-mode", label: "Mode", value: MODE_SPECS[settings.mode].label, note: nextRun() ?? MODE_SPECS[settings.mode].note, enabled: true },
        { id: "profile", icon: "icon-menu-profile", label: "Profile", note: "Speed, accuracy, advice", enabled: true },
        { id: "settings", icon: "icon-menu-settings", label: "Options", note: "Audio, shake, pace, ship, graphics", enabled: true },
        { id: "armory", icon: "icon-menu-armory", label: "Armory · Learning", note: "5 guns: ammo, range; how learning works", enabled: true },
      ];
    case "settings": {
      const later = started ? "End your run to change this" : undefined;
      return [
        { id: "sfx", icon: "icon-sfx", label: "Effects", value: percent(settings.sfxVolume), level: settings.sfxVolume, enabled: true },
        // The Sound panel's music art (a note), so Options and the panel match (UI pass 3).
        { id: "music", icon: "vol-music", label: "Music", value: percent(settings.musicVolume), level: settings.musicVolume, enabled: true },
        { id: "shake", icon: "icon-shake", label: "Screen shake", value: onOff(settings.screenShake), note: shakeAllowed ? undefined : "Disabled by ?shake=0", enabled: true },
        { id: "motion", icon: "icon-reduced-motion", label: "Reduce motion", value: MOTION_NAMES[motionPreference()], note: "No ship drift or lunges; no letter bounce", enabled: true },
        { id: "speak", icon: "icon-read-aloud", label: "Read words aloud", value: onOff(settings.pronunciationEnabled), enabled: true },
        { id: "adapt", icon: "icon-pace-director", label: "Adapt pace to your typing", value: onOff(settings.paceAdapt), note: nextRun() ?? (settings.paceAdapt ? "Swarm density follows your profile" : "Fixed pace throughout the run"), enabled: true },
        { id: "pilot", icon: "icon-ship", label: "Ship", value: PILOT_NAMES[chosen.pilot], note: later, enabled: !started },
        { id: "quality", icon: "icon-quality", label: "Graphics", value: TIER_NAMES[chosen.tier], note: later, enabled: !started },
        { id: "done", icon: "icon-check", label: "Done", enabled: true },
      ];
    }
    case "armory":
    case "profile":
      return [{ id: "back", icon: "icon-back", label: "Back", enabled: true }];
    case "pause":
      return [
        { id: "resume", icon: "icon-menu-play", label: "Resume", note: "Esc", enabled: true },
        { id: "settings", icon: "icon-menu-settings", label: "Options", note: "Audio, shake, speech", enabled: true },
        { id: "title", icon: "icon-back", label: "Main menu", note: "Your run stays paused", enabled: true },
      ];
    case "end": {
      const next = world.phase === "won" ? CHAPTER_1[level.index] : undefined;
      const list: MenuItem[] = [
        ...(next !== undefined ? [{ id: "next", icon: "icon-next-stage", art: "stage-" + next.id, label: "Stage " + next.index, note: next.name, enabled: true }] : []),
        { id: "replay", icon: "icon-retry", label: level.id === "s0" ? "Retry" : "Retry stage", enabled: true },
        ...(level.id === "s0" ? [] : [{ id: "stages", icon: "icon-menu-journey", label: "Stages", note: "Campaign", enabled: true }]),
        { id: "title", icon: "icon-back", label: "Main menu", note: "Esc", enabled: true },
      ];
      // Enter takes the first item (the one selected): the key is named there.
      list[0] = { ...list[0]!, note: (list[0]!.note ? list[0]!.note + " · " : "") + "Enter" };
      return list;
    }
    default:
      return [];
  }
}

export function view(which: Screen, state: ScreenState): ScreenView | null {
  const { menu, started, live, level, world, settings, profile, settled, stars, pilot, tier, wordOf, firstTime } = state;
  switch (which) {
    case "title":
      return {
        kind: "title",
        menu,
        lead: "The Black Hole Horde is coming. Type words to reload your guns; they fire on their own. Flawless words pierce armor and crit.",
        status: "SHIP " + PILOT_NAMES[pilot].toUpperCase() + " · GFX " + TIER_NAMES[tier].toUpperCase() + " · " + MODE_SPECS[settings.mode].label.toUpperCase(),
      };
    case "profile":
      return { kind: "profile", menu, ...profileView(profile, settings.mode, settings.paceAdapt) };
    case "settings":
      return { kind: "settings", menu, note: started ? "" : "Changing ships or graphics reloads the page when you press Done." };
    case "armory":
      return {
        kind: "armory",
        menu,
        guns: GUN_SPECS.map((gun) => ({ kind: gun.key, name: gun.name, title: gun.title, text: gun.magazine + (gun.trial ? " (" + gun.trial + ")" : "") + ", range " + gun.range + (gun.heavy ? ", words up to 1 letter longer" : "") + "." })),
        learning: [
          "Flawless words pierce armor (it blocks only 75%) and crit more often; in the Trial they hit 6% harder.",
          "Every word you finish goes into your learning log, shared across the portal's games.",
        ],
      };
    case "pause":
      return { kind: "pause", menu };
    case "intro":
      return {
        kind: "intro",
        title: level.id === "s0" ? "TRIAL" : "STAGE " + level.index + " · " + level.name.toUpperCase(),
        lines: [level.id === "s0" ? "Hold the lane for " + STAGE_S0.seconds / 60 + " min" : objectiveText(level), world.header.kit.guns.map((gun) => GUN_SPECS[gun]!.name).join(" · ")],
        ready: live, stage: level.id === "s0" ? undefined : level.id, guns: world.header.kit.guns.map((gun) => GUN_SPECS[gun]!.key),
      };
    case "end": {
      const report = skillReport(profile, settings.mode);
      return {
        kind: "end",
        menu,
        stage: level.id === "s0" ? "" : "Stage " + level.index + " · " + level.name,
        stars: stars === null ? "" : starRow(stars, LEARN_RULES[level.learn].starAccuracy),
        mode: MODE_SPECS[world.header.mode].label,
        advice: adviceText(report, settled, world.phase === "won"),
        note: [countedText(settled, report), report.suggestionText].filter(Boolean).join(" "),
        won: world.phase === "won",
        stats: runStats(world),
        words: runWords(world, wordOf, (index) => firstTime.has(index)),
      };
    }
    default:
      return null;
  }
}
