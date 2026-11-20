import {
  ArchiveIcon,
  CalendarIcon,
  CameraIcon,
  HeartIcon,
  PencilIcon,
  ShirtIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  GarmentFact,
  GarmentPhoto,
  GarmentStat,
  ItemDialog,
  OutfitPicture,
  SectionLabel,
  Swatch,
} from '@/components/lifeos'
import { outfitName } from './outfit-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Toggle } from '@/components/ui/toggle'
import { setMark, usePhotoUrls, type DayEntry, type GarmentView, type OutfitView } from '@/data'
import { dayLabel, removeEntry } from './day-actions'
import { MoveDialog } from './move-dialog'
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
  onOpenOutfit,
  onEdit,
  onAddAnother,
  onClose,
  entry,
}: {
  /** Opened from a day, as a single garment there (WRD-022 2–3): moved or taken off it. */
  entry?: DayEntry
  garment: GarmentView
  photo?: string
  added?: boolean
  /** My outfits it is in: shown, and counted on Delete (WRD-010 1, 3). */
  outfits: OutfitView[]
  onOpenOutfit: (id: string) => void
  onEdit: () => void
  onAddAnother: () => void
  onClose: () => void
}) {
  const g = garment
  const [moving, setMoving] = useState(false)
  const photos = usePhotoUrls(
    outfits.flatMap((o) => o.garments.map((x) => x.photo?.path)),
    'small',
  )
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
            {entry && !entry.outfit && (
              <>
                <DropdownMenuItem onClick={() => setMoving(true)}>
                  <CalendarIcon /> Move to another day
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    removeEntry(entry)
                    onClose()
                  }}
                >
                  <XIcon /> Remove from {dayLabel(entry.day)}
                </DropdownMenuItem>
              </>
            )}
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
                deleteGarments([g], outfits.length)
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
          <GarmentStat label="Worn" value={`${g.worn.times}×`} />
          <GarmentStat label="Last worn" value={g.worn.last ? dayLabel(g.worn.last) : 'Never'} />
          <GarmentStat label="Added" value={addedOn(g.item.created_at)} />
        </div>
      )}
      {!added && outfits.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionLabel count={outfits.length}>In outfits</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5">
            {outfits.map((o) => (
              <button
                key={o.item.id}
                type="button"
                className="flex min-w-0 flex-col gap-1.5 text-left"
                onClick={() => onOpenOutfit(o.item.id)}
              >
                <OutfitPicture
                  photos={o.garments.map((x) => (x.photo ? photos.get(x.photo.path) : undefined))}
                  className="rounded-row shadow-card"
                />
                <span className="truncate text-xs font-semibold">{outfitName(o)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {moving && entry && (
        <MoveDialog
          entry={entry}
          onClose={() => {
            setMoving(false)
            onClose()
          }}
        />
      )}
    </ItemDialog>
  )
}
