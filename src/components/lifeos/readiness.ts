/**
 * Readiness as a colour on one continuous scale, no bands (Joe, 29 October):
 * red (--destructive), amber (--readiness-mid), green (--success), mixed in
 * OKLCH. Most readiness lies between 50 % and 100 %, so that half spans most
 * of the scale: 50 % sits a third of the way along, amber at about 63 %
 * (Joe, 3 November).
 */
export function readinessPosition(percent: number) {
  const p = Math.max(0, Math.min(100, percent))
  return p <= 50 ? (p * 2) / 3 : 100 / 3 + ((p - 50) * 4) / 3
}

const pct = (n: number) => `${Math.round(n * 100) / 100}%`

export function readinessColour(percent: number) {
  const x = readinessPosition(percent)
  return x <= 50
    ? `color-mix(in oklch, var(--readiness-mid) ${pct(x * 2)}, var(--destructive))`
    : `color-mix(in oklch, var(--success) ${pct((x - 50) * 2)}, var(--readiness-mid))`
}
