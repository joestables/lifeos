import { useRef, useState } from 'react'
import { ItemDialog, type AlertChoice, type Repeat } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import {
  addAlert,
  addSubtask,
  archiveItem,
  createItem,
  newId,
  queue,
  removeDefaultAlert,
  stopRepeat,
  updateSubtask,
  useFoodSpaces,
  useSettings,
  type ItemFields,
} from '@/data'
import { isoDayOf } from '@/lib/dates'
import { typeLook } from '@/lib/item-types'
import { defaultAlert, alertFields } from '@/lib/alerts'
import { draftItem } from './item-navigation'
import { useDraftLabels } from './draft-labels'
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
  labelIds = [],
  doOn = null,
}: {
  onClose: () => void
  /** To do on this day: a day's "+" on Plan (PLN-006). */
  doOn?: string | null
  /** Starts with these Labels: the ones the page is narrowed to (TSK-001). */
  labelIds?: readonly string[]
}) {
  const settings = useSettings(queue)
  const { personal } = useFoodSpaces(queue)
  // Personal to start; or a Household (HSH-005 1).
  const [space, setSpace] = useState<string | null>(null)
  const draftLabels = useDraftLabels(labelIds, { id: space, personal })
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dates, setDates] = useState<TaskDates>({
    do_on: doOn,
    do_at: null,
    due_on: null,
    status: 'active',
  })
  const [repeat, setRepeat] = useState<Repeat | null>(null)
  const [alerts, setAlerts] = useState<DraftAlert[]>([])
  // The default changed or removed before Save (REM-002 1).
  const [defaultGone, setDefaultGone] = useState(false)
  const byDefault = defaultAlert({ type: 'task', do_on: dates.do_on, do_at: dates.do_at }, settings)
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; done: boolean }[]>([])

  const dirty =
    title.trim() !== '' ||
    notes !== '' ||
    dates.do_on !== doOn ||
    dates.due_on !== null ||
    subtasks.length > 0 ||
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
    const labelIds = draftLabels.save(id)
    for (const s of subtasks) {
      const sid = addSubtask(id, s.title)
      if (s.done) updateSubtask(id, sid, { done: true })
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
          labelIds,
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
        labels={draftLabels.labels}
        chosen={draftLabels.chosen}
        onToggleLabel={draftLabels.toggle}
        onCreateLabel={draftLabels.create}
        subtasks={subtasks}
        onAddSubtask={(t) => setSubtasks((s) => [...s, { id: newId(), title: t, done: false }])}
        onToggleSubtask={(id, done) =>
          setSubtasks((s) => s.map((x) => (x.id === id ? { ...x, done } : x)))
        }
        onRenameSubtask={(id, t) =>
          setSubtasks((s) => s.map((x) => (x.id === id ? { ...x, title: t } : x)))
        }
        onRemoveSubtask={(id) => setSubtasks((s) => s.filter((x) => x.id !== id))}
        space={<SpaceField value={space} onChange={setSpace} />}
      />
    </ItemDialog>
  )
}
