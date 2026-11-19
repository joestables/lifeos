import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArchiveIcon, Trash2Icon } from 'lucide-react'
import { EmptyState, GarmentLine, PageHeader, TypeScope } from '@/components/lifeos'
import { garmentFace } from '@/app/garment-face'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { archiveItem, queue, restoreItem, retireGarment, usePhotoUrls, useWardrobe } from '@/data'

/**
 * My retired garments, the most recently retired first (WRD-013 3): one is
 * brought back as it was, or deleted, to Recently deleted.
 */
export const Route = createFileRoute('/_app/settings/retired-garments')({
  component: RetiredGarments,
})

function RetiredGarments() {
  const navigate = useNavigate()
  const wardrobe = useWardrobe(queue)
  const retired = wardrobe.garments
    .filter((g) => g.retired)
    .sort((a, b) => b.item.updated_at.localeCompare(a.item.updated_at))
  const photos = usePhotoUrls(
    retired.map((g) => g.photo?.path),
    'small',
  )
  return (
    <TypeScope colour="orange">
      <PageHeader
        title="Retired garments"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
      />
      <div className="max-w-3xl px-5 pb-8 sm:px-9">
        {!wardrobe.isLoading && retired.length === 0 && (
          <EmptyState icon={ArchiveIcon} title="Nothing retired" />
        )}
        <div className="flex flex-col gap-1">
          {retired.map((g) => {
            const name = g.item.title
            return (
              <GarmentLine
                key={g.item.id}
                garment={garmentFace(g, photos.get(g.photo?.path ?? ''))}
                end={
                  <span className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        retireGarment(g.item.id, false)
                        toast(`Brought back "${name}"`, {
                          action: { label: 'Undo', onClick: () => retireGarment(g.item.id) },
                        })
                      }}
                    >
                      Bring back
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${name}`}
                      onClick={() => {
                        archiveItem(g.item.id)
                        toast(`Deleted "${name}"`, {
                          action: { label: 'Undo', onClick: () => restoreItem(g.item.id) },
                        })
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                  </span>
                }
              />
            )
          })}
        </div>
      </div>
    </TypeScope>
  )
}
