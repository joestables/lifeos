import { hexToLab } from './oklab.ts'

/** Below this chroma a colour reads as grey: white, greys and black come first. */
const NEUTRAL = 0.035

/**
 * My colours in the order they're listed (WRD-002 3, suggested): the
 * neutrals first, light to dark (White, Grey, Black), then the rest by hue
 * round the wheel from red, and by lightness within a hue, light first.
 */
export function compareColours(x: string, y: string): number {
  const a = hexToLab(x)
  const b = hexToLab(y)
  const ca = Math.hypot(a.a, a.b)
  const cb = Math.hypot(b.a, b.b)
  const na = ca < NEUTRAL
  const nb = cb < NEUTRAL
  if (na !== nb) return na ? -1 : 1
  if (na) return b.l - a.l
  const hue = (l: { a: number; b: number }) => {
    // From red round the wheel, through yellow, green and blue.
    const h = (Math.atan2(l.b, l.a) * 180) / Math.PI
    return (h + 360) % 360
  }
  // Hues within 15° are one hue, light first.
  const ha = Math.floor(hue(a) / 15)
  const hb = Math.floor(hue(b) / 15)
  return ha - hb || b.l - a.l
}
