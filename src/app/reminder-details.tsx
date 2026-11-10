import { daysBetween, todayIn } from '@lifeos/recurrence'
import { useState, type ReactNode } from 'react'
import {
  AlertEditDialog,
  AlertList,
  RepeatField,
  type AlertChoice,
  type AlertLine,
  type Repeat,
} from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import {
  addAlert,
  queue,
  removeAlert,
  stopRepeat,
  updateAlert,
  useAlerts,
  useSettings,
  type Item,
} from '@/data'
import { firstAlert, reminderAlertFields, reminderChoice, toCome } from '@/lib/alerts'
import { alertWhen, zonedInstant } from '@/lib/dates'
import { alertTimes } from '@/lib/plan'
import { repeatOf, repeatStart, repeatTask, useSeriesById } from './repeat'
import { Field } from './task-details'

/** The Alert dialog for a Reminder: a date and time still to come, and Alarm (RMD-002). */
export function ReminderAlertDialog({
  value,
  onSave,
  onClose,
}: {
  value: AlertChoice
  onSave: (choice: AlertChoice) => void
  onClose: () => void
}) {
  const settings = useSettings(queue)
  return (
    <AlertEditDialog
      value={value}
      anchors={[]}
      onSave={(choice) =>
        toCome(choice, settings.timezone) ? onSave(choice) : toast('Choose a time still to come')
      }
      onClose={onClose}
    />
  )
}

/**
 * A Reminder's Alerts (RMD-002): each at its date and time, opened to change
 * it or make it an Alarm, removed with × but for the last; "Add an alert".
 */
export function ReminderAlerts({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const now = new Date()
  const alerts = useAlerts(queue).filter((a) => a.item_id === item.id)
  const [editing, setEditing] = useState<{ id?: string; choice: AlertChoice } | null>(null)
  const day = item.do_on ?? todayIn(settings.timezone)
  const lines = alerts
    .map((a) => ({ a, t: alertTimes(item, [a], settings.timezone, now)[0] }))
    .filter((x) => x.t !== undefined)
    .sort((x, y) => x.t!.at - y.t!.at)
  const snoozed = (id: string) => {
    const a = alerts.find((x) => x.id === id)
    return !!a?.snoozed_until && Date.parse(a.snoozed_until) > now.getTime()
  }

  const save = (choice: AlertChoice) => {
    const fields = reminderAlertFields(choice, day)
    if (editing?.id) updateAlert(item.id, editing.id, fields)
    else addAlert(item.id, fields)
    setEditing(null)
  }

  return (
    <>
      <AlertList
        alerts={lines.map(({ a, t }): AlertLine => ({
          id: a.id,
          when: alertWhen(new Date(t!.at).toISOString(), now),
          says: snoozed(a.id) ? 'Snoozed' : '',
          alarm: a.alarm,
          removable: lines.length > 1,
        }))}
        onOpen={(id) => {
          const t = lines.find((x) => x.a.id === id)?.t
          if (t) setEditing({ id, choice: reminderChoice(t) })
        }}
        onRemove={(id) => removeAlert(item.id, id)}
        onAdd={() =>
          setEditing({
            choice: firstAlert(day, settings.timezone, settings.defaultAlertTime),
          })
        }
      />
      {editing && (
        <ReminderAlertDialog
          value={editing.choice}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

/** Everything about a Reminder (RMD-001): its Alerts and its Repeat, on a schedule. */
export function ReminderDetails({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const alerts = useAlerts(queue)
  const series = useSeriesById()
  const repeat = repeatOf(item, series)
  const today = todayIn(settings.timezone)
  const setRepeatTo = (next: Repeat | null) => {
    if (!next) return stopRepeat(item.id)
    repeatTask(item, next, {
      labelIds: [],
      timezone: settings.timezone,
      alerts: alerts
        .filter((a) => a.item_id === item.id && a.anchor === 'do_on')
        .map((a) => ({
          anchor: 'do_on',
          offset_days: a.offset_days,
          at_time: a.at_time,
          alarm: a.alarm,
        })),
    })
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="Alerts">
        <ReminderAlerts item={item} />
      </Field>
      <Field label="Repeat">
        <RepeatField
          value={repeat}
          scheduleOnly
          startsOn={repeatStart(item, today)}
          describeFrom={series.get(item.series_id ?? '')?.starts_on}
          onChange={setRepeatTo}
        />
      </Field>
    </div>
  )
}

/** A draft Alert in New reminder: a date and time, before Save. */
export interface DraftReminderAlert {
  id: string
  choice: AlertChoice
}

/** New reminder's Alerts before Save (RMD-001 4): changed, removed but for the last, added. */
export function DraftReminderAlerts({
  alerts,
  onChange,
  day,
}: {
  alerts: DraftReminderAlert[]
  onChange: (alerts: DraftReminderAlert[]) => void
  day: string
}): ReactNode {
  const settings = useSettings(queue)
  const now = new Date()
  const [editing, setEditing] = useState<{ id?: string; choice: AlertChoice } | null>(null)
  const dayOf = (a: DraftReminderAlert) =>
    a.choice.kind === 'fixed' && a.choice.day ? a.choice.day : day
  const sorted = [...alerts].sort(
    (a, b) => daysBetween(dayOf(b), dayOf(a)) || a.choice.time.localeCompare(b.choice.time),
  )
  return (
    <>
      <AlertList
        alerts={sorted.map((a): AlertLine => ({
          id: a.id,
          when:
            a.choice.kind === 'fixed' && a.choice.day
              ? alertWhen(zonedInstant(a.choice.day, a.choice.time, settings.timezone), now)
              : null,
          says: '',
          alarm: a.choice.alarm,
          removable: alerts.length > 1,
        }))}
        onOpen={(id) => {
          const a = alerts.find((x) => x.id === id)
          if (a) setEditing({ id, choice: a.choice })
        }}
        onRemove={(id) => onChange(alerts.filter((a) => a.id !== id))}
        onAdd={() =>
          setEditing({ choice: firstAlert(day, settings.timezone, settings.defaultAlertTime) })
        }
      />
      {editing && (
        <ReminderAlertDialog
          value={editing.choice}
          onSave={(choice) => {
            onChange(
              editing.id
                ? alerts.map((a) => (a.id === editing.id ? { ...a, choice } : a))
                : [...alerts, { id: crypto.randomUUID(), choice }],
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
