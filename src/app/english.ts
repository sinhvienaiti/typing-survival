import type { AdviceId } from "../kit/balance";

/** Local copy for presentation; the kit still selects the advice id. */
export const ADVICE_EN: Readonly<Record<AdviceId, string>> = {
  rest: "Your hands are slowing down. Take a few minutes to rest.",
  "slow-down": "You type fast but make mistakes. Slow down for more perfect words.",
  accuracy: "Focus on each letter first. Speed will follow.",
  steady: "Keep a steady, comfortable pace for every word.",
  "new-words": "Read new words' meanings and listen before typing.",
  crowd: "When foes crowd in, finish one word before switching.",
  "keep-going": "You are making steady progress. Keep it up!",
};
