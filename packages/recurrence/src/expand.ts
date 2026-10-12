import { addDays, daysInMonth, makeDay, parts, toNumber, weekdayOf, type Day } from './days.ts'
import { parseRule, WEEKDAYS, type Rule } from './rule.ts'

/** How far ahead a series' occurrences are made (ADR-0045). */
export const WINDOW_WEEKS = 12

/** A rule that never produces an occurrence can't loop for ever. */
const MAX_PERIODS = 5000

const asRule = (rule: Rule | string) => (typeof rule === 'string' ? parseRule(rule) : rule)

/** The nth (1–5, or -1 for the last) given weekday of a month, if it has one. */
function nthWeekday(year: number, month: number, weekday: number, nth: number): Day | null {
  if (nth > 0) {
    const first = makeDay(year, month, 1)!
    const date = 1 + ((weekday - weekdayOf(first) + 7) % 7) + (nth - 1) * 7
    return date <= daysInMonth(year, month) ? makeDay(year, month, date) : null
  }
  const lastDate = daysInMonth(year, month)
  const last = makeDay(year, month, lastDate)!
  return makeDay(year, month, lastDate - ((weekdayOf(last) - weekday + 7) % 7))
}

/** The days a period (the kth day, week, month or year from the start) holds, in order. */
function period(rule: Rule, startsOn: Day, k: number): Day[] {
  const start = parts(startsOn)
  const step = k * rule.interval
  switch (rule.frequency) {
    case 'daily':
      return [addDays(startsOn, step)]
    case 'weekly': {
      // Weeks start on Monday (WKST=MO); with no days named, the start's.
      const monday = addDays(startsOn, -weekdayOf(startsOn) + step * 7)
      const days = rule.byDay.length > 0 ? rule.byDay : [{ day: WEEKDAYS[weekdayOf(startsOn)]! }]
      return days
        .map((d) => WEEKDAYS.indexOf(d.day))
        .sort((a, b) => a - b)
        .map((i) => addDays(monday, i))
    }
    case 'monthly': {
      const index = start.month - 1 + step
      const year = start.year + Math.floor(index / 12)
      const month = (index % 12) + 1
      const nth = rule.byDay.find((d) => d.nth !== undefined)
      if (nth) {
        const day = nthWeekday(year, month, WEEKDAYS.indexOf(nth.day), nth.nth!)
        return day ? [day] : []
      }
      const date = rule.byMonthDay ?? start.date
      // A month without that date is skipped, as RFC 5545 says.
      const day =
        date === -1 ? makeDay(year, month, daysInMonth(year, month)) : makeDay(year, month, date)
      return day ? [day] : []
    }
    case 'yearly': {
      const day = makeDay(start.year + step, start.month, start.date)
      return day ? [day] : []
    }
  }
}

/** Roughly how many periods lie between the start and a day. */
function periodsTo(rule: Rule, startsOn: Day, day: Day): number {
  if (day <= startsOn) return 0
  const a = parts(startsOn)
  const b = parts(day)
  const span = {
    daily: toNumber(day) - toNumber(startsOn),
    weekly: Math.floor((toNumber(day) - toNumber(startsOn)) / 7),
    monthly: (b.year - a.year) * 12 + b.month - a.month,
    yearly: b.year - a.year,
  }[rule.frequency]
  return Math.floor(span / rule.interval)
}

/**
 * Walks a rule's occurrences from its start, in order, stopping when `visit`
 * returns false, at COUNT or past UNTIL.
 */
function walk(
  input: Rule | string,
  startsOn: Day,
  visit: (day: Day) => boolean,
  near: Day = startsOn,
): void {
  const rule = asRule(input)
  let made = 0
  // Without COUNT, start a period before `near` rather than from the start.
  const k0 = rule.count === undefined ? Math.max(0, periodsTo(rule, startsOn, near) - 1) : 0
  for (let k = k0; k < k0 + MAX_PERIODS; k++) {
    for (const day of period(rule, startsOn, k)) {
      if (day < startsOn) continue
      if (rule.until && day > rule.until) return
      if (!visit(day)) return
      made++
      if (rule.count !== undefined && made >= rule.count) return
    }
  }
}

/** Every occurrence from `from` to `to`, both included. */
export function occurrences(rule: Rule | string, startsOn: Day, from: Day, to: Day): Day[] {
  const out: Day[] = []
  walk(
    rule,
    startsOn,
    (day) => {
      if (day > to) return false
      if (day >= from) out.push(day)
      return true
    },
    from,
  )
  return out
}

/** The first occurrence after `after` (or on it, when inclusive), or null once the rule has ended. */
export function nextOccurrence(
  rule: Rule | string,
  startsOn: Day,
  after: Day,
  inclusive = false,
): Day | null {
  let found: Day | null = null
  walk(
    rule,
    startsOn,
    (day) => {
      if (day > after || (inclusive && day === after)) {
        found = day
        return false
      }
      return true
    },
    after,
  )
  return found
}

/**
 * When a Task repeated after completion comes back (TSK-009): its interval
 * after the day it was done. A month on from 31 January is the last day of
 * February.
 */
export function afterCompletion(input: Rule | string, doneOn: Day): Day {
  const rule = asRule(input)
  const { year, month, date } = parts(doneOn)
  switch (rule.frequency) {
    case 'daily':
      return addDays(doneOn, rule.interval)
    case 'weekly':
      return addDays(doneOn, rule.interval * 7)
    case 'monthly':
    case 'yearly': {
      const index = month - 1 + (rule.frequency === 'monthly' ? rule.interval : rule.interval * 12)
      const y = year + Math.floor(index / 12)
      const m = (index % 12) + 1
      return makeDay(y, m, Math.min(date, daysInMonth(y, m)))!
    }
  }
}

/**
 * What a run should make (ADR-0045): the occurrences after `after` (from the
 * start, when nothing is made yet) up to WINDOW_WEEKS ahead of today, and
 * always the first one beyond, so ticking a yearly Task still shows the next.
 * `until` is how far the series is then made.
 */
export function windowOf(
  rule: Rule | string,
  startsOn: Day,
  after: Day | null,
  today: Day,
  weeks = WINDOW_WEEKS,
): { days: Day[]; until: Day } {
  const horizon = addDays(today, weeks * 7)
  if (after !== null && after >= horizon) return { days: [], until: after }
  const from = after === null ? startsOn : addDays(after, 1)
  const days = from <= horizon ? occurrences(rule, startsOn, from, horizon) : []
  const beyond = nextOccurrence(rule, startsOn, horizon)
  if (beyond) days.push(beyond)
  return { days, until: days.length > 0 && days.at(-1)! > horizon ? days.at(-1)! : horizon }
}

/** Days between two days, for a due date kept the same distance after do-on. */
export const daysBetween = (from: Day, to: Day): number => toNumber(to) - toNumber(from)
