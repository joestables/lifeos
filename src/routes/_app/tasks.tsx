import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/lifeos'

/** Built in its own stage, from its spec (ADR-0026). */
export const Route = createFileRoute('/_app/tasks')({
  component: () => <PageHeader title="Tasks" />,
})
