import { GUN, type GunId } from "../content/guns";
import { loadProgress } from "./journey";
import type { TextStore } from "./skill";

export const GUIDE_KEY = "survival.guide";
export const RECOMMENDED: Readonly<Partial<Record<string, readonly GunId[]>>> = { "c1-s1": [GUN.xung, GUN.tia] };
export const START_NOTE = "Press Enter to start. Guns fire on their own; type words to load them.";
export const LOAD_HINT = "Type a word on a bay to load its gun";
type Guide = { started: boolean; hint: boolean };

export function loadGuide(store: TextStore): Guide {
  if (Object.keys(loadProgress(store).passed).length > 0) return { started: true, hint: true };
  try {
    const data: unknown = JSON.parse(store.getItem(GUIDE_KEY) ?? "null");
    if (data !== null && typeof data === "object" && "started" in data && "hint" in data && typeof data.started === "boolean" && typeof data.hint === "boolean") {
      return { started: data.started, hint: data.hint };
    }
  } catch {
    // Unavailable storage or a broken record starts over.
  }
  return { started: false, hint: false };
}

function mark(store: TextStore, field: keyof Guide): void {
  const data = loadGuide(store);
  data[field] = true;
  try {
    store.setItem(GUIDE_KEY, JSON.stringify(data));
  } catch {
    // Guidance must not block play when storage is full.
  }
}

export const markStarted = (store: TextStore): void => mark(store, "started");
export const markHintDone = (store: TextStore): void => mark(store, "hint");

/** One page's loading hint, with one persistence attempt after two loads. */
export class LoadHint {
  private done: boolean;
  constructor(private readonly store: TextStore) {
    this.done = loadGuide(store).hint;
  }

  text(mode: string, loads: number): string {
    if (!this.done && loads >= 2) {
      this.done = true;
      markHintDone(this.store);
    }
    return !this.done && mode === "play" && loads < 2 ? LOAD_HINT : "";
  }
}

export function noticeFor(ime: boolean, offline: boolean, hint: string): { text: string; kind: "warn" | "hint" } {
  if (ime) return { text: "Switch to an English keyboard", kind: "warn" };
  if (offline) return { text: "Offline word list (server words unavailable)", kind: "warn" };
  return { text: hint, kind: hint === "" ? "warn" : "hint" };
}
