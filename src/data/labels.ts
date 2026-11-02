import type { Database } from './database.types'
import type { QueueEntry } from './queue/store'
import type { RepeatArgs } from './series'
import { supabase } from './supabase'
import { allRows } from './paging'

type Tables = Database['core']['Tables']

/**
 * A Label (ITM-005): one set per Space, shared by Thoughts, Notes and Tasks. Its
 * other ids (`aliases`) stay on the server.
 */
export type Label = Omit<Tables['labels']['Row'], 'aliases'>
export type ItemLabel = Pick<Tables['item_labels']['Row'], 'item_id' | 'label_id'>
/** One of my marks: a pinned Note, a starred Task. */
export type Mark = Pick<Tables['marks']['Row'], 'item_id'>

export const labelsKey = ['labels'] as const
export const itemLabelsKey = ['item_labels'] as const
export const marksKey = ['marks'] as const

export async function fetchLabels(): Promise<Label[]> {
  return allRows((from, to) =>
    supabase()
      .from('labels')
      .select('id, name, space_id, created_by, created_at')
      .order('name')
      .order('id')
      .range(from, to),
  )
}

export async function fetchItemLabels(): Promise<ItemLabel[]> {
  return allRows((from, to) =>
    supabase()
      .from('item_labels')
      .select('item_id, label_id')
      .order('item_id')
      .order('label_id')
      .range(from, to),
  )
}

export async function fetchMarks(): Promise<Mark[]> {
  return allRows((from, to) =>
    supabase().from('marks').select('item_id').order('item_id').order('person_id').range(from, to),
  )
}

/** "home" is the same Label as "Home" (ITM-005). */
export const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()

/** Lays unsent Label writes over the Labels the server last sent. */
export function applyPendingLabels(
  rows: readonly Label[],
  entries: readonly QueueEntry[],
): Label[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as Record<string, unknown>
    switch (entry.fn) {
      case 'create_label': {
        const name = String(a.p_name).trim()
        if (out.some((l) => l.id === a.p_id || sameName(l.name, name))) break
        const at = new Date(entry.createdAt).toISOString()
        out.push({
          id: String(a.p_id),
          name,
          space_id: (a.p_space_id as string | null) ?? '',
          created_by: '',
          created_at: at,
        })
        break
      }
      case 'rename_label':
        out = out.map((l) => (l.id === a.p_id ? { ...l, name: String(a.p_name).trim() } : l))
        break
      case 'delete_label':
        out = out.filter((l) => l.id !== a.p_id)
        break
    }
  }
  return out.sort((x, y) => x.name.localeCompare(y.name))
}

/** Lays unsent labelling over the Item–Label pairs the server last sent. */
export function applyPendingItemLabels(
  rows: readonly ItemLabel[],
  entries: readonly QueueEntry[],
): ItemLabel[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as Record<string, unknown>
    switch (entry.fn) {
      case 'add_label':
        if (!out.some((r) => r.item_id === a.p_item && r.label_id === a.p_label))
          out.push({ item_id: String(a.p_item), label_id: String(a.p_label) })
        break
      case 'remove_label':
        out = out.filter((r) => !(r.item_id === a.p_item && r.label_id === a.p_label))
        break
      case 'delete_label':
        out = out.filter((r) => r.label_id !== a.p_id)
        break
      // A repeat's occurrences have its Labels; the next of one repeated
      // after completion has the Labels of the one ticked, until sent.
      case 'set_repeat': {
        const { p_template, p_occurrences } = entry.args as unknown as RepeatArgs
        for (const o of p_occurrences.slice(1))
          for (const label of p_template.label_ids ?? [])
            if (!out.some((r) => r.item_id === o.id && r.label_id === label))
              out.push({ item_id: o.id, label_id: label })
        break
      }
      case 'complete_occurrence':
        if (!out.some((r) => r.item_id === a.p_next))
          out.push(
            ...out
              .filter((r) => r.item_id === a.p_id)
              .map((r) => ({ item_id: String(a.p_next), label_id: r.label_id })),
          )
        break
    }
  }
  return out
}

/** Lays unsent marks over the marks the server last sent. */
export function applyPendingMarks(rows: readonly Mark[], entries: readonly QueueEntry[]): Mark[] {
  let out = [...rows]
  for (const entry of entries) {
    if (entry.fn !== 'set_mark') continue
    const { p_item, p_on } = entry.args as { p_item: string; p_on: boolean }
    out = out.filter((m) => m.item_id !== p_item)
    if (p_on) out.push({ item_id: p_item })
  }
  return out
}
