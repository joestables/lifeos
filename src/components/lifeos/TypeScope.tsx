import type * as React from 'react'
import type { TypeColour } from './colours'

/**
 * Wraps a page about one family of Types, or part of one: sets --tc, and
 * makes the primary, focus, selected and pressed colours the Type's. Never
 * on Inbox, Plan, Search or Settings (patterns.md#colour-by-type).
 */
export function TypeScope({
  colour,
  ...props
}: React.ComponentProps<'div'> & { colour: Exclude<TypeColour, 'none'> }) {
  return <div data-colour={colour} {...props} />
}
