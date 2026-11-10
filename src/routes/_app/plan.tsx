import { describeRule, todayIn } from '@lifeos/recurrence'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { BellRingIcon, CalendarDaysIcon, RepeatIcon, SquareCheckBigIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import {
  AddToDay,
  EmptyState,
  Fab,
  PageAction,
  PageHeader,
  SectionLabel,
  TabsRow,
  TypeScope,
  type AddChoice,
} from '@/components/lifeos'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAlertTimes } from '@/app/alert-times'
import { NewEventDialog } from '@/app/event-details'
import { repeatBit } from '@/app/item-meta'
import { useMine } from '@/app/mine'
import { NewReminderDialog } from '@/app/new-reminder'
import { NewTaskDialog } from '@/app/new-task'
import { PlacedRow } from '@/app/placed-row'
import { ReminderRow } from '@/app/reminder-row'
import { useTaskFacts } from '@/app/task-facts'
import { TaskRow } from '@/app/task-row'
import { useIsMobile } from '@/hooks/use-mobile'
import { queue, useItems, useSettings, type Item, type RepeatMode, type Series } from '@/data'
import { dateName, fromIsoDay, shortDate } from '@/lib/dates'
import { typeLook } from '@/lib/item-types'
import { byDay, eventEntries, recurringEntries, reminderEntries, startTime } from '@/lib/plan-lists'
import { taskGroups } from '@/lib/tasks'

type Tab = 'tasks' | 'events' | 'reminders' | 'recurring'
const TABS: { value: Tab; label: string; action: string }[] = [
  { value: 'tasks', label: 'Tasks', action: 'New task' },
  { value: 'events', label: 'Events', action: 'New event' },
  { value: 'reminders', label: 'Reminders', action: 'New reminder' },
  { value: 'recurring', label: 'Recurring', action: 'New' },
]
const isTab = (v: unknown): v is Tab => TABS.some((t) => t.value === v)
const NEW: AddChoice[] = (['task', 'event', 'reminder'] as const).map((key) => {
  const t = typeLook(key)
  return { key, label: t.label, colour: t.colour as AddChoice['colour'], icon: t.icon }
})

interface PlanSearch {
  tab?: Exclude<Tab, 'tasks'>
  /** Week's, from a link made before Plan was renamed Week (WEK-001 2). */
  day?: string
  add?: true
}

/** My Tasks, Events and Reminders as lists, and what repeats (views/week.md). */
export const Route = createFileRoute('/_app/plan')({
  validateSearch: (search: Record<string, unknown>): PlanSearch => ({
    ...(isTab(search.tab) && search.tab !== 'tasks' ? { tab: search.tab } : {}),
    ...(typeof search.day === 'string' ? { day: search.day } : {}),
    ...(search.add === true || search.add === 'true' || search.add === 1 || search.add === '1'
      ? { add: true as const }
      : {}),
  }),
  // Plan was the week until Stage 7b: its day and "+" are Week's now (WEK-001 2).
  beforeLoad: ({ search }) => {
    if (search.day || search.add)
      throw redirect({
        to: '/week',
        search: {
          ...(search.day ? { day: search.day } : {}),
          ...(search.add ? { add: true } : {}),
        },
        replace: true,
      })
  },
  component: Plan,
})

/** "Next today", "Next Wed 11 Nov" (PLA-005). */
const nextWhen = (day: string, now: Date, at?: string) => {
  const name = dateName(day, now)
  const words = name === 'Today' || name === 'Tomorrow' ? name.toLowerCase() : name
  return `Next ${words}${at ? `, ${at}` : ''}`
}
const inLater = (key: string, day: string) => (key === 'later' ? [shortDate(fromIsoDay(day))] : [])
const rule = (s: Series) => describeRule(s.rule, s.starts_on, s.mode as RepeatMode)

function Group({
  label,
  count,
  danger,
  children,
}: {
  label: string
  count: number
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section>
      <SectionLabel danger={danger} count={count}>
        {label}
      </SectionLabel>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

function Plan() {
  const search = Route.useSearch()
  const tab: Tab = search.tab ?? 'tasks'
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const settings = useSettings(queue)
  const [adding, setAdding] = useState<string | null>(null)
  const { items: visible, isLoading } = useItems(queue)
  // Only what is mine: in one of my Spaces (HSH-005 7).
  const mine = useMine()
  const items = useMemo(() => visible.filter(mine), [visible, mine])
  const facts = useTaskFacts()
  const alertsOf = useAlertTimes()
  const now = new Date()
  const today = todayIn(settings.timezone)
  const tz = settings.timezone
  const current = TABS.find((t) => t.value === tab)!

  // A Task as before (PLA-002 3).
  const task = (t: Item, showDay = false, repeat?: string) => {
    const f = facts.of(t)
    return (
      <TaskRow key={t.id} task={t} now={now} showDay={showDay} {...f} repeat={repeat ?? f.repeat} />
    )
  }

  let body: ReactNode
  let empty: { icon: typeof RepeatIcon; title: string } | null = null
  if (tab === 'tasks') {
    const groups = taskGroups(items, now)
    if (groups.length === 0) empty = { icon: SquareCheckBigIcon, title: 'No tasks yet' }
    body = groups.map((g) => (
      <Group key={g.key} label={g.label} count={g.tasks.length} danger={g.danger}>
        {g.tasks.map((t) => task(t, g.key === 'later' || g.key === 'someday'))}
      </Group>
    ))
  } else if (tab === 'events') {
    const groups = byDay(
      eventEntries(items, today, tz, now).map((e) => ({ day: e.day, value: e })),
      today,
    )
    if (groups.length === 0) empty = { icon: CalendarDaysIcon, title: 'No events coming' }
    body = groups.map((g) => (
      <Group key={g.key} label={g.label} count={g.entries.length}>
        {g.entries.map((e) => (
          <PlacedRow
            key={e.placed.item.id}
            placed={e.placed}
            day={e.day}
            past={e.past}
            before={inLater(g.key, e.day)}
            repeat={facts.of(e.placed.item).repeat}
          />
        ))}
      </Group>
    ))
  } else if (tab === 'reminders') {
    const groups = byDay(
      reminderEntries(items, today, alertsOf, now).map((e) => ({ day: e.day, value: e })),
      today,
    )
    if (groups.length === 0) empty = { icon: BellRingIcon, title: 'No reminders coming' }
    body = groups.map((g) => (
      <Group key={g.key} label={g.label} count={g.entries.length}>
        {g.entries.map((e) => (
          <ReminderRow
            key={e.item.id}
            item={e.item}
            alerts={e.alerts}
            repeat={facts.of(e.item).repeat}
            meta={inLater(g.key, e.day)}
            past={e.past}
          />
        ))}
      </Group>
    ))
  } else {
    const r = recurringEntries(items, facts.series, today, tz, alertsOf, now)
    if (r.tasks.length + r.events.length + r.reminders.length === 0)
      empty = { icon: RepeatIcon, title: 'Nothing repeats' }
    body = (
      <>
        {r.tasks.length > 0 && (
          <Group label="Tasks" count={r.tasks.length}>
            {r.tasks.map(({ task: t, series }) => task(t, true, rule(series)))}
          </Group>
        )}
        {r.events.length > 0 && (
          <Group label="Events" count={r.events.length}>
            {r.events.map((e) => (
              <PlacedRow
                key={e.placed.item.id}
                placed={e.placed}
                day={e.day}
                meta={[
                  repeatBit(rule(e.series)),
                  nextWhen(e.day, now, startTime(e.placed.item, tz)),
                ]}
              />
            ))}
          </Group>
        )}
        {r.reminders.length > 0 && (
          <Group label="Reminders" count={r.reminders.length}>
            {r.reminders.map((e) => (
              <ReminderRow
                key={e.item.id}
                item={e.item}
                alerts={e.alerts}
                repeat={rule(e.series)}
                meta={[nextWhen(e.day, now)]}
              />
            ))}
          </Group>
        )}
      </>
    )
  }

  const add = () =>
    setAdding(
      current.value === 'events' ? 'event' : current.value === 'reminders' ? 'reminder' : 'task',
    )
  // On Recurring, "New" is a menu of the three (PLA-001 3).
  const newMenu = (trigger: React.ReactElement, side?: 'top' | 'bottom') => (
    <AddToDay day="Today" choices={NEW} onChoose={setAdding} trigger={trigger} side={side} />
  )

  return (
    <TypeScope colour="blue">
      <PageHeader
        title="Plan"
        action={tab === 'recurring' ? undefined : { label: current.action, onClick: add }}
      />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        <TabsRow>
          <Tabs
            value={tab}
            onValueChange={(value: Tab) =>
              void navigate({
                to: '.',
                search: (prev) => ({ ...prev, tab: value === 'tasks' ? undefined : value }),
                replace: true,
              })
            }
          >
            <TabsList aria-label="View">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {tab === 'recurring' ? (
            newMenu(<PageAction label="New" />)
          ) : (
            <PageAction label={current.action} onClick={add} />
          )}
        </TabsRow>
        {!isLoading && empty && <EmptyState icon={empty.icon} title={empty.title} />}
        {body}
      </div>
      {tab === 'recurring' && isMobile && newMenu(<Fab label="New" />, 'top')}
      {adding === 'task' && <NewTaskDialog onClose={() => setAdding(null)} />}
      {adding === 'event' && <NewEventDialog day={today} onClose={() => setAdding(null)} />}
      {adding === 'reminder' && <NewReminderDialog day={today} onClose={() => setAdding(null)} />}
    </TypeScope>
  )
}
