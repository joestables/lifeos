import { ADD_CHOICES } from '@/app/add-choices'
import { AddToDayDialog } from '@/app/add-to-day'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { addDays, todayIn } from '@lifeos/recurrence'
import { AlarmClockIcon } from 'lucide-react'
import { Fragment, useEffect, useState, type DragEvent, type ReactElement } from 'react'
import {
  AddToDay,
  Fab,
  FilterChip,
  PageAction,
  PageHeader,
  PlanCard,
  PlanDay,
  PlanToolbar,
  PlanWeek,
  WeekStrip,
  type PlanWeekDay,
  type TypeColour,
} from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import { useGoogleLocked, useSyncOnOpen } from '@/app/google-source'
import { useOpenItem } from '@/app/item-navigation'
import { useAlertTimes } from '@/app/alert-times'
import {
  archiveItem,
  queue,
  restoreItem,
  updateItem,
  updateSettings,
  useHouseholds,
  useItems,
  useMeals,
  useSettings,
  type Item,
} from '@/data'
import { leftoversBefore } from '@/lib/meals'
import { useIsMobile } from '@/hooks/use-mobile'
import { dayName, fromIsoDay, shortDate } from '@/lib/dates'
import { itemTitle, plannedTypes, typeLook } from '@/lib/item-types'
import {
  cardLine,
  dayTitle,
  isPast,
  moveTo,
  planDays,
  weekOf,
  weekTitle,
  type AlertTime,
  type Placed,
} from '@/lib/plan'

type Layout = 'week' | 'day'
const LAYOUT_KEY = 'lifeos.plan.layout'

/** Week (views/week.md): the day shown, kept in the page's address. */
export const Route = createFileRoute('/_app/week')({
  // `add`: opened with "+" pressed, as the Today widget's "+" asks (WID-002 8).
  validateSearch: (search: Record<string, unknown>): { day?: string; add?: true } => ({
    ...(typeof search.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(search.day)
      ? { day: search.day }
      : {}),
    ...(search.add === true || search.add === 'true' || search.add === 1 || search.add === '1'
      ? { add: true as const }
      : {}),
  }),
  component: Week,
})

/** The Schedulable Types the app has yet: Week's filter and what "+" adds (PLN-004, PLN-006). */
const PLANNED = plannedTypes()

/** Week or Day on a computer, kept on this device only (PLN-002 2, ADR-0049). */
function useLayout(): [Layout, (layout: Layout) => void] {
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      return localStorage.getItem(LAYOUT_KEY) === 'day' ? 'day' : 'week'
    } catch {
      return 'week'
    }
  })
  return [
    layout,
    (next) => {
      setLayout(next)
      try {
        localStorage.setItem(LAYOUT_KEY, next)
      } catch {
        // Kept for this visit only.
      }
    },
  ]
}

/** A Reminder's times on its card, an Alarm's with an alarm clock (RMD-003 1). */
const alertTimesOf = (alerts: readonly AlertTime[]) =>
  alerts.map((a, i) => (
    <Fragment key={a.at}>
      {i > 0 && ', '}
      {a.alarm ? (
        // Inline, not inline-flex: a flex box takes the icon's foot as its
        // baseline, lifting this time above the others on the line.
        <span className="whitespace-nowrap">
          <AlarmClockIcon aria-label="Alarm" className="mr-0.5 inline size-3 align-middle" />
          {a.time}
        </span>
      ) : (
        a.time
      )}
    </Fragment>
  ))

const dayLabel = (day: string, today: string) =>
  day === today ? 'Today' : shortDate(fromIsoDay(day))

function Week() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const settings = useSettings(queue)
  // A shared Item says which Household it is in (HSH-003 1).
  const { households: mine } = useHouseholds(queue)
  const households = new Map(mine.map((h) => [h.id, h.name]))
  const { items } = useItems(queue)
  const open = useOpenItem()
  const [chosenLayout, setLayout] = useLayout()
  const googleLocked = useGoogleLocked()
  useSyncOnOpen()
  const layout: Layout = isMobile ? 'day' : chosenLayout
  const today = todayIn(settings.timezone)
  const day = search.day ?? today
  const week = weekOf(day)
  const hidden = settings.planHiddenTypes
  const alertsOf = useAlertTimes()
  const days = planDays(items, week[0]!, week[6]!, settings.timezone, hidden, alertsOf)
  const [adding, setAdding] = useState<{ type: string; day: string } | null>(null)
  // Asked from outside (the Today widget, WID-002 8): "+" open on the day,
  // each time it is asked, Week already open or not.
  const [addOpen, setAddOpen] = useState(false)
  const [asked, setAsked] = useState(false)
  if (search.add && !asked) {
    setAsked(true)
    setAddOpen(true)
  } else if (!search.add && asked) setAsked(false)
  useEffect(() => {
    if (search.add) void navigate({ to: '/week', search: { day: search.day }, replace: true })
  }, [search.add, search.day, navigate])
  const [drag, setDrag] = useState<{ item: Item; from: string } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const now = new Date()

  const goTo = (next: string) =>
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, day: next === today ? undefined : next }),
      replace: true,
    })
  // A phone's arrows move a week, its WeekStrip the day (patterns.md#week).
  const step = layout === 'week' || isMobile ? 7 : 1
  const toggle = (type: string, on: boolean) =>
    updateSettings({
      plan_hidden_types: on ? hidden.filter((t) => t !== type) : [...hidden, type],
    })

  const { meals } = useMeals(queue)
  const move = (item: Item, from: string, to: string) => {
    const patch = moveTo(item, from, to, settings.timezone)
    if (!patch) return
    const was = Object.fromEntries(
      Object.keys(patch).map((k) => [k, item[k as keyof typeof patch]]),
    ) as typeof patch
    // A Meal's leftovers at or before where it goes are removed (MPL-003 2).
    const gone =
      item.type === 'meal' && item.slot
        ? leftoversBefore(
            item.id,
            to,
            item.slot,
            meals.map((m) => ({
              id: m.item.id,
              leftoversOf: m.leftoversOf,
              day: m.item.do_on,
              slot: m.item.slot,
            })),
          )
        : []
    updateItem(item.id, patch)
    for (const l of gone) archiveItem(l.id)
    toast(
      `Moved "${itemTitle(item)}" to ${dayName(to, now)}${gone.length ? ' and removed its leftovers' : ''}`,
      {
        action: {
          label: 'Undo',
          onClick: () => {
            updateItem(item.id, was)
            for (const l of gone) restoreItem(l.id)
          },
        },
      },
    )
  }

  const card = (p: Placed, on: string, wide = false) => {
    const look = typeLook(p.item.type)
    const line = cardLine(p, on, settings.timezone, { long: wide, now })
    const node = (
      <PlanCard
        key={`${p.item.id}-${on}`}
        colour={look.colour}
        icon={look.icon}
        type={look.label}
        title={itemTitle(p.item)}
        time={p.alerts ? alertTimesOf(p.alerts) : line.time}
        detail={
          [line.detail, households.get(p.item.space_id)].filter(Boolean).join(' · ') || undefined
        }
        past={isPast(p.item, now, p) || (p.item.type === 'meal' && on < today)}
        done={p.item.status === 'done'}
        wide={wide}
        dragging={drag?.item.id === p.item.id && drag.from === on}
        onOpen={() => open(p.item)}
      />
    )
    // An Event from an incoming-only Google calendar stays where Google has it (PLN-007 4).
    if (wide || isMobile || googleLocked(p.item)) return node
    // On a computer's week, a card is dragged to another day (PLN-007).
    return (
      <div
        key={`${p.item.id}-${on}`}
        draggable
        onDragStart={(e: DragEvent) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', p.item.id)
          setDrag({ item: p.item, from: on })
        }}
        onDragEnd={() => {
          setDrag(null)
          setOver(null)
        }}
      >
        {node}
      </div>
    )
  }

  const addTo = (
    d: string,
    trigger?: ReactElement,
    side?: 'top' | 'bottom',
    control?: { open: boolean; onOpenChange: (open: boolean) => void },
  ) => (
    <AddToDay
      day={dayLabel(d, today)}
      choices={ADD_CHOICES}
      onChoose={(type) => setAdding({ type, day: d })}
      trigger={trigger}
      side={side}
      {...control}
    />
  )

  const weekDays: PlanWeekDay[] = week.map((d) => {
    const date = fromIsoDay(d)
    const list = days.get(d) ?? []
    return {
      key: d,
      name: shortDate(date).slice(0, 3),
      number: date.getDate(),
      today: d === today,
      add: addTo(d),
      dropping: drag !== null && over === d,
      drop: {
        onDragOver: (e) => {
          if (!drag) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (over !== d) setOver(d)
        },
        onDrop: (e) => {
          e.preventDefault()
          if (drag) move(drag.item, drag.from, d)
          setDrag(null)
          setOver(null)
        },
      },
      children: <>{list.map((p) => card(p, d))}</>,
    }
  })

  const strip = week.map((d) => {
    const date = fromIsoDay(d)
    return {
      key: d,
      name: shortDate(date).slice(0, 3),
      number: date.getDate(),
      today: d === today,
      dots: (days.get(d) ?? []).map((p) => typeLook(p.item.type).colour as TypeColour),
    }
  })

  // "Add" adds to the day shown, or in a week to today when it is in it.
  const addDay = layout === 'day' ? day : week.includes(today) ? today : week[0]!

  return (
    <>
      <PageHeader title="Week" />
      <div className="flex flex-col gap-4 px-5 pb-28 sm:px-9 sm:pb-8">
        <PlanToolbar
          title={layout === 'week' ? weekTitle(week[0]!) : dayTitle(day, isMobile)}
          day={day}
          onChooseDay={goTo}
          layout={layout}
          onLayout={setLayout}
          onToday={() => goTo(today)}
          onPrevious={() => goTo(addDays(day, -step))}
          onNext={() => goTo(addDays(day, step))}
          step={step === 7 ? 'week' : 'day'}
          action={addTo(
            addDay,
            <PageAction label="Add" />,
            undefined,
            isMobile ? undefined : { open: addOpen, onOpenChange: setAddOpen },
          )}
        />
        <div
          role="group"
          aria-label="Show on Week"
          className="flex items-center gap-2 overflow-x-auto"
        >
          {PLANNED.map((t) => (
            <FilterChip
              key={t.key}
              colour={t.colour}
              pressed={!hidden.includes(t.key)}
              onPressedChange={(on) => toggle(t.key, on)}
            >
              {t.label}s
            </FilterChip>
          ))}
        </div>
        {layout === 'week' ? (
          <PlanWeek days={weekDays} />
        ) : (
          <div className="flex max-w-3xl flex-col gap-4">
            <WeekStrip days={strip} chosen={day} onChoose={goTo} />
            <PlanDay>{(days.get(day) ?? []).map((p) => card(p, day, true))}</PlanDay>
          </div>
        )}
      </div>
      {isMobile &&
        addTo(day, <Fab label="Add" />, 'top', { open: addOpen, onOpenChange: setAddOpen })}
      {adding && (
        <AddToDayDialog
          type={adding.type}
          day={adding.day}
          today={today}
          onClose={() => setAdding(null)}
        />
      )}
    </>
  )
}

/** A workout planned from Week (PLN-006, GYM-007 1): New workout on the chosen day, then its page. */
