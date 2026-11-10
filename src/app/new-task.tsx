import { todayIn } from '@lifeos/recurrence'
import { useRef, useState } from 'react'
import { ItemDialog, type AlertChoice, type Repeat } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import {
  addAlert,
  archiveItem,
  createItem,
  queue,
  removeDefaultAlert,
  stopRepeat,
  useFoodSpaces,
  useSettings,
  type ItemFields,
} from '@/data'
import { isoDayOf } from '@/lib/dates'
import { typeLook } from '@/lib/item-types'
import { choiceFiresAt, defaultAlert, alertFields, inAnHour } from '@/lib/alerts'
import { draftItem } from './item-navigation'
import { DraftAlerts, type DraftAlert } from './draft-alerts'
import { SpaceField } from './space-field'
import { repeatTask } from './repeat'
import { TaskFields, type TaskDates } from './task-details'

const TASK = typeLook('task')

/**
 * A new Task with all its fields at once (TSK-001): "New task" on Tasks. Nothing
 * is kept until Save; Cancel, Escape or Close leave nothing behind, and while
 * anything is typed a click outside doesn't close it.
 */
export function NewTaskDialog({
  onClose,
  doOn,
}: {
  onClose: () => void
  /** To do on this day: a day's "+" on Plan (PLN-006); today if not said (PLA-006 1). */
  doOn?: string | null
}) {
  const settings = useSettings(queue)
  const startOn = doOn === undefined ? todayIn(settings.timezone) : doOn
  const { personal } = useFoodSpaces(queue)
  // Personal to start; or a Household (HSH-005 1).
  const [space, setSpace] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dates, setDates] = useState<TaskDates>({
    do_on: startOn,
    do_at: null,
    due_on: null,
    status: 'active',
  })
  const [repeat, setRepeat] = useState<Repeat | null>(null)
  const [alerts, setAlerts] = useState<DraftAlert[]>([])
  // The default changed or removed before Save (REM-002 1).
  const [defaultGone, setDefaultGone] = useState(false)
  const given = defaultAlert({ type: 'task', do_on: dates.do_on, do_at: dates.do_at }, settings)
  // A default already gone by today is an hour from now instead (PLA-006 2).
  const givenAt = given && choiceFiresAt(given, dates, settings.timezone)
  const [opened] = useState(() => Date.now())
  const late = !!givenAt && Date.parse(givenAt) <= opened
  const byDefault: AlertChoice | null =
    given && late ? { kind: 'fixed', ...inAnHour(new Date(opened), settings.timezone) } : given

  const dirty =
    title.trim() !== '' ||
    notes !== '' ||
    dates.do_on !== startOn ||
    dates.due_on !== null ||
    alerts.length > 0 ||
    defaultGone ||
    (space !== null && space !== personal)
  const today = isoDayOf(new Date())
  const anchors = [
    ...(dates.do_on ? (['do_on'] as const) : []),
    ...(dates.due_on ? (['due_on'] as const) : []),
  ]

  const save = () => {
    if (!title.trim()) return titleRef.current?.focus()
    const fields: ItemFields = { title: title.trim(), do_on: dates.do_on, due_on: dates.due_on }
    if (dates.do_at) fields.do_at = dates.do_at
    if (notes.trim()) fields.body = notes
    if (space && space !== personal) fields.space_id = space
    const id = createItem('task', fields)
    // The server gives it its default; changed or removed here, it goes.
    if (byDefault && defaultGone) removeDefaultAlert(id)
    else if (byDefault && late) {
      removeDefaultAlert(id)
      addAlert(id, alertFields(byDefault, settings.timezone))
    }
    // An Alert on a date the Task hasn't got is left out.
    const kept = alerts.filter(
      (r) =>
        r.choice.kind === 'fixed' ||
        ((r.choice.kind === 'do_on' || r.choice.kind === 'due_on') && dates[r.choice.kind]),
    )
    for (const r of kept) addAlert(id, alertFields(r.choice, settings.timezone))
    if (repeat) {
      const anchored = kept
        .map((r) => alertFields(r.choice, settings.timezone))
        .filter((f) => f.anchor)
      repeatTask(
        {
          ...draftItem(id, 'task'),
          ...fields,
          body: fields.body ?? null,
          do_at: fields.do_at ?? null,
        },
        repeat,
        {
          timezone: settings.timezone,
          alerts: anchored.map((f) => ({
            anchor: f.anchor!,
            offset_days: f.offset_days ?? 0,
            at_time: f.at_time ?? null,
            alarm: f.alarm ?? false,
          })),
        },
      )
    }
    onClose()
    toast('Task saved', {
      action: {
        label: 'Undo',
        onClick: () => {
          // A repeat goes with it.
          if (repeat) stopRepeat(id)
          archiveItem(id)
        },
      },
    })
  }

  const fresh: AlertChoice = anchors[0]
    ? {
        kind: anchors[0],
        daysBefore: 0,
        time: dates.do_at?.slice(0, 5) ?? settings.defaultAlertTime,
      }
    : { kind: 'fixed', day: today, time: settings.defaultAlertTime }

  return (
    <ItemDialog
      open
      onOpenChange={(open) => !open && onClose()}
      colour={TASK.colour}
      icon={TASK.icon}
      typeLabel="New task"
      standard
      title="New task"
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
      <TaskFields
        notes={notes}
        onNotesChange={setNotes}
        dates={dates}
        onDates={(patch) => setDates((d) => ({ ...d, ...(patch as Partial<TaskDates>) }))}
        repeat={repeat}
        onRepeat={setRepeat}
        startsOn={dates.do_on && dates.do_on > today ? dates.do_on : today}
        alerts={
          <DraftAlerts
            alerts={alerts}
            onChange={setAlerts}
            anchors={anchors}
            dates={dates}
            fresh={fresh}
            byDefault={defaultGone ? null : byDefault}
            onDefaultGone={() => setDefaultGone(true)}
          />
        }
        space={<SpaceField value={space} onChange={setSpace} />}
      />
    </ItemDialog>
  )
}
