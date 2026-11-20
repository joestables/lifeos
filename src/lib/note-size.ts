import { previewLines } from './markdown-preview'

/**
 * About how tall a NoteCard is, in lines, from what it shows: its padding
 * and title, each body line (a long one wraps), and its Labels. Worked out
 * from the Note rather than measured, so the cards are placed once and
 * never jump.
 */
export function noteCardSize({
  title,
  body,
  checklist,
  labels = [],
}: {
  title: string
  body: string | null
  /** A List's lines to tick, shown in place of a body. */
  checklist?: readonly string[]
  labels?: string[]
}): number {
  const lines = checklist
    ? checklist.slice(0, 8).map((text) => ({ text: [{ text }] }))
    : previewLines(body, 9)
  const text = (i: number) =>
    lines[i]!.text.map((t) => t.text)
      .join('')
      .trim()
  const shown = !checklist && lines.length > 0 && title === text(0)
  let rows = 0
  for (let i = shown ? 1 : 0; i < Math.min(lines.length, shown ? 9 : 8); i++)
    rows += Math.max(1, Math.ceil(text(i).length / 28))
  return 2 + Math.ceil(title.length / 22) + Math.min(rows, 12) + (labels.length > 0 ? 1.5 : 0)
}
