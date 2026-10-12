import { useState } from 'react'
import { ReminderDialog, ReminderList, type ReminderChoice } from '@/components/lifeos'
import {
  addReminder,
  queue,
  removeReminder,
  updateReminder,
  useReminders,
  useSettings,
  type Item,
  type Reminder,
} from '@/data'
import { todayIn } from '@lifeos/recurrence'
import { zonedParts } from '@/lib/dates'
import { byFiring, reminderFields, reminderSays, reminderTime } from '@/lib/reminders'

/**
 * An Item's Reminders (REM-002, REM-003): its default and my own, each
 * changed or removed here, and new ones on its do-on or due date (a Task) or
 * at a set time (anything).
 */
export function ItemReminders({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const now = new Date()
  const reminders = useReminders(queue)
    .filter((r) => r.item_id === item.id)
    .sort(byFiring)
  const [editing, setEditing] = useState<{ id?: string; choice: ReminderChoice } | null>(null)
  const anchors = [
    ...(item.type === 'task' && item.do_on ? (['do_on'] as const) : []),
    ...(item.type === 'task' && item.due_on ? (['due_on'] as const) : []),
  ]
  const timeOf = (r?: Reminder) =>
    r?.at_time?.slice(0, 5) ??
    (r?.anchor !== 'due_on' ? item.do_at?.slice(0, 5) : undefined) ??
    settings.defaultReminderTime

  const choiceOf = (r: Reminder): ReminderChoice =>
    r.anchor
      ? { kind: r.anchor as 'do_on' | 'due_on', daysBefore: -r.offset_days, time: timeOf(r) }
      : // In my home timezone, as it was set (ADR-0021).
        { kind: 'fixed', ...zonedParts(r.fixed_at!, settings.timezone) }
  const fresh: ReminderChoice = anchors[0]
    ? { kind: anchors[0], daysBefore: 0, time: timeOf() }
    : { kind: 'fixed', day: todayIn(settings.timezone), time: settings.defaultReminderTime }

  const save = (choice: ReminderChoice) => {
    const fields = reminderFields(choice, settings.timezone)
    if (editing?.id) updateReminder(item.id, editing.id, fields)
    else addReminder(item.id, fields)
    setEditing(null)
  }

  return (
    <>
      <ReminderList
        reminders={reminders.map((r) => ({
          id: r.id,
          when: reminderTime(r, now),
          says: reminderSays(r, now),
        }))}
        onOpen={(id) => {
          const r = reminders.find((x) => x.id === id)
          if (r) setEditing({ id, choice: choiceOf(r) })
        }}
        onRemove={(id) => removeReminder(item.id, id)}
        onAdd={() => setEditing({ choice: fresh })}
      />
      {editing && (
        <ReminderDialog
          value={editing.choice}
          anchors={anchors}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
