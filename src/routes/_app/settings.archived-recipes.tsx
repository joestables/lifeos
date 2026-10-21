import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArchiveIcon, ChefHatIcon } from 'lucide-react'
import { EmptyState, ItemRow, PageHeader, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { queue, updateItem, useFood } from '@/data'
import { whenAgo } from '@/lib/dates'

/**
 * My archived Recipes, the most recently changed first (RCP-010 5): one is
 * brought back as it was, its Variations' states restored by the server.
 */
export const Route = createFileRoute('/_app/settings/archived-recipes')({
  component: ArchivedRecipes,
})

function ArchivedRecipes() {
  const navigate = useNavigate()
  const food = useFood(queue)
  const archived = food.recipes
    .filter((r) => r.mine && r.state === 'cancelled')
    .sort((a, b) => b.item.updated_at.localeCompare(a.item.updated_at))
  return (
    <>
      <PageHeader
        title="Archived recipes"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="max-w-3xl px-5 pb-8 sm:px-9">
        {!food.isLoading && archived.length === 0 && (
          <EmptyState icon={ArchiveIcon} title="Nothing archived" />
        )}
        <div className="flex flex-col gap-1.5">
          {archived.map((r) => (
            <ItemRow
              key={r.item.id}
              leading={<TypeTile colour="green" icon={ChefHatIcon} size="sm" />}
              title={r.item.title}
              meta={[`Archived ${whenAgo(r.item.updated_at)}`]}
              sync={r.item.sync}
              trailing={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Its state comes back from its Variations' (ADR-0011).
                    updateItem(r.item.id, { status: 'active' })
                    toast(`Brought back "${r.item.title}"`, {
                      action: {
                        label: 'Undo',
                        onClick: () => updateItem(r.item.id, { status: 'cancelled' }),
                      },
                    })
                  }}
                >
                  Bring back
                </Button>
              }
            />
          ))}
        </div>
      </div>
    </>
  )
}
