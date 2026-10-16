import type { Item } from '@/data'
import { eventTimes, eventWhen } from './events'
import { capturedWhen, dateName, doneWhen, dueWhen, isoDayOf } from './dates'
import { plainLine } from './markdown-preview'

/**
 * The words of a search, as the database splits them (core.search_items):
 * lower case, split at anything that isn't a letter or a digit.
 */
export function searchWords(query: string): string[] {
  return query
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

const WORD = /[\p{L}\p{N}]+/gu

/** How much of a word a search matches: the longest search word it starts with. */
function matchLength(word: string, words: readonly string[]): number {
  const lower = word.toLocaleLowerCase()
  let best = 0
  for (const w of words) if (w.length > best && lower.startsWith(w)) best = w.length
  return best
}

/** Whether a word in the text starts with this search word. */
const hasWord = (text: string, w: string) =>
  [...text.matchAll(WORD)].some((m) => m[0].toLocaleLowerCase().startsWith(w))

/** A piece of text, and whether it is what was searched for (shown in bold). */
export interface Marked {
  text: string
  match?: boolean
}

/** Text in pieces, the start of each word a search word matches marked (SRC-001 2). */
export function markMatches(text: string, words: readonly string[]): Marked[] {
  const out: Marked[] = []
  let at = 0
  for (const m of text.matchAll(WORD)) {
    const n = matchLength(m[0], words)
    if (n === 0) continue
    if (m.index > at) out.push({ text: text.slice(at, m.index) })
    out.push({ text: text.slice(m.index, m.index + n), match: true })
    at = m.index + n
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}

/** A body's lines as plain words, blank ones left out. */
const bodyLines = (body: string | null) =>
  (body ?? '')
    .split('\n')
    .map((line) => plainLine(line).trim())
    .filter(Boolean)

/**
 * Searches the Items on the device (SRC-002), as the database would: every
 * search word starts a word of the title, a Label or the body. Title matches
 * first, then Labels, then bodies; then the most recently changed.
 */
export function searchItems(
  items: readonly Item[],
  labelsOf: (id: string) => readonly string[],
  query: string,
  limit = 30,
): Item[] {
  const words = searchWords(query)
  if (words.length === 0) return []
  const scored: { item: Item; score: number }[] = []
  for (const item of items) {
    const labels = labelsOf(item.id).join(' ')
    let score = 0
    for (const w of words) {
      const s = hasWord(item.title, w)
        ? 3
        : hasWord(labels, w)
          ? 2
          : hasWord(item.body ?? '', w)
            ? 1
            : 0
      if (s === 0) {
        score = 0
        break
      }
      score += s
    }
    if (score > 0) scored.push({ item, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || b.item.updated_at.localeCompare(a.item.updated_at))
    .slice(0, limit)
    .map((s) => s.item)
}

/** Around 48 characters of a line, starting a little before its first match. */
function around(line: string, words: readonly string[]): string {
  const first = [...line.matchAll(WORD)].find((m) => matchLength(m[0], words) > 0)
  if (!first || first.index <= 32) return line
  const from = line.lastIndexOf(' ', first.index - 16)
  return `…${line.slice(from + 1)}`
}

/** A result's muted line (components.md#command), and whether it is a warning. */
export interface ResultLine {
  text: string
  danger?: boolean
}

/**
 * What a result says under its title: the line of its body the search
 * found, else its Labels if they matched; else a Task's day, due date or
 * when it was done, or when a Thought was captured.
 */
export function resultLine(
  item: Item,
  words: readonly string[],
  labels: readonly string[],
  now: Date = new Date(),
  timezone: string = 'Europe/London',
): ResultLine | undefined {
  const lines = bodyLines(item.body)
  // An untitled Item's first line is its title.
  const rest = item.title.trim() ? lines : lines.slice(1)
  const found = rest.find((line) => [...line.matchAll(WORD)].some((m) => matchLength(m[0], words)))
  if (found) return { text: around(found, words) }
  if (labels.some((l) => markMatches(l, words).some((p) => p.match)))
    return { text: labels.join(' · ') }

  if (item.type === 'task') {
    const today = isoDayOf(now)
    if (item.status === 'done') return { text: doneWhen(item.updated_at, now) }
    if (item.due_on && item.due_on < today) return { text: dueWhen(item.due_on, now), danger: true }
    if (item.do_on)
      return {
        text: [dateName(item.do_on, now), item.do_at?.slice(0, 5)].filter(Boolean).join(' '),
      }
    if (item.due_on) return { text: dueWhen(item.due_on, now) }
    if (item.status === 'idea') return { text: 'Someday' }
    return undefined
  }
  if (item.type === 'event') {
    const t = eventTimes(item, timezone)
    const when = t && eventWhen(t)
    const text = [when, item.place?.trim()].filter(Boolean).join(' · ')
    return text ? { text } : undefined
  }
  if (item.type === 'thought') return { text: capturedWhen(item.created_at, now) }
  return rest[0] ? { text: rest[0] } : undefined
}

/** Results in groups by Type, each group where its best result is (components.md#command). */
export function byType(items: readonly Item[]): { type: string; items: Item[] }[] {
  const groups = new Map<string, Item[]>()
  for (const item of items) groups.set(item.type, [...(groups.get(item.type) ?? []), item])
  return [...groups].map(([type, items]) => ({ type, items }))
}
