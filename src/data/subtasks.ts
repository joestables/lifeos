import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'
import { allRows } from './paging'

/** A line ticked inside a Task (TSK-006). */
export type Subtask = Pick<
  Database['core']['Tables']['subtasks']['Row'],
  'id' | 'item_id' | 'title' | 'done' | 'position'
>

export const subtasksKey = ['subtasks'] as const

export async function fetchSubtasks(): Promise<Subtask[]> {
  return allRows((from, to) =>
    supabase()
      .from('subtasks')
      .select('id, item_id, title, done, position')
      .order('position')
      .order('id')
      .range(from, to),
  )
}

/** Lays unsent sub-task writes over the server's, in their order. */
export function applyPendingSubtasks(
  rows: readonly Subtask[],
  entries: readonly QueueEntry[],
): Subtask[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as {
      p_id?: string
      p_item?: string
      p_title?: string
      p_position?: string
      p_patch?: Partial<Pick<Subtask, 'title' | 'done' | 'position'>>
    }
    switch (entry.fn) {
      case 'add_subtask':
        if (!out.some((s) => s.id === a.p_id))
          out.push({
            id: String(a.p_id),
            item_id: String(a.p_item),
            title: a.p_title ?? '',
            done: false,
            position: a.p_position ?? '',
          })
        break
      case 'update_subtask':
        out = out.map((s) => (s.id === a.p_id ? { ...s, ...a.p_patch } : s))
        break
      case 'remove_subtask':
        out = out.filter((s) => s.id !== a.p_id)
        break
    }
  }
  return out.sort((x, y) => (x.position < y.position ? -1 : x.position > y.position ? 1 : 0))
}

/** A position after every one made before it on this device. */
export const nextPosition = () => Date.now().toString(36).padStart(10, '0')
