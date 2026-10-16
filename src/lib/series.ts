import type { Item } from '@/data'

const isOpen = (i: Item) => i.status === 'active' || i.status === 'idea'
const when = (i: Item) => i.do_on ?? i.occurrence_on ?? ''
/** The day the series made it for. */
const made = (i: Item) => i.occurrence_on ?? i.do_on ?? ''

/**
 * A repeating Task shows its next open occurrence only (TSK-008, ADR-0022).
 * An untouched one overtaken by a newer occurrence that has come due is
 * skipped (TSK-010): the nightly run closes it, and until then it is hidden
 * here. One I changed stays open, and shows until it is done. A repeating
 * Event, which nobody ticks off, shows its next one from today, else its
 * last (SRC-001; Plan shows every occurrence).
 */
export function currentOccurrences<T extends Item>(items: readonly T[], today: string): T[] {
  const bySeries = new Map<string, T[]>()
  for (const i of items)
    if (i.series_id && i.archived_at === null)
      bySeries.set(i.series_id, [...(bySeries.get(i.series_id) ?? []), i])

  const hidden = new Set<string>()
  for (const occurrences of bySeries.values()) {
    const latestDue = occurrences
      .filter((o) => o.do_on !== null && o.do_on <= today)
      .reduce<string | null>((max, o) => (max && max > made(o) ? max : made(o)), null)
    const skipped = (o: T) => o.touched_at === null && latestDue !== null && made(o) < latestDue
    const open = occurrences
      .filter((o) => isOpen(o) && !skipped(o))
      .sort((a, b) => when(a).localeCompare(when(b)) || made(a).localeCompare(made(b)))
    const next =
      occurrences[0]?.type === 'event'
        ? (open.find((o) => made(o) >= today) ?? open[open.length - 1])
        : open[0]
    for (const o of occurrences) if (isOpen(o) && o !== next) hidden.add(o.id)
  }
  return items.filter((i) => !hidden.has(i.id))
}

/** Whether a Task still repeats: in a series that goes on after it (TSK-011). */
export function stillRepeats(
  item: Pick<Item, 'series_id' | 'occurrence_on'>,
  series: { id: string; ended_on: string | null } | undefined,
): boolean {
  if (!item.series_id || !series) return false
  return series.ended_on === null || series.ended_on > item.occurrence_on!
}
