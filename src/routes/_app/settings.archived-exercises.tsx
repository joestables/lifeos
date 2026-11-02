import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArchiveIcon, DumbbellIcon } from 'lucide-react'
import { EmptyState, ItemRow, PageHeader, TypeScope, TypeTile } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { archiveExercise, queue, useGym } from '@/data'
import { whenAgo } from '@/lib/dates'

/**
 * Settings → Gym → Archived exercises (GYM-005): the most recently archived
 * first; one is brought back to the library as it was.
 */
export const Route = createFileRoute('/_app/settings/archived-exercises')({
  component: ArchivedExercises,
})

function ArchivedExercises() {
  const navigate = useNavigate()
  const gym = useGym(queue)
  const archived = gym.exercises
    .filter((x) => x.archived)
    .sort((a, b) => b.item.updated_at.localeCompare(a.item.updated_at))
  return (
    <TypeScope colour="coral">
      <PageHeader
        title="Archived exercises"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="max-w-3xl px-5 pb-8 sm:px-9">
        {!gym.isLoading && archived.length === 0 && (
          <EmptyState icon={ArchiveIcon} title="Nothing archived" />
        )}
        <div className="flex flex-col gap-1.5">
          {archived.map((x) => (
            <ItemRow
              key={x.item.id}
              leading={<TypeTile colour="coral" icon={DumbbellIcon} size="sm" />}
              title={x.item.title}
              meta={[`Archived ${whenAgo(x.item.updated_at)}`]}
              sync={x.item.sync}
              trailing={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    archiveExercise(x.item.id, false)
                    toast(`Brought back "${x.item.title}"`, {
                      action: { label: 'Undo', onClick: () => archiveExercise(x.item.id) },
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
    </TypeScope>
  )
}
