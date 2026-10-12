import { useMemo } from 'react'
import { queue, useLabels, useMarks, useSubtasks } from '@/data'

/** What a Task's row shows besides the Task itself: its Labels, star and sub-tasks. */
export function useTaskFacts() {
  const marks = useMarks(queue)
  const { labels, itemLabels } = useLabels(queue)
  const subtasks = useSubtasks(queue)
  return useMemo(() => {
    const names = new Map(labels.map((l) => [l.id, l.name]))
    const labelsOf = new Map<string, string[]>()
    for (const r of itemLabels) {
      const name = names.get(r.label_id)
      if (name !== undefined) labelsOf.set(r.item_id, [...(labelsOf.get(r.item_id) ?? []), name])
    }
    for (const list of labelsOf.values()) list.sort((a, b) => a.localeCompare(b))
    const counts = new Map<string, { done: number; total: number }>()
    for (const s of subtasks) {
      const c = counts.get(s.item_id) ?? { done: 0, total: 0 }
      counts.set(s.item_id, { done: c.done + (s.done ? 1 : 0), total: c.total + 1 })
    }
    return {
      labels,
      itemLabels,
      of: (id: string) => ({
        labels: labelsOf.get(id) ?? [],
        starred: marks.has(id),
        subtasks: counts.get(id),
      }),
    }
  }, [marks, labels, itemLabels, subtasks])
}
