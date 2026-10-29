/** MD5 of a string's UTF-8 bytes, as 32 hex digits (RFC 1321). */
export function md5(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++)
    words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i]! << ((i % 4) * 8))
  const bits = bytes.length * 8
  words[bits >> 5] = (words[bits >> 5] ?? 0) | (0x80 << (bits % 32))
  const n = (((bits + 64) >>> 9) << 4) + 16
  for (let i = 0; i < n; i++) words[i] = words[i] ?? 0
  words[n - 2] = bits
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const K = Array.from(
    { length: 64 },
    (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0,
  )
  let [a, b, c, d] = [0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476]
  for (let o = 0; o < n; o += 16) {
    let [A, B, C, D] = [a, b, c, d]
    for (let i = 0; i < 64; i++) {
      const r = i >> 4
      const f =
        r === 0
          ? (B & C) | (~B & D)
          : r === 1
            ? (D & B) | (~D & C)
            : r === 2
              ? B ^ C ^ D
              : C ^ (B | ~D)
      const g = r === 0 ? i : r === 1 ? (5 * i + 1) % 16 : r === 2 ? (3 * i + 5) % 16 : (7 * i) % 16
      const s = S[r * 4 + (i % 4)]!
      const t = (A + f + K[i]! + words[o + g]!) | 0
      ;[A, D, C] = [D, C, B]
      B = (B + ((t << s) | (t >>> (32 - s)))) | 0
    }
    ;[a, b, c, d] = [(a + A) | 0, (b + B) | 0, (c + C) | 0, (d + D) | 0]
  }
  return [a, b, c, d]
    .map((w) =>
      [0, 8, 16, 24].map((s) => ((w >>> s) & 0xff).toString(16).padStart(2, '0')).join(''),
    )
    .join('')
}

/**
 * A Meal's line on a shop, by its shop, Meal and source line: the id the
 * server gives it (`shopping_private.line_id`, MD5 of "list:meal:source"),
 * so a line ticked before its Meal is sent is the one written (SHP-004 3).
 */
export function mealLineId(list: string, meal: string, source: string): string {
  const h = md5(`${list}:${meal}:${source}`)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
