/**
 * Typed words go to the portal's learning record (kit learning bridge).
 * Inside the portal they are posted to it; played alone they wait in a
 * local queue the bridge sends the next time the game runs in the portal.
 * Learning never stops the fight: any failure is dropped.
 */
import { buildCombatLearningEvent, createLearningBridge, type LearningBridge } from "../kit/learning";
import type { Word } from "./vocab";

/** This game's id in portal/public/games.json. */
export const GAME_ID = "typing-survival";

let bridge: LearningBridge | null = null;

/** One finished word: "correct" when typed without a wrong key. */
export function reportWord(word: Word, perfect: boolean): void {
  try {
    bridge ??= createLearningBridge({ gameId: GAME_ID });
    bridge.sendAttempt(buildCombatLearningEvent({ gameId: GAME_ID, entry: { id: word.en, en: word.en, vi: word.vi, ipa: word.ipa }, perfect }));
  } catch {
    // The record is a bonus; the fight goes on without it.
  }
}
