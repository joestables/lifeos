import type { ReactNode } from 'react'
import { ItemRow, TypeTile } from '@/components/lifeos'
import { queue, useSettings } from '@/data'
import { itemTitle, typeLook } from '@/lib/item-types'
import { cardLine, type Placed } from '@/lib/plan'
import { repeatBit } from './item-meta'
import { useOpenItem } from './item-navigation'

/**
 * An Item that isn't a Task or a Reminder in a list of a day (TDY-004 2,
 * PLA-003): its Type's tile, its title, its time and one detail as Week's
 * card says them ("13:30–14:00 · Smile Clinic", "Dinner"), else its Type;
 * tapping it opens it.
 */
export function PlacedRow({
  placed,
  day,
  past = false,
  repeat,
  before = [],
  meta: given,
}: {
  placed: Placed
  /** The day it is listed on. */
  day: string
  past?: boolean
  repeat?: string
  /** Said first: its date in Later. */
  before?: ReactNode[]
  /** In place of its time and detail: its repeat and next date, on Recurring. */
  meta?: ReactNode[]
}) {
  const settings = useSettings(queue)
  const open = useOpenItem()
  const { item } = placed
  const look = typeLook(item.type)
  const line = cardLine(placed, day, settings.timezone, { long: true })
  const meta = given ?? ([...before, line.time, line.detail].filter(Boolean) as ReactNode[])
  if (repeat) meta.push(repeatBit(repeat))
  return (
    <ItemRow
      leading={<TypeTile colour={look.colour} icon={look.icon} />}
      title={itemTitle(item)}
      meta={meta.length > 0 ? meta : [look.label]}
      past={past}
      done={item.status === 'done'}
      sync={item.sync}
      onOpen={() => open(item)}
    />
  )
}
