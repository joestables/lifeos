import { shortRule } from '@lifeos/recurrence'
import { useMemo } from 'react'
import { queue, useLabels, useMarks, useSubtasks, type Item } from '@/data'
import { repeatOf, useSeriesById } from './repeat'

/** What a Task's row shows besides the Task itself: its Labels, star, sub-tasks and repeat. */
export function useTaskFacts() {
  const marks = useMarks(queue)
  const { labels, itemLabels } = useLabels(queue)
  const subtasks = useSubtasks(queue)
  const series = useSeriesById()
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
      series,
      of: (task: Item) => {
        const repeat = repeatOf(task, series)
        return {
          labels: labelsOf.get(task.id) ?? [],
          starred: marks.has(task.id),
          subtasks: counts.get(task.id),
          repeat: repeat ? shortRule(repeat.rule, repeat.mode) : undefined,
        }
      },
    }
  }, [marks, labels, itemLabels, subtasks, series])
}
