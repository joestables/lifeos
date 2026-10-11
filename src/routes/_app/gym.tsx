import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, TypeScope } from '@/components/lifeos'

/** Built in its own stage, from its spec (ADR-0026). */
export const Route = createFileRoute('/_app/gym')({
  component: () => (
    <TypeScope colour="coral">
      <PageHeader title="Gym" />
    </TypeScope>
  ),
})
