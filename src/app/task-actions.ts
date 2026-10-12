import { toast } from '@/components/ui/sonner'
import type { CaptureDates } from '@lifeos/capture'
import { createItem, updateItem, type Item, type ItemFields } from '@/data'
import { itemTitle } from '@/lib/item-types'

/** Parked for someday, without its do-on date (TSK-007), with Undo. */
export function toSomeday(task: Item) {
  const was = { status: task.status, do_on: task.do_on, do_at: task.do_at }
  updateItem(task.id, { status: 'idea', do_on: null, do_at: null })
  toast(`Moved "${itemTitle(task)}" to Someday`, {
    action: { label: 'Undo', onClick: () => updateItem(task.id, was) },
  })
}

/**
 * A Task from one line, its dates understood (TSK-001, CAP-003): the date
 * words leave its title. Its default Reminder comes with its do-on date
 * (REM-002).
 */
export function createTaskFrom(line: string, dates: CaptureDates): string {
  const fields: ItemFields = { title: dates.title || line.trim() }
  if (dates.doOn) fields.do_on = dates.doOn
  if (dates.doAt) fields.do_at = dates.doAt
  if (dates.dueOn) fields.due_on = dates.dueOn
  return createItem('task', fields)
}
