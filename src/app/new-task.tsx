import { useRef, useState } from 'react'
import {
  ItemDialog,
  ReminderDialog,
  ReminderList,
  type ReminderChoice,
  type Repeat,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import {
  addLabel,
  addReminder,
  addSubtask,
  archiveItem,
  createItem,
  createLabel,
  newId,
  queue,
  updateSubtask,
  useLabels,
  useSettings,
  type ItemFields,
} from '@/data'
import { isoDayOf, reminderWhen } from '@/lib/dates'
import { typeLook } from '@/lib/item-types'
import { choiceFiresAt, reminderFields, reminderSays } from '@/lib/reminders'
import { draftItem } from './item-navigation'
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
  labelId,
}: {
  onClose: () => void
  /** Starts with this Label. */
  labelId?: string
}) {
  const settings = useSettings(queue)
  const { labels } = useLabels(queue)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dates, setDates] = useState<TaskDates>({
    do_on: null,
    do_at: null,
    due_on: null,
    status: 'active',
  })
  const [repeat, setRepeat] = useState<Repeat | null>(null)
  const [reminders, setReminders] = useState<{ id: string; choice: ReminderChoice }[]>([])
  const [editing, setEditing] = useState<{ id?: string; choice: ReminderChoice } | null>(null)
  // Labels named here are made only on Save.
  const [newLabels, setNewLabels] = useState<{ id: string; name: string }[]>([])
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(labelId ? [labelId] : []))
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; done: boolean }[]>([])

  const dirty =
    title.trim() !== '' ||
    notes !== '' ||
    dates.do_on !== null ||
    dates.due_on !== null ||
    subtasks.length > 0 ||
    reminders.length > 0
  const today = isoDayOf(new Date())
  const anchors = [
    ...(dates.do_on ? (['do_on'] as const) : []),
    ...(dates.due_on ? (['due_on'] as const) : []),
  ]
  const allLabels = [...labels, ...newLabels].sort((a, b) => a.name.localeCompare(b.name))

  const save = () => {
    if (!title.trim()) return titleRef.current?.focus()
    const fields: ItemFields = { title: title.trim(), do_on: dates.do_on, due_on: dates.due_on }
    if (dates.do_at) fields.do_at = dates.do_at
    if (notes.trim()) fields.body = notes
    const id = createItem('task', fields)
    const labelIds = [...chosen].map((l) => {
      const made = newLabels.find((n) => n.id === l)
      return made ? createLabel(made.name) : l
    })
    for (const l of labelIds) addLabel(id, l)
    for (const s of subtasks) {
      const sid = addSubtask(id, s.title)
      if (s.done) updateSubtask(id, sid, { done: true })
    }
    // A Reminder on a date the Task hasn't got is left out.
    const kept = reminders.filter((r) => r.choice.kind === 'fixed' || dates[r.choice.kind])
    for (const r of kept) addReminder(id, reminderFields(r.choice, settings.timezone))
    if (repeat) {
      const anchored = kept
        .map((r) => reminderFields(r.choice, settings.timezone))
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
          reminders: anchored.map((f) => ({
            anchor: f.anchor!,
            offset_days: f.offset_days ?? 0,
            at_time: f.at_time ?? null,
          })),
        },
      )
    }
    onClose()
    toast('Task saved', { action: { label: 'Undo', onClick: () => archiveItem(id) } })
  }

  const fresh: ReminderChoice = anchors[0]
    ? {
        kind: anchors[0],
        daysBefore: 0,
        time: dates.do_at?.slice(0, 5) ?? settings.defaultReminderTime,
      }
    : { kind: 'fixed', day: today, time: settings.defaultReminderTime }

  return (
    <ItemDialog
      open
      onOpenChange={(open) => !open && onClose()}
      colour={TASK.colour}
      icon={TASK.icon}
      typeLabel="New task"
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
        reminders={
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
              onRemove={(id) => setReminders((rs) => rs.filter((r) => r.id !== id))}
              onAdd={() => setEditing({ choice: fresh })}
            />
            {editing && (
              <ReminderDialog
                value={editing.choice}
                anchors={anchors}
                onSave={(choice) => {
                  setReminders((rs) =>
                    editing.id
                      ? rs.map((r) => (r.id === editing.id ? { ...r, choice } : r))
                      : [...rs, { id: newId(), choice }],
                  )
                  setEditing(null)
                }}
                onClose={() => setEditing(null)}
              />
            )}
          </>
        }
        labels={allLabels}
        chosen={chosen}
        onToggleLabel={(id, on) =>
          setChosen((c) => {
            const next = new Set(c)
            if (on) next.add(id)
            else next.delete(id)
            return next
          })
        }
        onCreateLabel={(name) => {
          const existing = allLabels.find(
            (l) => l.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
          )
          const id = existing?.id ?? newId()
          if (!existing) setNewLabels((n) => [...n, { id, name: name.trim() }])
          setChosen((c) => new Set([...c, id]))
        }}
        subtasks={subtasks}
        onAddSubtask={(t) => setSubtasks((s) => [...s, { id: newId(), title: t, done: false }])}
        onToggleSubtask={(id, done) =>
          setSubtasks((s) => s.map((x) => (x.id === id ? { ...x, done } : x)))
        }
        onRenameSubtask={(id, t) =>
          setSubtasks((s) => s.map((x) => (x.id === id ? { ...x, title: t } : x)))
        }
        onRemoveSubtask={(id) => setSubtasks((s) => s.filter((x) => x.id !== id))}
      />
    </ItemDialog>
  )
}
