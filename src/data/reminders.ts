import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import { allRows } from './paging'

type Row = Database['core']['Tables']['reminders']['Row']

/**
 * One of my Reminders (ADR-0023): relative to one of its Item's dates
 * (`anchor`, `offset_days`, `at_time`) or at a fixed moment, and when it
 * fires. The server works out `fires_at`.
 */
export type Reminder = Pick<
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
>

/** What core.add_reminder and core.update_reminder take. */
export interface ReminderFields {
  anchor?: 'do_on' | 'due_on' | 'starts_at' | null
  offset_days?: number
  /** Before an Event's start by minutes ("30 minutes before"). */
  offset_minutes?: number
  at_time?: string | null
  fixed_at?: string | null
}

export const remindersKey = ['reminders'] as const

export async function fetchReminders(): Promise<Reminder[]> {
  return allRows((from, to) =>
    supabase()
      .from('reminders')
      .select(
        'id, item_id, fires_at, is_default, anchor, offset_days, at_time, offset_minutes, fixed_at, snoozed_until',
      )
      .order('id')
      .range(from, to),
  )
}

/**
 * Lays unsent Reminder writes over the server's. A fixed Reminder fires when
 * it says; a relative one's time is worked out by the server, so it shows
 * once sent.
 */
export function applyPendingReminders(
  rows: readonly Reminder[],
  entries: readonly QueueEntry[],
): Reminder[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as {
      p_id?: string
      p_item?: string
      p_fields?: ReminderFields
      p_patch?: ReminderFields
    }
    switch (entry.fn) {
      case 'add_reminder': {
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
        })
        break
      }
      case 'update_reminder': {
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
      case 'remove_reminder':
        out = out.filter((r) => r.id !== a.p_id)
        break
      case 'remove_default_reminder':
        out = out.filter((r) => !(r.item_id === a.p_item && r.is_default))
        break
    }
  }
  return out
}
