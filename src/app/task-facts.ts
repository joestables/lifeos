import { shortRule } from '@lifeos/recurrence'
import { useMemo } from 'react'
import { queue, useFoodSpaces, useMarks, type Item } from '@/data'
import { repeatOf, useSeriesById } from './repeat'

/**
 * What a Task's row shows besides the Task itself: its star, repeat and,
 * shared, its Household's name (HSH-005 2).
 */
export function useTaskFacts() {
  const marks = useMarks(queue)
  const { householdName } = useFoodSpaces(queue)
  const series = useSeriesById()
  return useMemo(
    () => ({
      series,
      of: (task: Item) => {
        const repeat = repeatOf(task, series)
        return {
          starred: marks.has(task.id),
          repeat: repeat ? shortRule(repeat.rule, repeat.mode) : undefined,
          household: householdName(task.space_id),
        }
      },
    }),
    [marks, series, householdName],
  )
}
