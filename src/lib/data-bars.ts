// The Data Bars Rule (DESIGN.md §2): a 0..1 share as a CSS width in percent, for DistributionBar and PaceBar.
// Clamped to 0..100 and rounded to two decimals; anything that is not a finite number draws nothing.
export function barPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  const clamped = Math.min(1, Math.max(0, value))
  return Math.round(clamped * 10000) / 100
}
