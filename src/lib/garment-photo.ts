import { estimateColour, rgbToHex, type Estimate } from '@lifeos/wardrobe'
import { resizePhoto } from './photo-resize'

/** A garment's photo kept square, no larger than this a side (ADR-0052's size). */
const SIDE = 1600
/** The estimate reads the photo at about this size (ADR-0067 2). */
const READ = 120

/**
 * A square of a picture to keep (WRD-005 2): its centre as a share of the
 * picture's width and height, and its zoom, 1 being the largest square
 * that fits.
 */
export interface Crop {
  x: number
  y: number
  zoom: number
}

export const CENTRED: Crop = { x: 0.5, y: 0.5, zoom: 1 }

/** The square a crop keeps, in the picture's pixels, kept inside it. */
export function cropSquare(width: number, height: number, crop: Crop) {
  const side = Math.min(width, height) / Math.max(1, crop.zoom)
  const left = Math.min(Math.max(crop.x * width - side / 2, 0), width - side)
  const top = Math.min(Math.max(crop.y * height - side / 2, 0), height - side)
  return { left, top, side }
}

/** A crop moved so its square stays inside the picture. */
export function clampCrop(width: number, height: number, crop: Crop): Crop {
  const zoom = Math.min(Math.max(crop.zoom, 1), 4)
  const { left, top, side } = cropSquare(width, height, { ...crop, zoom })
  return { x: (left + side / 2) / width, y: (top + side / 2) / height, zoom }
}

const canvasOf = (side: number) => {
  const c = document.createElement('canvas')
  c.width = side
  c.height = side
  return c
}

/**
 * The square kept (WRD-005 2), made small as a Recipe's photo is
 * (ADR-0052): WebP of about 250 KB, with its pixels read for the colour.
 */
export async function keepSquare(
  picture: ImageBitmap,
  crop: Crop,
): Promise<{ blob: Blob; width: number; height: number; estimate: Estimate }> {
  const { left, top, side } = cropSquare(picture.width, picture.height, crop)
  const out = Math.round(Math.min(SIDE, side))
  const canvas = canvasOf(out)
  canvas.getContext('2d')!.drawImage(picture, left, top, side, side, 0, 0, out, out)
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!png) throw new Error('This picture can’t be read')
  const [kept, estimate] = await Promise.all([
    resizePhoto(png),
    Promise.resolve(readColour(canvas)),
  ])
  return { ...kept, estimate }
}

/** The garment's colour in a square photo (WRD-006 1; ADR-0067). */
export function readColour(
  source: CanvasImageSource & { width: number; height: number },
): Estimate {
  const small = canvasOf(READ)
  const ctx = small.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, READ, READ)
  const { data } = ctx.getImageData(0, 0, READ, READ)
  return estimateColour({ width: READ, height: READ, data })
}

/**
 * The colour under a point of a picture (WRD-007 1), `at` in % of it: the
 * average of a small patch, so a thread or a speck doesn't decide it.
 */
export function colourAt(
  picture: CanvasImageSource & { width: number; height: number },
  at: { x: number; y: number },
): string {
  const patch = 5
  const c = canvasOf(patch)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const r = Math.max(picture.width, picture.height) / 120
  const x = (at.x / 100) * picture.width
  const y = (at.y / 100) * picture.height
  ctx.drawImage(picture, x - r, y - r, r * 2, r * 2, 0, 0, patch, patch)
  const { data } = ctx.getImageData(0, 0, patch, patch)
  let red = 0
  let green = 0
  let blue = 0
  for (let i = 0; i < data.length; i += 4) {
    red += data[i]!
    green += data[i + 1]!
    blue += data[i + 2]!
  }
  const n = data.length / 4
  return rgbToHex({ r: red / n, g: green / n, b: blue / n })
}
