import { useRef, useState } from 'react'
import { ItemDialog, RepeatField, type Repeat } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { addAlert, archiveItem, createItem, queue, stopRepeat, useSettings } from '@/data'
import { typeLook } from '@/lib/item-types'
import { firstAlert, reminderAlertFields } from '@/lib/alerts'
import { draftItem } from './item-navigation'
import { repeatTask } from './repeat'
import { DraftReminderAlerts, type DraftReminderAlert } from './reminder-details'
import { Field } from './task-details'

const REMINDER = typeLook('reminder')

/**
 * A new Reminder (RMD-001 4): a day's "+" on Plan. A title, one Alert to
 * start (an hour from now today, else my default time that day) and more
 * if wanted, and a Repeat. Nothing is kept until Save.
 */
export function NewReminderDialog({ day, onClose }: { day: string; onClose: () => void }) {
  const settings = useSettings(queue)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [repeat, setRepeat] = useState<Repeat | null>(null)
  const [alerts, setAlerts] = useState<DraftReminderAlert[]>(() => [
    {
      id: crypto.randomUUID(),
      choice: firstAlert(day, settings.timezone, settings.defaultAlertTime),
    },
  ])
  const dirty = title.trim() !== '' || alerts.length > 1 || repeat !== null

  const save = () => {
    if (!title.trim()) return titleRef.current?.focus()
    // Its day is its first Alert's (ADR-0065 2).
    const days = alerts.map((a) => (a.choice.kind === 'fixed' && a.choice.day ? a.choice.day : day))
    const first = days.sort()[0] ?? day
    const id = createItem('reminder', { title: title.trim(), do_on: first })
    const fields = alerts.map((a) => reminderAlertFields(a.choice, first))
    for (const f of fields) addAlert(id, f)
    if (repeat) {
      repeatTask({ ...draftItem(id, 'reminder'), title: title.trim(), do_on: first }, repeat, {
        labelIds: [],
        timezone: settings.timezone,
        alerts: fields.map((f) => ({
          anchor: 'do_on',
          offset_days: f.offset_days ?? 0,
          at_time: f.at_time ?? null,
          alarm: f.alarm ?? false,
        })),
      })
    }
    onClose()
    toast('Reminder saved', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (repeat) stopRepeat(id)
          archiveItem(id)
        },
      },
    })
  }

  return (
    <ItemDialog
      open
      onOpenChange={(open) => !open && onClose()}
      colour={REMINDER.colour}
      icon={REMINDER.icon}
      typeLabel="New reminder"
      title="New reminder"
      keepOnOutsideClick={dirty}
      titleField={
        <input
          ref={titleRef}
          aria-label="Title"
          placeholder="Title"
          autoComplete="off"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="min-w-0 bg-transparent pt-1 text-day outline-none placeholder:text-muted-foreground"
        />
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!title.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Alerts">
          <DraftReminderAlerts alerts={alerts} onChange={setAlerts} day={day} />
        </Field>
        <Field label="Repeat">
          <RepeatField value={repeat} scheduleOnly startsOn={day} onChange={setRepeat} />
        </Field>
      </div>
    </ItemDialog>
  )
}
