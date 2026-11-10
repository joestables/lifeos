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
  addAlert,
  archiveItem,
  createItem,
  linkItems,
  queue,
  removeDefaultAlert,
  stopRepeat,
  unlinkItems,
  updateItem,
  useItems,
  useFoodSpaces,
  useLinks,
  useAlerts,
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
import { defaultAlert, freshAlert, alertAnchors, alertFields } from '@/lib/alerts'
import { DraftAlerts, type DraftAlert } from './draft-alerts'
import { ItemAlerts } from './item-alerts'
import { CalendarSelect } from './calendar-select'
import { ItemSpaceField, SpaceField } from './space-field'
import { useMine } from './mine'
import { isOn, useGoogleSource } from './google-source'
import { MoreMenu } from './more-menu'
import { draftItem, useOpenItem } from './item-navigation'
import { eventRepeatStart, repeatEvent, repeatOf, useSeriesById, useTickDone } from './repeat'
import { useKeptText } from './kept-text'
import { Field } from './task-details'

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

/**
 * An Event's Alerts just below its times (Joe, 4 November), then place,
 * repeat, notes, Tasks and its Space last; no Labels (PLA-007,
 * components.md#eventdetails).
 */
function EventFields({
  times,
  space,
  place,
  onPlace,
  onPlaceBlur,
  notes,
  onNotes,
  onNotesBlur,
  repeat,
  calendar,
  alerts,
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
  alerts: ReactNode
  tasks?: ReactNode
  /** Where it is (HSH-005 1). */
  space?: ReactNode
}) {
  const ids = useId()
  return (
    <div className="flex flex-col gap-4">
      {times}
      <Field label="Alerts">{alerts}</Field>
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
      {tasks}
      {space}
    </div>
  )
}

const LEVEL_NAME = { off: 'Off', incoming: 'Incoming', two_way: 'Two-way' } as const

/**
 * An Event from an incoming-only Google calendar (GCL-004): its date and
 * time, place and notes are Google's, shown as lines, with "Open in Google
 * Calendar"; its Alerts and Tasks are LifeOS's own.
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
      <Field label="Alerts">
        <ItemAlerts item={item} />
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
  const alerts = useAlerts(queue)
  const series = useSeriesById()
  // A change to one occurrence is to that one; a new repeat applies from it on (EVT-004 3).
  const setRepeatTo = (next: Repeat | null) => {
    if (!next) return stopRepeat(item.id)
    repeatEvent(item, next, {
      timezone: settings.timezone,
      alerts: alerts
        .filter((r) => r.item_id === item.id && r.anchor && !r.is_default)
        .map((r) => ({
          anchor: r.anchor!,
          offset_days: r.offset_days,
          at_time: r.at_time,
          offset_minutes: r.offset_minutes,
          alarm: r.alarm,
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
      alerts={<ItemAlerts item={item} />}
      tasks={<EventTasks event={item} />}
      space={
        <ItemSpaceField
          item={item}
          onChange={(space) => updateItem(item.id, { space_id: space })}
        />
      }
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
    newEventTimes(day, today, new Date(), settings.defaultAlertTime, settings.timezone),
  )
  const times = useTimes(kept, setKept)
  const [alerts, setAlerts] = useState<DraftAlert[]>([])
  // The default changed or removed before Save (EVT-003 1).
  const [defaultGone, setDefaultGone] = useState(false)
  const [repeat, setRepeat] = useState<Repeat | null>(null)
  const { personal } = useFoodSpaces(queue)
  // Personal to start; or a Household (HSH-005 1).
  const [space, setSpace] = useState<string | null>(null)
  // Which Google calendar it goes to: my default, unless I choose (GCL-005 1).
  const calendar = useCalendar(queue)
  const twoWay = isOn(calendar.connection) && calendar.links.some((l) => l.level === 'two_way')
  const [chosen, setChosen] = useState<string | null | undefined>(undefined)
  const calendarId =
    chosen === undefined ? (calendar.links.find((l) => l.new_events)?.id ?? null) : chosen
  const stored = eventFields(times.shown, settings.timezone)
  const anchors = alertAnchors({ type: 'event', do_on: null, due_on: null, ...stored })
  const byDefault = defaultAlert({ type: 'event', ...stored }, settings)
  const dirty =
    title.trim() !== '' ||
    place !== '' ||
    notes !== '' ||
    alerts.length > 0 ||
    defaultGone ||
    (space !== null && space !== personal)

  const save = () => {
    if (!title.trim()) return titleRef.current?.focus()
    if (times.invalid) return
    const fields: ItemFields = { title: title.trim(), ...eventFields(kept, settings.timezone) }
    if (place.trim()) fields.place = place.trim()
    if (notes.trim()) fields.body = notes
    if (space && space !== personal) fields.space_id = space
    const id = newId()
    // Before the Event, so it never goes out without it.
    if (twoWay) setEventCalendar(id, calendarId)
    createItem('event', fields, id)
    // The server gives it its default; changed or removed here, it goes.
    if (byDefault && defaultGone) removeDefaultAlert(id)
    const own = alerts.map((r) => alertFields(r.choice, settings.timezone))
    for (const f of own) addAlert(id, f)
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
          timezone: settings.timezone,
          alerts: own
            .filter((f) => f.anchor)
            .map((f) => ({
              anchor: f.anchor!,
              offset_days: f.offset_days ?? 0,
              at_time: f.at_time ?? null,
              offset_minutes: f.offset_minutes ?? 0,
              alarm: f.alarm ?? false,
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
        alerts={
          <DraftAlerts
            alerts={alerts}
            onChange={setAlerts}
            anchors={anchors}
            dates={{ starts_at: stored.starts_at, start_day: times.shown.startDay }}
            fresh={freshAlert(anchors, settings.defaultAlertTime, today)}
            byDefault={defaultGone ? null : byDefault}
            onDefaultGone={() => setDefaultGone(true)}
          />
        }
        space={<SpaceField value={space} onChange={setSpace} />}
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
 * Someone else's, seen through the link, says whose and can't be ticked or
 * unlinked here (HSH-005 7); only Tasks that may be linked to it are offered
 * (ADR-0017: in its Space, or both mine), and one made here is in its Space.
 */
export function EventTasks({ event }: { event: Item }) {
  const { items } = useItems(queue)
  const links = useLinks(queue)
  const open = useOpenItem()
  const tickDone = useTickDone()
  const mine = useMine()
  const { me, firstName } = useFoodSpaces(queue)
  const now = new Date()
  const mayLink = (t: Item) =>
    mine(t) &&
    (t.space_id === event.space_id || ((!t.owner_id || t.owner_id === me) && event.owner_id === me))
  const linked = new Set(
    links.filter((l) => l.link_type === 'for' && l.to_item === event.id).map((l) => l.from_item),
  )
  const tasks = items.filter((i) => linked.has(i.id))
  const candidates = items
    .filter(
      (i) =>
        i.type === 'task' &&
        !linked.has(i.id) &&
        (i.status === 'active' || i.status === 'idea') &&
        mayLink(i),
    )
    .sort((a, b) => (a.do_on ?? '9').localeCompare(b.do_on ?? '9'))
    .map((t) => ({ id: t.id, title: itemTitle(t), when: taskWhen(t, now) }))

  return (
    <Field label="Tasks">
      <div className="flex flex-col gap-1.5">
        {tasks.map((t) => {
          const when = taskWhen(t, now)
          const theirs = !mine(t)
          return (
            <ItemRow
              key={t.id}
              leading={
                <Checkbox
                  colour={TASK.colour}
                  aria-label={`Done: ${itemTitle(t)}`}
                  checked={t.status === 'done'}
                  disabled={theirs}
                  onCheckedChange={(on) =>
                    on ? tickDone(t) : updateItem(t.id, { status: 'active' })
                  }
                />
              }
              title={itemTitle(t)}
              meta={[...(when ? [when] : []), ...(theirs ? [`${firstName(t.owner_id)}’s`] : [])]}
              done={t.status === 'done'}
              sync={t.sync}
              onOpen={() => open(t)}
              menu={
                theirs ? undefined : (
                  <MoreMenu>
                    <DropdownMenuItem onClick={() => unlinkItems(t.id, event.id, 'for')}>
                      <UnlinkIcon /> Remove link
                    </DropdownMenuItem>
                  </MoreMenu>
                )
              }
            />
          )
        })}
        <TaskLinker
          tasks={candidates}
          onLink={(id) => linkItems(id, event.id, 'for')}
          onCreate={(title) =>
            linkItems(createItem('task', { title, space_id: event.space_id }), event.id, 'for')
          }
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
