import { useState } from 'react'
import {
  ReminderDialog,
  ReminderList,
  type ReminderAnchor,
  type ReminderChoice,
} from '@/components/lifeos'
import { newId, queue, useSettings } from '@/data'
import { reminderWhen } from '@/lib/dates'
import { choiceFiresAt, reminderFields, reminderSays, sameChoice } from '@/lib/reminders'

export interface DraftReminder {
  id: string
  choice: ReminderChoice
}

/** The default's row among the drafts. */
const DEFAULT = 'default'

/**
 * The Reminders of an Item not yet kept ("New task", "New event"): listed,
 * changed and removed here, each with when it will fire once the dates it
 * hangs on are set; made on Save. The default the server will give it shows
 * first (REM-002 1, EVT-003 1): changed, it is one of mine; removed, it goes.
 */
export function DraftReminders({
  reminders,
  onChange,
  anchors,
  dates,
  fresh,
  byDefault = null,
  onDefaultGone,
}: {
  reminders: readonly DraftReminder[]
  onChange: (reminders: DraftReminder[]) => void
  anchors: ReminderAnchor[]
  /** What they hang on, for when they will fire. */
  dates: Parameters<typeof choiceFiresAt>[1]
  /** A new one's first choice. */
  fresh: ReminderChoice
  /** The default it will be given, while it is kept; null when there is none. */
  byDefault?: ReminderChoice | null
  /** The default changed or removed: made into one of mine, or gone. */
  onDefaultGone?: () => void
}) {
  const settings = useSettings(queue)
  const [editing, setEditing] = useState<{ id?: string; choice: ReminderChoice } | null>(null)
  const shown = byDefault ? [{ id: DEFAULT, choice: byDefault }, ...reminders] : reminders
  return (
    <>
      <ReminderList
        reminders={shown.map((r) => {
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
          const r = shown.find((x) => x.id === id)
          if (r) setEditing({ id, choice: r.choice })
        }}
        onRemove={(id) =>
          id === DEFAULT ? onDefaultGone?.() : onChange(reminders.filter((r) => r.id !== id))
        }
        onAdd={() => setEditing({ choice: fresh })}
      />
      {editing && (
        <ReminderDialog
          value={editing.choice}
          anchors={anchors}
          onSave={(choice) => {
            if (editing.id === DEFAULT) {
              if (byDefault && !sameChoice(choice, byDefault)) {
                onDefaultGone?.()
                onChange([...reminders, { id: newId(), choice }])
              }
            } else
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
