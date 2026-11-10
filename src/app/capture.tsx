import { readLine, type LineAlert } from '@lifeos/capture'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AddAlertMenu,
  ChipRow,
  LabelChips,
  NewDialog,
  QuickChip,
  SavesAs,
  SmartLine,
  type AlertChoice,
} from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import { addAlert, addLabel, archiveItem, createItem, queue, useLabels, useSettings } from '@/data'
import { reminderAlertFields } from '@/lib/alerts'
import { typeLook } from '@/lib/item-types'
import {
  likeliest,
  pillLabel,
  quickTimes,
  sameAlert,
  settled,
  withoutWords,
  type NewAlert,
} from '@/lib/new-line'
import { OpenCapture } from './open-capture'
import { ReminderAlertDialog } from './reminder-details'

const REMINDER = typeLook('reminder')
const THOUGHT = typeLook('thought')

/** An Alert taken from the line or added: its own, until Save. */
interface Pill extends NewAlert {
  id: string
}

/** Where an Alert dialog is open: a pill's, or Pick a date and time. */
type Editing = { pill: string } | { typed: LineAlert } | { pick: true }

/**
 * "New" over any page (NEW-001–006): N on a computer, "New" at the top
 * right, Notes' New thought. One line: a time in it makes a Reminder, none a
 * Thought; its Alerts are pills; quick times add more. Saving leaves the page
 * as it was, says what was made, and offers Undo.
 */
export function CaptureProvider({ children }: { children: ReactNode }) {
  const settings = useSettings(queue)
  const { labels } = useLabels(queue)
  const allLabels = useMemo(
    () => labels.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    [labels],
  )
  const [open, setOpen] = useState(false)
  // Read by the N key without re-adding its listener.
  const isOpen = useRef(false)
  useEffect(() => {
    isOpen.current = open
  }, [open])
  const lineRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [pills, setPills] = useState<Pill[]>([])
  // Words whose pill I removed: kept as words (NEW-004 3).
  const [literal, setLiteral] = useState<string[]>([])
  const [chosenLabels, setChosenLabels] = useState<string[]>([])
  const [editing, setEditing] = useState<Editing | null>(null)
  const [now, setNow] = useState(() => new Date())
  const reading = useMemo(
    () => readLine(text, now, settings.defaultAlertTime, literal),
    [text, now, settings.defaultAlertTime, literal],
  )
  // Alerts still in the line's words; the rest are pills of their own.
  const typed = reading.alerts.filter((a) => !pills.some((p) => sameAlert(p, a)))

  const start = useCallback(() => {
    setText('')
    setPills([])
    setLiteral([])
    setChosenLabels([])
    setEditing(null)
    setNow(new Date())
    setOpen(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.repeat || isOpen.current) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      // Not while a menu or list is open, where N picks an option.
      if (e.isComposing || document.querySelector('[role="menu"], [role="listbox"]')) return
      e.preventDefault()
      start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [start])

  const add = (a: NewAlert) =>
    setPills((list) =>
      list.some((p) => sameAlert(p, a)) ? list : [...list, { ...a, id: crypto.randomUUID() }],
    )
  /** The words for these Alerts become their pills (NEW-003 1). */
  const take = (line: string, alerts: readonly LineAlert[]) => {
    for (const a of alerts) add({ day: a.day, time: a.time, alarm: false })
    return alerts.length ? withoutWords(line, alerts) : line
  }

  const onText = (next: string) => {
    const r = readLine(next, now, settings.defaultAlertTime, literal)
    setText(
      take(
        next,
        r.alerts.filter((a) => settled(next, a)),
      ),
    )
  }
  const focusLine = () => setTimeout(() => lineRef.current?.focus(), 0)

  const alerts: NewAlert[] = [
    ...pills,
    ...typed.map((a) => ({ day: a.day, time: a.time, alarm: false })),
  ]
  const isReminder = alerts.length > 0
  const title = isReminder
    ? readLine(text, now, settings.defaultAlertTime, literal).title
    : text.trim()

  const onSave = () => {
    if (!title) return
    setOpen(false)
    if (!isReminder) {
      const id = createItem('thought', { title })
      // A Label deleted while "New" was open isn't given (CAP-009).
      for (const l of chosenLabels) if (allLabels.some((a) => a.id === l)) addLabel(id, l)
      toast('Thought saved', { action: { label: 'Undo', onClick: () => archiveItem(id) } })
      return
    }
    // Its day is its first Alert's; each Alert hangs on it (ADR-0065 2).
    const sorted = [...alerts].sort(
      (a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time),
    )
    const first = sorted[0]!
    const id = createItem('reminder', { title, do_on: first.day })
    for (const a of sorted)
      addAlert(
        id,
        reminderAlertFields({ kind: 'fixed', day: a.day, time: a.time, alarm: a.alarm }, first.day),
      )
    toast(`Reminder saved · ${pillLabel(first, now)}`, {
      action: { label: 'Undo', onClick: () => archiveItem(id) },
    })
  }

  const times = quickTimes(now, settings.defaultAlertTime)
  const next = likeliest(times, now)
  const quick = (t: (typeof times)[number]) => {
    add({ ...t.alert, alarm: false })
    focusLine()
  }

  const editingValue: AlertChoice | null = !editing
    ? null
    : 'pill' in editing
      ? (() => {
          const p = pills.find((x) => x.id === editing.pill)
          return p ? { kind: 'fixed', day: p.day, time: p.time, alarm: p.alarm } : null
        })()
      : 'typed' in editing
        ? { kind: 'fixed', day: editing.typed.day, time: editing.typed.time, alarm: false }
        : { kind: 'fixed', ...times[0]!.alert, alarm: false }
  const saveEdit = (choice: AlertChoice) => {
    if (!editing || choice.kind !== 'fixed' || !choice.day) return
    const a = { day: choice.day, time: choice.time, alarm: choice.alarm ?? false }
    if ('pill' in editing)
      setPills((list) => list.map((p) => (p.id === editing.pill ? { ...p, ...a } : p)))
    else if ('typed' in editing) {
      // Changed, the words leave the line for their pill.
      setText(withoutWords(text, [editing.typed]))
      add(a)
    } else add(a)
    setEditing(null)
    focusLine()
  }

  return (
    <OpenCapture.Provider value={start}>
      {children}
      <NewDialog
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
        saveDisabled={!title}
        savesAs={
          isReminder ? (
            <SavesAs colour="blue" icon={REMINDER.icon} label="Reminder" />
          ) : (
            <SavesAs colour="yellow" icon={THOUGHT.icon} label="Thought" />
          )
        }
      >
        <SmartLine
          inputRef={lineRef}
          value={text}
          onValueChange={onText}
          placeholder="Remind me to…"
          // Soonest first, typed or added.
          pills={[
            ...pills.map((p) => ({ ...p, id: p.id })),
            ...typed.map((a) => ({ ...a, id: `typed:${a.index}`, alarm: false })),
          ]
            .sort((x, y) => x.day.localeCompare(y.day) || x.time.localeCompare(y.time))
            .map((p) => ({ id: p.id, label: pillLabel(p, now), alarm: p.alarm }))}
          onOpenPill={(id) => {
            const t = typed.find((a) => `typed:${a.index}` === id)
            setEditing(t ? { typed: t } : { pill: id })
          }}
          onRemovePill={(id) => {
            const t = typed.find((a) => `typed:${a.index}` === id)
            if (t) setLiteral((l) => [...l, t.text.trim().toLowerCase()])
            else setPills((list) => list.filter((p) => p.id !== id))
            focusLine()
          }}
        />
        <ChipRow>
          <QuickChip onClick={() => quick(times[0]!)}>{times[0]!.label}</QuickChip>
          <QuickChip onClick={() => quick(next)}>{next.label}</QuickChip>
          <AddAlertMenu
            label="More"
            choices={times.map((t) => ({ label: t.label, when: t.when, onChoose: () => quick(t) }))}
            onPick={() => setEditing({ pick: true })}
          />
        </ChipRow>
        {/* Labels are a Thought's; a Reminder has none (NEW-006 1). */}
        {!isReminder && allLabels.length > 0 && (
          <LabelChips
            aria-label="Labels"
            labels={allLabels}
            chosen={new Set(chosenLabels)}
            onChange={(ids) => setChosenLabels([...ids])}
          />
        )}
      </NewDialog>
      {editingValue && (
        <ReminderAlertDialog
          value={editingValue}
          onSave={saveEdit}
          onClose={() => {
            setEditing(null)
            focusLine()
          }}
        />
      )}
    </OpenCapture.Provider>
  )
}
