import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { DateField, RepeatField, SubtaskList, TimeField } from '@/components/lifeos'
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
  useSettings,
  useSubtasks,
  type Item,
  type ItemFields,
} from '@/data'
import { isoDayOf } from '@/lib/dates'
import { repeatOf, repeatStart, repeatTask, useSeriesById, useTickDone } from './repeat'

/** How long typing pauses before it is kept. */
const PAUSE = 400

/** Text kept as it is typed: a short pause, or at once on leaving. */
function useKeptText(id: string, field: 'title' | 'body', initial: string) {
  const [text, setText] = useState(initial)
  const waiting = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (waiting.current === null) return
    updateItem(id, { [field]: waiting.current } as ItemFields)
    waiting.current = null
  }, [id, field])
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])
  const change = (value: string) => {
    setText(value)
    waiting.current = value
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, PAUSE)
  }
  return [text, change, flush] as const
}

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

function Field({
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

/**
 * Everything about a Task (TSK-002), each change kept as it is made: notes,
 * do-on date and time, due date, repeat, Labels, sub-tasks. Its Reminders
 * join them with Reminders (plan step 11). A change to one occurrence of a
 * repeat is to that one alone; a new repeat applies from it on (TSK-011).
 */
export function TaskDetails({ item }: { item: Item }) {
  const ids = useId()
  const [notes, setNotes, flushNotes] = useKeptText(item.id, 'body', item.body ?? '')
  // The do-on Calendar, opened by hand or to ask for a time's day.
  const [dayOpen, setDayOpen] = useState(false)
  const pendingTime = useRef<string | null>(null)
  const { labels, itemLabels } = useLabels(queue)
  const subtasks = useSubtasks(queue).filter((s) => s.item_id === item.id)
  const settings = useSettings()
  const series = useSeriesById()
  const today = isoDayOf(new Date())
  const repeat = repeatOf(item, series)

  const setDoOn = (day: string | null) => {
    const patch: ItemFields = { do_on: day }
    if (day === null) patch.do_at = null
    else if (pendingTime.current) patch.do_at = pendingTime.current
    // A date makes a Someday Task active again (TSK-007).
    if (day !== null && item.status === 'idea') patch.status = 'active'
    pendingTime.current = null
    updateItem(item.id, patch)
  }
  const setTime = (time: string) => {
    if (!time) return updateItem(item.id, { do_at: null })
    // A time needs a day: ask for it (TSK-002).
    if (!item.do_on) {
      pendingTime.current = time
      setDayOpen(true)
      return
    }
    updateItem(item.id, { do_at: time })
  }

  const chosen = new Set(itemLabels.filter((r) => r.item_id === item.id).map((r) => r.label_id))
  const setRepeatTo = (next: typeof repeat) => {
    if (!next) return stopRepeat(item.id)
    repeatTask(item, next, { labelIds: [...chosen], timezone: settings.timezone })
  }
  const byName = [...labels].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        aria-label="Notes"
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={flushNotes}
        className="min-h-16"
      />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <Field label="Do on" htmlFor={`${ids}-do`}>
          <DateField
            id={`${ids}-do`}
            value={item.do_on}
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
            value={item.do_at?.slice(0, 5) ?? ''}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
        <Field label="Due" htmlFor={`${ids}-due`}>
          <DateField
            id={`${ids}-due`}
            value={item.due_on}
            late={item.status !== 'done' && item.due_on !== null && item.due_on < today}
            onChange={(day) => updateItem(item.id, { due_on: day })}
          />
        </Field>
        <Field label="Repeat" htmlFor={`${ids}-repeat`}>
          <RepeatField
            id={`${ids}-repeat`}
            value={repeat}
            startsOn={repeatStart(item, today)}
            describeFrom={series.get(item.series_id ?? '')?.starts_on}
            onChange={setRepeatTo}
          />
        </Field>
      </div>
      <Field label="Labels">
        <div className="flex flex-wrap items-center gap-1.5">
          {byName
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
            labels={byName}
            chosen={chosen}
            onToggle={(id, on) => (on ? addLabel(item.id, id) : removeLabel(item.id, id))}
            onCreate={(name) => addLabel(item.id, createLabel(name))}
          />
        </div>
      </Field>
      <Field label="Sub-tasks">
        <SubtaskList
          subtasks={subtasks}
          onToggle={(id, done) => updateSubtask(item.id, id, { done })}
          onRename={(id, title) => updateSubtask(item.id, id, { title })}
          onRemove={(id) => removeSubtask(item.id, id)}
          onAdd={(title) => addSubtask(item.id, title)}
        />
      </Field>
    </div>
  )
}
