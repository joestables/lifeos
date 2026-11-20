import { PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import {
  ChoiceChips,
  GarmentLine,
  RemoveButton,
  Tray,
  TrayPanel,
  WardrobePane,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { GarmentView, WardrobeData } from '@/data'
import { garmentFace } from './garment-face'
import { builderGarments, saveOutfit } from './outfit-actions'
import type { Builder } from './outfit-builder'

/** My Outfits: every outfit is in it, so it is always on and can't be taken off (WRD-018 1). */
const MY_OUTFITS = 'my-outfits'

/** Collections as ChoiceChips: My Outfits always on, then mine in my order. */
export function CollectionChips({
  wardrobe,
  chosen,
  onChange,
}: {
  wardrobe: WardrobeData
  chosen: readonly string[]
  onChange: (collections: string[]) => void
}) {
  return (
    <ChoiceChips
      compact
      aria-label="Collections"
      choices={[
        { id: MY_OUTFITS, name: 'My Outfits' },
        ...wardrobe.lists.collection.map((c) => ({ id: c.id, name: c.name })),
      ]}
      chosen={new Set([MY_OUTFITS, ...chosen])}
      onChange={(next) => onChange(next.filter((c) => c !== MY_OUTFITS))}
    />
  )
}

function Contents({
  wardrobe,
  builder,
  garments,
  photos,
  onChange,
  onTakeOut,
}: {
  wardrobe: WardrobeData
  builder: Builder
  garments: GarmentView[]
  photos: ReadonlyMap<string, string>
  onChange: (patch: Partial<Builder>) => void
  onTakeOut: (id: string) => void
}) {
  const ids = useId()
  const photoOf = (g: GarmentView) => (g.photo ? photos.get(g.photo.path) : undefined)
  return (
    <>
      {/* Its garments as lines only: a picture of them took the room (Joe, 20 November). */}
      <div className="flex flex-col gap-0.5">
        {garments.map((g) => (
          <GarmentLine
            key={g.item.id}
            garment={garmentFace(g, photoOf(g))}
            end={
              <RemoveButton label={`Take ${g.title} out`} onClick={() => onTakeOut(g.item.id)} />
            }
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Collections</Label>
        <CollectionChips
          wardrobe={wardrobe}
          chosen={builder.collections}
          onChange={(collections) => onChange({ collections })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-name`}>Name</Label>
        <Input
          id={`${ids}-name`}
          placeholder="Optional"
          value={builder.name}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <label className="flex items-center justify-between gap-3 text-sm font-semibold">
        Clear after saving
        <Switch
          checked={builder.clearAfter}
          onCheckedChange={(clearAfter) => onChange({ clearAfter })}
        />
      </label>
    </>
  )
}

/**
 * The Outfit builder (WRD-014 2–4): a pane on the right on a computer; a
 * tray along the foot on a phone, opening to the whole builder. Save outfit
 * makes it in My Outfits and the collections chosen, then empties or keeps
 * it as Clear after saving says.
 */
export function BuilderPane({
  wardrobe,
  builder,
  photos,
  onChange,
  onTakeOut,
  onClear,
  onOpenOutfit,
}: {
  wardrobe: WardrobeData
  builder: Builder
  photos: ReadonlyMap<string, string>
  onChange: (patch: Partial<Builder>) => void
  onTakeOut: (id: string) => void
  onClear: () => void
  onOpenOutfit: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const garments = builderGarments(wardrobe, builder.garments)
  const save = () => {
    if (!garments.length) return
    const id = saveOutfit(
      wardrobe,
      garments.map((g) => g.item.id),
      { name: builder.name, collections: builder.collections },
      onOpenOutfit,
    )
    if (id && builder.clearAfter) onClear()
    if (id) setOpen(false)
  }
  const contents = () => (
    <Contents
      wardrobe={wardrobe}
      builder={builder}
      garments={garments}
      photos={photos}
      onChange={onChange}
      onTakeOut={onTakeOut}
    />
  )
  const clear = (
    <Button variant="ghost" size="sm" disabled={!garments.length} onClick={onClear}>
      Clear
    </Button>
  )
  const saveButton = (
    <Button className="flex-1" disabled={!garments.length} onClick={save}>
      <PlusIcon /> Save outfit
    </Button>
  )
  return (
    <>
      <WardrobePane
        title="Outfit builder"
        count={garments.length}
        aside={clear}
        footer={saveButton}
        className="max-md:hidden"
      >
        {contents()}
      </WardrobePane>
      {open ? (
        <TrayPanel
          title="Outfit builder"
          count={garments.length}
          aside={clear}
          footer={saveButton}
          onClose={() => setOpen(false)}
        >
          {contents()}
        </TrayPanel>
      ) : (
        <Tray
          title="Outfit builder"
          photos={garments.map((g) => (g.photo ? photos.get(g.photo.path) : undefined))}
          count={garments.length}
          onOpen={() => setOpen(true)}
          action={
            <Button size="sm" disabled={!garments.length} onClick={save}>
              Save
            </Button>
          }
        />
      )}
    </>
  )
}
