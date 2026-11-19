import { labToHex, nameColour } from '@lifeos/wardrobe'
import { Link } from '@tanstack/react-router'
import {
  ArchiveIcon,
  EllipsisIcon,
  ListIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { CardRow, ListEntryRow, Swatch, Text } from '@/components/lifeos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import {
  mergeEntry,
  ORDERED_LISTS,
  placeLabel,
  queue,
  removeWardrobeEntry,
  saveEntry,
  searchPlaces,
  setEntryPosition,
  setWeatherPlace,
  splitPlace,
  useWardrobe,
  type PlaceFound,
  type WardrobeData,
  type WardrobeEntry,
  type WardrobeList,
} from '@/data'
import { positionBetween } from '@/data/food-writes'
import { useReorder } from '@/hooks/use-reorder'
import { Field } from './task-details'

/** Each list's names: its title, one of it, and what uses it. */
const LIST_WORDS: Record<WardrobeList, { title: string; one: string; of: 'garment' | 'outfit' }> = {
  category: { title: 'Categories', one: 'Category', of: 'garment' },
  size: { title: 'Sizes', one: 'Size', of: 'garment' },
  collection: { title: 'Collections', one: 'Collection', of: 'outfit' },
  colour: { title: 'Colours', one: 'Colour', of: 'garment' },
  fit: { title: 'Fits', one: 'Fit', of: 'garment' },
  brand: { title: 'Brands', one: 'Brand', of: 'garment' },
  tag: { title: 'Tags', one: 'Tag', of: 'garment' },
}

const MAX_NAME: Record<WardrobeList, number> = {
  category: 40,
  size: 20,
  collection: 40,
  colour: 40,
  fit: 40,
  brand: 60,
  tag: 40,
}

const count = (n: number, of: string) => `${n} ${of}${n === 1 ? '' : 's'}`
const usesLabel = (n: number, of: string) => (n === 0 ? 'Unused' : count(n, of))
const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

/** A new colour's swatch until one is picked: a mid grey (data, not a token; ADR-0067). */
const START_HEX = labToHex({ l: 0.6, a: 0, b: 0 })

type Editing = { kind: 'new' } | { kind: 'edit'; entry: WardrobeEntry }

/**
 * An entry's name, and a colour's swatch (WRD-028 4): a new one, or a
 * change. The swatch is the device's colour picker; a new colour's name is
 * suggested from it until one is typed (ADR-0067 4).
 */
function EntryDialog({
  list,
  entries,
  editing,
  onDone,
}: {
  list: WardrobeList
  entries: readonly WardrobeEntry[]
  editing: Editing
  onDone: () => void
}) {
  const ids = useId()
  const { one } = LIST_WORDS[list]
  const old = editing.kind === 'edit' ? editing.entry : undefined
  const [name, setName] = useState(old?.name ?? '')
  const [hex, setHex] = useState(old?.hex ?? START_HEX)
  const [named, setNamed] = useState(old !== undefined)
  const isColour = list === 'colour'
  const taken = entries.some((e) => e.id !== old?.id && key(e.name) === key(name))
  const myOutfits = list === 'collection' && key(name) === 'my outfits'
  const bad = taken || myOutfits
  const changed = !old || name.trim() !== old.name || (isColour && hex !== old.hex)
  const save = () => {
    if (!name.trim() || bad) return
    if (changed) {
      const position =
        !old && ORDERED_LISTS.includes(list)
          ? positionBetween(entries.at(-1)?.position, null)
          : undefined
      saveEntry(list, name, {
        ...(old && { id: old.id }),
        ...(isColour && { hex }),
        ...(position && { position }),
      })
    }
    onDone()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {old ? `Edit ${one.toLowerCase()}` : `New ${one.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          {isColour && (
            <Field label="Swatch" htmlFor={`${ids}-hex`}>
              <label className="flex w-fit cursor-pointer items-center gap-3 rounded-control">
                <Swatch hex={hex} size="lg" />
                <span className="text-sm text-muted-foreground tabular-nums">{hex}</span>
                <input
                  id={`${ids}-hex`}
                  type="color"
                  className="sr-only"
                  value={hex}
                  onChange={(e) => {
                    setHex(e.target.value)
                    if (!named) setName(nameColour(e.target.value))
                  }}
                />
              </label>
            </Field>
          )}
          <Field label="Name" htmlFor={`${ids}-name`}>
            <Input
              id={`${ids}-name`}
              data-autofocus={!isColour || undefined}
              value={name}
              maxLength={MAX_NAME[list]}
              autoComplete="off"
              aria-invalid={bad || undefined}
              onChange={(e) => {
                setName(e.target.value)
                setNamed(true)
              }}
            />
            {bad && (
              <Text as="p" size="sm" tone="danger">
                {myOutfits ? 'My Outfits is always there' : 'Already on the list'}
              </Text>
            )}
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={!name.trim() || bad}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Merging an entry into another of its list (WRD-028 3–5): whatever used it
 * uses the one chosen, which keeps its name; this one goes. Nothing is
 * chosen to start, so a wrong merge is never one tap away.
 */
function MergeDialog({
  list,
  entry,
  entries,
  moving,
  onDone,
}: {
  list: WardrobeList
  entry: WardrobeEntry
  entries: readonly WardrobeEntry[]
  moving: number
  onDone: () => void
}) {
  const ids = useId()
  const { one, of } = LIST_WORDS[list]
  const others = entries
    .filter((e) => e.id !== entry.id)
    .sort((a, b) => a.name.localeCompare(b.name))
  const [into, setInto] = useState('')
  const items = others.map((o) => ({ value: o.id, label: o.name }))
  const merge = () => {
    const kept = others.find((o) => o.id === into)
    if (!kept) return
    mergeEntry(list, entry.id, kept.id)
    toast(`Merged "${entry.name}" into "${kept.name}"`)
    onDone()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge "{entry.name}"</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            merge()
          }}
        >
          <Field label="Merge into" htmlFor={`${ids}-into`}>
            <Select value={into} items={items} onValueChange={(v) => v && setInto(v)}>
              <SelectTrigger id={`${ids}-into`} className="w-full">
                <SelectValue placeholder={`Choose a ${one.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {others.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.hex && <Swatch hex={o.hex} size="sm" />}
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {moving > 0 && (
              <Text as="p" size="sm" tone="muted">
                {count(moving, of)} {moving === 1 ? 'moves' : 'move'}
              </Text>
            )}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" disabled={!into}>
              Merge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * One of my Wardrobe lists (WRD-028 1–5): its title and count, "+ Category"
 * at its heading, then a ListEntryRow per entry saying how many use it;
 * Categories, Sizes and Collections dragged into order by their handles,
 * My Outfits first and fixed. An entry nothing uses is deleted at once,
 * with Undo; one in use can only be merged; a Collection can always be
 * deleted, its outfits staying in My Outfits.
 */
export function WardrobeListCard({
  list,
  wardrobe,
}: {
  list: WardrobeList
  wardrobe: WardrobeData
}) {
  const { title, one, of } = LIST_WORDS[list]
  const entries = wardrobe.lists[list]
  const ordered = ORDERED_LISTS.includes(list)
  const [editing, setEditing] = useState<Editing>()
  const [merging, setMerging] = useState<WardrobeEntry>()
  const [refusing, setRefusing] = useState<WardrobeEntry>()
  const [confirming, setConfirming] = useState<WardrobeEntry>()
  const reorder = useReorder(
    entries.map((e) => e.id),
    (moved, to) => {
      const rest = entries.filter((e) => e.id !== moved)
      setEntryPosition(list, moved, positionBetween(rest[to - 1]?.position, rest[to]?.position))
    },
  )
  const remove = (e: WardrobeEntry) => {
    removeWardrobeEntry(list, e.id)
    toast(`Deleted "${e.name}"`, {
      action: {
        label: 'Undo',
        onClick: () =>
          saveEntry(list, e.name, {
            id: e.id,
            ...(e.hex && { hex: e.hex }),
            ...(e.position && { position: e.position }),
          }),
      },
    })
  }
  const startDelete = (e: WardrobeEntry) => {
    const n = wardrobe.uses(list, e.id)
    if (list === 'collection') return n.all > 0 ? setConfirming(e) : remove(e)
    if (n.all > 0) return setRefusing(e)
    remove(e)
  }
  const refusingUses = refusing ? wardrobe.uses(list, refusing.id) : undefined
  const confirmingUses = confirming ? wardrobe.uses(list, confirming.id).shown : 0
  const total = entries.length + (list === 'collection' ? 1 : 0)

  return (
    <Card className="gap-2 p-3 pt-2">
      <div className="flex h-11 items-center gap-2 pl-2">
        <Text as="h2" size="h2">
          {title}
        </Text>
        <Badge variant="outline">{total}</Badge>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          aria-label={`New ${one.toLowerCase()}`}
          onClick={() => setEditing({ kind: 'new' })}
        >
          <PlusIcon /> {one}
        </Button>
      </div>
      <div className="flex flex-col">
        {list === 'collection' && (
          <ListEntryRow
            name="My Outfits"
            ordered
            fixed
            uses={usesLabel(wardrobe.outfits.length, 'outfit')}
          />
        )}
        {entries.map((e) => (
          <ListEntryRow
            key={e.id}
            name={e.name}
            ordered={ordered}
            hex={e.hex ?? undefined}
            uses={usesLabel(wardrobe.uses(list, e.id).shown, of)}
            {...(ordered && { reorder: reorder.row(e.id), onHandleKeyDown: reorder.keys(e.id) })}
            menu={
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label={`${e.name} options`} />
                  }
                >
                  <EllipsisIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing({ kind: 'edit', entry: e })}>
                    <PencilIcon /> {list === 'colour' ? 'Edit' : 'Rename'}
                  </DropdownMenuItem>
                  {list !== 'collection' && entries.length > 1 && (
                    <DropdownMenuItem onClick={() => setMerging(e)}>Merge into…</DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => startDelete(e)}>
                    <Trash2Icon /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        ))}
        {!wardrobe.isLoading && entries.length === 0 && list !== 'collection' && (
          <Text as="p" size="sm" tone="muted" className="px-2 pb-2">
            None yet
          </Text>
        )}
      </div>
      {editing && (
        <EntryDialog
          key={editing.kind === 'edit' ? editing.entry.id : 'new'}
          list={list}
          entries={entries}
          editing={editing}
          onDone={() => setEditing(undefined)}
        />
      )}
      {merging && (
        <MergeDialog
          list={list}
          entry={merging}
          entries={entries}
          moving={wardrobe.uses(list, merging.id).shown}
          onDone={() => setMerging(undefined)}
        />
      )}
      <AlertDialog open={refusing !== undefined} onOpenChange={(o) => !o && setRefusing(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>"{refusing?.name}" is in use</AlertDialogTitle>
            <AlertDialogDescription>
              {refusingUses && refusingUses.shown > 0
                ? `${count(refusingUses.shown, of)} ${refusingUses.shown === 1 ? 'uses' : 'use'} it. Merge it into another ${one.toLowerCase()}.`
                : `A garment in Recently deleted uses it. Merge it into another ${one.toLowerCase()}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={confirming !== undefined}
        onOpenChange={(o) => !o && setConfirming(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirming?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingUses === 1
                ? 'Its outfit stays in My Outfits'
                : `Its ${confirmingUses} outfits stay in My Outfits`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirming) removeWardrobeEntry(list, confirming.id)
                setConfirming(undefined)
              }}
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/** Waits this long after the last key before asking Open-Meteo. */
const SEARCH_WAIT = 300

type Search =
  | { state: 'idle' }
  | { state: 'searching' }
  | { state: 'found'; places: PlaceFound[] }
  | { state: 'failed' }

/** The weather's place, found by name (WRD-028 6; ADR-0068). */
function PlaceDialog({ onDone }: { onDone: () => void }) {
  const ids = useId()
  const [name, setName] = useState('')
  const [found, setSearch] = useState<Search>({ state: 'idle' })
  const short = name.trim().length < 2
  const search: Search = short ? { state: 'idle' } : found
  useEffect(() => {
    if (short) return
    const stop = new AbortController()
    const timer = setTimeout(() => {
      setSearch({ state: 'searching' })
      searchPlaces(name, stop.signal)
        .then((places) => setSearch({ state: 'found', places }))
        .catch(() => !stop.signal.aborted && setSearch({ state: 'failed' }))
    }, SEARCH_WAIT)
    return () => {
      clearTimeout(timer)
      stop.abort()
    }
  }, [name, short])
  const choose = (p: PlaceFound) => {
    setWeatherPlace(placeLabel(p), p.latitude, p.longitude)
    onDone()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Weather place</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Place" htmlFor={`${ids}-place`}>
            <Input
              id={`${ids}-place`}
              data-autofocus
              type="search"
              value={name}
              placeholder="Manchester"
              autoComplete="off"
              enterKeyHint="search"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="flex min-h-12 flex-col" aria-live="polite">
            {search.state === 'searching' && (
              <Text as="p" size="sm" tone="muted" className="px-1 py-3">
                Searching…
              </Text>
            )}
            {search.state === 'failed' && (
              <Text as="p" size="sm" tone="muted" className="px-1 py-3">
                Couldn’t search. Check your signal
              </Text>
            )}
            {search.state === 'found' && search.places.length === 0 && (
              <Text as="p" size="sm" tone="muted" className="px-1 py-3">
                No place called "{name.trim()}"
              </Text>
            )}
            {search.state === 'found' &&
              search.places.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex min-h-12 items-center gap-3 rounded-row px-2 text-left outline-none hover:bg-accent focus-visible:bg-accent"
                  onClick={() => choose(p)}
                >
                  <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    {p.region && (
                      <span className="truncate text-xs text-muted-foreground">{p.region}</span>
                    )}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The weather's place (WRD-028 6): where it is, with Change; none yet, Choose. */
export function WeatherCard({ wardrobe }: { wardrobe: WardrobeData }) {
  const [open, setOpen] = useState(false)
  const place = wardrobe.place ? splitPlace(wardrobe.place.name) : undefined
  return (
    <Card className="gap-3">
      <Text as="h2" size="h2">
        Weather
      </Text>
      <div className="flex items-center gap-3 rounded-row bg-muted/60 px-3 py-2.5">
        <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{place?.name ?? 'No place yet'}</span>
          {place?.region && (
            <span className="truncate text-xs text-muted-foreground">{place.region}</span>
          )}
        </span>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {place ? 'Change' : 'Choose'}
        </Button>
      </div>
      {open && <PlaceDialog onDone={() => setOpen(false)} />}
    </Card>
  )
}

/** Retired garments, leading to their page (WRD-028 7). */
export function RetiredCard({ wardrobe }: { wardrobe: WardrobeData }) {
  const retired = wardrobe.garments.filter((g) => g.retired).length
  return (
    <Card className="gap-0 px-2 py-1.5">
      <CardRow
        icon={<ArchiveIcon />}
        label="Retired garments"
        value={retired}
        render={<Link to="/settings/retired-garments" />}
      />
    </Card>
  )
}

/** Settings' Wardrobe (WRD-028): its lists and weather, and Retired garments. */
export function WardrobeCard() {
  const wardrobe = useWardrobe(queue)
  const retired = wardrobe.garments.filter((g) => g.retired).length
  return (
    <Card className="gap-0 px-2 py-1.5">
      <div className="px-3 pt-2 pb-1">
        <CardTitle>Wardrobe</CardTitle>
      </div>
      <CardRow
        icon={<ListIcon />}
        label="Lists and weather"
        render={<Link to="/settings/wardrobe" />}
      />
      <CardRow
        icon={<ArchiveIcon />}
        label="Retired garments"
        value={retired}
        render={<Link to="/settings/retired-garments" />}
      />
    </Card>
  )
}
