import { parseCapture } from '@lifeos/capture'
import { toast } from '@/components/ui/sonner'
import {
  convertItem,
  queue,
  removeReminder,
  updateItem,
  useReminders,
  useSettings,
  type Item,
  type ItemFields,
} from '@/data'
import { zonedInstant } from '@/lib/dates'
import { typeLook } from '@/lib/item-types'

/**
 * Converts an Item in place (ITM-004), saying so. A Thought becoming a Task
 * has its dates understood as they were meant when it was captured
 * (INB-002, CAP-003); its own Reminder stays (CAP-004) unless the Task's
 * default Reminder fires at the same moment.
 */
export function useConvert() {
  const settings = useSettings(queue)
  const reminders = useReminders(queue)
  return (item: Item, type: string) => {
    convertItem(item.id, type)
    toast(`Converted into a ${typeLook(type).label}`)
    if (item.type !== 'thought' || type !== 'task') return

    const dates = parseCapture(item.title, new Date(item.created_at))
    const patch: ItemFields = { title: dates.title || item.title }
    if (dates.doOn) patch.do_on = dates.doOn
    if (dates.doAt) patch.do_at = dates.doAt
    if (dates.dueOn) patch.due_on = dates.dueOn
    if (patch.title !== item.title || dates.doOn || dates.dueOn) updateItem(item.id, patch)

    if (dates.doOn) {
      const at = new Date(
        zonedInstant(dates.doOn, dates.doAt ?? settings.defaultReminderTime, settings.timezone),
      ).getTime()
      for (const r of reminders) {
        if (r.item_id === item.id && !r.is_default && r.fires_at && Date.parse(r.fires_at) === at)
          removeReminder(item.id, r.id)
      }
    }
  }
}
