/**
 * Colours in OKLab, where the distance between two colours follows how
 * different they look (ADR-0067 2–3). Björn Ottosson's conversion, from
 * sRGB through linear light.
 */

/** A colour in OKLab: lightness 0–1, and a and b around 0. */
export interface Lab {
  l: number
  a: number
  b: number
}

/** sRGB, each channel 0–255. */
export interface Rgb {
  r: number
  g: number
  b: number
}

const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, c)) * 255)
}

export function rgbToLab({ r, g, b }: Rgb): Lab {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

export function labToRgb({ l: L, a, b }: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

/** "#1f2a44" → its channels. Upper or lower case; the "#" is needed. */
export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`Not a colour: ${hex}`)
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) }
}

/** Channels → "#1f2a44", lower case, as colours are stored (ADR-0067 5). */
export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

export const hexToLab = (hex: string): Lab => rgbToLab(hexToRgb(hex))
export const labToHex = (lab: Lab): string => rgbToHex(labToRgb(lab))

/** How different two colours look: ΔE in OKLab (0 the same; about 1 black to white). */
export function deltaE(x: Lab, y: Lab): number {
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}
