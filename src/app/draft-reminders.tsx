import { useState } from 'react'
import {
  ReminderDialog,
  ReminderList,
  type ReminderAnchor,
  type ReminderChoice,
} from '@/components/lifeos'
import { newId, queue, useSettings } from '@/data'
import { reminderWhen } from '@/lib/dates'
import { choiceFiresAt, reminderFields, reminderSays } from '@/lib/reminders'

export interface DraftReminder {
  id: string
  choice: ReminderChoice
}

/**
 * The Reminders of an Item not yet kept ("New task", "New event"): listed,
 * changed and removed here, each with when it will fire once the dates it
 * hangs on are set; made on Save.
 */
export function DraftReminders({
  reminders,
  onChange,
  anchors,
  dates,
  fresh,
}: {
  reminders: readonly DraftReminder[]
  onChange: (reminders: DraftReminder[]) => void
  anchors: ReminderAnchor[]
  /** What they hang on, for when they will fire. */
  dates: Parameters<typeof choiceFiresAt>[1]
  /** A new one's first choice. */
  fresh: ReminderChoice
}) {
  const settings = useSettings(queue)
  const [editing, setEditing] = useState<{ id?: string; choice: ReminderChoice } | null>(null)
  return (
    <>
      <ReminderList
        reminders={reminders.map((r) => {
          const at = choiceFiresAt(r.choice, dates, settings.timezone)
          const f = reminderFields(r.choice, settings.timezone)
          return {
            id: r.id,
            when: at && reminderWhen(at),
            says: reminderSays({
              ...f,
              anchor: f.anchor ?? null,
              offset_days: f.offset_days ?? 0,
              fixed_at: f.fixed_at ?? null,
              snoozed_until: null,
            }),
          }
        })}
        onOpen={(id) => {
          const r = reminders.find((x) => x.id === id)
          if (r) setEditing({ id, choice: r.choice })
        }}
        onRemove={(id) => onChange(reminders.filter((r) => r.id !== id))}
        onAdd={() => setEditing({ choice: fresh })}
      />
      {editing && (
        <ReminderDialog
          value={editing.choice}
          anchors={anchors}
          onSave={(choice) => {
            onChange(
              editing.id
                ? reminders.map((r) => (r.id === editing.id ? { ...r, choice } : r))
                : [...reminders, { id: newId(), choice }],
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
