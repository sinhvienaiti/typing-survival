/**
 * Hành trình (docs/BUILD_S1.md §4, R1 part): choose a stage of chapter 1
 * (opened one by one as the one before is passed) → its briefing → the
 * loadout (2 of the 5 guns, keys 1–5 or ← →, Enter) → the fight, with the
 * stage's reference kit (§4.1 "Chơi một ải lẻ": its bays, Rèn levels to the
 * guns in the order picked, armour). The choice survives the page reload
 * that starts a fight (sessionStorage `survival.next`; ?stage=&guns= for
 * the scenarios). Stars per stage and mode live in `survival.stages`.
 * No DOM here: the host draws (view/screens-journey.ts) and reloads.
 */
import { CHAPTER_1, isStageId, stageById } from "../content/chapter-1";
import { COUNTERS, COUNTER_ROWS, GUN_IDS, GUN_SPECS, gunByKey, type GunId } from "../content/guns";
import { LEARN_RULES, type Stage } from "../content/stage-rules";
import { stageThreat, uncovered } from "../content/threat";
import type { Mode } from "../content/balance";
import type { KeyAction } from "./input";
import { Menu, type MenuItem } from "./menu";
import type { TextStore } from "./skill";

export const NEXT_KEY = "survival.next";
export const STAGES_KEY = "survival.stages";

/** The card goes back only when its previous screen is known. */
export function introKey(key: string, from: "loadout" | "journey" | "direct"): "back" | "enter" | "none" {
  return key === "Escape" ? (from === "direct" ? "none" : "back") : "enter";
}

/** What the next page plays: a stage and the guns picked for it. */
export type RunChoice = { readonly stage: string; readonly guns: readonly GunId[] };

/** The choice the last page left (once: it is cleared), or the address's ?stage=&guns=; null plays the trial. */
export function takeChoice(session: TextStore & { removeItem?(key: string): void }, params: URLSearchParams): RunChoice | null {
  const fromUrl = params.get("stage");
  if (isStageId(fromUrl) && fromUrl !== "s0") return { stage: fromUrl, guns: parseGuns(params.get("guns"), stageById(fromUrl)) };
  const raw = session.getItem(NEXT_KEY);
  if (raw === null) return null;
  session.setItem(NEXT_KEY, "");
  try {
    const data = JSON.parse(raw) as { stage?: unknown; guns?: unknown };
    if (!isStageId(data.stage) || data.stage === "s0" || !Array.isArray(data.guns)) return null;
    return { stage: data.stage, guns: parseGuns(data.guns.join(","), stageById(data.stage)) };
  } catch {
    return null;
  }
}

/** Gun keys ("ray,tia") → distinct guns for the stage's bays (filled from the first cards when short). */
export function parseGuns(text: string | null, stage: Stage): GunId[] {
  const guns: GunId[] = [];
  for (const key of (text ?? "").split(",")) {
    const gun = gunByKey(key.trim());
    if (gun >= 0 && !guns.includes(gun as GunId) && guns.length < stage.kit.bays) guns.push(gun as GunId);
  }
  for (const gun of GUN_IDS) if (guns.length < stage.kit.bays && !guns.includes(gun)) guns.push(gun);
  return guns;
}

/** Stars by mode and stage (0–3), and the stages passed (in any mode). */
export type Progress = { best: Partial<Record<Mode, Record<string, number>>>; passed: Record<string, true> };

export function loadProgress(store: TextStore): Progress {
  try {
    const raw = JSON.parse(store.getItem(STAGES_KEY) ?? "null") as Partial<Progress> | null;
    if (raw !== null && typeof raw === "object") return { best: raw.best ?? {}, passed: raw.passed ?? {} };
  } catch {
    // A broken record starts over.
  }
  return { best: {}, passed: {} };
}

/** A stage's stars (§4.1): won · armour ≥ 50 % · accuracy ≥ the rule's bar (95 %, 90 % on Thiếu chữ). */
export function starsOf(stage: Stage, won: boolean, armour: number, armourMax: number, accuracy: number): [boolean, boolean, boolean] {
  return [won, won && armour >= armourMax * 0.5, won && accuracy >= LEARN_RULES[stage.learn].starAccuracy];
}

/** Records a finished stage; returns the progress with it. */
export function recordStage(store: TextStore, mode: Mode, stage: string, stars: readonly boolean[]): Progress {
  const progress = loadProgress(store);
  const count = stars.filter(Boolean).length;
  const best = (progress.best[mode] ??= {});
  best[stage] = Math.max(best[stage] ?? 0, count);
  if (stars[0]) progress.passed[stage] = true;
  store.setItem(STAGES_KEY, JSON.stringify(progress));
  return progress;
}

/** Stage n opens once stage n − 1 is passed (stage 1 always). */
export const isOpen = (progress: Progress, index: number): boolean => index <= 1 || progress.passed[CHAPTER_1[index - 2]!.id] === true;

export type JourneyScreen = "stages" | "briefing" | "loadout";

export type JourneyHost = {
  mode(): Mode;
  store: TextStore;
  sound(kind: "move" | "select" | "back"): void;
  /** Redraw the overlay with the journey's view. */
  draw(): void;
  /** Start the fight (the page reloads into it). */
  start(choice: RunChoice): void;
  /** Back to the title screen. */
  back(): void;
};

export type CardView = { readonly gun: GunId; readonly key: string; readonly name: string; readonly title: string; readonly magazine: string; readonly range: string; readonly heavy: boolean; readonly good: string; readonly poor: string; readonly picked: number; readonly level: number; readonly on: boolean };
export type ThreatView = { readonly label: string; readonly weight: number; readonly counters: string; readonly covered: boolean };

/** The journey's state machine: which screen, the selected stage, the loadout's cursor and picks. */
export class Journey {
  screen: JourneyScreen | null = null;
  menu = new Menu([]);
  stage: Stage = CHAPTER_1[0]!;
  cursor = 0;
  picked: GunId[] = [];

  constructor(private readonly host: JourneyHost) {}

  get active(): boolean {
    return this.screen !== null;
  }

  /** The stage select (`focus`: a stage to select). */
  open(focus?: string): void {
    const progress = loadProgress(this.host.store);
    const best = progress.best[this.host.mode()] ?? {};
    const items: MenuItem[] = CHAPTER_1.map((stage) => ({
      id: stage.id,
      label: "Stage " + stage.index + " · " + stage.name + (isOpen(progress, stage.index) ? "  " + "★".repeat(best[stage.id] ?? 0) + "☆".repeat(3 - (best[stage.id] ?? 0)) : ""),
      note: isOpen(progress, stage.index) ? stageNote(stage) : "Clear Stage " + (stage.index - 1) + " to unlock",
      enabled: isOpen(progress, stage.index),
    }));
    items.push({ id: "back", label: "Back", note: "Main menu", enabled: true });
    this.menu = new Menu(items);
    if (focus !== undefined) this.menu.select(focus);
    this.screen = "stages";
    this.host.draw();
  }

  /** A stage's briefing. */
  brief(stage: Stage): void {
    this.stage = stage;
    this.menu = new Menu([
      { id: "loadout", label: "Loadout", note: "Pick " + stage.kit.bays + " of 5 guns", enabled: true },
      { id: "back", label: "Back", note: "Stages", enabled: true },
    ]);
    this.screen = "briefing";
    this.host.draw();
  }

  loadout(): void {
    this.screen = "loadout";
    this.cursor = 0;
    this.picked = this.picked.filter((gun) => GUN_IDS.includes(gun)).slice(0, this.stage.kit.bays);
    this.host.draw();
  }

  close(): void {
    this.screen = null;
  }

  /** Cards of the loadout (the stage's levels go to the guns in the order picked). */
  cards(): CardView[] {
    return GUN_SPECS.map((spec, gun) => {
      const order = this.picked.indexOf(gun as GunId);
      return {
        gun: gun as GunId,
        key: spec.key,
        name: spec.name,
        title: spec.title,
        magazine: spec.magazine,
        range: spec.range,
        heavy: spec.heavy,
        good: rowsWhere(gun, 2),
        poor: rowsWhere(gun, 0),
        picked: order,
        level: order >= 0 ? (this.stage.kit.levels[order] ?? 1) : 0,
        on: this.cursor === gun,
      };
    });
  }

  /** What the stage throws at you, heaviest first, and whether the picked guns answer it. */
  threats(): ThreatView[] {
    const weights = stageThreat(this.stage);
    const open = new Set(uncovered(this.picked, weights));
    return COUNTER_ROWS.filter((row) => weights[row] > 0.02)
      .sort((a, b) => weights[b] - weights[a])
      .map((row) => ({ label: ROW_LABELS[row], weight: weights[row], counters: counterTag(row), covered: this.picked.length === 0 || !open.has(row) }));
  }

  get ready(): boolean {
    return this.picked.length === this.stage.kit.bays;
  }

  private toggle(gun: GunId): void {
    const at = this.picked.indexOf(gun);
    if (at >= 0) this.picked.splice(at, 1);
    else if (this.picked.length < this.stage.kit.bays) this.picked.push(gun);
    else {
      // Every bay taken: say so (a dull tick and the start button lit), instead of nothing.
      this.host.sound("back");
      this.cursor = GUN_IDS.length;
      this.host.draw();
      return;
    }
    this.host.sound("select");
    this.host.draw();
  }

  /** Digits: on the loadout, card n. */
  pick(n: number): void {
    if (this.screen !== "loadout" || n < 1 || n > GUN_IDS.length) return;
    this.cursor = n - 1;
    this.toggle((n - 1) as GunId);
  }

  /** A key on a journey screen; true when it was the journey's. */
  act(action: KeyAction): boolean {
    if (this.screen === null) return false;
    if (this.screen === "loadout") return this.actLoadout(action);
    if (action === "up" || action === "down" || action === "left" || action === "right") {
      if (this.menu.move(action === "up" || action === "left" ? -1 : 1)) {
        this.host.sound("move");
        this.host.draw();
      }
    } else if (action === "enter") this.take();
    else if (action === "pause") this.escape();
    return true;
  }

  private actLoadout(action: KeyAction): boolean {
    const n = GUN_IDS.length;
    if (action === "left" || action === "right" || action === "up" || action === "down") {
      // The cards (0 … 4) and the start button (5).
      this.cursor = (this.cursor + (action === "left" || action === "up" ? -1 : 1) + n + 1) % (n + 1);
      this.host.sound("move");
      this.host.draw();
    } else if (action === "enter") {
      if (this.cursor < n) this.toggle(this.cursor as GunId);
      else if (this.ready) this.begin();
      else this.host.sound("back");
    } else if (action === "pause") this.escape();
    return true;
  }

  /** Enter on the selected menu item (stage select, briefing). */
  take(): void {
    const item = this.menu.current;
    if (item === undefined || !item.enabled) return;
    this.host.sound("select");
    if (item.id === "back") {
      this.escape();
      return;
    }
    if (this.screen === "stages") this.brief(stageById(item.id));
    else if (item.id === "loadout") this.loadout();
  }

  /** The start button (or Enter on it). */
  begin(): void {
    if (!this.ready) return;
    this.host.sound("select");
    this.host.start({ stage: this.stage.id, guns: this.picked.slice() });
  }

  /** Esc: one screen back. */
  escape(): void {
    this.host.sound("back");
    if (this.screen === "loadout") this.brief(this.stage);
    else if (this.screen === "briefing") this.open(this.stage.id);
    else {
      this.close();
      this.host.back();
    }
  }
}

export const ROW_LABELS = {
  swarmFar: "Swarm mid-lane",
  swarmNear: "Swarm at the line",
  scout: "Scouts and shots",
  armoured: "Brute, Pack Leader (armor)",
  shield: "Shield Guard",
  splitter: "Splitter and Shard",
} as const;

/** "khắc: Ray · được: Pháo Sao" for a row. */
export function counterTag(row: (typeof COUNTER_ROWS)[number]): string {
  const names = (mark: number) => GUN_IDS.filter((gun) => COUNTERS[row][gun] === mark).map((gun) => GUN_SPECS[gun]!.name);
  const good = names(2);
  const fair = names(1);
  return (good.length > 0 ? "Best: " + good.join(", ") : "") + (fair.length > 0 ? (good.length > 0 ? " · " : "") + "OK: " + fair.join(", ") : "");
}

/** The rows a gun counters (mark 2) or is poor on (mark 0), as text. */
function rowsWhere(gun: number, mark: number): string {
  return COUNTER_ROWS.filter((row) => COUNTERS[row][gun] === mark).map((row) => ROW_LABELS[row]).join(", ");
}

/** A stage's line on the stage select: objective, hazard, rule. */
export function stageNote(stage: Stage): string {
  const parts = [objectiveText(stage)];
  if (stage.hazard !== null) parts.push("Rift");
  parts.push("Words: " + LEARN_RULES[stage.learn].label);
  return parts.join(" · ");
}

export function objectiveText(stage: Stage): string {
  const o = stage.objective;
  if (o.kind === "hold") return "Hold for " + Math.floor(o.seconds / 60) + ":" + String(o.seconds % 60).padStart(2, "0");
  return "Hunt " + o.need + " of " + o.leaders.length + " Pack Leaders";
}
