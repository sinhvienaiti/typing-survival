/**
 * Typed words go to the portal's learning record (kit learning bridge).
 * With a configured portal they are posted to it; otherwise they wait in a
 * local queue the bridge sends the next time a configured portal is available.
 * Learning never stops the fight: any failure is dropped.
 */
import { buildCombatLearningEvent, type LearningBridge } from "../kit/learning";
import { createPortalBridge, GAME_ID, type PortalBridgeOptions } from "./portal";
import type { Word } from "./vocab";

export { GAME_ID };

let bridge: LearningBridge | null = null;

/** Recreate the module bridge with an injected host/storage for isolated tests. */
export function resetLearningBridge(options?: PortalBridgeOptions): void {
  bridge?.dispose();
  bridge = options ? createPortalBridge(options) : null;
}

/** One finished word: "correct" when typed without a wrong key. */
export function reportWord(word: Word, perfect: boolean): void {
  try {
    bridge ??= createPortalBridge();
    bridge.sendAttempt(buildCombatLearningEvent({ gameId: GAME_ID, entry: { id: word.en, en: word.en, vi: word.vi, ipa: word.ipa }, perfect }));
  } catch {
    // The record is a bonus; the fight goes on without it.
  }
}
