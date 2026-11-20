import { labToHex, nameColour, suggestColours } from '@lifeos/wardrobe'
import { Link } from '@tanstack/react-router'
import { CameraIcon, PipetteIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AddChip,
  ChoiceChips,
  GarmentSheet,
  SheetField,
  Swatch,
  Text,
  type Choice,
} from '@/components/lifeos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addGarmentTags,
  createGarment,
  holdPhoto,
  removeGarmentTags,
  saveEntry,
  updateGarment,
  type GarmentPatch,
  type GarmentView,
  type WardrobeData,
  type WardrobeEntry,
} from '@/data'
import { colourOrder, matchBrands, recentBrands, sizesFor, stillNeeded } from '@/lib/wardrobe'
import type { TakenPhoto } from './garment-camera'
import { NewColourDialog, type ColourChoice } from './new-colour'
import { NewEntryChip } from './wardrobe-parts'

const NEW = 'new'
/** The picker's start without a photo or a colour: a mid grey (data, ADR-0067). */
const GREY = labToHex({ l: 0.6, a: 0, b: 0 })
const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

interface Draft {
  colour?: ColourChoice
  category?: string
  size?: string
  brand?: string
  fit: string | null
  tags: string[]
  ownName: string
}

/** My colours close to a photo's estimate, or a new one of it (WRD-006 2–3). */
function suggestion(photo: TakenPhoto | null, colours: readonly WardrobeEntry[]) {
  if (!photo) return { offered: [] as WardrobeEntry[], fresh: undefined }
  const mine = colours.filter((c): c is WardrobeEntry & { hex: string } => c.hex !== null)
  const { offered, newColour } = suggestColours(photo.estimate.lab, mine)
  return {
    offered,
    fresh: newColour
      ? { kind: 'new' as const, hex: photo.estimate.hex, name: nameColour(photo.estimate.lab) }
      : undefined,
  }
}

/** The part of a brand's name typed, in bold (WRD-008 1). */
function Matched({ name, typed }: { name: string; typed: string }) {
  const at = name.toLowerCase().indexOf(typed.trim().toLowerCase())
  if (at < 0 || !typed.trim()) return <>{name}</>
  const end = at + typed.trim().length
  return (
    <>
      {name.slice(0, at)}
      <b>{name.slice(at, end)}</b>
      {name.slice(end)}
    </>
  )
}

/** Brand: my recent ones as pills, or a search that narrows as I type, with Add (WRD-008 1). */
function BrandField({
  brands,
  recent,
  chosen,
  onChoose,
}: {
  brands: readonly WardrobeEntry[]
  recent: readonly WardrobeEntry[]
  chosen?: string
  onChoose: (id: string | undefined) => void
}) {
  const [typed, setTyped] = useState<string | null>(null)
  const pick = brands.find((b) => b.id === chosen)
  const shown = pick && !recent.includes(pick) ? [pick, ...recent] : [...recent]
  const found = typed ? matchBrands(brands, typed) : []
  const exact = typed ? brands.find((b) => key(b.name) === key(typed)) : undefined
  const choose = (id: string) => {
    onChoose(id)
    setTyped(null)
  }
  return (
    <SheetField label="Brand">
      {typed === null ? (
        <ChoiceChips
          single
          aria-label="Brand"
          choices={shown.map((b) => ({ id: b.id, name: b.name }))}
          chosen={new Set(chosen ? [chosen] : [])}
          onChange={(v) => onChoose(v[0])}
          add={
            <AddChip icon={SearchIcon} onClick={() => setTyped('')}>
              {brands.length ? 'Search brands' : 'Add brand'}
            </AddChip>
          }
        />
      ) : (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (exact) choose(exact.id)
            else if (found[0]) choose(found[0].id)
            else if (typed.trim()) choose(saveEntry('brand', typed))
          }}
        >
          <Input
            autoFocus
            aria-label="Search brands"
            placeholder="Brand"
            value={typed}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setTyped(null)
              }
            }}
          />
          {typed.trim() && (
            <div
              role="listbox"
              aria-label="Brands"
              className="flex flex-col rounded-lg bg-popover p-1.5 shadow-pop"
            >
              {found.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="option"
                  aria-selected={b.id === chosen}
                  className="flex h-9 items-center rounded-sm px-2.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                  onClick={() => choose(b.id)}
                >
                  <span className="truncate">
                    <Matched name={b.name} typed={typed} />
                  </span>
                </button>
              ))}
              {!exact && (
                <>
                  {found.length > 0 && <div className="my-1 h-px bg-border" />}
                  <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-sm px-2.5 text-left text-sm text-muted-foreground outline-none hover:bg-accent focus-visible:bg-accent"
                    onClick={() => choose(saveEntry('brand', typed))}
                  >
                    <PlusIcon className="size-4" /> Add "{typed.trim()}"
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      )}
    </SheetField>
  )
}

/**
 * A garment's sheet (WRD-005 3–7, WRD-006–WRD-008, WRD-010 2): its colour,
 * category, size, brand, fit and tags as pills on one sheet; Save when the
 * four required are set. New, it is made with its photo held for signal;
 * edited, only what changed is sent, a new photo's colour suggested but
 * not chosen unless I choose it.
 */
export function GarmentSheetDialog({
  wardrobe,
  garment,
  photo,
  photoUrl,
  carried,
  onRetake,
  onCamera,
  onFile,
  onSaved,
  onClose,
  hidden = false,
}: {
  /** Put away while the camera is up, keeping what's chosen. */
  hidden?: boolean
  wardrobe: WardrobeData
  /** Editing this one; else a new garment. */
  garment?: GarmentView
  /** A photo taken on this sheet. */
  photo: TakenPhoto | null
  /** Its photo as it is, when editing. */
  photoUrl?: string
  /** The last garment's category and size, with Add another (WRD-009 2). */
  carried?: { category: string; size: string }
  onRetake: () => void
  onCamera: () => void
  onFile: (file: File) => void
  onSaved: (id: string) => void
  onClose: () => void
}) {
  const { lists, garments } = wardrobe
  const editing = garment !== undefined
  const suggested = useMemo(() => suggestion(photo, lists.colour), [photo, lists.colour])
  const startColour = (): ColourChoice | undefined => {
    if (garment) return { kind: 'mine', id: garment.row.colour_id }
    if (suggested.fresh) return suggested.fresh
    const first = suggested.offered[0]
    return first ? { kind: 'mine', id: first.id } : undefined
  }
  const [draft, setDraft] = useState<Draft>(() => ({
    colour: startColour(),
    category: garment?.row.category_id ?? carried?.category,
    size: garment?.row.size_id ?? carried?.size,
    brand: garment?.row.brand_id,
    fit: garment?.row.fit_id ?? null,
    tags: garment?.tags.map((t) => t.id) ?? [],
    ownName: garment?.row.own_name ?? '',
  }))
  // A new photo on a new garment: its colour suggested afresh (WRD-009 2).
  const [readFrom, setReadFrom] = useState(photo)
  if (readFrom !== photo) {
    setReadFrom(photo)
    if (!editing && photo) setDraft((d) => ({ ...d, colour: startColour() }))
  }
  const [allColours, setAllColours] = useState(false)
  const [moreSizes, setMoreSizes] = useState(false)
  const [picking, setPicking] = useState(false)
  const [naming, setNaming] = useState(Boolean(garment?.row.own_name))
  const [leaving, setLeaving] = useState(false)
  const change = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const byId = (entries: readonly WardrobeEntry[], id?: string | null) =>
    id ? entries.find((e) => e.id === id) : undefined
  const colourName =
    draft.colour?.kind === 'new' ? draft.colour.name : byId(lists.colour, draft.colour?.id)?.name
  const title =
    draft.ownName.trim() ||
    [colourName, byId(lists.brand, draft.brand)?.name, byId(lists.category, draft.category)?.name]
      .filter(Boolean)
      .join(' ') ||
    (editing ? garment.title : 'New garment')
  const needed = stillNeeded({
    colour:
      draft.colour && (draft.colour.kind === 'mine' || draft.colour.name.trim()) ? 'y' : undefined,
    category: draft.category,
    size: draft.size,
    brand: draft.brand,
  })
  const touched =
    !!photo ||
    (editing
      ? draft.colour?.kind === 'new' ||
        draft.colour?.id !== garment.row.colour_id ||
        draft.category !== garment.row.category_id ||
        draft.size !== garment.row.size_id ||
        draft.brand !== garment.row.brand_id ||
        draft.fit !== garment.row.fit_id ||
        draft.ownName.trim() !== (garment.row.own_name ?? '') ||
        draft.tags.join() !== garment.tags.map((t) => t.id).join()
      : !!(draft.category || draft.size || draft.brand || draft.fit || draft.tags.length))
  const close = () => (touched ? setLeaving(true) : onClose())

  const save = () => {
    if (needed || !draft.colour || !draft.category || !draft.size || !draft.brand) return
    const colour =
      draft.colour.kind === 'new'
        ? saveEntry('colour', draft.colour.name, { hex: draft.colour.hex })
        : draft.colour.id
    let id: string
    if (garment) {
      id = garment.item.id
      const patch: GarmentPatch = {}
      if (colour !== garment.row.colour_id) patch.colour_id = colour
      if (draft.category !== garment.row.category_id) patch.category_id = draft.category
      if (draft.size !== garment.row.size_id) patch.size_id = draft.size
      if (draft.brand !== garment.row.brand_id) patch.brand_id = draft.brand
      if (draft.fit !== garment.row.fit_id) patch.fit_id = draft.fit
      if (draft.ownName.trim() !== (garment.row.own_name ?? ''))
        patch.own_name = draft.ownName.trim() || null
      if (Object.keys(patch).length) updateGarment(id, patch)
      const had = garment.tags.map((t) => t.id)
      addGarmentTags(
        [id],
        draft.tags.filter((t) => !had.includes(t)),
      )
      removeGarmentTags(
        [id],
        had.filter((t) => !draft.tags.includes(t)),
      )
      if (photo) holdPhoto(id, photo, garment.photo)
    } else {
      id = createGarment({
        colour,
        category: draft.category,
        size: draft.size,
        brand: draft.brand,
        fit: draft.fit,
        tags: draft.tags,
        ownName: draft.ownName,
      })
      if (photo) holdPhoto(id, photo)
    }
    onSaved(id)
  }

  // Colour: the suggestion first, my close ones, the one chosen, then all mine on asking.
  const fresh = draft.colour?.kind === 'new' ? draft.colour : undefined
  const colourChoices: Choice[] = []
  if (fresh) colourChoices.push({ id: NEW, name: `New: ${fresh.name || 'colour'}`, hex: fresh.hex })
  const offeredIds = new Set<string>()
  const offer = (e: WardrobeEntry | undefined, note?: string) => {
    if (!e || offeredIds.has(e.id) || !e.hex) return
    offeredIds.add(e.id)
    colourChoices.push({ id: e.id, name: e.name, hex: e.hex, ...(note && { note }) })
  }
  for (const c of suggested.offered) offer(c)
  if (draft.colour?.kind === 'mine') offer(byId(lists.colour, draft.colour.id))
  if (allColours || !photo) for (const c of colourOrder(lists.colour)) offer(c)

  const sizes = sizesFor(draft.category, garments, lists.size)
  const shownSizes = moreSizes ? [...sizes.lead, ...sizes.rest] : sizes.lead
  const chosenSize = byId(lists.size, draft.size)
  if (chosenSize && !shownSizes.includes(chosenSize)) shownSizes.push(chosenSize)
  const categoryName = byId(lists.category, draft.category)?.name

  return (
    <>
      <GarmentSheet
        open={!hidden}
        onOpenChange={(o) => !o && close()}
        label={editing ? 'Edit garment' : 'New garment'}
        title={title}
        photo={photo?.url ?? photoUrl}
        note={carried && !editing ? 'Category and size from the last one' : undefined}
        retake={
          <Button variant="link" size="sm" className="self-start" onClick={onRetake}>
            <CameraIcon /> {photo || photoUrl ? 'Retake' : 'Take photo'}
          </Button>
        }
        photoButtons={
          <>
            <Button variant="outline" size="sm" onClick={onCamera}>
              <CameraIcon /> Camera
            </Button>
            <Button variant="outline" size="sm" render={<label />}>
              Choose file
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) onFile(f)
                }}
              />
            </Button>
          </>
        }
        footer={
          <>
            {needed && (
              <Text as="span" size="sm" tone="muted" className="mr-auto font-semibold">
                {needed}
              </Text>
            )}
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!!needed} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <SheetField
          label="Colour"
          aside={
            photo ? (suggested.fresh ? 'None of yours is close' : 'From the photo') : undefined
          }
        >
          <ChoiceChips
            single
            aria-label="Colour"
            choices={colourChoices}
            chosen={new Set(fresh ? [NEW] : draft.colour?.kind === 'mine' ? [draft.colour.id] : [])}
            onChange={(v) => {
              const id = v[0]
              if (!id) return change({ colour: undefined })
              if (id === NEW) return
              change({ colour: { kind: 'mine', id } })
            }}
            add={
              <>
                {photo && !allColours && lists.colour.length > offeredIds.size && (
                  <AddChip icon={null} onClick={() => setAllColours(true)}>
                    All colours
                  </AddChip>
                )}
                {!fresh && (
                  <AddChip icon={PipetteIcon} onClick={() => setPicking(true)}>
                    New colour
                  </AddChip>
                )}
              </>
            }
          />
          {fresh && (
            <div className="flex items-center gap-2 rounded-row bg-muted/60 py-2 pr-2 pl-3">
              <Swatch hex={fresh.hex} size="md" />
              <Input
                size="sm"
                aria-label="New colour's name"
                value={fresh.name}
                maxLength={40}
                autoComplete="off"
                className="flex-1 bg-card"
                onChange={(e) => change({ colour: { ...fresh, name: e.target.value } })}
              />
              <Button variant="ghost" size="sm" onClick={() => setPicking(true)}>
                <PipetteIcon /> Pick
              </Button>
            </div>
          )}
        </SheetField>
        <SheetField label="Category">
          {lists.category.length ? (
            <ChoiceChips
              single
              aria-label="Category"
              choices={lists.category.map((c) => ({ id: c.id, name: c.name }))}
              chosen={new Set(draft.category ? [draft.category] : [])}
              onChange={(v) => change({ category: v[0] })}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              render={<Link to="/settings/wardrobe" />}
            >
              Add categories in Settings
            </Button>
          )}
        </SheetField>
        <SheetField
          label="Size"
          aside={sizes.rest.length && categoryName ? `Used with ${categoryName}` : undefined}
        >
          {lists.size.length ? (
            <ChoiceChips
              single
              aria-label="Size"
              choices={shownSizes.map((s) => ({ id: s.id, name: s.name }))}
              chosen={new Set(draft.size ? [draft.size] : [])}
              onChange={(v) => change({ size: v[0] })}
              add={
                sizes.rest.length > 0 && !moreSizes ? (
                  <AddChip icon={null} onClick={() => setMoreSizes(true)}>
                    More sizes
                  </AddChip>
                ) : undefined
              }
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              render={<Link to="/settings/wardrobe" />}
            >
              Add sizes in Settings
            </Button>
          )}
        </SheetField>
        <BrandField
          brands={lists.brand}
          recent={recentBrands(garments, lists.brand)}
          chosen={draft.brand}
          onChoose={(brand) => change({ brand })}
        />
        <SheetField label="Fit" aside="Optional">
          <ChoiceChips
            single
            aria-label="Fit"
            choices={lists.fit.map((f) => ({ id: f.id, name: f.name }))}
            chosen={new Set(draft.fit ? [draft.fit] : [])}
            onChange={(v) => change({ fit: v[0] ?? null })}
            add={
              <NewEntryChip
                list="fit"
                one="Fit"
                entries={lists.fit}
                onMade={(fit) => change({ fit })}
              />
            }
          />
        </SheetField>
        <SheetField label="Tags" aside="Optional">
          <ChoiceChips
            aria-label="Tags"
            choices={lists.tag.map((t) => ({ id: t.id, name: t.name }))}
            chosen={new Set(draft.tags)}
            onChange={(tags) => change({ tags })}
            add={
              <NewEntryChip
                list="tag"
                one="Tag"
                entries={lists.tag}
                onMade={(t) => setDraft((d) => ({ ...d, tags: [...new Set([...d.tags, t])] }))}
              />
            }
          />
        </SheetField>
        {naming ? (
          <SheetField label="Own name" aside="Optional">
            <Input
              aria-label="Own name"
              value={draft.ownName}
              maxLength={80}
              placeholder={title}
              autoComplete="off"
              onChange={(e) => change({ ownName: e.target.value })}
            />
          </SheetField>
        ) : (
          <Button variant="link" size="sm" className="self-start" onClick={() => setNaming(true)}>
            <PlusIcon /> Own name
          </Button>
        )}
      </GarmentSheet>
      {picking && (
        <NewColourDialog
          photo={photo?.url ?? photoUrl}
          start={
            fresh?.hex ??
            photo?.estimate.hex ??
            byId(lists.colour, draft.colour?.kind === 'mine' ? draft.colour.id : undefined)?.hex ??
            GREY
          }
          mine={lists.colour}
          onClose={() => setPicking(false)}
          onUse={(colour) => {
            change({ colour })
            setPicking(false)
          }}
        />
      )}
      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing ? 'Discard your changes?' : 'Discard this garment?'}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              Discard
            </AlertDialogAction>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
