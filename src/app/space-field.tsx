import { queue, useFoodSpaces, type Item } from '@/data'
import { SpaceSelect } from './space-select'
import { Field } from './task-details'

/**
 * Where a Task or an Event is (HSH-005 1): Personal or one of my
 * Households, last in its popup. Only with a Household, and only on one I
 * made: only its maker moves it (HSH-003 3).
 */
export function SpaceField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (space: string) => void
}) {
  const spaces = useFoodSpaces(queue)
  if (spaces.spaces.length < 2 || !spaces.personal) return null
  return (
    <Field label="Space">
      <SpaceSelect
        label="Space"
        spaces={spaces.spaces}
        value={value ?? spaces.personal}
        onChange={onChange}
      />
    </Field>
  )
}

/** An Item's Space, changed by its maker; nothing for anyone else's. */
export function ItemSpaceField({
  item,
  onChange,
}: {
  item: Item
  onChange: (space: string) => void
}) {
  const { me } = useFoodSpaces(queue)
  if (item.owner_id && me && item.owner_id !== me) return null
  return <SpaceField value={item.space_id} onChange={onChange} />
}
