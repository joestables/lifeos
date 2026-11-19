import { ArchiveIcon, CameraIcon, HeartIcon, PencilIcon, ShirtIcon, Trash2Icon } from 'lucide-react'
import { GarmentFact, GarmentPhoto, GarmentStat, ItemDialog, Swatch } from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Toggle } from '@/components/ui/toggle'
import { setMark, type GarmentView } from '@/data'
import { deleteGarments, retireGarments } from './garment-actions'
import { MoreMenu } from './more-menu'

const ADDED = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const ADDED_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "2 Oct", or with its year when not this one. */
function addedOn(at: string) {
  const d = new Date(at)
  return (d.getFullYear() === new Date().getFullYear() ? ADDED : ADDED_YEAR).format(d)
}

/**
 * A garment's popup, read-only (WRD-010 1): its photo large, its facts,
 * when it was added; the heart, Edit and "…" (Retire, Delete) in its
 * header. Just saved, "Added" with Done and Add another (WRD-009 1).
 */
export function GarmentDialog({
  garment,
  photo,
  added = false,
  outfits,
  onEdit,
  onAddAnother,
  onClose,
}: {
  garment: GarmentView
  photo?: string
  added?: boolean
  /** How many of my outfits it is in, said on Delete (WRD-010 3). */
  outfits: number
  onEdit: () => void
  onAddAnother: () => void
  onClose: () => void
}) {
  const g = garment
  return (
    <ItemDialog
      open
      onOpenChange={(o) => !o && onClose()}
      colour="orange"
      icon={ShirtIcon}
      typeLabel={added ? 'Garment · Added' : g.retired ? 'Garment · Retired' : 'Garment'}
      title={g.title}
      actions={
        <>
          <Toggle
            aria-label="Favourite"
            pressed={g.favourite}
            onPressedChange={(on) => setMark(g.item.id, on)}
          >
            <HeartIcon />
          </Toggle>
          <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={onEdit}>
            <PencilIcon />
          </Button>
          <MoreMenu>
            {!g.retired && (
              <DropdownMenuItem
                onClick={() => {
                  retireGarments([g])
                  onClose()
                }}
              >
                <ArchiveIcon /> Retire
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                deleteGarments([g], outfits)
                onClose()
              }}
            >
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </MoreMenu>
        </>
      }
      footer={
        added ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
            <Button onClick={onAddAnother}>
              <CameraIcon /> Add another
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <GarmentPhoto
          src={photo}
          retired={g.retired}
          className="w-full shrink-0 rounded-lg sm:w-52"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <GarmentFact label="Category">{g.category?.name}</GarmentFact>
          <GarmentFact label="Brand">{g.brand?.name}</GarmentFact>
          <GarmentFact label="Size">{g.size?.name}</GarmentFact>
          <GarmentFact label="Colour">
            {g.colour?.hex && <Swatch hex={g.colour.hex} />} {g.colour?.name}
          </GarmentFact>
          {g.fit && <GarmentFact label="Fit">{g.fit.name}</GarmentFact>}
          {g.tags.length > 0 && (
            <GarmentFact label="Tags">
              {g.tags.map((t) => (
                <Badge key={t.id} variant="secondary">
                  {t.name}
                </Badge>
              ))}
            </GarmentFact>
          )}
        </div>
      </div>
      {!added && (
        <div className="grid grid-cols-3 gap-2">
          <GarmentStat label="Added" value={addedOn(g.item.created_at)} />
        </div>
      )}
    </ItemDialog>
  )
}
