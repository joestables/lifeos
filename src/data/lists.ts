import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import { allRows } from './paging'

/**
 * A List's line (ADR-0069, NTE-006): typed, ticked as I go, or a
 * subheading (heading), in its position.
 */
export type ListLine = Omit<Database['core']['Tables']['list_lines']['Row'], 'created_at'>

/** What a line is added with, or changed by (NTE-006 3). */
export type ListLineFields = Partial<Pick<ListLine, 'position' | 'heading' | 'text'>>

export const listLinesKey = ['core', 'list_lines'] as const

export async function fetchListLines(): Promise<ListLine[]> {
  return allRows((from, to) =>
    supabase()
      .from('list_lines')
      .select('id, list_id, position, heading, text, checked, updated_at')
      .order('position')
      .order('id')
      .range(from, to),
  )
}

// ---------------------------------------------------------------------------
// Unsent writes laid over what the server last sent (OFF-001).

type Args = Record<string, unknown>
const trimmed = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const when = (e: QueueEntry) => new Date(e.createdAt).toISOString()

const byPosition = (a: ListLine, b: ListLine) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : a.id < b.id ? -1 : 1

/** Lines with unsent additions, changes, ticks and removals laid over, as the server makes them. */
export function applyPendingListLines(
  rows: readonly ListLine[],
  entries: readonly QueueEntry[],
): ListLine[] {
  let out = [...rows]
  for (const e of entries) {
    const a = e.args as Args
    switch (e.fn) {
      case 'add_list_line': {
        if (out.some((l) => l.id === a.p_id)) break
        const f = (a.p_fields ?? {}) as Args
        const heading = trimmed(f.heading)
        const text = heading === null ? trimmed(f.text) : null
        // The server refuses a line with no words.
        if (heading === null && text === null) break
        out.push({
          id: String(a.p_id),
          list_id: String(a.p_list),
          position: typeof f.position === 'string' ? f.position : '',
          heading,
          text,
          checked: false,
          updated_at: when(e),
        })
        break
      }
      case 'update_list_line': {
        const p = (a.p_patch ?? {}) as Args
        out = out.map((l) => {
          if (l.id !== a.p_id) return l
          const heading = 'heading' in p && l.heading !== null ? trimmed(p.heading) : l.heading
          const text = 'text' in p && l.heading === null ? trimmed(p.text) : l.text
          return {
            ...l,
            ...('position' in p && { position: String(p.position) }),
            // Emptied, it would be refused: it stays as it was.
            heading: l.heading !== null ? (heading ?? l.heading) : null,
            text: l.heading === null ? (text ?? l.text) : null,
            updated_at: when(e),
          }
        })
        break
      }
      case 'remove_list_line':
        out = out.filter((l) => l.id !== a.p_id)
        break
      case 'tick_list_lines': {
        const ids = new Set((a.p_ids as string[] | undefined) ?? [])
        const on = Boolean(a.p_checked)
        out = out.map((l) =>
          ids.has(l.id) && l.heading === null && l.checked !== on
            ? { ...l, checked: on, updated_at: when(e) }
            : l,
        )
        break
      }
    }
  }
  return out.sort(byPosition)
}
