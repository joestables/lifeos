export type SortDirection = 'asc' | 'desc'

/**
 * A comparator written for a sort's `initial` way (newest first, A–Z), run
 * the way chosen: reversed when the two differ.
 */
export function directed<V>(
  compare: (a: V, b: V) => number,
  initial: SortDirection,
  direction: SortDirection,
): (a: V, b: V) => number {
  return initial === direction ? compare : (a, b) => compare(b, a)
}
