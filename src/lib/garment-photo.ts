import { estimateColour, rgbToHex, type Estimate } from '@lifeos/wardrobe'
import { PHOTO_BYTES } from './photo-resize'

/**
 * A garment's photo kept square, no larger than this a side: under
 * ADR-0052's 1600, as a square at 1200 already fills a computer's popup
 * and keeps to its weight in one try.
 */
const SIDE = 1200
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

const webp = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))

/** A preview's side: the sheet's photo and the loupe's, while the kept photo is made. */
const PREVIEW = 640

/**
 * The square kept (WRD-005 2), as small as a Recipe's photo (ADR-0052):
 * its colour read and a small preview made at once, so the sheet opens
 * straight away; the photo itself drawn at 1200px and made WebP once (again
 * a little lower only if it is still heavy) while the sheet is filled in.
 * Each file made on a phone costs time (Joe, 20 November).
 */
export async function keepSquare(
  picture: ImageBitmap,
  crop: Crop,
): Promise<{
  photo: Promise<Blob>
  preview: Blob
  width: number
  height: number
  estimate: Estimate
}> {
  const { left, top, side } = cropSquare(picture.width, picture.height, crop)
  const out = Math.round(Math.min(SIDE, side))
  const canvas = canvasOf(out)
  const g = canvas.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(picture, left, top, side, side, 0, 0, out, out)
  const estimate = readColour(canvas)
  const small = canvasOf(Math.min(PREVIEW, out))
  small.getContext('2d')!.drawImage(canvas, 0, 0, small.width, small.height)
  const preview = await new Promise<Blob | null>((resolve) =>
    small.toBlob(resolve, 'image/jpeg', 0.85),
  )
  if (!preview) throw new Error('This picture can’t be read')
  const photo = (async () => {
    let blob = await webp(canvas, 0.8)
    if (blob && blob.size > PHOTO_BYTES) blob = (await webp(canvas, 0.65)) ?? blob
    if (!blob || blob.type !== 'image/webp') throw new Error('This browser can’t make WebP')
    return blob
  })()
  // Not waited for here: a failure is the sheet's, at Save.
  photo.catch(() => undefined)
  return { photo, preview, width: out, height: out, estimate }
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
