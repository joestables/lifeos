import { Link } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ListChecksIcon,
  ShirtIcon,
  SlidersHorizontalIcon,
  TagIcon,
  TagsIcon,
  Trash2Icon,
} from 'lucide-react'
import { memo, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  ChoiceChips,
  EmptyState,
  FilterDialog,
  FilterLayout,
  FilterPanel,
  GarmentCard,
  RecipeGrid,
  SectionLabel,
  SelectionBar,
  SortMenu,
  type CardSize,
  type FilterGroup,
  type GarmentFace,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  addGarmentTags,
  removeGarmentTags,
  setMark,
  usePhotoUrls,
  type GarmentView,
  type WardrobeData,
} from '@/data'
import {
  GARMENT_FILTERS,
  GARMENT_GROUPINGS,
  GARMENT_SORTS,
  filterChoices,
  groupGarments,
  shownGarments,
  type GarmentGrouping,
  type GarmentSort,
} from '@/lib/wardrobe'
import { deleteGarments, retireGarments } from './garment-actions'
import { garmentFace } from './garment-face'
import { SearchField } from './search-field'
import { useWardrobeView } from './wardrobe-view'
import { NewEntryChip } from './wardrobe-parts'

type CardActions = {
  open: (id: string) => void
  choose: (id: string, on: boolean) => void
  start: (id: string) => void
}

/** A garment's card, drawn again only when what it shows changes. */
const WardrobeCard = memo(function WardrobeCard({
  face,
  selecting,
  selected,
  actions,
}: {
  face: GarmentFace
  selecting: boolean
  selected: boolean
  actions: RefObject<CardActions>
}) {
  return (
    <GarmentCard
      garment={face}
      mode={selecting ? 'select' : 'browse'}
      chosen={selected}
      onOpen={() => actions.current.open(face.id)}
      onFavourite={(on) => setMark(face.id, on)}
      onChoose={(on) => actions.current.choose(face.id, on)}
      onLongPress={selecting ? undefined : () => actions.current.start(face.id)}
    />
  )
})

/**
 * Tags for the garments chosen (WRD-012 2): Add offers every tag (and "+
 * Tag"); Remove only those the chosen garments have.
 */
function TagsDialog({
  mode,
  garments,
  wardrobe,
  onDone,
}: {
  mode: 'add' | 'remove'
  garments: readonly GarmentView[]
  wardrobe: WardrobeData
  onDone: () => void
}) {
  const [chosen, setChosen] = useState<string[]>([])
  const had = new Set(garments.flatMap((g) => g.tags.map((t) => t.id)))
  const tags = wardrobe.lists.tag.filter((t) => mode === 'add' || had.has(t.id))
  const names = wardrobe.lists.tag.filter((t) => chosen.includes(t.id)).map((t) => t.name)
  const n = garments.length === 1 ? '1 garment' : `${garments.length} garments`
  const verb = mode === 'add' ? 'Add' : 'Remove'
  const go = () => {
    const ids = garments.map((g) => g.item.id)
    if (mode === 'add') addGarmentTags(ids, chosen)
    else removeGarmentTags(ids, chosen)
    toast(
      `${mode === 'add' ? 'Tagged' : 'Untagged'} ${n}`,
      mode === 'add'
        ? { action: { label: 'Undo', onClick: () => removeGarmentTags(ids, chosen) } }
        : undefined,
    )
    onDone()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent data-colour="orange">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? `Add tags to ${n}` : `Remove tags from ${n}`}</DialogTitle>
        </DialogHeader>
        <ChoiceChips
          aria-label="Tags"
          choices={tags.map((t) => ({ id: t.id, name: t.name }))}
          chosen={new Set(chosen)}
          onChange={setChosen}
          add={
            mode === 'add' ? (
              <NewEntryChip
                list="tag"
                one="Tag"
                entries={wardrobe.lists.tag}
                onMade={(id) => setChosen((c) => [...new Set([...c, id])])}
              />
            ) : undefined
          }
        />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button disabled={!chosen.length} onClick={go}>
            {chosen.length === 1
              ? `${verb} ${names[0]}`
              : `${verb} ${chosen.length || ''} tags`.replace('  ', ' ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The Wardrobe tab (WRD-001–004, WRD-011, WRD-012): the FilterPanel, then
 * search, Sort, Group, S / M / L and Select over the garments' cards.
 */
export function WardrobeTab({
  wardrobe,
  onOpen,
  onNew,
  onChoosing,
}: {
  wardrobe: WardrobeData
  onOpen: (id: string) => void
  onNew: () => void
  /** Choosing several: the page puts its Fab away. */
  onChoosing: (on: boolean) => void
}) {
  const { view, size, change, setSearch } = useWardrobeView()
  const [sheet, setSheet] = useState(false)
  const [choosing, setChoosingHere] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const [tagging, setTagging] = useState<'add' | 'remove' | null>(null)
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
  const choose = (id: string, on: boolean) =>
    setChosen((c) => {
      const next = new Set(c)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const actions = useRef<CardActions>({ open: onOpen, choose, start })
  useLayoutEffect(() => {
    actions.current = { open: onOpen, choose, start }
  })

  const { lists, garments } = wardrobe
  const owned = garments.filter((g) => !g.retired)
  const shown = shownGarments(garments, view, lists)
  const photos = usePhotoUrls(
    shown.map((g) => g.photo?.path),
    size === 'L' ? 'whole' : 'small',
  )
  const choices = filterChoices(garments, lists)
  const groups: FilterGroup[] = GARMENT_FILTERS.map((name) => {
    const on = view.chosen[name] ?? []
    const values = choices[name].map((c) => c.name)
    // A chosen value no garment has now still shows, to be taken off.
    const all = [...values, ...on.filter((c) => !values.includes(c))]
    return {
      name,
      values: all,
      chosen: on,
      open: name === 'Category',
      ...(name === 'Colour' && {
        control: (
          <ChoiceChips
            compact
            aria-label="Colour"
            choices={[
              ...choices.Colour.map((c) => ({ id: c.name, name: c.name, hex: c.hex ?? undefined })),
              ...on.filter((c) => !values.includes(c)).map((c) => ({ id: c, name: c })),
            ]}
            chosen={new Set(on)}
            onChange={(next) => change({ chosen: { ...view.chosen, Colour: next } })}
          />
        ),
      }),
    }
  }).filter((g) => g.values.length > 0)
  const chosenCount = groups.reduce((n, g) => n + (g.chosen?.length ?? 0), 0)
  const onChange = (group: string, next: string[]) =>
    change({ chosen: { ...view.chosen, [group]: next } })
  const reset = () => change({ chosen: {} })
  const picked = shown.filter((g) => chosen.has(g.item.id))
  const act = (fn: (gs: GarmentView[]) => void) => () => {
    if (picked.length) fn(picked)
    done()
  }
  const sortAndGroup = (fill: boolean) => (
    <>
      <SortMenu<GarmentSort>
        fill={fill}
        options={GARMENT_SORTS}
        value={view.sort}
        direction={view.sortDir}
        onChange={(sort, sortDir) => change({ sort, sortDir })}
      />
      <Select
        value={view.group}
        items={GARMENT_GROUPINGS}
        onValueChange={(v) => v !== null && change({ group: v as GarmentGrouping })}
      >
        <SelectTrigger
          size="sm"
          aria-label="Group"
          className={fill ? 'min-w-0 flex-1 lg:w-auto lg:flex-none' : 'w-auto'}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GARMENT_GROUPINGS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
  const noLists = lists.category.length === 0 || lists.size.length === 0

  return (
    <>
      <FilterLayout
        filters={
          <FilterPanel
            groups={groups}
            active={chosenCount > 0}
            onChange={onChange}
            onReset={reset}
          />
        }
      >
        {choosing ? (
          <SelectionBar
            count={picked.length}
            onDone={done}
            onSelectAll={() => setChosen(new Set(shown.map((g) => g.item.id)))}
            actions={[
              { label: 'Add tag', icon: TagIcon, onClick: () => setTagging('add') },
              { label: 'Remove tag', icon: TagsIcon, onClick: () => setTagging('remove') },
              { label: 'Retire', icon: ArchiveIcon, onClick: act(retireGarments) },
              {
                label: 'Delete',
                icon: Trash2Icon,
                onClick: act((gs) => deleteGarments(gs)),
                destructive: true,
              },
            ]}
          />
        ) : (
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex items-center gap-2 lg:contents">
              <SearchField label="Search clothes" value={view.search} onChange={setSearch} />
              <Button
                variant="outline"
                size="sm"
                className="relative lg:hidden"
                onClick={() => setSheet(true)}
              >
                <SlidersHorizontalIcon /> Filters
                {chosenCount > 0 && (
                  <Badge className="absolute -top-2 -right-2">{chosenCount}</Badge>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 lg:contents">
              {sortAndGroup(true)}
              <ToggleGroup
                aria-label="Card size"
                className="max-md:hidden"
                value={[size]}
                onValueChange={(v: string[]) => v[0] && change({ size: v[0] as CardSize })}
              >
                <ToggleGroupItem value="S">S</ToggleGroupItem>
                <ToggleGroupItem value="M">M</ToggleGroupItem>
                <ToggleGroupItem value="L">L</ToggleGroupItem>
              </ToggleGroup>
              <Button variant="ghost" size="sm" className="max-md:hidden" onClick={() => start()}>
                <ListChecksIcon /> Select
              </Button>
            </div>
          </div>
        )}
        {!wardrobe.isLoading && owned.length === 0 && (
          <EmptyState
            icon={ShirtIcon}
            title="No garments yet"
            {...(!noLists && { action: { label: 'New garment', onClick: onNew } })}
          >
            {noLists && (
              <Button variant="outline" size="sm" render={<Link to="/settings/wardrobe" />}>
                Add categories and sizes
              </Button>
            )}
          </EmptyState>
        )}
        {owned.length > 0 && shown.length === 0 && (
          <EmptyState icon={SlidersHorizontalIcon} title="No garments match" />
        )}
        {groupGarments(shown, view.group, lists).map((g) => {
          const grid = (
            <RecipeGrid size={size}>
              {g.garments.map((x) => (
                <WardrobeCard
                  key={x.item.id}
                  face={garmentFace(x, x.photo && photos.get(x.photo.path))}
                  selecting={choosing}
                  selected={chosen.has(x.item.id)}
                  actions={actions}
                />
              ))}
            </RecipeGrid>
          )
          return g.label ? (
            <section key={g.key}>
              <SectionLabel count={g.garments.length}>{g.label}</SectionLabel>
              {grid}
            </section>
          ) : (
            <div key={g.key}>{grid}</div>
          )
        })}
      </FilterLayout>
      <FilterDialog
        open={sheet}
        onOpenChange={setSheet}
        colour="orange"
        onReset={reset}
        show={shown.length === 1 ? 'Show 1 garment' : `Show ${shown.length} garments`}
      >
        <FilterPanel
          bare
          groups={groups}
          active={chosenCount > 0}
          onChange={onChange}
          onReset={reset}
        />
      </FilterDialog>
      {tagging && (
        <TagsDialog
          mode={tagging}
          garments={picked}
          wardrobe={wardrobe}
          onDone={() => {
            setTagging(null)
            done()
          }}
        />
      )}
    </>
  )
}
