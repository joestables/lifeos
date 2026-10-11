import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ArrowRightIcon, EllipsisIcon, InboxIcon, StarIcon, Trash2Icon } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { useConvert } from '@/app/convert'
import { deleteItem, useOpenItem } from '@/app/item-navigation'
import { useOpenCapture } from '@/app/open-capture'
import { queue, updateItem, useItems, useLabels, useMarks, useReminders, type Item } from '@/data'
import { capturedWhen, dueWhen, isoDayOf, reminderWhen, sinceWhen } from '@/lib/dates'
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
  const marks = useMarks(queue)
  const { labels, itemLabels } = useLabels(queue)
  const reminders = useReminders(queue)
  const labelNames = (itemId: string) =>
    itemLabels
      .filter((r) => r.item_id === itemId)
      .map((r) => labels.find((l) => l.id === r.label_id)?.name)
      .filter((n): n is string => !!n)
      .sort()
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
                <TaskRow
                  key={t.id}
                  task={t}
                  now={now}
                  late
                  labels={labelNames(t.id)}
                  starred={marks.has(t.id)}
                />
              ))}
            </div>
          </section>
        )}
        {today.length > 0 && (
          <section>
            <SectionLabel count={today.length}>Today</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {today.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  now={now}
                  labels={labelNames(t.id)}
                  starred={marks.has(t.id)}
                />
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
      <Fab label="Capture" onClick={openCapture} />
    </>
  )
}

function MoreMenu({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More" />}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

/** An open Task: tick it done, or move it to tomorrow (INB-003, INB-004). */
function TaskRow({
  task,
  now,
  late = false,
  labels,
  starred,
}: {
  task: Item
  now: Date
  late?: boolean
  /** Its Labels' names, A to Z. */
  labels: string[]
  starred: boolean
}) {
  const open = useOpenItem()
  const title = itemTitle(task)
  const today = isoDayOf(now)

  const done = () => {
    updateItem(task.id, { status: 'done' })
    toast(`Done "${title}"`, {
      action: { label: 'Undo', onClick: () => updateItem(task.id, { status: 'active' }) },
    })
  }
  const toTomorrow = () => {
    const tomorrow = isoDayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
    const was = task.do_on
    updateItem(task.id, { do_on: tomorrow })
    toast(`Moved "${title}" to tomorrow`, {
      action: { label: 'Undo', onClick: () => updateItem(task.id, { do_on: was }) },
    })
  }

  const meta = []
  if (late && task.due_on)
    meta.push(<span className="text-destructive">{dueWhen(task.due_on, now)}</span>)
  if (!late) {
    if (task.do_at) meta.push(task.do_at.slice(0, 5))
    if (task.do_on && task.do_on < today) meta.push(sinceWhen(task.do_on, now))
    if (task.due_on) meta.push(dueWhen(task.due_on, now))
  }
  meta.push(...labels)

  return (
    <ItemRow
      leading={
        <Checkbox
          colour={TASK.colour}
          aria-label={`Done: ${title}`}
          checked={false}
          onCheckedChange={(on) => on && done()}
        />
      }
      title={title}
      meta={meta}
      sync={task.sync}
      onOpen={() => open(task)}
      actions={
        !late && (
          <Button variant="ghost" size="sm" onClick={toTomorrow}>
            Tomorrow
          </Button>
        )
      }
      menu={
        <MoreMenu>
          {!late && (
            <DropdownMenuItem onClick={toTomorrow}>
              <ArrowRightIcon /> Tomorrow
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => deleteItem(task)}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </MoreMenu>
      }
      trailing={
        starred && (
          <StarIcon
            data-colour={TASK.colour}
            aria-label="Starred"
            className="size-4 fill-tc text-tc"
          />
        )
      }
    />
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
