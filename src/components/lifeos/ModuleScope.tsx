import type * as React from 'react'
import type { ModuleKey } from './modules'

/**
 * Wraps a Module's page, or part of one: sets --mc, and makes the primary,
 * focus, selected and pressed colours the Module's. Module pages only.
 */
export function ModuleScope({
  module,
  ...props
}: React.ComponentProps<'div'> & { module: Exclude<ModuleKey, 'core'> }) {
  return <div data-module={module} {...props} />
}
