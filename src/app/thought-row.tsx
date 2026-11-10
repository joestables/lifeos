import { Trash2Icon } from 'lucide-react'
import { ItemRow, SwipeAction } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Item } from '@/data'
import { capturedWhen } from '@/lib/dates'
import { convertTargets, itemTitle, typeLook } from '@/lib/item-types'
import { useConvert } from './convert'
import { deleteItem, useOpenItem } from './item-navigation'
import { MoreMenu } from './more-menu'
import { tickThought } from './thought-actions'
import { useCanShop, useToShop } from './to-shop'

const TASK = typeLook('task')
const THOUGHT = typeLook('thought')
/** Reminder, Task and Note a tap each; the rest after them in the menu (NTE-005 3). */
const FIRST = ['reminder', 'task', 'event', 'note']
const QUICK = ['reminder', 'task', 'note']
const rank = (key: string) => (FIRST.includes(key) ? FIRST.indexOf(key) : FIRST.length)

/**
 * A Thought on Notes' Thoughts (NTE-005): ticked off when it no longer
 * matters (INB-006), converted into a Reminder, a Task or a Note in one
 * action and into any other Capturable Type from its menu (INB-002), or
 * deleted. Swiped, it becomes a Task.
 */
export function ThoughtRow({
  thought,
  now,
  labels,
}: {
  thought: Item
  now: Date
  /** Its Labels' names, A to Z. */
  labels: string[]
}) {
  const open = useOpenItem()
  const doConvert = useConvert()
  const toShop = useToShop()
  const canShop = useCanShop(thought)
  const convert = (item: Item, type: string) =>
    type === 'shopping_list' ? toShop.start(item) : doConvert(item, type)
  // Shopping list only when it names a Pantry ingredient (SHP-003 5).
  const targets = convertTargets('thought')
    .filter((t) => t.key !== 'shopping_list' || canShop)
    .sort((a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label))
  const quick = targets.filter((t) => QUICK.includes(t.key))
  const title = itemTitle(thought)

  return (
    <>
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
          meta={[capturedWhen(thought.created_at, now), ...labels]}
          sync={thought.sync}
          onOpen={() => open(thought)}
          actions={quick.map((t) => (
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
      {toShop.dialog}
    </>
  )
}
