import { deltaE, hexToLab, type Lab } from './oklab.ts'

/**
 * How close my colours must be to the estimate to be offered (ΔE in
 * OKLab; ADR-0067 3). Set against the test photos: an estimate lands
 * within about 0.02 of the garment's colour (a little darker in a dim
 * room), while colours a person calls different are 0.065 apart or more
 * (navy and black 0.066, teal and denim 0.075). Near ones closer than this
 * are both offered (white and cream, 0.046), the closer first; a teal
 * shirt makes a new Teal rather than taking Denim.
 */
export const CLOSE = 0.06
/** A new colour this close to one of mine is flagged as its near twin: closer than white and cream. */
export const TWIN = 0.035
/** At most this many of my colours are offered (WRD-006 2). */
export const OFFERED = 4

/** One of my colours. */
export interface MyColour {
  id: string
  hex: string
}

/**
 * My colours to offer for an estimate (WRD-006 2–3): those within CLOSE,
 * closest first, at most OFFERED; the first is chosen. None close means a
 * new colour is offered instead.
 */
export function suggestColours<C extends MyColour>(
  estimate: Lab,
  mine: readonly C[],
): { offered: C[]; newColour: boolean } {
  const offered = mine
    .map((c) => ({ c, d: deltaE(estimate, hexToLab(c.hex)) }))
    .filter((x) => x.d <= CLOSE)
    .sort((x, y) => x.d - y.d)
    .slice(0, OFFERED)
    .map((x) => x.c)
  return { offered, newColour: offered.length === 0 }
}

/** The colour of mine a new one is a near twin of (WRD-007 3), if any: the closest. */
export function nearTwin<C extends MyColour>(hex: string, mine: readonly C[]): C | undefined {
  const lab = hexToLab(hex)
  let best: C | undefined
  let bestD = TWIN
  for (const c of mine) {
    const d = deltaE(lab, hexToLab(c.hex))
    if (d <= bestD) {
      bestD = d
      best = c
    }
  }
  return best
}
