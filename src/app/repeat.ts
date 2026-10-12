import { afterCompletion, daysBetween, nextOccurrence, todayIn, windowOf } from '@lifeos/recurrence'
import { useCallback, useMemo } from 'react'
import type { Repeat } from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import {
  completeOccurrence,
  newId,
  queue,
  setRepeat,
  updateItem,
  useSeries,
  type Item,
  type Series,
} from '@/data'
import { itemTitle } from '@/lib/item-types'
import { stillRepeats } from '@/lib/series'

/** Every series I can see, by id. */
export function useSeriesById(): ReadonlyMap<string, Series> {
  const series = useSeries(queue)
  return useMemo(() => new Map(series.map((s) => [s.id, s])), [series])
}

/** A Task's repeat, while it still repeats. */
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
 * Ticks a Task done, with Undo (TSK-003). One repeated after completion
 * makes its next occurrence as it goes (TSK-009).
 */
export function useTickDone() {
  const series = useSeriesById()
  return useCallback(
    (task: Item) => {
      const s = task.series_id ? series.get(task.series_id) : undefined
      if (s && s.mode === 'after_completion' && stillRepeats(task, s))
        completeOccurrence(task.id, afterCompletion(s.rule, todayIn(s.timezone)))
      else updateItem(task.id, { status: 'done' })
      toast(`Done "${itemTitle(task)}"`, {
        action: { label: 'Undo', onClick: () => updateItem(task.id, { status: 'active' }) },
      })
    },
    [series],
  )
}
