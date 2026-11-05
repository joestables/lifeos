import { queue, useFoodSpaces, type Item } from '@/data'

/**
 * Whether an Item is in one of my Spaces (HSH-005 7, ADR-0016): someone
 * else's Personal Item I see only through a link isn't mine, and stays out
 * of my Inbox and Tasks. Until my Spaces are known, and for one made on this
 * device not yet sent, everything counts.
 */
export function useMine(): (item: Item) => boolean {
  const { spaces, personal } = useFoodSpaces(queue)
  if (!personal) return () => true
  const ids = new Set(spaces.map((s) => s.id))
  return (item: Item) => !item.space_id || ids.has(item.space_id)
}
