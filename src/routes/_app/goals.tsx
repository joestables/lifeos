import { createFileRoute } from '@tanstack/react-router'
import { ModuleScope, PageHeader } from '@/components/lifeos'

/** Built in its own stage, from its spec (ADR-0026). */
export const Route = createFileRoute('/_app/goals')({
  component: () => (
    <ModuleScope module="goals">
      <PageHeader kicker="Goals" title="Goals" />
    </ModuleScope>
  ),
})
