import { hasTrait, TYPES, type TypeDefinition } from './types.ts'

/** Pairs of closely related Types whose fields map cleanly (ADR-0018). */
const RELATED: readonly (readonly [string, string])[] = [['task', 'event']]

/**
 * The Types an Item of this Type can be converted into in place, keeping its
 * id, links and history (ADR-0018, ADR-0037):
 * a Thought into any Capturable Type; a Note into any other Capturable Type;
 * Task and Event into each other. Anything else is "create from" + became.
 */
export function convertsTo(from: TypeDefinition): string[] {
  const capturable = TYPES.filter((t) => hasTrait(t, 'capturable')).map((t) => t.key as string)
  const targets = new Set<string>()
  if (from.key === 'thought' || from.key === 'note') {
    for (const key of capturable) if (key !== from.key) targets.add(key)
  }
  for (const [a, b] of RELATED) {
    if (from.key === a) targets.add(b)
    if (from.key === b) targets.add(a)
  }
  return [...targets].sort()
}
