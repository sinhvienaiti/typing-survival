/**
 * The one S0 stage (docs/survival/BUILD_S0.md §3–§4): 180 s, the rainbow
 * family, steady grouped spawns. Rates are foes per second over [from, to);
 * peaks are the two surges.
 */
export type RateSpan = { from: number; to: number; rate: number; peak: 0 | 1 | 2 };

export const STAGE_S0 = {
  seconds: 180,
  family: "rainbow",
  rates: [
    { from: 0, to: 30, rate: 1.5, peak: 0 },
    { from: 30, to: 60, rate: 2.5, peak: 0 },
    { from: 60, to: 68, rate: 5.0, peak: 1 },
    { from: 68, to: 90, rate: 3.0, peak: 0 },
    { from: 90, to: 150, rate: 3.5, peak: 0 },
    { from: 150, to: 160, rate: 6.5, peak: 2 },
    { from: 160, to: 165, rate: 3.5, peak: 0 },
    { from: 165, to: 180, rate: 3.0, peak: 0 },
  ] as readonly RateSpan[],
} as const;

export function spanAt(seconds: number): RateSpan {
  const rates = STAGE_S0.rates;
  for (const span of rates) if (seconds < span.to) return span;
  return rates[rates.length - 1]!;
}
