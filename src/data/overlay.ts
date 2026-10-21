import { addDays, daysBetween } from '@lifeos/recurrence'
import { zonedInstant } from '@/lib/dates'
import type { QueueEntry } from './queue/store'
import type { RepeatArgs } from './series'
import type { Item, ItemFields, ItemRow } from './types'

const blankItem = (id: string, type: string, at: string): ItemRow => ({
  id,
  type,
  title: '',
  body: null,
  place: null,
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
    /** A change I make to an occurrence touches it (ADR-0022). */
    const touch = (id: string, change: Partial<Item>) =>
      mark(
        id,
        byId.get(id)?.series_id
          ? { touched_at: byId.get(id)!.touched_at ?? at, ...change }
          : change,
      )
    /** What a series takes away: its untouched, open occurrences from a day on. */
    const takeAway = (seriesId: string | null, from: string | null, keep?: string) => {
      if (!seriesId || !from) return
      for (const i of byId.values())
        if (
          i.series_id === seriesId &&
          i.occurrence_on! >= from &&
          i.touched_at === null &&
          i.archived_at === null &&
          (i.status === 'active' || i.status === 'idea') &&
          i.id !== keep
        )
          mark(i.id, { archived_at: at })
    }
    /** An occurrence made like another, unless its day is made already. */
    const occurrence = (
      like: Item,
      seriesId: string,
      id: string,
      on: string,
      fields: Partial<Item>,
    ) => {
      if (byId.has(id)) return
      for (const i of byId.values()) if (i.series_id === seriesId && i.occurrence_on === on) return
      byId.set(id, {
        ...blankItem(id, like.type, at),
        space_id: like.space_id,
        owner_id: like.owner_id,
        series_id: seriesId,
        occurrence_on: on,
        do_on: on,
        ...fields,
        sync,
      })
      order.push(id)
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
      // A Recipe comes with its first Variation; both are mine (ADR-0051).
      case 'food.create_recipe': {
        const a = entry.args as {
          p_id: string
          p_variation: string
          p_name: string
          p_status?: string
          p_variation_name?: string
        }
        const status = a.p_status ?? 'idea'
        if (!byId.has(a.p_id)) {
          byId.set(a.p_id, {
            ...blankItem(a.p_id, 'recipe', at),
            title: a.p_name.trim(),
            status,
            sync,
          })
          order.push(a.p_id)
        } else mark(a.p_id, {})
        if (!byId.has(a.p_variation)) {
          byId.set(a.p_variation, {
            ...blankItem(a.p_variation, 'variation', at),
            title: a.p_variation_name?.trim() || 'Standard',
            status,
            sync,
          })
          order.push(a.p_variation)
        }
        break
      }
      case 'food.add_variation': {
        const a = entry.args as { p_id: string; p_name: string; p_from?: string | null }
        if (!byId.has(a.p_id)) {
          byId.set(a.p_id, {
            ...blankItem(a.p_id, 'variation', at),
            title: a.p_name.trim(),
            status: a.p_from ? 'active' : 'idea',
            sync,
          })
          order.push(a.p_id)
        } else mark(a.p_id, {})
        break
      }
      // A Meal is an Item on a day and in a slot (MPL-002); the app sends its name.
      case 'food.plan_meal': {
        const a = entry.args as { p_id: string; p_fields: Record<string, unknown> }
        const f = a.p_fields
        if (!byId.has(a.p_id)) {
          byId.set(a.p_id, {
            ...blankItem(a.p_id, 'meal', at),
            title: String(f.title ?? '').trim(),
            do_on: (f.do_on as string) ?? null,
            slot: (f.slot as string) ?? null,
            ...(typeof f.space_id === 'string' && { space_id: f.space_id }),
            sync,
          })
          order.push(a.p_id)
        } else mark(a.p_id, {})
        break
      }
      case 'update_item': {
        const { p_id, p_patch } = entry.args as { p_id: string; p_patch: ItemFields }
        touch(p_id, p_patch)
        break
      }
      case 'archive_item':
        touch((entry.args as { p_id: string }).p_id, { archived_at: at })
        break
      case 'restore_item':
        mark((entry.args as { p_id: string }).p_id, { archived_at: null })
        break
      case 'convert_item': {
        const { p_id, p_type } = entry.args as { p_id: string; p_type: string }
        // Sorted into a Recipe, it is an Idea (RCP-002 4).
        mark(p_id, { type: p_type, ...(p_type === 'recipe' ? { status: 'idea' } : {}) })
        break
      }
      case 'set_repeat': {
        const a = entry.args as unknown as RepeatArgs
        const item = byId.get(a.p_item)
        const [first, ...rest] = a.p_occurrences
        if (!item || !first || item.series_id === a.p_series) break
        takeAway(item.series_id, item.occurrence_on, item.id)
        const t = a.p_template
        // An Event at its time on each day, in the series' timezone (EVT-004).
        const eventOn = (on: string): Partial<Item> => {
          if (t.all_day)
            return {
              do_on: null,
              all_day: true,
              starts_at: `${on}T00:00:00.000Z`,
              ends_at: `${addDays(on, t.days ?? 1)}T00:00:00.000Z`,
            }
          const start = zonedInstant(on, (t.start_time ?? '09:00').slice(0, 5), a.p_timezone)
          return {
            do_on: null,
            all_day: false,
            starts_at: start,
            ends_at: new Date(
              Date.parse(start) + (t.duration_minutes ?? 60) * 60_000,
            ).toISOString(),
          }
        }
        const fields = (on: string): Partial<Item> =>
          item.type === 'event'
            ? eventOn(on)
            : {
                do_on: on,
                do_at: t.do_at ?? null,
                due_on: t.due_offset_days == null ? null : addDays(on, t.due_offset_days),
              }
        mark(item.id, {
          series_id: a.p_series,
          occurrence_on: first.on,
          ...fields(first.on),
          status: item.status === 'idea' ? 'active' : item.status,
          touched_at: null,
        })
        for (const o of rest)
          occurrence(item, a.p_series, o.id, o.on, {
            title: t.title,
            body: t.body ?? null,
            place: t.place ?? null,
            ...fields(o.on),
          })
        break
      }
      case 'stop_repeat': {
        const item = byId.get((entry.args as { p_item: string }).p_item)
        if (item?.occurrence_on) takeAway(item.series_id, addDays(item.occurrence_on, 1))
        break
      }
      case 'complete_occurrence': {
        const { p_id, p_next, p_next_on } = entry.args as {
          p_id: string
          p_next: string
          p_next_on: string
        }
        const item = byId.get(p_id)
        if (!item) break
        touch(p_id, { status: 'done' })
        // Until the server answers, the next is made like this one.
        if (item.series_id)
          occurrence(item, item.series_id, p_next, p_next_on, {
            title: item.title,
            body: item.body,
            do_at: item.do_at,
            due_on:
              item.due_on && item.do_on
                ? addDays(p_next_on, daysBetween(item.do_on, item.due_on))
                : null,
          })
        break
      }
      default:
        // Links don't change how an Item looks.
        break
    }
  }
  return order.map((id) => byId.get(id)!)
}

const worst = (a: Item['sync'], b: Item['sync']): Item['sync'] =>
  a === 'failed' || b === 'failed' ? 'failed' : (a ?? b)
