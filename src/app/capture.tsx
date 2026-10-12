import { parseCapture, type CaptureDates } from '@lifeos/capture'
import { BellIcon, CalendarIcon, FlagIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from '@/components/ui/sonner'
import { CaptureDialog, type CaptureType } from '@/components/lifeos/CaptureDialog'
import {
  addFixedReminder,
  archiveItem,
  createItem,
  queue,
  useSettings,
  type Settings,
} from '@/data'
import { dayName, fromIsoDay, shortDate, zonedInstant } from '@/lib/dates'
import { typeLook } from '@/lib/item-types'
import { OpenCapture } from './open-capture'
import { createTaskFrom } from './task-actions'

/** Thought first: what capture makes unless switched (ADR-0027). */
const TYPES: CaptureType[] = ['thought', 'task'].map((key) => {
  const { label, colour, icon } = typeLook(key)
  return { key, label, colour, icon }
})

/** "Fri 18:00", "Tomorrow", "Due Fri". */
function when(dates: CaptureDates, now: Date): string | undefined {
  if (dates.doOn) return [dayName(dates.doOn, now), dates.doAt].filter(Boolean).join(' ')
  if (dates.dueOn) return `Due ${dayName(dates.dueOn, now)}`
  return undefined
}

/** What a line becomes, as one call each to the write queue. */
function save(type: string, line: string, dates: CaptureDates, settings: Settings): string {
  if (type === 'task') return createTaskFrom(line, dates)
  const id = createItem('thought', { title: line.trim() })
  const day = dates.doOn ?? dates.dueOn
  if (day && settings.thoughtReminders) {
    // A dated Thought reminds me, at my default time without one (CAP-004),
    // unless I turned that off (REM-007).
    const at = dates.doAt ?? settings.defaultReminderTime
    addFixedReminder(id, zonedInstant(day, at, settings.timezone))
  }
  return id
}

/**
 * Capture over any page (CAP-001, CAP-002): N on a computer, the drawer's
 * button, the phone's top bar and Inbox's Fab. Saving leaves the page as it
 * was, says what was made, and offers Undo.
 */
export function CaptureProvider({ children }: { children: ReactNode }) {
  const settings = useSettings(queue)
  const [open, setOpen] = useState(false)
  // Read by the N key without re-adding its listener.
  const isOpen = useRef(false)
  useEffect(() => {
    isOpen.current = open
  }, [open])
  const [type, setType] = useState('thought')
  const [text, setText] = useState('')
  const [now, setNow] = useState(() => new Date())
  const dates = useMemo(() => parseCapture(text, now), [text, now])

  const start = useCallback((as: 'thought' | 'task' = 'thought') => {
    setType(as)
    setText('')
    setNow(new Date())
    setOpen(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.repeat || isOpen.current) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      start('thought')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [start])

  const said = when(dates, now)
  const onSave = () => {
    const id = save(type, text, dates, settings)
    setOpen(false)
    const made = `${typeLook(type).label} saved`
    toast(type === 'task' && said ? `${made} · ${said}` : made, {
      action: { label: 'Undo', onClick: () => archiveItem(id) },
    })
  }

  const understood =
    type === 'task'
      ? [
          dates.doOn && {
            icon: CalendarIcon,
            label: [shortDate(fromIsoDay(dates.doOn)), dates.doAt].filter(Boolean).join(' '),
          },
          dates.dueOn && { icon: FlagIcon, label: `Due ${shortDate(fromIsoDay(dates.dueOn))}` },
          dates.doOn && {
            icon: BellIcon,
            label: dates.doAt ?? settings.defaultReminderTime,
          },
        ].filter((u) => !!u)
      : []

  return (
    <OpenCapture.Provider value={start}>
      {children}
      <CaptureDialog
        open={open}
        onOpenChange={setOpen}
        types={TYPES}
        type={type}
        onTypeChange={setType}
        text={text}
        onTextChange={setText}
        offer={
          type === 'thought' && said
            ? { type: 'task', label: `Task, ${said}?`, onTake: () => setType('task') }
            : undefined
        }
        understood={understood}
        onSave={onSave}
      />
    </OpenCapture.Provider>
  )
}
