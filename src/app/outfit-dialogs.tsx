import { CalendarPlusIcon, PencilIcon, ShirtIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useId, useState } from 'react'
import {
  ChoiceChips,
  GarmentCard,
  GarmentLine,
  ItemDialog,
  OutfitPicture,
  RecipeGrid,
  Text,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePhotoUrls, type OutfitView, type WardrobeData, type WardrobeEntry } from '@/data'
import { matchesSearch } from '@/lib/wardrobe'
import { garmentFace } from './garment-face'
import { MoreMenu } from './more-menu'
import {
  builderGarments,
  changeOutfit,
  deleteOutfits,
  garmentCount,
  outfitName,
  planOutfits,
  saveOutfit,
  takeOutOfCollection,
} from './outfit-actions'
import { CollectionChips } from './outfit-builder-pane'
import { SearchField } from './search-field'

/**
 * An outfit's popup, read-only (WRD-017): its collections, its picture and
 * its garments (each opening its own popup); Edit; Add to Planned outfits;
 * "…" with Delete in My Outfits, or Remove from this collection in mine.
 */
export function OutfitDialog({
  outfit,
  wardrobe,
  collection,
  onOpenGarment,
  onEdit,
  onClose,
}: {
  outfit: OutfitView
  wardrobe: WardrobeData
  /** The collection it was opened from; none is My Outfits. */
  collection?: WardrobeEntry
  onOpenGarment: (id: string) => void
  onEdit: () => void
  onClose: () => void
}) {
  const photos = usePhotoUrls(
    outfit.garments.map((g) => g.photo?.path),
    'small',
  )
  const photoOf = (path?: string) => (path ? photos.get(path) : undefined)
  const names = wardrobe.lists.collection.filter((c) => outfit.collections.includes(c.id))
  return (
    <ItemDialog
      open
      onOpenChange={(o) => !o && onClose()}
      colour="orange"
      icon={ShirtIcon}
      typeLabel="Outfit"
      title={outfitName(outfit)}
      actions={
        <>
          <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={onEdit}>
            <PencilIcon />
          </Button>
          <MoreMenu>
            {collection ? (
              <DropdownMenuItem
                onClick={() => {
                  takeOutOfCollection([outfit], collection)
                  onClose()
                }}
              >
                <XIcon /> Remove from {collection.name}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  deleteOutfits([outfit])
                  onClose()
                }}
              >
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            )}
          </MoreMenu>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">My Outfits</Badge>
        {names.map((c) => (
          <Badge key={c.id} variant="secondary">
            {c.name}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-5 sm:flex-row">
        <OutfitPicture
          photos={outfit.garments.map((g) => photoOf(g.photo?.path))}
          className="w-full shrink-0 rounded-lg sm:w-56"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {outfit.garments.map((g) => (
            <GarmentLine
              key={g.item.id}
              garment={garmentFace(g, photoOf(g.photo?.path))}
              muted={g.retired}
              onOpen={() => onOpenGarment(g.item.id)}
            />
          ))}
        </div>
      </div>
      <Button
        variant="outline"
        className="self-start"
        disabled={outfit.planned}
        onClick={() => planOutfits([outfit])}
      >
        <CalendarPlusIcon /> {outfit.planned ? 'In Planned outfits' : 'Add to Planned outfits'}
      </Button>
    </ItemDialog>
  )
}

/**
 * New outfit, or an outfit edited (WRD-015, WRD-017 2): my garments as
 * small cards with a search and the Category pills, pressed in and out;
 * the collections (the one being viewed chosen) and an optional name.
 */
export function OutfitEditor({
  wardrobe,
  outfit,
  collection,
  onSaved,
  onClose,
  onOpenOutfit,
}: {
  wardrobe: WardrobeData
  /** Editing this one; else a new outfit. */
  outfit?: OutfitView
  /** The collection being viewed, chosen to start (WRD-015 1). */
  collection?: string
  onSaved: (id: string) => void
  onClose: () => void
  onOpenOutfit: (id: string) => void
}) {
  const ids = useId()
  const [garments, setGarments] = useState<string[]>(outfit?.garments.map((g) => g.item.id) ?? [])
  const [collections, setCollections] = useState<string[]>(
    outfit?.collections ?? (collection ? [collection] : []),
  )
  const [name, setName] = useState(outfit?.name ?? '')
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  // Owned garments, and any of this outfit's that are Retired, to take out.
  const offered = wardrobe.garments.filter(
    (g) =>
      (!g.retired || garments.includes(g.item.id)) &&
      (!categories.length || categories.includes(g.row.category_id)) &&
      matchesSearch(g, search),
  )
  const photos = usePhotoUrls(
    offered.map((g) => g.photo?.path),
    'small',
  )
  const used = new Set(wardrobe.garments.filter((g) => !g.retired).map((g) => g.row.category_id))
  const chosen = builderGarments(wardrobe, garments)
  const save = () => {
    if (!garments.length) return
    if (outfit) {
      if (changeOutfit(wardrobe, outfit, { garments, name, collections }, onOpenOutfit))
        onSaved(outfit.item.id)
      return
    }
    const id = saveOutfit(wardrobe, garments, { name, collections }, onOpenOutfit)
    if (id) onSaved(id)
  }
  return (
    <ItemDialog
      open
      onOpenChange={(o) => !o && onClose()}
      colour="orange"
      icon={ShirtIcon}
      typeLabel={outfit ? 'Edit outfit' : 'New outfit'}
      title={<span className="sr-only">{outfit ? 'Edit outfit' : 'New outfit'}</span>}
      wide
      keepOnOutsideClick
      footer={
        <>
          <Text
            as="span"
            size="sm"
            tone="muted"
            className="mr-auto self-center font-semibold tabular-nums"
          >
            {garmentCount(chosen.length)}
          </Text>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!chosen.length} onClick={save}>
            Save outfit
          </Button>
        </>
      }
    >
      <SearchField label="Search clothes" value={search} onChange={setSearch} />
      <ChoiceChips
        compact
        aria-label="Category"
        choices={wardrobe.lists.category
          .filter((c) => used.has(c.id))
          .map((c) => ({ id: c.id, name: c.name }))}
        chosen={new Set(categories)}
        onChange={setCategories}
      />
      <RecipeGrid size="S">
        {offered.map((g) => {
          const on = garments.includes(g.item.id)
          return (
            <GarmentCard
              key={g.item.id}
              garment={garmentFace(g, g.photo && photos.get(g.photo.path))}
              mode="build"
              chosen={on}
              onChoose={(next) =>
                setGarments((gs) =>
                  next ? [...new Set([...gs, g.item.id])] : gs.filter((x) => x !== g.item.id),
                )
              }
            />
          )
        })}
      </RecipeGrid>
      <div className="flex flex-col gap-2">
        <Label>Collections</Label>
        <CollectionChips wardrobe={wardrobe} chosen={collections} onChange={setCollections} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${ids}-name`}>Name</Label>
        <Input
          id={`${ids}-name`}
          placeholder="Optional"
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </ItemDialog>
  )
}
