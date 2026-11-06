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
import {
  byFiring,
  freshReminder,
  reminderAnchors,
  reminderChoice,
  reminderFields,
  reminderSays,
  reminderTime,
} from '@/lib/reminders'

/**
 * An Item's Reminders (REM-002, REM-003, EVT-003): its default and my own,
 * each changed or removed here, and new ones on its do-on or due date (a
 * Task), before or on the day it starts (an Event), or at a set time
 * (anything).
 */
export function ItemReminders({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const now = new Date()
  const reminders = useReminders(queue)
    .filter((r) => r.item_id === item.id)
    .sort(byFiring)
  const [editing, setEditing] = useState<{ id?: string; choice: ReminderChoice } | null>(null)
  const anchors = reminderAnchors(item)
  const timeOf = (r?: Reminder) =>
    r?.at_time?.slice(0, 5) ??
    (r?.anchor !== 'due_on' ? item.do_at?.slice(0, 5) : undefined) ??
    settings.defaultReminderTime

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
          alarm: r.alarm,
        }))}
        onOpen={(id) => {
          const r = reminders.find((x) => x.id === id)
          if (r) setEditing({ id, choice: reminderChoice(r, timeOf(r), settings.timezone) })
        }}
        onRemove={(id) => removeReminder(item.id, id)}
        onAdd={() =>
          setEditing({ choice: freshReminder(anchors, timeOf(), todayIn(settings.timezone)) })
        }
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
