import { Trash2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ItemRow, TypeTile } from '@/components/lifeos'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Item } from '@/data'
import { convertTargets, itemTitle, typeLook } from '@/lib/item-types'
import type { AlertTime } from '@/lib/plan'
import { useConvert } from './convert'
import { alertBits, repeatBit } from './item-meta'
import { deleteItem, useOpenItem } from './item-navigation'
import { MoreMenu } from './more-menu'

const REMINDER = typeLook('reminder')

/**
 * A Reminder in a list (TDY-004, PLA-004): its tile, its title, that day's
 * Alert times, its repeat; opened by tapping, converted or deleted from
 * its "…" menu (RMD-006). Faded once that day's Alerts have all gone off.
 */
export function ReminderRow({
  item,
  alerts,
  repeat,
  meta = [],
  past = false,
}: {
  item: Item
  alerts: readonly AlertTime[]
  /** How it repeats, in a word or two, while it does. */
  repeat?: string
  /** More to say after them: its date in Later, "Next Sun 15 Nov". */
  meta?: ReactNode[]
  past?: boolean
}) {
  const open = useOpenItem()
  return (
    <ItemRow
      leading={<TypeTile colour={REMINDER.colour} icon={REMINDER.icon} />}
      title={itemTitle(item)}
      meta={[...alertBits(alerts), ...(repeat ? [repeatBit(repeat)] : []), ...meta]}
      past={past}
      sync={item.sync}
      onOpen={() => open(item)}
      menu={<ConvertMenu item={item} />}
    />
  )
}

/** "Convert to" the Types an Item converts into in place, then Delete (TDY-004 3). */
export function ConvertMenu({ item }: { item: Item }) {
  const convert = useConvert()
  const targets = convertTargets(item.type)
  return (
    <MoreMenu>
      {targets.length > 0 && (
        <>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Convert to</DropdownMenuLabel>
            {targets.map((t) => (
              <DropdownMenuItem key={t.key} onClick={() => convert(item, t.key)}>
                <t.icon /> {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem variant="destructive" onClick={() => deleteItem(item)}>
        <Trash2Icon /> Delete
      </DropdownMenuItem>
    </MoreMenu>
  )
}
