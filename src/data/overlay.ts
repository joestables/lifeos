import type { QueueEntry } from './queue/store'
import type { Item, ItemFields, ItemRow } from './types'

const blankItem = (id: string, type: string, at: string): ItemRow => ({
  id,
  type,
  title: '',
  body: null,
  space_id: '',
  owner_id: '',
  status: 'active',
  starts_at: null,
  ends_at: null,
  all_day: null,
  due_on: null,
  do_on: null,
  do_at: null,
  slot: null,
  series_id: null,
  occurrence_on: null,
  position: null,
  touched_at: null,
  created_at: at,
  updated_at: at,
  archived_at: null,
})

/**
 * Lays writes that haven't reached the server over the Items it last sent,
 * so a change shows at once and survives a reload. Each changed Item is
 * marked as not yet sent, or as failed (OFF-001, OFF-004).
 */
export function applyPending(items: readonly ItemRow[], entries: readonly QueueEntry[]): Item[] {
  if (entries.length === 0) return items as Item[]
  const byId = new Map<string, Item>(items.map((i) => [i.id, i]))
  const order = items.map((i) => i.id)

  for (const entry of entries) {
    const at = new Date(entry.createdAt).toISOString()
    const sync = entry.state
    const mark = (id: string, change: Partial<Item>) => {
      const item = byId.get(id)
      if (!item) return
      byId.set(id, { ...item, ...change, updated_at: at, sync: worst(item.sync, sync) })
    }

    switch (entry.fn) {
      case 'create_item': {
        const { p_id, p_type, p_fields } = entry.args as {
          p_id: string
          p_type: string
          p_fields?: ItemFields
        }
        if (!byId.has(p_id)) {
          byId.set(p_id, { ...blankItem(p_id, p_type, at), ...p_fields, sync })
          order.push(p_id)
        } else {
          mark(p_id, {})
        }
        break
      }
      case 'update_item': {
        const { p_id, p_patch } = entry.args as { p_id: string; p_patch: ItemFields }
        mark(p_id, p_patch)
        break
      }
      case 'archive_item':
        mark((entry.args as { p_id: string }).p_id, { archived_at: at })
        break
      case 'restore_item':
        mark((entry.args as { p_id: string }).p_id, { archived_at: null })
        break
      default:
        // Links don't change how an Item looks.
        break
    }
  }
  return order.map((id) => byId.get(id)!)
}

const worst = (a: Item['sync'], b: Item['sync']): Item['sync'] =>
  a === 'failed' || b === 'failed' ? 'failed' : (a ?? b)
