/**
 * Whether an Item shows on a page narrowed to some Labels (NTE-002,
 * TSK-004, INB-007): with none chosen, everything; otherwise what has any
 * of them.
 */
export function labelMatcher(
  chosen: ReadonlySet<string>,
  itemLabels: readonly { item_id: string; label_id: string }[],
): (itemId: string) => boolean {
  if (chosen.size === 0) return () => true
  const shown = new Set(itemLabels.filter((r) => chosen.has(r.label_id)).map((r) => r.item_id))
  return (itemId) => shown.has(itemId)
}
