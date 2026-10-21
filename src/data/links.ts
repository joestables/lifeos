import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

/** A link between two Items (ADR-0007): a Task *for* an Event (EVT-006). */
export interface Link {
  from_item: string
  to_item: string
  link_type: string
}

export const linksKey = ['links'] as const

export async function fetchLinks(): Promise<Link[]> {
  const { data, error } = await supabase()
    .from('links')
    .select('from_item, to_item, link_type')
    .order('created_at')
  if (error) throw error
  return data
}

/** Lays unsent links and unlinks over the server's. */
export function applyPendingLinks(rows: readonly Link[], entries: readonly QueueEntry[]): Link[] {
  let out = [...rows]
  for (const entry of entries) {
    // A new Variation is a Variation of its Recipe (ADR-0011).
    if (entry.fn === 'food.create_recipe' || entry.fn === 'food.add_variation') {
      const a = entry.args as { p_id: string; p_variation?: string; p_recipe?: string }
      const link =
        entry.fn === 'food.create_recipe'
          ? { from_item: String(a.p_variation), to_item: a.p_id, link_type: 'variation_of' }
          : { from_item: a.p_id, to_item: String(a.p_recipe), link_type: 'variation_of' }
      if (!out.some((l) => l.from_item === link.from_item && l.link_type === 'variation_of'))
        out.push(link)
      continue
    }
    if (entry.fn !== 'link_items' && entry.fn !== 'unlink_items') continue
    const a = entry.args as { p_from: string; p_to: string; p_link_type: string }
    const same = (l: Link) =>
      l.from_item === a.p_from && l.to_item === a.p_to && l.link_type === a.p_link_type
    out = out.filter((l) => !same(l))
    if (entry.fn === 'link_items')
      out.push({ from_item: a.p_from, to_item: a.p_to, link_type: a.p_link_type })
  }
  return out
}
