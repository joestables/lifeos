/**
 * Readiness as a colour on one continuous scale, no bands (Joe, 29 October):
 * red at 0 %, amber at 50 %, green at 100 %, mixed from the meaning tokens.
 */
export function readinessColour(percent: number) {
  const p = Math.max(0, Math.min(100, percent))
  return p <= 50
    ? `color-mix(in oklch, var(--warning) ${p * 2}%, var(--destructive))`
    : `color-mix(in oklch, var(--success) ${(p - 50) * 2}%, var(--warning))`
}
