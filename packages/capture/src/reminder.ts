import { GB, type ParsedResult } from 'chrono-node/en'

/** An Alert the line asks for: a local day and time ("2026-11-10", "20:00"). */
export interface LineAlert {
  day: string
  time: string
  /** The words that said it, as typed, and where they are in the line. */
  text: string
  index: number
  /** The part of the line taken out of the title for it: its words, and an "every" or "and" before them. */
  from: number
  to: number
}

/** What "New" reads in a line (NEW-003): its title, without the words for its Alerts, and the Alerts. */
export interface LineReading {
  title: string
  alerts: LineAlert[]
}

const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/** Ordinary words that are also dates: one counts only next to a number or after "on". */
const AMBIGUOUS = new Set(['may', 'sun', 'sat', 'march', 'mar', 'second'])

/** Short day names chrono doesn't know, swapped for ones it does, at the same length. */
const SHORT_DAYS: [RegExp, string][] = [
  [/\btues\b/gi, 'tue '],
  [/\bthurs\b/gi, 'thu  '],
  [/\bthur\b/gi, 'thu '],
  [/\bweds\b/gi, 'wed '],
]

/** Words read as the quick times are (NEW-005): "tonight" is This evening, 18:00. */
const EVENING = '18:00'

function counts(r: ParsedResult): boolean {
  const words = r.text.toLowerCase().trim()
  if (/\d/.test(words)) return true
  if (words.startsWith('on ')) return true
  return !AMBIGUOUS.has(words)
}

/** "at 5" is 17:00, "6:30" the evening, "07:30" stays: as CAP-003 reads times. */
function timeOf(r: ParsedResult): string | undefined {
  const start = r.start
  if (!start.isCertain('hour')) return undefined
  let hour = start.get('hour') ?? 0
  const minute = start.get('minute') ?? 0
  const clockStyle = /(^|\D)\d\d[:.]\d\d/.test(r.text)
  const relative = /\bin\s+\d/i.test(r.text)
  if (!relative && !start.isCertain('meridiem') && !clockStyle && hour >= 1 && hour <= 7) hour += 12
  return `${pad(hour)}:${pad(minute)}`
}

function tidy(text: string): string {
  const t = text
    .replace(/\s+([?!.,])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|\s)(at|on|by|every|and|&|,)(\s+(at|on|by|every|and|&|,))*\s*$/i, '')
    .trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Reads the Alerts in a line typed into "New" (NEW-003, ADR-0065 11),
 * deterministically and with no signal. Each date or time is an Alert:
 * a date with no time at `defaultTime`; a time with no date today, or
 * tomorrow once it has gone; a weekday the next one, today while its time is
 * to come; "and 9pm" after a dated time, the same day. Nothing typed makes
 * an Alert in the past. "every" sets no Repeat. Words in `literal` are kept
 * as words. `now` is the device's time.
 */
export function readLine(
  line: string,
  now: Date,
  defaultTime: string,
  literal: readonly string[] = [],
): LineReading {
  let probe = line
  for (const [re, to] of SHORT_DAYS) probe = probe.replace(re, to)
  const results = GB.parse(probe, now, { forwardDate: true }).filter(counts)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const today = isoDay(now)
  const alerts: LineAlert[] = []
  const cut: [number, number][] = []

  for (const r of results) {
    // A short day name read as chrono's ("tues" as "tue "): to the end of the word typed.
    let end = r.index + r.text.length
    while (end < line.length && /\w/.test(line[end]!) && /\w/.test(line[end - 1]!)) end++
    const text = line.slice(r.index, end)
    if (literal.includes(text.trim().toLowerCase())) continue
    const start = r.start
    const lower = r.text.toLowerCase()
    let time = timeOf(r)
    let day: string
    const datedDay = start.isCertain('day') || start.isCertain('weekday')
    const previous = alerts.at(-1)
    const between = previous ? line.slice(previous.to, r.index) : ''
    const joined = !!previous && /^\s*(and|&|,)\s*$/i.test(between)

    if (/\btonight\b/.test(lower)) {
      day = today
      time = EVENING
    } else if (/\bthis weekend\b|\bweekend\b/.test(lower)) {
      day = isoDay(addDays(now, (6 - now.getDay() + 7) % 7))
    } else if (start.isCertain('weekday') && !start.isCertain('day')) {
      day = isoDay(addDays(now, ((start.get('weekday') ?? 0) - now.getDay() + 7) % 7))
    } else if (datedDay) {
      const d = start.date()
      day = isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    } else if (joined) {
      // "tue 8pm and 9pm": the same day.
      day = previous.day
    } else {
      day = time && minutes(time) <= nowMinutes ? isoDay(addDays(now, 1)) : today
    }
    time ??= defaultTime
    // A weekday whose time has gone today is next week's.
    if (
      day === today &&
      minutes(time) <= nowMinutes &&
      start.isCertain('weekday') &&
      !start.isCertain('day')
    )
      day = isoDay(addDays(now, 7))
    // Nothing typed is in the past (NEW-003 6).
    if (day < today || (day === today && minutes(time) <= nowMinutes)) continue
    // "every tuesday": the word goes with the day, and sets no Repeat (NEW-003 7).
    const every = /\bevery\s+$/i.exec(line.slice(0, r.index))
    const from = joined ? previous!.to : every ? r.index - every[0].length : r.index
    alerts.push({ day, time, text, index: r.index, from, to: end })
    cut.push([from, end])
  }

  let title = line
  for (const [from, to] of cut.sort((a, b) => b[0] - a[0]))
    title = `${title.slice(0, from)} ${title.slice(to)}`
  return { title: tidy(title), alerts }
}
