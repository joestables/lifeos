import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

/** One of my Reminders, as the app shows it: when it fires. */
export type Reminder = Pick<
  Database['core']['Tables']['reminders']['Row'],
  'id' | 'item_id' | 'fires_at' | 'is_default'
>

export const remindersKey = ['reminders'] as const

export async function fetchReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase()
    .from('reminders')
    .select('id, item_id, fires_at, is_default')
  if (error) throw error
  return data
}

/**
 * Lays unsent Reminder writes over the server's. A fixed Reminder fires when
 * it says; others are worked out by the server, so they show once sent.
 */
export function applyPendingReminders(
  rows: readonly Reminder[],
  entries: readonly QueueEntry[],
): Reminder[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as { p_id?: string; p_item?: string; p_fields?: { fixed_at?: string } }
    switch (entry.fn) {
      case 'add_reminder':
        if (!out.some((r) => r.id === a.p_id))
          out.push({
            id: String(a.p_id),
            item_id: String(a.p_item),
            fires_at: a.p_fields?.fixed_at ?? null,
            is_default: false,
          })
        break
      case 'remove_reminder':
        out = out.filter((r) => r.id !== a.p_id)
        break
    }
  }
  return out
}
