import { createFileRoute } from '@tanstack/react-router'
import { InboxIcon, Trash2Icon } from 'lucide-react'
import {
  EmptyState,
  Fab,
  ItemRow,
  PageHeader,
  SectionLabel,
  SwipeAction,
  TypeTile,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useConvert } from '@/app/convert'
import { deleteItem, useOpenItem } from '@/app/item-navigation'
import { MoreMenu } from '@/app/more-menu'
import { useOpenCapture } from '@/app/open-capture'
import { useTaskFacts } from '@/app/task-facts'
import { TaskRow } from '@/app/task-row'
import { queue, useItems, useReminders, type Item } from '@/data'
import { capturedWhen, reminderWhen } from '@/lib/dates'
import { inboxGroups } from '@/lib/inbox'
import { convertTargets, itemTitle, typeLook } from '@/lib/item-types'

/** One feed of what needs me (views/inbox.md): Overdue, Today, To sort. */
export const Route = createFileRoute('/_app/inbox')({
  component: Inbox,
})

const TASK = typeLook('task')
const THOUGHT = typeLook('thought')

function Inbox() {
  const openCapture = useOpenCapture()
  const { items, isLoading } = useItems(queue)
  const now = new Date()
  const { overdue, today, toSort } = inboxGroups(items, now)
  const empty = overdue.length + today.length + toSort.length === 0
  const facts = useTaskFacts()
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
        {!isLoading && empty && <EmptyState icon={InboxIcon} title="Nothing needs you" />}
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
        {toSort.length > 0 && (
          <section>
            <SectionLabel count={toSort.length}>To sort</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {toSort.map((t) => (
                <ThoughtRow key={t.id} thought={t} now={now} reminder={nextReminder(t.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
      <Fab label="Capture" onClick={() => openCapture()} />
    </>
  )
}

/** A Thought to sort: into a Task or a Note in one action, or delete it (INB-002). */
function ThoughtRow({
  thought,
  now,
  reminder,
}: {
  thought: Item
  now: Date
  /** When its next Reminder fires. */
  reminder?: string
}) {
  const open = useOpenItem()
  const convert = useConvert()
  // Task first: the one a swipe does.
  const targets = convertTargets('thought').slice().reverse()
  const meta = [capturedWhen(thought.created_at, now)]
  if (reminder) meta.push(reminderWhen(reminder, now))

  return (
    <SwipeAction
      label={TASK.label}
      icon={TASK.icon}
      colour={TASK.colour}
      onAction={() => convert(thought, 'task')}
    >
      <ItemRow
        leading={<TypeTile colour={THOUGHT.colour} icon={THOUGHT.icon} size="sm" />}
        title={itemTitle(thought)}
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
