import { createFileRoute, Navigate } from '@tanstack/react-router'
import { PageHeader, TypeScope } from '@/components/lifeos'
import { CheckImport } from '@/app/check-import'
import { usePendingImport } from '@/app/import-store'
import { queue, useFood } from '@/data'

/** Check the import (RCP-014 1): the recipe the AI wrote, to change and keep. */
export const Route = createFileRoute('/_app/recipes/import')({
  component: CheckImportRoute,
})

function CheckImportRoute() {
  const pending = usePendingImport()
  const food = useFood(queue)
  // Nothing to check (the page reloaded, or it was kept): back to Recipes.
  if (!pending) return <Navigate to="/recipes" replace />
  if (food.isLoading) return null
  return (
    <TypeScope colour="green">
      <PageHeader title="Check the import" />
      <CheckImport pending={pending} food={food} />
    </TypeScope>
  )
}
