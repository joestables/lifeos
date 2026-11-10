import { createFileRoute, Link } from '@tanstack/react-router'
import { todayIn } from '@lifeos/recurrence'
import { SunIcon } from 'lucide-react'
import { CalendarBrokenAlert } from '@/app/google-calendar'
import { CardRow, EmptyState, PageHeader, SectionLabel, TypeTile } from '@/components/lifeos'
import { useAlertTimes } from '@/app/alert-times'
import { useMine } from '@/app/mine'
import { NotificationsOffer } from '@/app/notifications-offer'
import { PlacedRow } from '@/app/placed-row'
import { ReminderRow } from '@/app/reminder-row'
import { useTaskFacts } from '@/app/task-facts'
import { TaskRow } from '@/app/task-row'
import { queue, useItems, useSettings, type Item } from '@/data'
import { typeLook } from '@/lib/item-types'
import { dayTitle } from '@/lib/plan'
import { todayList, type OnToday } from '@/lib/today'

/** Everything on today, in four parts, and overdue Tasks (views/today.md). */
export const Route = createFileRoute('/_app/today')({ component: Today })

const THOUGHT = typeLook('thought')

function Today() {
  const settings = useSettings(queue)
  const { items: visible, isLoading } = useItems(queue)
  // Only what is mine: in one of my Spaces (HSH-005 7).
  const mine = useMine()
  const items = visible.filter(mine)
  const alertsOf = useAlertTimes()
  const facts = useTaskFacts()
  const now = new Date()
  const today = todayIn(settings.timezone)
  const list = todayList(items, today, settings.timezone, alertsOf, now)
  const toSort = items.filter(
    (i) => i.type === 'thought' && i.archived_at === null && i.status === 'active',
  ).length

  // A Task as on Plan, without its Labels (PLA-002 3).
  const task = (t: Item) => (
    <TaskRow key={t.id} task={t} now={now} {...facts.of(t)} labels={[]} subtasks={undefined} />
  )
  const row = ({ placed, past }: OnToday) => {
    const { item } = placed
    if (item.type === 'task') return task(item)
    if (item.type === 'reminder')
      return (
        <ReminderRow
          key={item.id}
          item={item}
          alerts={placed.alerts ?? []}
          repeat={facts.of(item).repeat}
          past={past}
        />
      )
    return (
      <PlacedRow
        key={item.id}
        placed={placed}
        day={today}
        past={past}
        repeat={facts.of(item).repeat}
      />
    )
  }

  return (
    <>
      <PageHeader title="Today" eyebrow={dayTitle(today)} />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        <CalendarBrokenAlert />
        <NotificationsOffer />
        {!isLoading && list.count === 0 && <EmptyState icon={SunIcon} title="Nothing today" />}
        {list.overdue.length > 0 && (
          <section>
            <SectionLabel danger count={list.overdue.length}>
              Overdue
            </SectionLabel>
            <div className="flex flex-col gap-1.5">{list.overdue.map(task)}</div>
          </section>
        )}
        {list.parts.map((g) => (
          <section key={g.key}>
            <SectionLabel>{g.label}</SectionLabel>
            <div className="flex flex-col gap-1.5">{g.items.map(row)}</div>
          </section>
        ))}
        {/* How many Thoughts wait, never which (TDY-001 3). */}
        {toSort > 0 && (
          <CardRow
            render={<Link to="/notes" search={{ tab: 'thoughts' }} />}
            icon={<TypeTile colour={THOUGHT.colour} icon={THOUGHT.icon} size="sm" />}
            label={toSort === 1 ? '1 thought to sort' : `${toSort} thoughts to sort`}
            className="text-muted-foreground"
          />
        )}
      </div>
    </>
  )
}
