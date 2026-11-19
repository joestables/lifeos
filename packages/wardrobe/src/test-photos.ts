import { hexToRgb, type Rgb } from './oklab.ts'
import type { Pixels } from './estimate.ts'

/**
 * Test photos for the colour estimate (ADR-0067 3): a garment laid on a
 * bed or a floor as a phone photographs it, made the same way every time.
 * The light falls off towards the corners; the garment has folds, a
 * shadow on the surface around it, and noise as a camera adds; it may be
 * striped, cropped by the frame, or lit with a glare.
 */
export interface Scene {
  garment: string
  background: string
  /** Its outline: a T-shirt, a pair of trousers, or a pair of shoes. */
  shape?: 'tshirt' | 'trousers' | 'shoes'
  /** How much of the frame it fills (1 is its usual size). */
  scale?: number
  /** A second colour in stripes, and the share of the garment it takes. */
  stripes?: { colour: string; share: number }
  /** A bright patch of reflected light on the garment. */
  glare?: boolean
  /** The light: 1 even, lower dimmer in the corners. */
  light?: number
  seed?: number
  size?: number
}

/** A small fast generator, so every photo is the same each run. */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const inPolygon = (x: number, y: number, pts: readonly [number, number][]) => {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!
    const [xj, yj] = pts[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Outlines on a unit square, centred. */
const SHAPES: Record<NonNullable<Scene['shape']>, [number, number][][]> = {
  tshirt: [
    [
      [0.36, 0.18],
      [0.64, 0.18],
      [0.84, 0.27],
      [0.92, 0.42],
      [0.79, 0.47],
      [0.75, 0.4],
      [0.75, 0.84],
      [0.25, 0.84],
      [0.25, 0.4],
      [0.21, 0.47],
      [0.08, 0.42],
      [0.16, 0.27],
    ],
  ],
  trousers: [
    [
      [0.33, 0.12],
      [0.67, 0.12],
      [0.72, 0.9],
      [0.55, 0.9],
      [0.5, 0.38],
      [0.45, 0.9],
      [0.28, 0.9],
    ],
  ],
  shoes: [
    [
      [0.12, 0.42],
      [0.5, 0.36],
      [0.62, 0.46],
      [0.6, 0.56],
      [0.12, 0.56],
    ],
    [
      [0.4, 0.6],
      [0.78, 0.54],
      [0.9, 0.64],
      [0.88, 0.74],
      [0.4, 0.74],
    ],
  ],
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
const scaled = (c: Rgb, k: number): Rgb => ({ r: c.r * k, g: c.g * k, b: c.b * k })

export function photo(scene: Scene): Pixels {
  const size = scene.size ?? 96
  const rand = random(scene.seed ?? 7)
  const garment = hexToRgb(scene.garment)
  const stripe = scene.stripes ? hexToRgb(scene.stripes.colour) : undefined
  const surface = hexToRgb(scene.background)
  const shapes = SHAPES[scene.shape ?? 'tshirt']
  const k = scene.scale ?? 1
  const light = scene.light ?? 0.82
  const data = new Uint8ClampedArray(size * size * 4)
  const inside = (u: number, v: number) => {
    const x = (u - 0.5) / k + 0.5
    const y = (v - 0.5) / k + 0.5
    return shapes.some((s) => inPolygon(x, y, s))
  }
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size
      const v = (py + 0.5) / size
      // Light falling off towards the corners.
      const r2 = (u - 0.45) ** 2 + (v - 0.4) ** 2
      const lit = 1 - (1 - light) * Math.min(1, r2 * 3)
      let c: Rgb
      if (inside(u, v)) {
        const striped =
          stripe && scene.stripes && (v * 12) % 1 < scene.stripes.share ? stripe : garment
        // Folds: soft bands of shade across the garment.
        const fold = 1 - 0.12 * Math.max(0, Math.sin(u * 19 + v * 7)) ** 3
        c = scaled(striped, lit * fold)
        if (scene.glare && (u - 0.42) ** 2 + (v - 0.35) ** 2 < 0.004) c = scaled(c, 1.6)
      } else {
        // The garment's shadow on the surface, just below and right of it.
        const shade = inside(u - 0.02, v - 0.025) ? 0.8 : 1
        c = scaled(surface, lit * shade)
      }
      const i = (py * size + px) * 4
      const n = () => (rand() - 0.5) * 10
      data[i] = clamp(c.r + n())
      data[i + 1] = clamp(c.g + n())
      data[i + 2] = clamp(c.b + n())
      data[i + 3] = 255
    }
  }
  return { width: size, height: size, data }
}
