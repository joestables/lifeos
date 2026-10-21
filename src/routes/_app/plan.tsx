import { AddMealDialog } from '@/app/add-meal'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { addDays, todayIn } from '@lifeos/recurrence'
import { TYPES, hasTrait } from '@lifeos/ontology'
import { useState, type DragEvent, type ReactElement } from 'react'
import {
  AddToDay,
  DropSlot,
  Fab,
  FilterChip,
  PageAction,
  PageHeader,
  PlanCard,
  PlanDay,
  PlanToolbar,
  PlanWeek,
  WeekStrip,
  type AddChoice,
  type PlanWeekDay,
  type TypeColour,
} from '@/components/lifeos'
import { toast } from '@/components/ui/sonner'
import { NewEventDialog } from '@/app/event-details'
import { useGoogleLocked, useSyncOnOpen } from '@/app/google-source'
import { useOpenItem } from '@/app/item-navigation'
import { NewTaskDialog } from '@/app/new-task'
import {
  queue,
  updateItem,
  updateSettings,
  useHouseholds,
  useItems,
  useSettings,
  type Item,
} from '@/data'
import { useIsMobile } from '@/hooks/use-mobile'
import { dayName, fromIsoDay, shortDate } from '@/lib/dates'
import { itemTitle, offered, typeLook } from '@/lib/item-types'
import {
  cardLine,
  dayTitle,
  isPast,
  moveTo,
  planDays,
  weekOf,
  weekTitle,
  type Placed,
} from '@/lib/plan'

type Layout = 'week' | 'day'
const LAYOUT_KEY = 'lifeos.plan.layout'

/** Plan (views/plan.md): the day shown, kept in the page's address. */
export const Route = createFileRoute('/_app/plan')({
  validateSearch: (search: Record<string, unknown>): { day?: string } =>
    typeof search.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(search.day)
      ? { day: search.day }
      : {},
  component: Plan,
})

/** The Schedulable Types the app has yet: Plan's filter and what "+" adds (PLN-004, PLN-006). */
const PLANNED = TYPES.filter((t) => hasTrait(t, 'schedulable') && offered(t.key)).map((t) =>
  typeLook(t.key),
)
const ADD: AddChoice[] = PLANNED.map((t) => ({
  key: t.key,
  label: t.label,
  colour: t.colour as AddChoice['colour'],
  icon: t.icon,
}))

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

const dayLabel = (day: string, today: string) =>
  day === today ? 'Today' : shortDate(fromIsoDay(day))

function Plan() {
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
  const days = planDays(items, week[0]!, week[6]!, settings.timezone, hidden)
  const [adding, setAdding] = useState<{ type: string; day: string } | null>(null)
  const [drag, setDrag] = useState<{ item: Item; from: string } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const now = new Date()

  const goTo = (next: string) =>
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, day: next === today ? undefined : next }),
      replace: true,
    })
  // A phone's arrows move a week, its WeekStrip the day (patterns.md#plan).
  const step = layout === 'week' || isMobile ? 7 : 1
  const toggle = (type: string, on: boolean) =>
    updateSettings({
      plan_hidden_types: on ? hidden.filter((t) => t !== type) : [...hidden, type],
    })

  const move = (item: Item, from: string, to: string) => {
    const patch = moveTo(item, from, to, settings.timezone)
    if (!patch) return
    const was = Object.fromEntries(
      Object.keys(patch).map((k) => [k, item[k as keyof typeof patch]]),
    ) as typeof patch
    updateItem(item.id, patch)
    toast(`Moved "${itemTitle(item)}" to ${dayName(to, now)}`, {
      action: { label: 'Undo', onClick: () => updateItem(item.id, was) },
    })
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
        time={line.time}
        detail={
          [line.detail, households.get(p.item.space_id)].filter(Boolean).join(' · ') || undefined
        }
        past={isPast(p.item, now)}
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

  const addTo = (d: string, trigger?: ReactElement, side?: 'top' | 'bottom') => (
    <AddToDay
      day={dayLabel(d, today)}
      choices={ADD}
      onChoose={(type) => setAdding({ type, day: d })}
      trigger={trigger}
      side={side}
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
      children: (
        <>
          {list.map((p) => card(p, d))}
          {drag && over === d && drag.from !== d && <DropSlot />}
        </>
      ),
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
      <PageHeader title="Plan" />
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
          action={addTo(addDay, <PageAction label="Add" />)}
        />
        <div
          role="group"
          aria-label="Show on Plan"
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
      {isMobile && addTo(day, <Fab label="Add" />, 'top')}
      {adding?.type === 'task' && (
        <NewTaskDialog doOn={adding.day} onClose={() => setAdding(null)} />
      )}
      {adding?.type === 'event' && (
        <NewEventDialog day={adding.day} onClose={() => setAdding(null)} />
      )}
      {adding?.type === 'meal' && (
        <AddMealDialog day={adding.day} onClose={() => setAdding(null)} />
      )}
    </>
  )
}
