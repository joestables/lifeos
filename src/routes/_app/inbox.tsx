import { createFileRoute } from '@tanstack/react-router'
import { InboxIcon, TagIcon, Trash2Icon } from 'lucide-react'
import {
  EmptyState,
  Fab,
  ItemRow,
  LabelChips,
  PageHeader,
  SectionLabel,
  SwipeAction,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useConvert } from '@/app/convert'
import { deleteItem, useOpenItem } from '@/app/item-navigation'
import { useLabelFilter, validateLabels } from '@/app/label-filter'
import { MoreMenu } from '@/app/more-menu'
import { NotificationsOffer } from '@/app/notifications-offer'
import { useOpenCapture } from '@/app/open-capture'
import { useTaskFacts } from '@/app/task-facts'
import { TaskRow } from '@/app/task-row'
import { tickThought } from '@/app/thought-actions'
import { queue, useItems, useReminders, type Item } from '@/data'
import { capturedWhen, reminderWhen } from '@/lib/dates'
import { inboxGroups } from '@/lib/inbox'
import { convertTargets, itemTitle, typeLook } from '@/lib/item-types'

/** One feed of what needs me (views/inbox.md): Overdue, Today, Thoughts. */
export const Route = createFileRoute('/_app/inbox')({
  validateSearch: validateLabels,
  component: Inbox,
})

const TASK = typeLook('task')
const THOUGHT = typeLook('thought')

function Inbox() {
  const openCapture = useOpenCapture()
  const { items, isLoading } = useItems(queue)
  const now = new Date()
  const facts = useTaskFacts()
  const filter = useLabelFilter(Route.useSearch().labels)
  // The chosen Labels narrow every group (INB-007); the drawer's count doesn't change.
  const all = inboxGroups(items, now)
  const overdue = all.overdue.filter((i) => filter.shows(i.id))
  const today = all.today.filter((i) => filter.shows(i.id))
  const thoughts = all.thoughts.filter((i) => filter.shows(i.id))
  const waiting = all.overdue.length + all.today.length + all.thoughts.length > 0
  const empty = overdue.length + today.length + thoughts.length === 0
  const reminders = useReminders(queue)
  // A Thought's next Reminder, if it has one still to come.
  const nextReminder = (itemId: string) =>
    reminders
      .filter((r) => r.item_id === itemId && r.fires_at && Date.parse(r.fires_at) > now.getTime())
      .map((r) => r.fires_at!)
      .sort()[0]

  return (
    <>
      <PageHeader title="Inbox" />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        {filter.labels.length > 0 && (
          <LabelChips labels={filter.labels} chosen={filter.chosen} onChange={filter.choose} />
        )}
        <NotificationsOffer />
        {!isLoading && !waiting && <EmptyState icon={InboxIcon} title="Nothing needs you" />}
        {waiting && empty && <EmptyState icon={TagIcon} title={filter.nothing('items')} />}
        {overdue.length > 0 && (
          <section>
            <SectionLabel danger count={overdue.length}>
              Overdue
            </SectionLabel>
            <div className="flex flex-col gap-1.5">
              {overdue.map((t) => (
                <TaskRow key={t.id} task={t} now={now} {...facts.of(t)} />
              ))}
            </div>
          </section>
        )}
        {today.length > 0 && (
          <section>
            <SectionLabel count={today.length}>Today</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {today.map((t) => (
                <TaskRow key={t.id} task={t} now={now} {...facts.of(t)} />
              ))}
            </div>
          </section>
        )}
        {thoughts.length > 0 && (
          <section>
            <SectionLabel count={thoughts.length}>Thoughts</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {thoughts.map((t) => (
                <ThoughtRow
                  key={t.id}
                  thought={t}
                  now={now}
                  labels={facts.of(t).labels}
                  reminder={nextReminder(t.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <Fab label="Capture" onClick={() => openCapture()} />
    </>
  )
}

/**
 * A Thought: ticked off when it no longer matters (INB-006), or sorted into a
 * Task or a Note in one action, or deleted (INB-002).
 */
function ThoughtRow({
  thought,
  now,
  labels,
  reminder,
}: {
  thought: Item
  now: Date
  /** Its Labels' names, A to Z. */
  labels: string[]
  /** When its next Reminder fires. */
  reminder?: string
}) {
  const open = useOpenItem()
  const convert = useConvert()
  // Task first: the one a swipe does.
  const targets = convertTargets('thought').slice().reverse()
  const meta = [capturedWhen(thought.created_at, now)]
  if (reminder) meta.push(reminderWhen(reminder, now))
  meta.push(...labels)
  const title = itemTitle(thought)

  return (
    <SwipeAction
      label={TASK.label}
      icon={TASK.icon}
      colour={TASK.colour}
      onAction={() => convert(thought, 'task')}
    >
      <ItemRow
        leading={
          <Checkbox
            colour={THOUGHT.colour}
            aria-label={`Done: ${title}`}
            checked={thought.status === 'done'}
            onCheckedChange={(on) => tickThought(thought, on)}
          />
        }
        title={title}
        meta={meta}
        sync={thought.sync}
        onOpen={() => open(thought)}
        actions={targets.map((t) => (
          <Button key={t.key} variant="outline" size="sm" onClick={() => convert(thought, t.key)}>
            <t.icon data-colour={t.colour} className="text-tc-text" /> {t.label}
          </Button>
        ))}
        menu={
          <MoreMenu>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Convert to</DropdownMenuLabel>
              {targets.map((t) => (
                <DropdownMenuItem key={t.key} onClick={() => convert(thought, t.key)}>
                  <t.icon /> {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => deleteItem(thought)}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </MoreMenu>
        }
      />
    </SwipeAction>
  )
}
