import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import type { TypeColour } from './colours'

/** A Type-specific state ("Last cooked Mon"), in the Type's colour on its tint. */
export function TypeBadge({
  colour,
  ...props
}: React.ComponentProps<'span'> & { colour: Exclude<TypeColour, 'none'> }) {
  return <Badge data-colour={colour} variant="type" {...props} />
}
