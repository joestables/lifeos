import { useState } from 'react'
import { AlertEditDialog, AlertList, type AlertAnchor, type AlertChoice } from '@/components/lifeos'
import { newId, queue, useSettings } from '@/data'
import { alertWhen } from '@/lib/dates'
import { choiceFiresAt, alertFields, alertSays, sameChoice } from '@/lib/alerts'

export interface DraftAlert {
  id: string
  choice: AlertChoice
}

/** The default's row among the drafts. */
const DEFAULT = 'default'

/**
 * The Alerts of an Item not yet kept ("New task", "New event"): listed,
 * changed and removed here, each with when it will fire once the dates it
 * hangs on are set; made on Save. The default the server will give it shows
 * first (REM-002 1, EVT-003 1): changed, it is one of mine; removed, it goes.
 */
export function DraftAlerts({
  alerts,
  onChange,
  anchors,
  dates,
  fresh,
  byDefault = null,
  onDefaultGone,
}: {
  alerts: readonly DraftAlert[]
  onChange: (alerts: DraftAlert[]) => void
  anchors: AlertAnchor[]
  /** What they hang on, for when they will fire. */
  dates: Parameters<typeof choiceFiresAt>[1]
  /** A new one's first choice. */
  fresh: AlertChoice
  /** The default it will be given, while it is kept; null when there is none. */
  byDefault?: AlertChoice | null
  /** The default changed or removed: made into one of mine, or gone. */
  onDefaultGone?: () => void
}) {
  const settings = useSettings(queue)
  const [editing, setEditing] = useState<{ id?: string; choice: AlertChoice } | null>(null)
  const shown = byDefault ? [{ id: DEFAULT, choice: byDefault }, ...alerts] : alerts
  return (
    <>
      <AlertList
        alerts={shown.map((r) => {
          const at = choiceFiresAt(r.choice, dates, settings.timezone)
          const f = alertFields(r.choice, settings.timezone)
          return {
            id: r.id,
            when: at && alertWhen(at),
            says: alertSays({
              ...f,
              anchor: f.anchor ?? null,
              offset_days: f.offset_days ?? 0,
              fixed_at: f.fixed_at ?? null,
              snoozed_until: null,
            }),
            alarm: r.choice.alarm ?? false,
          }
        })}
        onOpen={(id) => {
          const r = shown.find((x) => x.id === id)
          if (r) setEditing({ id, choice: r.choice })
        }}
        onRemove={(id) =>
          id === DEFAULT ? onDefaultGone?.() : onChange(alerts.filter((r) => r.id !== id))
        }
        onAdd={() => setEditing({ choice: fresh })}
      />
      {editing && (
        <AlertEditDialog
          value={editing.choice}
          anchors={anchors}
          onSave={(choice) => {
            if (editing.id === DEFAULT) {
              if (byDefault && !sameChoice(choice, byDefault)) {
                onDefaultGone?.()
                onChange([...alerts, { id: newId(), choice }])
              }
            } else
              onChange(
                editing.id
                  ? alerts.map((r) => (r.id === editing.id ? { ...r, choice } : r))
                  : [...alerts, { id: newId(), choice }],
              )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
