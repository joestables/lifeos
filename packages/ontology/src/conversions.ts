import { hasTrait, TYPES, type TypeDefinition } from './types.ts'

/** What a Note, with its text, doesn't become: a title only, or lines (RMD-006, ADR-0069). */
const NOT_FROM_NOTE: readonly string[] = ['reminder', 'list']

/** Pairs of closely related Types whose fields map cleanly (ADR-0018). */
const RELATED: readonly (readonly [string, string])[] = [
  ['task', 'event'],
  ['reminder', 'task'],
  ['reminder', 'event'],
]

/**
 * The Types an Item of this Type can be converted into in place, keeping its
 * id, links and history (ADR-0018, ADR-0037):
 * a Thought into any Capturable Type; a Note into any other Capturable Type
 * but a Reminder, which is a title only (RMD-006), and a List, whose lines
 * aren't a Note's text (ADR-0069); Task, Event and Reminder into each
 * other. Anything else is "create from" + became.
 */
export function convertsTo(from: TypeDefinition): string[] {
  const capturable = TYPES.filter((t) => hasTrait(t, 'capturable')).map((t) => t.key as string)
  const targets = new Set<string>()
  if (from.key === 'thought' || from.key === 'note') {
    for (const key of capturable)
      if (key !== from.key && !(from.key === 'note' && NOT_FROM_NOTE.includes(key)))
        targets.add(key)
  }
  for (const [a, b] of RELATED) {
    if (from.key === a) targets.add(b)
    if (from.key === b) targets.add(a)
  }
  return [...targets].sort()
}
