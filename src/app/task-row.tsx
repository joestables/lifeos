import { ArrowRightIcon, ArchiveIcon, RepeatIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { ItemRow } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { Toggle } from '@/components/ui/toggle'
import { setMark, updateItem, type Item } from '@/data'
import { dateName, dueWhen, isoDayOf, sinceWhen } from '@/lib/dates'
import { convertTargets, itemTitle } from '@/lib/item-types'
import { useConvert } from './convert'
import { deleteItem, useOpenItem } from './item-navigation'
import { useTickDone } from './repeat'
import { toSomeday } from './task-actions'
import { MoreMenu } from './more-menu'

const tomorrowOf = (now: Date) =>
  isoDayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))

/**
 * A Task in a list (patterns.md#tasks): tick it done, open it, move it to
 * tomorrow or Someday, star it, convert it (RMD-006) or delete it. Its meta: time, the day when the group
 * doesn't say it, the due date (red once passed), its repeat, Labels,
 * sub-tasks "2/5".
 */
export function TaskRow({
  task,
  now,
  labels = [],
  starred = false,
  subtasks,
  repeat,
  household,
  showDay = false,
}: {
  task: Item
  now: Date
  /** Its Labels' names, A to Z. */
  labels?: string[]
  starred?: boolean
  subtasks?: { done: number; total: number }
  /** How it repeats, in a word or two ("Weekly"), while it does. */
  repeat?: string
  /** Its Household's name, when it is shared (HSH-005 2). */
  household?: string
  /** Say its day ("Tomorrow", "Mon 19 Oct"): in Later, By label. */
  showDay?: boolean
}) {
  const open = useOpenItem()
  const tickDone = useTickDone()
  const convert = useConvert()
  const title = itemTitle(task)
  const today = isoDayOf(now)
  const isDone = task.status === 'done'
  const late = !isDone && task.due_on !== null && task.due_on < today

  const toTomorrow = () => {
    const was = { do_on: task.do_on, status: task.status }
    updateItem(task.id, { do_on: tomorrowOf(now), status: 'active' })
    toast(`Moved "${title}" to tomorrow`, {
      action: { label: 'Undo', onClick: () => updateItem(task.id, was) },
    })
  }

  const meta = []
  if (late) meta.push(<span className="text-destructive">{dueWhen(task.due_on!, now)}</span>)
  if (task.do_on) {
    if (task.do_on < today && !isDone) meta.push(sinceWhen(task.do_on, now))
    else if (showDay) meta.push(dateName(task.do_on, now))
  }
  if (task.do_at) meta.push(task.do_at.slice(0, 5))
  if (!late && task.due_on) meta.push(dueWhen(task.due_on, now))
  if (repeat)
    meta.push(
      <span className="inline-flex items-center gap-1">
        <RepeatIcon className="size-3.5" aria-label="Repeats" />
        {repeat}
      </span>,
    )
  meta.push(...labels)
  if (subtasks && subtasks.total > 0)
    meta.push(
      <span className="tabular-nums">
        {subtasks.done}/{subtasks.total}
      </span>,
    )
  if (household) meta.push(household)

  const canMove = !isDone && !late && task.do_on !== tomorrowOf(now)
  const star = (
    <Toggle
      data-colour="blue"
      aria-label="Star"
      pressed={starred}
      onPressedChange={(on) => setMark(task.id, on)}
    >
      <StarIcon />
    </Toggle>
  )

  return (
    <ItemRow
      leading={
        <Checkbox
          colour="blue"
          aria-label={`Done: ${title}`}
          checked={isDone}
          onCheckedChange={(on) =>
            on ? tickDone(task) : updateItem(task.id, { status: 'active' })
          }
        />
      }
      title={title}
      meta={meta}
      done={isDone}
      sync={task.sync}
      onOpen={() => open(task)}
      actions={
        <>
          {canMove && (
            <Button variant="ghost" size="sm" onClick={toTomorrow}>
              Tomorrow
            </Button>
          )}
          {!starred && star}
        </>
      }
      menu={
        <MoreMenu>
          {canMove && (
            <DropdownMenuItem onClick={toTomorrow}>
              <ArrowRightIcon /> Tomorrow
            </DropdownMenuItem>
          )}
          {!isDone && task.status !== 'idea' && (
            <DropdownMenuItem onClick={() => toSomeday(task)}>
              <ArchiveIcon /> Someday
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Convert to</DropdownMenuLabel>
            {convertTargets('task').map((t) => (
              <DropdownMenuItem key={t.key} onClick={() => convert(task, t.key)}>
                <t.icon /> {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => deleteItem(task)}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </MoreMenu>
      }
      trailing={starred && star}
    />
  )
}
