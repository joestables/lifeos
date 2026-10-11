/** One line of a Note's start, as its card shows it (ADR-0046). */
export type PreviewLine =
  | { kind: 'check'; done: boolean; text: Inline[] }
  | { kind: 'bullet'; text: Inline[] }
  | { kind: 'number'; n: string; text: Inline[] }
  | { kind: 'text'; text: Inline[] }

/** A run of text, bold, italic or both. */
export interface Inline {
  text: string
  bold?: boolean
  italic?: boolean
}

/** Reads bold, italic and links (shown as their text) in one line. */
export function readInline(line: string): Inline[] {
  const plain = line
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\\([\\*_[\]()#+\-.!`])/g, '$1')
  const out: Inline[] = []
  const re = /(\*\*\*|___)(.+?)\1|(\*\*|__)(.+?)\3|(\*|_)(.+?)\5/g
  let at = 0
  for (const m of plain.matchAll(re)) {
    if (m.index > at) out.push({ text: plain.slice(at, m.index) })
    if (m[2] !== undefined) out.push({ text: m[2], bold: true, italic: true })
    else if (m[4] !== undefined) out.push({ text: m[4], bold: true })
    else out.push({ text: m[6]!, italic: true })
    at = m.index + m[0].length
  }
  if (at < plain.length) out.push({ text: plain.slice(at) })
  return out
}

/** The first lines of a Markdown body, blank lines left out. */
export function previewLines(markdown: string | null, max = 8): PreviewLine[] {
  const lines: PreviewLine[] = []
  for (const raw of (markdown ?? '').split('\n')) {
    if (lines.length >= max) break
    const line = raw.trim()
    if (!line) continue
    let m: RegExpMatchArray | null
    if ((m = line.match(/^[-*+] \[( |x|X)\] ?(.*)$/)))
      lines.push({ kind: 'check', done: m[1] !== ' ', text: readInline(m[2]!) })
    else if ((m = line.match(/^[-*+] (.*)$/)))
      lines.push({ kind: 'bullet', text: readInline(m[1]!) })
    else if ((m = line.match(/^(\d+)[.)] (.*)$/)))
      lines.push({ kind: 'number', n: m[1]!, text: readInline(m[2]!) })
    else lines.push({ kind: 'text', text: readInline(line) })
  }
  return lines
}

/** A line as plain words: what stands in for a missing title (NTE-001). */
export const plainLine = (line: string) => {
  const [first] = previewLines(line, 1)
  return first ? first.text.map((t) => t.text).join('') : ''
}
