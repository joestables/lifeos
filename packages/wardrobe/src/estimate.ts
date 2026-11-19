import { deltaE, labToHex, rgbToLab, type Lab } from './oklab.ts'

/**
 * A photo's pixels, as a canvas gives them: RGBA, row by row. The app
 * scales the photo down to about 100 × 100 first (ADR-0067 2); any size
 * works.
 */
export interface Pixels {
  width: number
  height: number
  data: ArrayLike<number>
}

/** The garment's colour as estimated, and how much of the garment it is (0–1). */
export interface Estimate {
  hex: string
  lab: Lab
  share: number
}

/**
 * Two neighbouring pixels this alike (ΔE, after a light blur) are the same
 * surface: the background spreads across them from the photo's edges, so
 * light falling off gradually is still background, and a garment's
 * outline stops it.
 */
const STEP = 0.03
/**
 * Lightness counts for this much of a step or a shade's difference: a
 * shadow, or a fold's shading, darkens a colour without changing its hue,
 * so the background spreads across a soft shadow, and a garment's shades
 * count together.
 */
const LIGHTNESS = 0.4
/** At least this share of the photo must be left once the background is out. */
const ENOUGH = 0.04
/** Two clusters this close, lightness counting less, are shades of one colour and count together. */
const SAME = 0.07
const CLUSTERS = 5
const ROUNDS = 15
/** The photo is read on a grid of at most this many cells a side. */
const GRID = 120

interface Sample {
  lab: Lab
  weight: number
}

/**
 * The garment's dominant colour in a photo (ADR-0067 2): its pixels in
 * OKLab; the background, spreading in from the photo's edges across alike
 * neighbours, left out; the rest clustered, each pixel counting more the
 * nearer it is to the centre; and shades of one colour counted together,
 * so a fold's shadow joins its garment. When nothing is left once the
 * background is out (a white shirt on a white sheet), the centre is read
 * as it is.
 */
export function estimateColour(pixels: Pixels): Estimate {
  const { width, height, data } = pixels
  if (width < 1 || height < 1 || data.length < width * height * 4) {
    throw new Error('No pixels to read')
  }
  // A grid of cells, each the average of the pixels it covers.
  const step = Math.max(1, Math.ceil(Math.max(width, height) / GRID))
  const cols = Math.ceil(width / step)
  const rows = Math.ceil(height / step)
  const grid: (Lab | null)[] = []
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let y = gy * step; y < Math.min(height, (gy + 1) * step); y++) {
        for (let x = gx * step; x < Math.min(width, (gx + 1) * step); x++) {
          const i = (y * width + x) * 4
          if ((data[i + 3] ?? 255) < 128) continue
          r += data[i]!
          g += data[i + 1]!
          b += data[i + 2]!
          n++
        }
      }
      grid.push(n ? rgbToLab({ r: r / n, g: g / n, b: b / n }) : null)
    }
  }
  const at = (x: number, y: number) => grid[y * cols + x] ?? null
  // A light blur, so a camera's noise doesn't stop the background spreading.
  const smooth = grid.map((c, k) => {
    if (!c) return null
    const x = k % cols
    const y = Math.floor(k / cols)
    let l = 0
    let a = 0
    let b = 0
    let n = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const p =
          x + dx >= 0 && x + dx < cols && y + dy >= 0 && y + dy < rows ? at(x + dx, y + dy) : null
        if (!p) continue
        l += p.l
        a += p.a
        b += p.b
        n++
      }
    }
    return { l: l / n, a: a / n, b: b / n }
  })

  // The background: everything reached from the edges by small steps.
  const background = new Uint8Array(cols * rows)
  const queue: number[] = []
  for (let x = 0; x < cols; x++) queue.push(x, (rows - 1) * cols + x)
  for (let y = 0; y < rows; y++) queue.push(y * cols, y * cols + cols - 1)
  for (const k of queue) background[k] = 1
  while (queue.length) {
    const k = queue.pop()!
    const here = smooth[k]
    if (!here) continue
    const x = k % cols
    const y = Math.floor(k / cols)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const nk = ny * cols + nx
      const there = smooth[nk]
      if (background[nk] || !there) continue
      if (shadeDistance(here, there) < STEP) {
        background[nk] = 1
        queue.push(nk)
      }
    }
  }

  const all: (Sample & { centre: boolean; background: boolean })[] = []
  grid.forEach((lab, k) => {
    if (!lab) return
    const dx = ((k % cols) - (cols - 1) / 2) / (cols / 2)
    const dy = (Math.floor(k / cols) - (rows - 1) / 2) / (rows / 2)
    const r2 = Math.min(1, (dx * dx + dy * dy) / 2)
    // The centre counts four times what a corner does.
    all.push({
      lab,
      weight: 1 - 0.75 * r2,
      centre: Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4,
      background: background[k] === 1,
    })
  })
  if (all.length === 0) throw new Error('No pixels to read')
  let garment = all.filter((p) => !p.background)
  if (garment.length < all.length * ENOUGH) garment = all.filter((p) => p.centre)
  return dominant(garment)
}

/** The heaviest colour among weighted samples: k-means, then shades merged. */
function dominant(samples: Sample[]): Estimate {
  const centres = seed(samples, CLUSTERS)
  let groups: { lab: Lab; weight: number }[] = []
  for (let round = 0; round < ROUNDS; round++) {
    const sums = centres.map(() => ({ l: 0, a: 0, b: 0, w: 0 }))
    for (const p of samples) {
      let best = 0
      let bestD = Infinity
      centres.forEach((c, k) => {
        const d = deltaE(p.lab, c)
        if (d < bestD) {
          bestD = d
          best = k
        }
      })
      const s = sums[best]!
      s.l += p.lab.l * p.weight
      s.a += p.lab.a * p.weight
      s.b += p.lab.b * p.weight
      s.w += p.weight
    }
    groups = sums.map((s, k) =>
      s.w > 0
        ? { lab: { l: s.l / s.w, a: s.a / s.w, b: s.b / s.w }, weight: s.w }
        : { lab: centres[k]!, weight: 0 },
    )
    groups.forEach((g, k) => (centres[k] = g.lab))
  }
  const merged = mergeShades(groups.filter((g) => g.weight > 0))
  const total = merged.reduce((n, g) => n + g.weight, 0)
  const top = merged.reduce((best, g) => (g.weight > best.weight ? g : best))
  return { hex: labToHex(top.lab), lab: top.lab, share: total > 0 ? top.weight / total : 0 }
}

/**
 * The first centre the samples' weighted mean's nearest, then each the
 * farthest from those chosen (weighted): the same answer every time.
 */
function seed(samples: Sample[], k: number): Lab[] {
  const mean = samples.reduce(
    (m, p) => ({
      l: m.l + p.lab.l * p.weight,
      a: m.a + p.lab.a * p.weight,
      b: m.b + p.lab.b * p.weight,
      w: m.w + p.weight,
    }),
    { l: 0, a: 0, b: 0, w: 0 },
  )
  const centre = { l: mean.l / mean.w, a: mean.a / mean.w, b: mean.b / mean.w }
  const chosen: Lab[] = [
    samples.reduce((best, p) => (deltaE(p.lab, centre) < deltaE(best.lab, centre) ? p : best)).lab,
  ]
  while (chosen.length < Math.min(k, samples.length)) {
    let far = samples[0]!
    let farD = -1
    for (const p of samples) {
      const d = Math.min(...chosen.map((c) => deltaE(p.lab, c))) * p.weight
      if (d > farD) {
        farD = d
        far = p
      }
    }
    if (farD <= 0) break
    chosen.push(far.lab)
  }
  return chosen
}

/** How far apart two colours are, lightness counting for LIGHTNESS of itself. */
function shadeDistance(x: Lab, y: Lab): number {
  return Math.hypot((x.l - y.l) * LIGHTNESS, x.a - y.a, x.b - y.b)
}

/** Clusters closer than SAME are shades of one colour: the heavier keeps its centre, the weights add. */
function mergeShades(groups: { lab: Lab; weight: number }[]) {
  const sorted = [...groups].sort((p, q) => q.weight - p.weight)
  const out: { lab: Lab; weight: number }[] = []
  for (const g of sorted) {
    const into = out.find((o) => shadeDistance(o.lab, g.lab) < SAME)
    if (into) into.weight += g.weight
    else out.push({ ...g })
  }
  return out
}
