import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import { allRows } from './paging'

type Row = Database['core']['Tables']['alerts']['Row']

/**
 * One of my Alerts (ADR-0023): relative to one of its Item's dates
 * (`anchor`, `offset_days`, `at_time`) or at a fixed moment, and when it
 * fires. The server works out `fires_at`.
 */
export type Alert = Pick<
  Row,
  | 'id'
  | 'item_id'
  | 'fires_at'
  | 'is_default'
  | 'anchor'
  | 'offset_days'
  | 'at_time'
  | 'offset_minutes'
  | 'fixed_at'
  | 'snoozed_until'
  | 'alarm'
>

/** What core.add_alert and core.update_alert take. */
export interface AlertFields {
  anchor?: 'do_on' | 'due_on' | 'starts_at' | null
  offset_days?: number
  /** Before an Event's start by minutes ("30 minutes before"). */
  offset_minutes?: number
  at_time?: string | null
  fixed_at?: string | null
  /** Rings until stopped on the Android app (REM-011). */
  alarm?: boolean
}

export const alertsKey = ['alerts'] as const

export async function fetchAlerts(): Promise<Alert[]> {
  return allRows((from, to) =>
    supabase()
      .from('alerts')
      .select(
        'id, item_id, fires_at, is_default, anchor, offset_days, at_time, offset_minutes, fixed_at, snoozed_until, alarm',
      )
      .order('id')
      .range(from, to),
  )
}

/**
 * Lays unsent Alert writes over the server's. A fixed Alert fires when
 * it says; a relative one's time is worked out by the server, so it shows
 * once sent.
 */
export function applyPendingAlerts(
  rows: readonly Alert[],
  entries: readonly QueueEntry[],
): Alert[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as {
      p_id?: string
      p_item?: string
      p_fields?: AlertFields
      p_patch?: AlertFields
    }
    switch (entry.fn) {
      case 'add_alert': {
        if (out.some((r) => r.id === a.p_id)) break
        const f = a.p_fields ?? {}
        out.push({
          id: String(a.p_id),
          item_id: String(a.p_item),
          fires_at: f.fixed_at ?? null,
          is_default: false,
          anchor: f.anchor ?? null,
          offset_days: f.offset_days ?? 0,
          at_time: f.at_time ?? null,
          offset_minutes: f.offset_minutes ?? 0,
          fixed_at: f.fixed_at ?? null,
          snoozed_until: null,
          alarm: f.alarm ?? false,
        })
        break
      }
      case 'update_alert': {
        const p = a.p_patch ?? {}
        out = out.map((r) =>
          r.id === a.p_id
            ? {
                ...r,
                ...p,
                is_default: false,
                snoozed_until: null,
                fires_at:
                  p.fixed_at !== undefined ? p.fixed_at : r.anchor || p.anchor ? null : r.fires_at,
              }
            : r,
        )
        break
      }
      case 'remove_alert':
        out = out.filter((r) => r.id !== a.p_id)
        break
      case 'remove_default_alert':
        out = out.filter((r) => !(r.item_id === a.p_item && r.is_default))
        break
    }
  }
  return out
}
