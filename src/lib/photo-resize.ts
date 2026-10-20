/** About the size a photo is kept at (ADR-0052). */
export const PHOTO_BYTES = 250 * 1024
/** Its longest side at most. */
const LONGEST = 1600

/**
 * The sizes to try a photo at, largest first: its own (no larger than
 * LONGEST on its longest side), then each step 80% of the last.
 */
export function photoSizes(
  width: number,
  height: number,
  steps = 4,
): { width: number; height: number }[] {
  const first = Math.min(1, LONGEST / Math.max(width, height))
  return Array.from({ length: steps }, (_, i) => {
    const k = first * 0.8 ** i
    return {
      width: Math.max(1, Math.round(width * k)),
      height: Math.max(1, Math.round(height * k)),
    }
  })
}

const QUALITIES = [0.85, 0.75, 0.65]

/**
 * A photo made WebP of about 250 KB on the device (ADR-0052): turned the
 * way the camera held it, no wider than 1600px, then smaller and lower in
 * quality until it fits. Refused when the browser can't read it.
 */
export async function resizePhoto(
  file: Blob,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    let last: { blob: Blob; width: number; height: number } | null = null
    for (const size of photoSizes(bitmap.width, bitmap.height)) {
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height)
      for (const q of QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/webp', q),
        )
        if (!blob || blob.type !== 'image/webp') throw new Error('This browser can’t make WebP')
        last = { blob, ...size }
        if (blob.size <= PHOTO_BYTES) return last
      }
    }
    return last!
  } finally {
    bitmap.close()
  }
}

/** A picture from a link (RCP-006 3), when its site lets it be read. */
export async function photoFromLink(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`The link answered ${res.status}`)
  const blob = await res.blob()
  if (!blob.type.startsWith('image/')) throw new Error('The link isn’t a picture')
  return blob
}
