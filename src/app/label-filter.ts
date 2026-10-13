import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { queue, useLabels } from '@/data'
import { labelMatcher } from '@/lib/labels'

/** The Labels chosen to filter a page, kept in its address (`?labels=`). */
export interface LabelsSearch {
  labels?: string[]
}

export function validateLabels(search: Record<string, unknown>): LabelsSearch {
  const labels = Array.isArray(search.labels)
    ? search.labels.filter((l): l is string => typeof l === 'string')
    : []
  return labels.length > 0 ? { labels } : {}
}

/**
 * Filtering a page by Label (NTE-002, TSK-004, INB-007): all my Labels as
 * pills, any number chosen; an Item shows if it has any of them. The choice
 * stays in the address, so switching a page's views keeps it.
 */
export function useLabelFilter(fromSearch: readonly string[] | undefined) {
  const navigate = useNavigate()
  const { labels, itemLabels } = useLabels(queue)
  const all = useMemo(
    () => labels.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    [labels],
  )
  // A Label deleted since it was chosen no longer filters.
  const chosen = useMemo<ReadonlySet<string>>(
    () => new Set((fromSearch ?? []).filter((id) => all.some((l) => l.id === id))),
    [fromSearch, all],
  )
  const shows = useMemo(() => labelMatcher(chosen, itemLabels), [chosen, itemLabels])
  const choose = (next: string[]) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        labels: next.length > 0 ? next : undefined,
      }),
      replace: true,
    })
  /** "No notes labelled Home", "No tasks with these labels". */
  const nothing = (things: string) => {
    if (chosen.size !== 1) return `No ${things} with these labels`
    const [id] = chosen
    return `No ${things} labelled ${all.find((l) => l.id === id)!.name}`
  }

  return { labels: all, chosen, shows, choose, nothing }
}
