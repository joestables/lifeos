import {
  CalendarPlusIcon,
  FolderPlusIcon,
  ListChecksIcon,
  ShirtIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useState, type HTMLAttributes } from 'react'
import {
  ChoiceChips,
  EmptyState,
  GarmentLine,
  OutfitCard,
  PlannedOutfitLine,
  RecipeGrid,
  SelectionBar,
  SortMenu,
  Text,
  Tray,
  TrayPanel,
  WardrobePane,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import {
  addPlanned,
  addToCollections,
  clearPlanned,
  removePlanned,
  usePhotoUrls,
  type GarmentView,
  type OutfitView,
  type WardrobeData,
} from '@/data'
import { useLongPress } from '@/hooks/use-long-press'
import { directed } from '@/lib/sort'
import { matchesSearch, wornSorts } from '@/lib/wardrobe'
import { deleteOutfits, garmentCount, planOutfits, takeOutOfCollection } from './outfit-actions'
import { SearchField } from './search-field'
import { garmentFace } from './garment-face'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MY_OUTFITS, type OutfitSort, OUTFIT_SORTS, type useOutfitsView } from './outfits-view'

const byAdded = (a: OutfitView, b: OutfitView) => b.item.created_at.localeCompare(a.item.created_at)
const outfitSorts: Record<OutfitSort, (a: OutfitView, b: OutfitView) => number> = {
  added: byAdded,
  ...wornSorts(byAdded),
}

/** An outfit matches when each word is in its name or matches one of its garments (WRD-016 3). */
function outfitMatches(o: OutfitView, search: string) {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return words.every(
    (w) => o.name.toLowerCase().includes(w) || o.garments.some((g) => matchesSearch(g, w)),
  )
}

/** An outfit's card: drawn again only when what it shows changes. */
function OutfitTile({
  outfit,
  photos,
  selecting,
  selected,
  onOpen,
  onSelect,
  onStart,
}: {
  outfit: OutfitView
  photos: ReadonlyMap<string, string>
  selecting: boolean
  selected: boolean
  onOpen: () => void
  onSelect: (on: boolean) => void
  onStart?: () => void
}) {
  const longPress = useLongPress(onStart)
  return (
    <div {...longPress}>
      <OutfitCard
        photos={outfit.garments.map((g) => (g.photo ? photos.get(g.photo.path) : undefined))}
        name={outfit.name.trim() || undefined}
        meta={garmentCount(outfit.garments.length)}
        selecting={selecting}
        selected={selected}
        onOpen={onOpen}
        onSelect={onSelect}
      />
    </div>
  )
}

/** Outfits into more of my collections (WRD-019 2–3). */
function CollectDialog({
  outfits,
  wardrobe,
  onDone,
}: {
  outfits: readonly OutfitView[]
  wardrobe: WardrobeData
  onDone: () => void
}) {
  const [chosen, setChosen] = useState<string[]>([])
  const n = outfits.length === 1 ? '1 outfit' : `${outfits.length} outfits`
  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent data-colour="orange">
        <DialogHeader>
          <DialogTitle>Add {n} to a collection</DialogTitle>
        </DialogHeader>
        {wardrobe.lists.collection.length ? (
          <ChoiceChips
            aria-label="Collections"
            choices={wardrobe.lists.collection.map((c) => ({ id: c.id, name: c.name }))}
            chosen={new Set(chosen)}
            onChange={setChosen}
          />
        ) : (
          <Text as="p" size="sm" tone="muted">
            No collections yet: they're made in Settings → Wardrobe
          </Text>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            disabled={!chosen.length}
            onClick={() => {
              const ids = outfits.map((o) => o.item.id)
              addToCollections(ids, chosen)
              onDone()
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The Planned outfits pane (WRD-021 1–2): the outfits waiting to go onto
 * days, newest last, each removable, with Clear; on a phone a tray.
 */
/** What's chosen in the pane to go on a day: an outfit, or a single garment. */
export interface Pick {
  kind: 'outfit' | 'garment'
  id: string
}

export function PlannedPane({
  wardrobe,
  onOpen,
  week,
}: {
  wardrobe: WardrobeData
  onOpen: (id: string) => void
  /**
   * On the Week tab (WRD-021 3–5): each line dragged onto a day (on a
   * phone, held first, the tray stepping aside), or on a phone tapped and
   * then a day; on a computer the Garments search too.
   */
  week?: {
    drag: (key: string) => HTMLAttributes<HTMLDivElement>
    picked?: Pick
    onPick: (pick: Pick) => void
    /** A line is being dragged: the tray steps aside, and closes once it's let go. */
    dragging?: boolean
  }
}) {
  const [open, setOpen] = useState(false)
  // Let go of a line dragged from the tray: the tray stays closed.
  const [lifted, setLifted] = useState(false)
  if (week?.dragging && open && !lifted) setLifted(true)
  if (!week?.dragging && lifted) {
    setLifted(false)
    setOpen(false)
  }
  const [showing, setShowing] = useState<'outfits' | 'garments'>('outfits')
  const [search, setSearch] = useState('')
  const planned = wardrobe.planned
  const found = week
    ? wardrobe.garments.filter((g) => !g.retired && matchesSearch(g, search)).slice(0, 40)
    : []
  const photos = usePhotoUrls(
    [
      ...planned.flatMap((o) => o.garments.map((g) => g.photo?.path)),
      ...found.map((g) => g.photo?.path),
    ],
    'small',
  )
  const photoOf = (g: GarmentView) => (g.photo ? photos.get(g.photo.path) : undefined)
  const photosOf = (o: OutfitView) => o.garments.map(photoOf)
  const pick = (p: Pick) => {
    week?.onPick(p)
    setOpen(false)
  }
  const clear = (
    <Button
      variant="ghost"
      size="sm"
      disabled={!planned.length}
      onClick={() => {
        const was = [...planned]
        clearPlanned()
        toast('Planned outfits cleared', {
          action: { label: 'Undo', onClick: () => addPlanned(was.map((o) => o.item.id)) },
        })
      }}
    >
      Clear
    </Button>
  )
  // On a phone's Week, a line is chosen to place; anywhere else, opened.
  const lines = (phone: boolean) => (
    <div className="flex flex-col gap-1.5">
      {!planned.length && (
        <Text as="p" size="sm" tone="muted">
          Nothing to plan
        </Text>
      )}
      {planned.map((o) => (
        <div key={o.item.id} {...week?.drag(`outfit:${o.item.id}`)}>
          <PlannedOutfitLine
            photos={photosOf(o)}
            name={o.name.trim() || undefined}
            meta={
              phone && week
                ? `${garmentCount(o.garments.length)} · Drag to a day`
                : garmentCount(o.garments.length)
            }
            picked={week?.picked?.kind === 'outfit' && week.picked.id === o.item.id}
            onRemove={() => removePlanned([o.item.id])}
            onOpen={() =>
              phone && week ? pick({ kind: 'outfit', id: o.item.id }) : onOpen(o.item.id)
            }
          />
        </div>
      ))}
    </div>
  )
  const garmentsList = (phone: boolean) => (
    <div className="flex flex-col gap-2">
      <SearchField label="Search clothes" value={search} onChange={setSearch} />
      <div className="flex flex-col gap-0.5">
        {found.map((g) => (
          <div key={g.item.id} {...(!phone && week?.drag(`garment:${g.item.id}`))}>
            <GarmentLine
              garment={garmentFace(g, photoOf(g))}
              {...(phone && { onOpen: () => pick({ kind: 'garment', id: g.item.id }) })}
            />
          </div>
        ))}
      </div>
    </div>
  )
  // A phone's tray is the planned outfits alone (Joe, 20 November).
  const body = (phone: boolean) =>
    week && !phone ? (
      <>
        <Tabs value={showing} onValueChange={(v: 'outfits' | 'garments') => setShowing(v)}>
          <TabsList aria-label="Show">
            <TabsTrigger value="outfits">Outfits</TabsTrigger>
            <TabsTrigger value="garments">Garments</TabsTrigger>
          </TabsList>
        </Tabs>
        {showing === 'outfits' ? lines(phone) : garmentsList(phone)}
      </>
    ) : (
      lines(phone)
    )
  return (
    <>
      <WardrobePane
        title="Planned outfits"
        count={planned.length}
        aside={clear}
        className="max-md:hidden"
      >
        {body(false)}
      </WardrobePane>
      {open ? (
        <TrayPanel
          title="Planned outfits"
          count={planned.length}
          aside={clear}
          onClose={() => setOpen(false)}
          away={lifted}
        >
          {body(true)}
        </TrayPanel>
      ) : (
        !week?.picked && (
          <Tray
            title="Planned outfits"
            photos={planned.map((o) => photosOf(o)[0])}
            count={planned.length}
            unit="outfit"
            onOpen={() => setOpen(true)}
          />
        )
      )}
    </>
  )
}

/**
 * The Outfits tab (WRD-016, WRD-019): a collection's outfits as cards,
 * searched and sorted, with Select; the Planned outfits pane beside them.
 */
export function OutfitsTab({
  wardrobe,
  onOpen,
  onNew,
  onChoosing,
  view,
}: {
  wardrobe: WardrobeData
  onOpen: (id: string) => void
  onNew: () => void
  onChoosing: (on: boolean) => void
  view: ReturnType<typeof useOutfitsView>
}) {
  const { kept, change } = view
  const [search, setSearch] = useState('')
  const [choosing, setChoosingHere] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const [collecting, setCollecting] = useState(false)
  const setChoosing = (on: boolean) => {
    setChoosingHere(on)
    onChoosing(on)
  }
  const start = (id?: string) => {
    setChoosing(true)
    setChosen(new Set(id ? [id] : []))
  }
  const done = () => {
    setChoosing(false)
    setChosen(new Set())
  }
  const collection = wardrobe.lists.collection.find((c) => c.id === kept.collection)
  const inCollection = collection
    ? wardrobe.outfits.filter((o) => o.collections.includes(collection.id))
    : wardrobe.outfits
  const shown = inCollection
    .filter((o) => outfitMatches(o, search))
    .sort(directed(outfitSorts[kept.sort], 'desc', kept.sortDir))
  const photos = usePhotoUrls(
    shown.flatMap((o) => o.garments.map((g) => g.photo?.path)),
    'small',
  )
  const picked = shown.filter((o) => chosen.has(o.item.id))
  const act = (fn: (os: OutfitView[]) => void) => () => {
    if (picked.length) fn(picked)
    done()
  }
  const options = [
    { value: MY_OUTFITS, label: 'My Outfits' },
    ...wardrobe.lists.collection.map((c) => ({ value: c.id, label: c.name })),
  ]

  const toolbar = choosing ? (
    <SelectionBar
      count={picked.length}
      onDone={done}
      onSelectAll={() => setChosen(new Set(shown.map((o) => o.item.id)))}
      actions={[
        {
          label: 'Add to Planned outfits',
          short: 'Add to Planned',
          icon: CalendarPlusIcon,
          onClick: act((os) => planOutfits(os)),
        },
        { label: 'Add to collection', icon: FolderPlusIcon, onClick: () => setCollecting(true) },
        collection
          ? {
              label: 'Remove from collection',
              short: 'Remove',
              icon: XIcon,
              onClick: act((os) => takeOutOfCollection(os, collection)),
            }
          : {
              label: 'Delete',
              icon: Trash2Icon,
              onClick: act(deleteOutfits),
              destructive: true,
            },
      ]}
    />
  ) : (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex items-center gap-2 lg:contents">
        <SearchField label="Search outfits" value={search} onChange={setSearch} />
      </div>
      <div className="flex items-center gap-2 lg:contents">
        <Select
          value={collection ? collection.id : MY_OUTFITS}
          items={options}
          onValueChange={(v) => v !== null && change({ collection: v })}
        >
          <SelectTrigger
            size="sm"
            aria-label="Collection"
            className="min-w-0 flex-1 lg:w-auto lg:flex-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SortMenu<OutfitSort>
          fill
          options={OUTFIT_SORTS}
          value={kept.sort}
          direction={kept.sortDir}
          onChange={(sort, sortDir) => change({ sort, sortDir })}
        />
        <Button variant="ghost" size="sm" className="max-md:hidden" onClick={() => start()}>
          <ListChecksIcon /> Select
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {toolbar}
        {!wardrobe.isLoading && inCollection.length === 0 && (
          <EmptyState
            icon={ShirtIcon}
            title={collection ? `Nothing in ${collection.name}` : 'No outfits yet'}
            action={{ label: 'New outfit', onClick: onNew }}
          />
        )}
        {inCollection.length > 0 && shown.length === 0 && (
          <EmptyState icon={ShirtIcon} title="No outfits match" />
        )}
        <RecipeGrid size="M">
          {shown.map((o) => (
            <OutfitTile
              key={o.item.id}
              outfit={o}
              photos={photos}
              selecting={choosing}
              selected={chosen.has(o.item.id)}
              onOpen={() => onOpen(o.item.id)}
              onSelect={(on) =>
                setChosen((c) => {
                  const next = new Set(c)
                  if (on) next.add(o.item.id)
                  else next.delete(o.item.id)
                  return next
                })
              }
              onStart={choosing ? undefined : () => start(o.item.id)}
            />
          ))}
        </RecipeGrid>
      </div>
      {!choosing && <PlannedPane wardrobe={wardrobe} onOpen={onOpen} />}
      {collecting && (
        <CollectDialog
          outfits={picked}
          wardrobe={wardrobe}
          onDone={() => {
            setCollecting(false)
            done()
          }}
        />
      )}
    </div>
  )
}
