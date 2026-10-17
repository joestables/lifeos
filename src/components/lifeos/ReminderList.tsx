import { BellIcon, PlusIcon, XIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateField } from './DateField'
import { TimeField } from './TimeField'

/** A Reminder as the list shows it: when it fires, and what it hangs on. */
export interface ReminderLine {
  id: string
  /** "Fri 16 Oct 09:00", once known. */
  when: string | null
  /** "On the day", "1 day before", "At a set time". */
  says: string
}

/**
 * An Item's Reminders (components.md): each a line with a bell, when it
 * fires and what it hangs on, opened to change it or removed with ×; then
 * "Add a reminder".
 */
export function ReminderList({
  reminders,
  onOpen,
  onRemove,
  onAdd,
}: {
  reminders: ReminderLine[]
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col">
      {reminders.map((r) => (
        <div key={r.id} className="group/reminder flex min-h-9 items-center gap-2.5">
          <BellIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <button
            type="button"
            onClick={() => onOpen(r.id)}
            className="flex min-w-0 flex-1 items-baseline gap-2 rounded-[2px] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring-soft"
          >
            <span className="truncate tabular-nums">{r.when ?? r.says}</span>
            {r.when && <span className="truncate text-sm text-muted-foreground">{r.says}</span>}
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove reminder ${r.when ?? r.says}`}
            onClick={() => onRemove(r.id)}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="self-start px-0 text-muted-foreground hover:bg-transparent"
        onClick={onAdd}
      >
        <PlusIcon /> Add a reminder
      </Button>
    </div>
  )
}

/**
 * A Reminder being made or changed: on one of the Item's dates (an Event's
 * is the day it starts), some minutes before an Event starts, or at a set time.
 */
export type ReminderChoice =
  | { kind: 'do_on' | 'due_on' | 'starts_at'; daysBefore: number; time: string }
  | { kind: 'before'; minutes: number; time: string }
  | { kind: 'fixed'; day: string | null; time: string }

/** What a Reminder can hang on, beside a set time. */
export type ReminderAnchor = 'do_on' | 'due_on' | 'before' | 'starts_at'

const KINDS = [
  { value: 'do_on', label: 'Do-on date' },
  { value: 'due_on', label: 'Due date' },
  { value: 'before', label: 'Before it starts' },
  { value: 'starts_at', label: 'The day it starts' },
  { value: 'fixed', label: 'A set time' },
] as const

/** How long before an Event starts (EVT-003 3). */
const BEFORE = [
  { value: 0, label: 'At the start' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
] as const

/**
 * Making or changing a Reminder (REM-003, EVT-003), confirmed by Save: what
 * it hangs on — the do-on date, the due date, before an Event starts or the
 * day it starts (when the Item has them), or a set time — then days before
 * and the time, how long before, or the date and time.
 */
export function ReminderDialog({
  value,
  anchors,
  onSave,
  onClose,
}: {
  value: ReminderChoice
  /** The Item's dates a Reminder can hang on. */
  anchors: ReminderAnchor[]
  onSave: (choice: ReminderChoice) => void
  onClose: () => void
}) {
  const ids = useId()
  const [choice, setChoice] = useState<ReminderChoice>(value)
  const kinds = KINDS.filter((k) => k.value === 'fixed' || anchors.includes(k.value))
  const before = 'daysBefore' in choice ? String(choice.daysBefore) : ''
  const valid =
    choice.kind === 'before' ||
    (/^\d\d:\d\d$/.test(choice.time) &&
      (choice.kind === 'fixed' ? choice.day !== null : choice.daysBefore >= 0))

  const setKind = (kind: ReminderChoice['kind']) =>
    setChoice(
      kind === 'fixed'
        ? { kind, day: null, time: choice.time }
        : kind === 'before'
          ? { kind, minutes: 30, time: choice.time }
          : { kind, daysBefore: 'daysBefore' in choice ? choice.daysBefore : 0, time: choice.time },
    )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reminder</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onSave(choice)
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-on`}>On</Label>
            <Select
              value={choice.kind}
              items={kinds}
              onValueChange={(kind) => setKind(kind as ReminderChoice['kind'])}
            >
              <SelectTrigger id={`${ids}-on`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {choice.kind === 'before' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-minutes`}>How long before</Label>
              <Select
                value={String(choice.minutes)}
                items={BEFORE.map((b) => ({ value: String(b.value), label: b.label }))}
                onValueChange={(m) => setChoice({ ...choice, minutes: Number(m) })}
              >
                <SelectTrigger id={`${ids}-minutes`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEFORE.map((b) => (
                    <SelectItem key={b.value} value={String(b.value)}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {choice.kind === 'fixed' ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${ids}-day`}>Date</Label>
                  <DateField
                    id={`${ids}-day`}
                    value={choice.day}
                    onChange={(day) => setChoice({ ...choice, day })}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${ids}-before`}>Days before</Label>
                  <Input
                    id={`${ids}-before`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={366}
                    value={before}
                    onChange={(e) =>
                      setChoice({ ...choice, daysBefore: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${ids}-at`}>Time</Label>
                <TimeField
                  id={`${ids}-at`}
                  value={choice.time}
                  onChange={(time) => setChoice({ ...choice, time })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
