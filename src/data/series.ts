import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

/** A repeat rule that makes occurrences (ADR-0022): each repeating Task's or Event's. */
export type Series = Pick<
  Database['core']['Tables']['series']['Row'],
  'id' | 'mode' | 'rule' | 'starts_on' | 'timezone' | 'ended_on'
>

export type RepeatMode = 'schedule' | 'after_completion'

/** What each occurrence is made with (core_private.make_occurrences). */
export type SeriesTemplate = {
  title: string
  body?: string | null
  /** A Task's. */
  do_at?: string | null
  due_offset_days?: number | null
  /** An Event's (EVT-004): its place, start time in the series' timezone and length, or all day for some days. */
  place?: string | null
  start_time?: string | null
  duration_minutes?: number | null
  all_day?: boolean
  days?: number | null
  label_ids?: string[]
  /** Its own Reminders on its dates, made for each occurrence (REM-002 4). */
  reminders?: {
    anchor: string
    offset_days: number
    at_time: string | null
    offset_minutes?: number
  }[]
}

/** The arguments of core.set_repeat, worked out on the device (ADR-0045). */
export type RepeatArgs = {
  p_item: string
  p_series: string
  p_mode: RepeatMode
  p_rule: string
  p_starts_on: string
  p_timezone: string
  p_template: SeriesTemplate
  /** The Item itself first, then the rest of the window. */
  p_occurrences: { id: string; on: string }[]
  p_until: string
}

export const seriesKey = ['series'] as const

export async function fetchSeries(): Promise<Series[]> {
  const { data, error } = await supabase()
    .from('series')
    .select('id, mode, rule, starts_on, timezone, ended_on')
  if (error) throw error
  return data
}

/** Lays unsent repeat writes over the series the server last sent. */
export function applyPendingSeries(
  rows: readonly Series[],
  entries: readonly QueueEntry[],
  /** The Items the server last sent, for the series each Task was in. */
  items: readonly { id: string; series_id: string | null; occurrence_on: string | null }[],
): Series[] {
  let out = [...rows]
  const moved = new Map<string, { series_id: string; occurrence_on: string }>()
  const occurrenceOf = (id: string) =>
    moved.get(id) ?? items.find((i) => i.id === id) ?? { series_id: null, occurrence_on: null }
  const end = (id: string | null, last: string | null) => {
    if (!id || !last) return
    out = out.map((s) =>
      s.id === id && (!s.ended_on || s.ended_on > last) ? { ...s, ended_on: last } : s,
    )
  }
  for (const entry of entries) {
    if (entry.fn === 'set_repeat') {
      const a = entry.args as unknown as RepeatArgs
      const was = occurrenceOf(a.p_item)
      if (was.series_id === a.p_series) continue
      moved.set(a.p_item, { series_id: a.p_series, occurrence_on: a.p_occurrences[0]!.on })
      if (was.series_id) end(was.series_id, dayBefore(was.occurrence_on))
      if (out.some((s) => s.id === a.p_series)) continue
      out.push({
        id: a.p_series,
        mode: a.p_mode,
        rule: a.p_rule,
        starts_on: a.p_starts_on,
        timezone: a.p_timezone,
        ended_on: null,
      })
    } else if (entry.fn === 'stop_repeat') {
      const was = occurrenceOf((entry.args as { p_item: string }).p_item)
      end(was.series_id, was.occurrence_on)
    }
  }
  return out
}

const dayBefore = (day: string | null) => {
  if (!day) return null
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
