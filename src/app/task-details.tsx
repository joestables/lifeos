import { useId, useRef, useState, type ReactNode } from 'react'
import { DateField, RepeatField, SubtaskList, TimeField, type Repeat } from '@/components/lifeos'
import { LabelPicker } from '@/components/lifeos/LabelPicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  addLabel,
  addSubtask,
  createLabel,
  queue,
  removeLabel,
  removeSubtask,
  stopRepeat,
  updateItem,
  updateSubtask,
  useLabels,
  useReminders,
  useSettings,
  useSubtasks,
  type Item,
  type ItemFields,
} from '@/data'
import { isoDayOf } from '@/lib/dates'
import { TaskFor } from './event-details'
import { useKeptText } from './kept-text'
import { ItemReminders } from './item-reminders'
import { repeatOf, repeatStart, repeatTask, useSeriesById, useTickDone } from './repeat'

/** A Task's checkbox and title, edited in place (TSK-002). */
export function TaskTitle({ item }: { item: Item }) {
  const [title, setTitle, flush] = useKeptText(item.id, 'title', item.title)
  const tickDone = useTickDone()
  return (
    <div className="flex items-center gap-3 pt-1">
      <Checkbox
        colour="blue"
        aria-label="Done"
        className="size-5"
        checked={item.status === 'done'}
        onCheckedChange={(on) => (on ? tickDone(item) : updateItem(item.id, { status: 'active' }))}
      />
      <input
        aria-label="Title"
        placeholder="Title"
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={flush}
        className="min-w-0 flex-1 bg-transparent text-day outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

/** An Item's Labels as Badges, and "Add" to open the LabelPicker (ITM-005). */
export function LabelsField({
  labels,
  chosen,
  onToggle,
  onCreate,
}: {
  /** Mine, A to Z. */
  labels: { id: string; name: string }[]
  chosen: ReadonlySet<string>
  onToggle: (id: string, on: boolean) => void
  onCreate: (name: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels
        .filter((l) => chosen.has(l.id))
        .map((l) => (
          <Badge key={l.id}>{l.name}</Badge>
        ))}
      <LabelPicker
        trigger={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Add
          </Button>
        }
        labels={labels}
        chosen={chosen}
        onToggle={onToggle}
        onCreate={onCreate}
      />
    </div>
  )
}

/** An Item's own Labels, each change kept at once. */
export function ItemLabels({ item }: { item: Item }) {
  const { labels, itemLabels } = useLabels(queue)
  const chosen = new Set(itemLabels.filter((r) => r.item_id === item.id).map((r) => r.label_id))
  return (
    <LabelsField
      labels={[...labels].sort((a, b) => a.name.localeCompare(b.name))}
      chosen={chosen}
      onToggle={(id, on) => (on ? addLabel(item.id, id) : removeLabel(item.id, id))}
      onCreate={(name) => addLabel(item.id, createLabel(name))}
    />
  )
}

/** A Task's dates and status, as its fields show them. */
export interface TaskDates {
  do_on: string | null
  do_at: string | null
  due_on: string | null
  status: string
}

/**
 * A Task's fields (TSK-002), for a Task kept as it is changed or a new one
 * kept on Save: notes, do-on date and time, due date, repeat, Reminders,
 * Labels, sub-tasks. A time needs a day, so a time on its own asks for one.
 */
export function TaskFields({
  notes,
  onNotesChange,
  onNotesBlur,
  dates,
  onDates,
  repeat,
  onRepeat,
  startsOn,
  describeFrom,
  reminders,
  labels,
  chosen,
  onToggleLabel,
  onCreateLabel,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onRenameSubtask,
  onRemoveSubtask,
  forEvent,
}: {
  notes: string
  onNotesChange: (notes: string) => void
  onNotesBlur?: () => void
  dates: TaskDates
  onDates: (patch: ItemFields) => void
  repeat: Repeat | null
  onRepeat: (repeat: Repeat | null) => void
  startsOn: string
  describeFrom?: string
  /** Its Reminders, listed and changed. */
  reminders: ReactNode
  /** Mine, A to Z. */
  labels: { id: string; name: string }[]
  chosen: ReadonlySet<string>
  onToggleLabel: (id: string, on: boolean) => void
  onCreateLabel: (name: string) => void
  subtasks: readonly { id: string; title: string; done: boolean }[]
  onAddSubtask: (title: string) => void
  onToggleSubtask: (id: string, done: boolean) => void
  onRenameSubtask: (id: string, title: string) => void
  onRemoveSubtask: (id: string) => void
  /** The Events it is for (EVT-006 3). */
  forEvent?: ReactNode
}) {
  const ids = useId()
  // The do-on Calendar, opened by hand or to ask for a time's day.
  const [dayOpen, setDayOpen] = useState(false)
  const pendingTime = useRef<string | null>(null)
  const today = isoDayOf(new Date())

  const setDoOn = (day: string | null) => {
    const patch: ItemFields = { do_on: day }
    if (day === null) patch.do_at = null
    else if (pendingTime.current) patch.do_at = pendingTime.current
    // A date makes a Someday Task active again (TSK-007).
    if (day !== null && dates.status === 'idea') patch.status = 'active'
    pendingTime.current = null
    onDates(patch)
  }
  const setTime = (time: string) => {
    if (!time) return onDates({ do_at: null })
    // A time needs a day: ask for it (TSK-002).
    if (!dates.do_on) {
      pendingTime.current = time
      setDayOpen(true)
      return
    }
    onDates({ do_at: time })
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        aria-label="Notes"
        placeholder="Notes"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        onBlur={onNotesBlur}
        className="min-h-16"
      />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <Field label="Do on" htmlFor={`${ids}-do`}>
          <DateField
            id={`${ids}-do`}
            value={dates.do_on}
            onChange={setDoOn}
            open={dayOpen}
            onOpenChange={(open) => {
              setDayOpen(open)
              if (!open) pendingTime.current = null
            }}
          />
        </Field>
        <Field label="Time" htmlFor={`${ids}-at`}>
          <TimeField
            id={`${ids}-at`}
            none
            value={dates.do_at?.slice(0, 5) ?? ''}
            onChange={setTime}
          />
        </Field>
        <Field label="Due" htmlFor={`${ids}-due`}>
          <DateField
            id={`${ids}-due`}
            value={dates.due_on}
            late={dates.status !== 'done' && dates.due_on !== null && dates.due_on < today}
            onChange={(day) => onDates({ due_on: day })}
          />
        </Field>
        <Field label="Repeat" htmlFor={`${ids}-repeat`}>
          <RepeatField
            id={`${ids}-repeat`}
            value={repeat}
            startsOn={startsOn}
            describeFrom={describeFrom}
            onChange={onRepeat}
          />
        </Field>
      </div>
      <Field label="Reminders">{reminders}</Field>
      <Field label="Labels">
        <LabelsField
          labels={labels}
          chosen={chosen}
          onToggle={onToggleLabel}
          onCreate={onCreateLabel}
        />
      </Field>
      {forEvent}
      <Field label="Sub-tasks">
        <SubtaskList
          subtasks={subtasks}
          onToggle={onToggleSubtask}
          onRename={onRenameSubtask}
          onRemove={onRemoveSubtask}
          onAdd={onAddSubtask}
        />
      </Field>
    </div>
  )
}

/**
 * Everything about a Task (TSK-002), each change kept as it is made. A
 * change to one occurrence of a repeat is to that one alone; a new repeat
 * applies from it on (TSK-011).
 */
export function TaskDetails({ item }: { item: Item }) {
  const [notes, setNotes, flushNotes] = useKeptText(item.id, 'body', item.body ?? '')
  const { labels, itemLabels } = useLabels(queue)
  const subtasks = useSubtasks(queue).filter((s) => s.item_id === item.id)
  const settings = useSettings(queue)
  const reminders = useReminders(queue)
  const series = useSeriesById()
  const repeat = repeatOf(item, series)

  const chosen = new Set(itemLabels.filter((r) => r.item_id === item.id).map((r) => r.label_id))
  const setRepeatTo = (next: Repeat | null) => {
    if (!next) return stopRepeat(item.id)
    repeatTask(item, next, {
      labelIds: [...chosen],
      timezone: settings.timezone,
      reminders: reminders
        .filter((r) => r.item_id === item.id && r.anchor && !r.is_default)
        .map((r) => ({ anchor: r.anchor!, offset_days: r.offset_days, at_time: r.at_time })),
    })
  }

  return (
    <TaskFields
      notes={notes}
      onNotesChange={setNotes}
      onNotesBlur={flushNotes}
      dates={item}
      onDates={(patch) => updateItem(item.id, patch)}
      repeat={repeat}
      onRepeat={setRepeatTo}
      startsOn={repeatStart(item, isoDayOf(new Date()))}
      describeFrom={series.get(item.series_id ?? '')?.starts_on}
      reminders={<ItemReminders item={item} />}
      labels={[...labels].sort((a, b) => a.name.localeCompare(b.name))}
      chosen={chosen}
      onToggleLabel={(id, on) => (on ? addLabel(item.id, id) : removeLabel(item.id, id))}
      onCreateLabel={(name) => addLabel(item.id, createLabel(name))}
      subtasks={subtasks}
      onAddSubtask={(title) => addSubtask(item.id, title)}
      onToggleSubtask={(id, done) => updateSubtask(item.id, id, { done })}
      onRenameSubtask={(id, title) => updateSubtask(item.id, id, { title })}
      onRemoveSubtask={(id) => removeSubtask(item.id, id)}
      forEvent={<TaskFor task={item} />}
    />
  )
}
