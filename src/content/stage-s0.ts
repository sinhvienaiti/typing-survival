/**
 * The one S0 stage (docs/survival/BUILD_S0.md §3–§4): 180 s, the rainbow
 * family, steady grouped spawns. Rates are foes per second over [from, to);
 * peaks are the two surges.
 */
export type RateSpan = { from: number; to: number; rate: number; peak: 0 | 1 | 2 };

/**
 * The rates are BUILD_S0 §4's table raised in the S0 review (BUILD_NOTES.md
 * §7): with its rates no typist ever saw the 120–160 foes of a surge (at
 * most 108 even with no shot fired), so the calm stretches run ~1.3× and the
 * surges are real floods (15 and 11 a second). Tuned with the typing bots
 * (scripts/survival/balance.ts): a 35 WPM typist sees 40–80 foes in the calm
 * and 120–160 at the surges, and wins.
 */
export const STAGE_S0 = {
  seconds: 180,
  family: "rainbow",
  rates: [
    { from: 0, to: 30, rate: 2.0, peak: 0 },
    { from: 30, to: 60, rate: 3.2, peak: 0 },
    { from: 60, to: 68, rate: 15, peak: 1 },
    { from: 68, to: 90, rate: 3.8, peak: 0 },
    { from: 90, to: 150, rate: 4.2, peak: 0 },
    { from: 150, to: 160, rate: 11, peak: 2 },
    { from: 160, to: 165, rate: 4.2, peak: 0 },
    { from: 165, to: 180, rate: 3.8, peak: 0 },
  ] as readonly RateSpan[],
} as const;

export function spanAt(seconds: number): RateSpan {
  const rates = STAGE_S0.rates;
  for (const span of rates) if (seconds < span.to) return span;
  return rates[rates.length - 1]!;
}
