import { afterCompletion, daysBetween, nextOccurrence, todayIn, windowOf } from '@lifeos/recurrence'
import { useCallback, useMemo } from 'react'
import type { Repeat } from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import {
  archiveItem,
  completeOccurrence,
  newId,
  queue,
  setRepeat,
  updateItem,
  useSeries,
  type Item,
  type Series,
} from '@/data'
import { eventTimes } from '@/lib/events'
import { itemTitle } from '@/lib/item-types'
import { stillRepeats } from '@/lib/series'

/** Every series I can see, by id. */
export function useSeriesById(): ReadonlyMap<string, Series> {
  const series = useSeries(queue)
  return useMemo(() => new Map(series.map((s) => [s.id, s])), [series])
}

/** A Task's or an Event's repeat, while it still repeats. */
export function repeatOf(item: Item, series: ReadonlyMap<string, Series>): Repeat | null {
  const s = item.series_id ? series.get(item.series_id) : undefined
  return s && stillRepeats(item, s) ? { mode: s.mode as Repeat['mode'], rule: s.rule } : null
}

/**
 * The day a repeat starts from: the Task's do-on date, never before today,
 * so a new repeat doesn't fill the past.
 */
export function repeatStart(item: Item, today: string): string {
  return item.do_on && item.do_on > today ? item.do_on : today
}

/**
 * Makes a Task repeat, or changes its repeat from it on (TSK-008, TSK-009,
 * TSK-011): the device works out the first window, and the Task becomes its
 * first occurrence (ADR-0045). False when the repeat would make nothing.
 */
export function repeatTask(
  item: Item,
  repeat: Repeat,
  {
    labelIds,
    timezone,
    reminders = [],
  }: {
    labelIds: string[]
    timezone: string
    /** Its own Reminders on its dates, for each occurrence (REM-002 4). */
    reminders?: { anchor: string; offset_days: number; at_time: string | null }[]
  },
): boolean {
  const today = todayIn(timezone)
  const schedule = repeat.mode === 'schedule'
  const startsOn = schedule ? repeatStart(item, today) : (item.do_on ?? today)
  const first = schedule ? nextOccurrence(repeat.rule, startsOn, startsOn, true) : startsOn
  if (!first) return false
  const window = schedule
    ? windowOf(repeat.rule, startsOn, null, today)
    : { days: [first], until: first }
  const anchor = item.do_on ?? first
  setRepeat({
    p_item: item.id,
    p_series: newId(),
    p_mode: repeat.mode,
    p_rule: repeat.rule,
    p_starts_on: startsOn,
    p_timezone: timezone,
    p_template: {
      title: item.title,
      body: item.body,
      do_at: item.do_at,
      due_offset_days: item.due_on ? daysBetween(anchor, item.due_on) : null,
      label_ids: labelIds,
      reminders,
    },
    p_occurrences: window.days.map((on, i) => ({ id: i === 0 ? item.id : newId(), on })),
    p_until: window.until,
  })
  return true
}

/**
 * The day an Event's repeat starts from: its start day, never before today,
 * so a new repeat doesn't fill the past.
 */
export function eventRepeatStart(item: Item, timezone: string, today: string): string {
  const t = eventTimes(item, timezone)
  return t && t.startDay > today ? t.startDay : today
}

/**
 * Makes an Event repeat on a schedule, or changes its repeat from it on
 * (EVT-004): each occurrence at its start time in my timezone and for its
 * length, or all day for its days; with its place, Labels and own
 * Reminders. The Event becomes the first occurrence. False when the repeat
 * would make nothing.
 */
export function repeatEvent(
  item: Item,
  repeat: Repeat,
  {
    labelIds,
    timezone,
    reminders = [],
  }: {
    labelIds: string[]
    timezone: string
    reminders?: {
      anchor: string
      offset_days: number
      at_time: string | null
      offset_minutes: number
    }[]
  },
): boolean {
  const t = eventTimes(item, timezone)
  if (!t) return false
  const today = todayIn(timezone)
  const startsOn = eventRepeatStart(item, timezone, today)
  const first = nextOccurrence(repeat.rule, startsOn, startsOn, true)
  if (!first) return false
  const window = windowOf(repeat.rule, startsOn, null, today)
  const minutes =
    item.starts_at && item.ends_at
      ? Math.round((Date.parse(item.ends_at) - Date.parse(item.starts_at)) / 60_000)
      : 60
  setRepeat({
    p_item: item.id,
    p_series: newId(),
    p_mode: 'schedule',
    p_rule: repeat.rule,
    p_starts_on: startsOn,
    p_timezone: timezone,
    p_template: {
      title: item.title,
      body: item.body,
      place: item.place,
      start_time: t.allDay ? null : t.startTime,
      duration_minutes: t.allDay ? null : minutes,
      all_day: t.allDay,
      days: t.allDay ? daysBetween(t.startDay, t.endDay) + 1 : null,
      label_ids: labelIds,
      reminders,
    },
    p_occurrences: window.days.map((on, i) => ({ id: i === 0 ? item.id : newId(), on })),
    p_until: window.until,
  })
  return true
}

/**
 * Ticks a Task done, with Undo (TSK-003). One repeated after completion
 * makes its next occurrence as it goes (TSK-009).
 */
export function useTickDone() {
  const series = useSeriesById()
  return useCallback(
    (task: Item) => {
      const s = task.series_id ? series.get(task.series_id) : undefined
      const was = task.status
      let next: string | undefined
      if (s && s.mode === 'after_completion' && stillRepeats(task, s))
        next = completeOccurrence(task.id, afterCompletion(s.rule, todayIn(s.timezone)))
      else updateItem(task.id, { status: 'done' })
      // Undo puts it back as it was (in Someday, say), and takes away the
      // next occurrence ticking it made.
      toast(`Done "${itemTitle(task)}"`, {
        action: {
          label: 'Undo',
          onClick: () => {
            updateItem(task.id, { status: was })
            if (next) archiveItem(next)
          },
        },
      })
    },
    [series],
  )
}
