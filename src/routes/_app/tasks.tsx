import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, TypeScope } from '@/components/lifeos'

/** Built in its own stage, from its spec (ADR-0026). */
export const Route = createFileRoute('/_app/tasks')({
  component: () => (
    <TypeScope colour="blue">
      <PageHeader title="Tasks" />
    </TypeScope>
  ),
})
