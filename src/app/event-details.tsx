import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  LinkIcon,
  MapPinIcon,
  StickyNoteIcon,
  UnlinkIcon,
} from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { todayIn } from '@lifeos/recurrence'
import {
  EventFact,
  EventSource,
  EventTimesField,
  ItemDialog,
  ItemRow,
  RepeatField,
  TypeTile,
  type Repeat,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { TaskLinker } from '@/components/lifeos/TaskLinker'
import {
  addReminder,
  archiveItem,
  createItem,
  linkItems,
  queue,
  stopRepeat,
  unlinkItems,
  updateItem,
  useItems,
  useLabels,
  useLinks,
  useReminders,
  googleEventUrl,
  newId,
  setEventCalendar,
  useCalendar,
  useSettings,
  type Item,
  type ItemFields,
} from '@/data'
import { dateName } from '@/lib/dates'
import {
  endsAfterStart,
  eventFields,
  eventTimes,
  eventWhen,
  moveStart,
  newEventTimes,
  setAllDay,
  type EventTimes,
} from '@/lib/events'
import { itemTitle, typeLook } from '@/lib/item-types'
import { freshReminder, reminderAnchors, reminderFields } from '@/lib/reminders'
import { useDraftLabels } from './draft-labels'
import { DraftReminders, type DraftReminder } from './draft-reminders'
import { ItemReminders } from './item-reminders'
import { CalendarSelect } from './calendar-select'
import { isOn, useGoogleSource } from './google-source'
import { MoreMenu } from './more-menu'
import { draftItem, useOpenItem } from './item-navigation'
import { eventRepeatStart, repeatEvent, repeatOf, useSeriesById, useTickDone } from './repeat'
import { useKeptText } from './kept-text'
import { Field, ItemLabels, LabelsField } from './task-details'

const EVENT = typeLook('event')
const TASK = typeLook('task')

/** An Event's title, edited in place (EVT-002). */
export function EventTitle({ item }: { item: Item }) {
  const [title, setTitle, flush] = useKeptText(item.id, 'title', item.title)
  return (
    <input
      aria-label="Title"
      placeholder="Title"
      autoComplete="off"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={flush}
      className="min-w-0 bg-transparent pt-1 text-day outline-none placeholder:text-muted-foreground"
    />
  )
}

/**
 * Times being changed: kept as they change while the end is after the start;
 * an end before it is shown and not kept (EVT-001 2).
 */
function useTimes(initial: EventTimes, keep: (t: EventTimes) => void) {
  const [draft, setDraft] = useState<EventTimes | null>(null)
  const shown = draft ?? initial
  const change = (next: EventTimes) => {
    if (endsAfterStart(next)) {
      setDraft(null)
      keep(next)
    } else setDraft(next)
  }
  return {
    shown,
    invalid: draft !== null,
    field: (
      <EventTimesField
        value={shown}
        endInvalid={draft !== null}
        onStart={(day, time) => change(moveStart(shown, day, time))}
        onEnd={(day, time) => change({ ...shown, endDay: day, endTime: time })}
        onAllDay={(allDay) => change(setAllDay(shown, allDay))}
      />
    ),
  }
}

/** An Event's place, notes, Reminders, Labels and Tasks, under its times (components.md#eventdetails). */
function EventFields({
  times,
  place,
  onPlace,
  onPlaceBlur,
  notes,
  onNotes,
  onNotesBlur,
  repeat,
  calendar,
  reminders,
  labels,
  tasks,
}: {
  times: ReactNode
  /** A new Event's Calendar, given the id its Label names (GCL-005 1). */
  calendar?: (id: string) => ReactNode
  /** The RepeatField, given the id its Label names. */
  repeat: (id: string) => ReactNode
  place: string
  onPlace: (place: string) => void
  onPlaceBlur?: () => void
  notes: string
  onNotes: (notes: string) => void
  onNotesBlur?: () => void
  reminders: ReactNode
  labels: ReactNode
  tasks?: ReactNode
}) {
  const ids = useId()
  return (
    <div className="flex flex-col gap-4">
      {times}
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Place">
          <Input
            aria-label="Place"
            placeholder="None"
            autoComplete="off"
            value={place}
            onChange={(e) => onPlace(e.target.value)}
            onBlur={onPlaceBlur}
          />
        </Field>
        <Field label="Repeat" htmlFor={`${ids}-repeat`}>
          {repeat(`${ids}-repeat`)}
        </Field>
        {calendar && (
          <Field label="Calendar" htmlFor={`${ids}-calendar`}>
            {calendar(`${ids}-calendar`)}
          </Field>
        )}
      </div>
      <Textarea
        aria-label="Notes"
        placeholder="Notes"
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
        onBlur={onNotesBlur}
        className="min-h-16"
      />
      <Field label="Reminders">{reminders}</Field>
      <Field label="Labels">{labels}</Field>
      {tasks}
    </div>
  )
}

const LEVEL_NAME = { off: 'Off', incoming: 'Incoming', two_way: 'Two-way' } as const

/**
 * An Event from an incoming-only Google calendar (GCL-004): its date and
 * time, place and notes are Google's, shown as lines, with "Open in Google
 * Calendar"; its Reminders, Labels and Tasks are LifeOS's own.
 */
export function GoogleEventDetails({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const source = useGoogleSource(item)
  const t = eventTimes(item, settings.timezone)
  return (
    <div className="flex flex-col gap-4">
      {source?.link && (
        <EventSource calendar={source.link.name} level={LEVEL_NAME[source.link.level]} />
      )}
      <div className="flex flex-col">
        {t && <EventFact icon={<CalendarDaysIcon />}>{eventWhen(t)}</EventFact>}
        {item.place && <EventFact icon={<MapPinIcon />}>{item.place}</EventFact>}
        {item.body && (
          <EventFact icon={<StickyNoteIcon />}>
            <span className="text-muted-foreground">{item.body}</span>
          </EventFact>
        )}
      </div>
      {source?.link && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          nativeButton={false}
          render={
            <a
              href={googleEventUrl(source.ref!.external_id, source.link.calendar_id)}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <ExternalLinkIcon />
          Open in Google Calendar
        </Button>
      )}
      <Field label="Reminders">
        <ItemReminders item={item} />
      </Field>
      <Field label="Labels">
        <ItemLabels item={item} />
      </Field>
      <EventTasks event={item} />
    </div>
  )
}

/** Everything about an Event (EVT-002), each change kept as it is made. */
export function EventDetails({ item }: { item: Item }) {
  const settings = useSettings(queue)
  const today = todayIn(settings.timezone)
  const [place, setPlace, flushPlace] = useKeptText(item.id, 'place', item.place ?? '')
  const [notes, setNotes, flushNotes] = useKeptText(item.id, 'body', item.body ?? '')
  const times = useTimes(eventTimes(item, settings.timezone) ?? newEventTimes(today, today), (t) =>
    updateItem(item.id, eventFields(t, settings.timezone)),
  )
  const { itemLabels } = useLabels(queue)
  const reminders = useReminders(queue)
  const series = useSeriesById()
  // A change to one occurrence is to that one; a new repeat applies from it on (EVT-004 3).
  const setRepeatTo = (next: Repeat | null) => {
    if (!next) return stopRepeat(item.id)
    repeatEvent(item, next, {
      labelIds: itemLabels.filter((r) => r.item_id === item.id).map((r) => r.label_id),
      timezone: settings.timezone,
      reminders: reminders
        .filter((r) => r.item_id === item.id && r.anchor && !r.is_default)
        .map((r) => ({
          anchor: r.anchor!,
          offset_days: r.offset_days,
          at_time: r.at_time,
          offset_minutes: r.offset_minutes,
        })),
    })
  }
  const source = useGoogleSource(item)
  return (
    <EventFields
      times={
        <>
          {source?.link && (
            <EventSource calendar={source.link.name} level={LEVEL_NAME[source.link.level]} />
          )}
          {times.field}
        </>
      }
      repeat={(id) => (
        <RepeatField
          id={id}
          scheduleOnly
          value={repeatOf(item, series)}
          startsOn={eventRepeatStart(item, settings.timezone, todayIn(settings.timezone))}
          describeFrom={series.get(item.series_id ?? '')?.starts_on}
          onChange={setRepeatTo}
        />
      )}
      place={place}
      onPlace={setPlace}
      onPlaceBlur={flushPlace}
      notes={notes}
      onNotes={setNotes}
      onNotesBlur={flushNotes}
      reminders={<ItemReminders item={item} />}
      labels={<ItemLabels item={item} />}
      tasks={<EventTasks event={item} />}
    />
  )
}

/**
 * A new Event with all its fields at once (EVT-001), on a day: kept only on
 * Save; Cancel, Escape or Close leave nothing behind, and while anything is
 * typed a click outside doesn't close it.
 */
export function NewEventDialog({ day, onClose }: { day: string; onClose: () => void }) {
  const settings = useSettings(queue)
  const today = todayIn(settings.timezone)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [notes, setNotes] = useState('')
  const [kept, setKept] = useState(() =>
    newEventTimes(day, today, new Date(), settings.defaultReminderTime, settings.timezone),
  )
  const times = useTimes(kept, setKept)
  const [reminders, setReminders] = useState<DraftReminder[]>([])
  const [repeat, setRepeat] = useState<Repeat | null>(null)
  const labels = useDraftLabels()
  // Which Google calendar it goes to: my default, unless I choose (GCL-005 1).
  const calendar = useCalendar(queue)
  const twoWay = isOn(calendar.connection) && calendar.links.some((l) => l.level === 'two_way')
  const [chosen, setChosen] = useState<string | null | undefined>(undefined)
  const calendarId =
    chosen === undefined ? (calendar.links.find((l) => l.new_events)?.id ?? null) : chosen
  const stored = eventFields(times.shown, settings.timezone)
  const anchors = reminderAnchors({ type: 'event', do_on: null, due_on: null, ...stored })
  const dirty = title.trim() !== '' || place !== '' || notes !== '' || reminders.length > 0

  const save = () => {
    if (!title.trim()) return titleRef.current?.focus()
    if (times.invalid) return
    const fields: ItemFields = { title: title.trim(), ...eventFields(kept, settings.timezone) }
    if (place.trim()) fields.place = place.trim()
    if (notes.trim()) fields.body = notes
    const id = newId()
    // Before the Event, so it never goes out without it.
    if (twoWay) setEventCalendar(id, calendarId)
    createItem('event', fields, id)
    const labelIds = labels.save(id)
    const own = reminders.map((r) => reminderFields(r.choice, settings.timezone))
    for (const f of own) addReminder(id, f)
    if (repeat)
      repeatEvent(
        {
          ...draftItem(id, 'event'),
          ...fields,
          body: fields.body ?? null,
          place: fields.place ?? null,
        },
        repeat,
        {
          labelIds,
          timezone: settings.timezone,
          reminders: own
            .filter((f) => f.anchor)
            .map((f) => ({
              anchor: f.anchor!,
              offset_days: f.offset_days ?? 0,
              at_time: f.at_time ?? null,
              offset_minutes: f.offset_minutes ?? 0,
            })),
        },
      )
    onClose()
    toast('Event saved', {
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

  return (
    <ItemDialog
      open
      onOpenChange={(open) => !open && onClose()}
      colour={EVENT.colour}
      icon={EVENT.icon}
      typeLabel="New event"
      standard
      title="New event"
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
          <Button onClick={save} disabled={!title.trim() || times.invalid}>
            Save
          </Button>
        </>
      }
    >
      <EventFields
        times={times.field}
        repeat={(id) => (
          <RepeatField
            id={id}
            scheduleOnly
            value={repeat}
            startsOn={times.shown.startDay > today ? times.shown.startDay : today}
            onChange={setRepeat}
          />
        )}
        calendar={
          twoWay
            ? (id) => (
                <CalendarSelect
                  id={id}
                  links={calendar.links}
                  value={calendarId}
                  onChange={setChosen}
                />
              )
            : undefined
        }
        place={place}
        onPlace={setPlace}
        notes={notes}
        onNotes={setNotes}
        reminders={
          <DraftReminders
            reminders={reminders}
            onChange={setReminders}
            anchors={anchors}
            dates={{ starts_at: stored.starts_at, start_day: times.shown.startDay }}
            fresh={freshReminder(anchors, settings.defaultReminderTime, today)}
          />
        }
        labels={
          <LabelsField
            labels={labels.labels}
            chosen={labels.chosen}
            onToggle={labels.toggle}
            onCreate={labels.create}
          />
        }
      />
    </ItemDialog>
  )
}

/** A Task's day as a short line says it: "Today", "Fri 16 Oct". */
const taskWhen = (task: Item, now: Date) =>
  task.do_on
    ? dateName(task.do_on, now)
    : task.due_on
      ? `Due ${dateName(task.due_on, now)}`
      : undefined

/**
 * An Event's Tasks (EVT-006): each a Task of its own, linked *for* the Event,
 * with its tick; "Link a task" finds one of my open Tasks or makes one.
 */
export function EventTasks({ event }: { event: Item }) {
  const { items } = useItems(queue)
  const links = useLinks(queue)
  const open = useOpenItem()
  const tickDone = useTickDone()
  const now = new Date()
  const linked = new Set(
    links.filter((l) => l.link_type === 'for' && l.to_item === event.id).map((l) => l.from_item),
  )
  const tasks = items.filter((i) => linked.has(i.id))
  const candidates = items
    .filter(
      (i) =>
        i.type === 'task' && !linked.has(i.id) && (i.status === 'active' || i.status === 'idea'),
    )
    .sort((a, b) => (a.do_on ?? '9').localeCompare(b.do_on ?? '9'))
    .map((t) => ({ id: t.id, title: itemTitle(t), when: taskWhen(t, now) }))

  return (
    <Field label="Tasks">
      <div className="flex flex-col gap-1.5">
        {tasks.map((t) => {
          const when = taskWhen(t, now)
          return (
            <ItemRow
              key={t.id}
              leading={
                <Checkbox
                  colour={TASK.colour}
                  aria-label={`Done: ${itemTitle(t)}`}
                  checked={t.status === 'done'}
                  onCheckedChange={(on) =>
                    on ? tickDone(t) : updateItem(t.id, { status: 'active' })
                  }
                />
              }
              title={itemTitle(t)}
              meta={when ? [when] : []}
              done={t.status === 'done'}
              sync={t.sync}
              onOpen={() => open(t)}
              menu={
                <MoreMenu>
                  <DropdownMenuItem onClick={() => unlinkItems(t.id, event.id, 'for')}>
                    <UnlinkIcon /> Remove link
                  </DropdownMenuItem>
                </MoreMenu>
              }
            />
          )
        })}
        <TaskLinker
          tasks={candidates}
          onLink={(id) => linkItems(id, event.id, 'for')}
          onCreate={(title) => linkItems(createItem('task', { title }), event.id, 'for')}
          trigger={
            <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
              <LinkIcon />
              Link a task
            </Button>
          }
        />
      </div>
    </Field>
  )
}

/** The Events a Task is *for* (EVT-006 3): each opens it, and can be unlinked. */
export function TaskFor({ task }: { task: Item }) {
  const { items } = useItems(queue)
  const links = useLinks(queue)
  const settings = useSettings(queue)
  const open = useOpenItem()
  const ids = new Set(
    links.filter((l) => l.link_type === 'for' && l.from_item === task.id).map((l) => l.to_item),
  )
  const events = items.filter((i) => ids.has(i.id))
  if (events.length === 0) return null
  return (
    <Field label="For">
      <div className="flex flex-col gap-1.5">
        {events.map((e) => {
          const t = eventTimes(e, settings.timezone)
          return (
            <ItemRow
              key={e.id}
              leading={<TypeTile colour={EVENT.colour} icon={EVENT.icon} size="sm" />}
              title={itemTitle(e)}
              meta={t ? [eventWhen(t)] : []}
              sync={e.sync}
              onOpen={() => open(e)}
              menu={
                <MoreMenu>
                  <DropdownMenuItem onClick={() => unlinkItems(task.id, e.id, 'for')}>
                    <UnlinkIcon /> Remove link
                  </DropdownMenuItem>
                </MoreMenu>
              }
            />
          )
        })}
      </div>
    </Field>
  )
}
