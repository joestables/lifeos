import { parseCapture } from '@lifeos/capture'
import { toast } from '@/components/ui/sonner'
import {
  addReminder,
  convertItem,
  queue,
  removeReminder,
  updateItem,
  useReminders,
  useSettings,
  type Item,
  type ItemFields,
  type Reminder,
} from '@/data'
import { zonedInstant } from '@/lib/dates'
import { typeLook } from '@/lib/item-types'

/**
 * Converts an Item in place (ITM-004), saying so, with Undo. A Thought becoming a Task
 * has its dates understood as they were meant when it was captured
 * (INB-002, CAP-003); its own Reminder stays (CAP-004) unless the Task's
 * default Reminder fires at the same moment.
 */
export function useConvert() {
  const settings = useSettings(queue)
  const reminders = useReminders(queue)
  return (item: Item, type: string) => {
    convertItem(item.id, type)
    const removed: Reminder[] = []
    let changed: ItemFields | null = null
    toast(`Converted into a ${typeLook(type).label}`, {
      // Back to its Type, its dates and title as they were, its own Reminder kept.
      action: {
        label: 'Undo',
        onClick: () => {
          // Its dates go first: a Thought has none.
          if (changed) updateItem(item.id, changed)
          convertItem(item.id, item.type)
          for (const r of removed)
            addReminder(item.id, {
              anchor: r.anchor as 'do_on' | 'due_on' | null,
              offset_days: r.offset_days,
              at_time: r.at_time,
              fixed_at: r.fixed_at,
            })
        },
      },
    })
    if (item.type !== 'thought' || type !== 'task') return

    const dates = parseCapture(item.title, new Date(item.created_at))
    const patch: ItemFields = { title: dates.title || item.title }
    if (dates.doOn) patch.do_on = dates.doOn
    if (dates.doAt) patch.do_at = dates.doAt
    if (dates.dueOn) patch.due_on = dates.dueOn
    if (patch.title !== item.title || dates.doOn || dates.dueOn) {
      updateItem(item.id, patch)
      changed = { title: item.title, do_on: item.do_on, do_at: item.do_at, due_on: item.due_on }
    }

    // Only a default that will be made can stand in for the Thought's own.
    if (dates.doOn && settings.taskReminders) {
      const at = new Date(
        zonedInstant(dates.doOn, dates.doAt ?? settings.defaultReminderTime, settings.timezone),
      ).getTime()
      for (const r of reminders) {
        if (r.item_id === item.id && !r.is_default && r.fires_at && Date.parse(r.fires_at) === at) {
          removeReminder(item.id, r.id)
          removed.push(r)
        }
      }
    }
  }
}
