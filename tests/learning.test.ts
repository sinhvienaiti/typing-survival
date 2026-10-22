import { describe, expect, it } from "vitest";
import { GAME_ID, reportWord } from "../src/app/learning";
import { createLearningBridge } from "../src/kit/learning";

/**
 * A finished word reaches the learning record as this game: played alone
 * (no portal), it waits in the bridge's queue under gameId "typing-survival".
 */
describe("learning events", () => {
  it("a typed word is queued as typing-survival, correct when typed without a wrong key", () => {
    expect(GAME_ID).toBe("typing-survival");
    reportWord({ en: "River", vi: "sông", ipa: "/ˈrɪvər/" }, true);
    reportWord({ en: "house", vi: "ngôi nhà", ipa: "" }, false);
    const queued = createLearningBridge({ gameId: GAME_ID }).queued();
    expect(queued.map((event) => [event.gameId, event.entityId, event.result, event.activityType])).toEqual([
      ["typing-survival", "river", "correct", "typing"],
      ["typing-survival", "house", "wrong", "typing"],
    ]);
  });
});
