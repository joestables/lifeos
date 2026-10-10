import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import type { ModuleKey } from './modules'

/** Names the Module, or a Module-specific state ("Last cooked Mon"). */
export function ModuleBadge({
  module,
  ...props
}: React.ComponentProps<'span'> & { module: Exclude<ModuleKey, 'core'> }) {
  return <Badge data-module={module} variant="module" {...props} />
}
