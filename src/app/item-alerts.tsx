import { useState } from 'react'
import { AlertEditDialog, AlertList, type AlertChoice } from '@/components/lifeos'
import {
  addAlert,
  queue,
  removeAlert,
  updateAlert,
  useAlerts,
  useSettings,
  type Item,
  type Alert,
} from '@/data'
import { todayIn } from '@lifeos/recurrence'
import {
  byFiring,
  freshAlert,
  alertAnchors,
  alertChoice,
  alertFields,
  alertSays,
  alertTime,
} from '@/lib/alerts'

/**
 * An Item's Alerts (REM-002, REM-003, EVT-003): its default and my own,
 * each changed or removed here, and new ones on its do-on or due date (a
 * Task), before or on the day it starts (an Event), or at a set time
 * (anything).
 */
export function ItemAlerts({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const now = new Date()
  const alerts = useAlerts(queue)
    .filter((r) => r.item_id === item.id)
    .sort(byFiring)
  const [editing, setEditing] = useState<{ id?: string; choice: AlertChoice } | null>(null)
  const anchors = alertAnchors(item)
  const timeOf = (r?: Alert) =>
    r?.at_time?.slice(0, 5) ??
    (r?.anchor !== 'due_on' ? item.do_at?.slice(0, 5) : undefined) ??
    settings.defaultAlertTime

  const save = (choice: AlertChoice) => {
    const fields = alertFields(choice, settings.timezone)
    if (editing?.id) updateAlert(item.id, editing.id, fields)
    else addAlert(item.id, fields)
    setEditing(null)
  }

  return (
    <>
      <AlertList
        alerts={alerts.map((r) => ({
          id: r.id,
          when: alertTime(r, now),
          says: alertSays(r, now),
          alarm: r.alarm,
        }))}
        onOpen={(id) => {
          const r = alerts.find((x) => x.id === id)
          if (r) setEditing({ id, choice: alertChoice(r, timeOf(r), settings.timezone) })
        }}
        onRemove={(id) => removeAlert(item.id, id)}
        onAdd={() =>
          setEditing({ choice: freshAlert(anchors, timeOf(), todayIn(settings.timezone)) })
        }
      />
      {editing && (
        <AlertEditDialog
          value={editing.choice}
          anchors={anchors}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
