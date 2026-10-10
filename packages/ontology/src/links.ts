import type { TypeKey } from './types.ts'

export interface LinkTypeDefinition {
  /** Stored in core.links.link_type. */
  key: string
  /** Read from the "from" Item: a Task is *for* an Event. */
  label: string
  /** Read from the "to" Item: an Event has Tasks *to do for* it. */
  inverseLabel: string
  /** The Types each end may be; 'any' allows every Type. */
  from: readonly TypeKey[] | 'any'
  to: readonly TypeKey[] | 'any'
  /** The same both ways round (relates to). */
  symmetric: boolean
}

/**
 * Link types between the Types that exist so far (data-model.md#link-types).
 * The rest arrive with the Types they connect.
 */
export const LINK_TYPES = [
  {
    key: 'for',
    label: 'for',
    inverseLabel: 'to do for',
    from: ['task'],
    to: ['event'],
    symmetric: false,
  },
  {
    key: 'became',
    label: 'became',
    inverseLabel: 'came from',
    from: 'any',
    to: 'any',
    symmetric: false,
  },
  {
    key: 'relates_to',
    label: 'relates to',
    inverseLabel: 'relates to',
    from: 'any',
    to: 'any',
    symmetric: true,
  },
] as const satisfies readonly LinkTypeDefinition[]

export type LinkTypeKey = (typeof LINK_TYPES)[number]['key']
