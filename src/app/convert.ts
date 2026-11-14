import { parseCapture } from '@lifeos/capture'
import { useNavigate } from '@tanstack/react-router'
import { toast } from '@/components/ui/sonner'
import { convertItem, settingsNow, updateItem, type Item, type ItemFields } from '@/data'
import { zonedInstant } from '@/lib/dates'
import { eventAsTask, taskAsEvent } from '@/lib/events'
import { typeLook } from '@/lib/item-types'
import { useOpenItem } from './item-navigation'

/** "a Task", "an Event". */
const withArticle = (label: string) => `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}`

/**
 * Converts an Item in place (ITM-004), saying so, with Undo. A Thought becoming a Task
 * has its dates understood as they were meant when it was captured
 * (INB-002, CAP-003). Becoming an Event, the date is
 * its start (INB-002 3). A Task and an Event swap their times (EVT-005): the
 * server maps them, and they are laid over here too so they show at once,
 * offline as well. Sorted into a Recipe, it offers Open rather than Undo.
 */
export function useConvert() {
  const navigate = useNavigate()
  const open = useOpenItem()
  return (item: Item, type: string) => {
    // Read when it is converted: a row that offers it isn't drawn again with every write.
    const settings = settingsNow()
    // A Thought into a Reminder (RMD-006 1): its Alert at the time its text
    // names, those words out of its title; the server gives it one an hour
    // from now if it names none, or one gone by. Its popup opens.
    if (item.type === 'thought' && type === 'reminder') {
      const dates = parseCapture(item.title, new Date(item.created_at))
      const title = dates.title || item.title
      const day = dates.doOn ?? dates.dueOn
      const at = day
        ? zonedInstant(day, dates.doAt ?? settings.defaultAlertTime, settings.timezone)
        : undefined
      if (title !== item.title) updateItem(item.id, { title })
      convertItem(item.id, type, at)
      toast('Converted into a Reminder', {
        action: {
          label: 'Undo',
          onClick: () => {
            updateItem(item.id, { do_on: null, title: item.title })
            convertItem(item.id, item.type)
          },
        },
      })
      open({ id: item.id, type })
      return
    }
    convertItem(item.id, type)
    // Sorted into a Recipe it is an Idea, its text the Idea's notes (RCP-002 4): no way
    // back that keeps the text, so it opens instead of undoing.
    if (type === 'recipe') {
      toast('Converted into a Recipe', {
        action: {
          label: 'Open',
          onClick: () => void navigate({ to: '/recipes/$id', params: { id: item.id } }),
        },
      })
      return
    }
    let changed: ItemFields | null = null
    const swapped =
      item.type === 'task' && type === 'event'
        ? taskAsEvent(item, settings.timezone)
        : item.type === 'event' && type === 'task'
          ? eventAsTask(item, settings.timezone)
          : null
    if (swapped) updateItem(item.id, swapped)
    toast(`Converted into ${withArticle(typeLook(type).label)}`, {
      // Back to its Type, its dates and title as they were.
      action: {
        label: 'Undo',
        onClick: () => {
          // Its dates go first: a Thought has none.
          if (changed) updateItem(item.id, changed)
          convertItem(item.id, item.type)
        },
      },
    })
    if (item.type !== 'thought' || (type !== 'task' && type !== 'event')) return

    const dates = parseCapture(item.title, new Date(item.created_at))
    if (type === 'event') {
      const start = dates.doOn
        ? taskAsEvent({ do_on: dates.doOn, do_at: dates.doAt ?? null }, settings.timezone)
        : null
      const title = dates.title || item.title
      if (start || title !== item.title) {
        updateItem(item.id, { title, ...start })
        changed = { title: item.title, starts_at: null, ends_at: null, all_day: null }
      }
      return
    }
    const patch: ItemFields = { title: dates.title || item.title }
    if (dates.doOn) patch.do_on = dates.doOn
    if (dates.doAt) patch.do_at = dates.doAt
    if (dates.dueOn) patch.due_on = dates.dueOn
    if (patch.title !== item.title || dates.doOn || dates.dueOn) {
      updateItem(item.id, patch)
      changed = { title: item.title, do_on: item.do_on, do_at: item.do_at, due_on: item.due_on }
    }
  }
}
