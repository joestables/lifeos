import { todayIn } from '@lifeos/recurrence'
import { ClockIcon, PackageIcon, SearchIcon, StarIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  CardRow,
  EmptyState,
  KeepToggles,
  PantryAisle,
  PantryRow,
  SectionLabel,
  SortMenu,
  type Kept,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AddToPantryDialog } from './add-to-pantry'
import { MoreMenu } from './more-menu'
import { MergeDialog, RecipesUsingDialog } from './pantry-dialogs'
import { PantryEntryDialog } from './pantry-entry'
import { SearchField } from './search-field'
import { SpaceSelect } from './space-select'
import {
  addPantry,
  queue,
  keepEntry,
  removeEntry,
  removePantry,
  updateLine,
  useFood,
  useFoodSpaces,
  useMeals,
  useSettings,
  usePantryInUse,
  useShopping,
  type PantryEntry,
} from '@/data'
import {
  AISLES,
  PANTRY_SORTS,
  mealsUsing,
  mergeable,
  pantryShown,
  pantryUse,
  recipesUsing,
  typedNames,
  usedIn,
  type Aisle,
  type PantryRecipe,
  type PantrySort,
  type TypedName,
} from '@/lib/pantry'
import type { SortDirection } from '@/lib/sort'

type Open =
  { kind: 'edit' | 'recipes' | 'merge'; entry: PantryEntry } | { kind: 'typed'; typed: TypedName }

type Showing = 'all' | Kept

/** How the Pantry is shown, kept on this device (PAN-001 1). */
interface View {
  sort: PantrySort
  dir: SortDirection
  aisle: boolean
  unit: boolean
  /** How many Recipes use each entry (Joe, 26 October). */
  recipes: boolean
  showing: Showing
  /** Whose staples and Essentials: a Space, until I choose another. */
  space: string | null
}

const KEY = 'lifeos.pantry.view'
const DEFAULT: View = {
  sort: 'aisle',
  dir: 'asc',
  aisle: false,
  unit: false,
  recipes: true,
  showing: 'all',
  space: null,
}

function useView(): [View, (patch: Partial<View>) => void] {
  const [view, setView] = useState<View>(() => {
    try {
      return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<View>) }
    } catch {
      return DEFAULT
    }
  })
  const change = (patch: Partial<View>) =>
    setView((v) => {
      const next = { ...v, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Kept for this visit only.
      }
      return next
    })
  return [view, change]
}

/** My Recipes' lines kept as typed, to add to the Pantry (PAN-004 2). */
function useTyped() {
  const food = useFood(queue)
  const recipes = usePantryRecipes()
  const entries = useMemo(() => [...food.pantry.values()], [food.pantry])
  return useMemo(() => typedNames(recipes, entries), [recipes, entries])
}

function usePantryRecipes(): PantryRecipe[] {
  const food = useFood(queue)
  return useMemo(
    () =>
      food.recipes.map((r) => ({
        id: r.item.id,
        name: r.item.title,
        mine: r.mine,
        variations: r.variations.map((v) => ({ id: v.item.id, mine: v.mine, lines: v.lines })),
      })),
    [food.recipes],
  )
}

/** Lines kept as typed in my Recipes, now using the entry (PAN-004 2). */
const link = (t: TypedName, pantry: string) => {
  for (const l of t.lines) updateLine(l.variation, l.line, { pantry_id: pantry, text: null })
}

/**
 * The Meal plan's Pantry (PAN-001–004, SHP-005): a Space's staples and
 * Essentials picked from it (All · Staples · Essentials), ingredients by
 * aisle or sorted by use, household items; Pending leads to the names kept
 * as typed. New entry is opened by the page's action.
 */
export function PantryTab({
  creating,
  onCreating,
  onPending,
}: {
  creating: boolean
  onCreating: (on: boolean) => void
  onPending: () => void
}) {
  const food = useFood(queue)
  const { entries: kept, lists } = useShopping(queue)
  const spaces = useFoodSpaces(queue)
  const [view, change] = useView()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => {
    setOpen(null)
    onCreating(false)
  }
  const space =
    view.space && spaces.spaces.some((s) => s.id === view.space)
      ? view.space
      : (spaces.home ?? spaces.personal)

  const recipes = usePantryRecipes()
  const entries = useMemo(() => [...food.pantry.values()], [food.pantry])
  const using = useMemo(() => recipesUsing(recipes), [recipes])
  const { meals } = useMeals(queue)
  const inUse = usePantryInUse(queue)
  const today = todayIn(useSettings(queue).timezone)
  // Only Meals today or later keep an entry (Joe, 24 October): a past
  // Meal's line becomes typed when its entry goes.
  const mealUses = useMemo(
    () =>
      mealsUsing(
        meals
          .filter((m) => m.item.do_on !== null && m.item.do_on >= today)
          .map((m) => ({ id: m.item.id, name: m.item.title, lines: m.lines })),
      ),
    [meals, today],
  )
  const typed = useTyped()

  // Recently used and Most popular (Joe, 25 October).
  const use = useMemo(() => {
    const variationLines = new Map(
      food.recipes.flatMap((r) => r.variations.map((v) => [v.item.id, v.lines] as const)),
    )
    return pantryUse(
      food.recipes.map((r) => ({
        when: r.item.updated_at,
        lines: r.variations.flatMap((v) => v.lines),
      })),
      meals
        .filter((m) => m.item.do_on && !m.leftoversOf)
        .map((m) => ({
          when: m.item.do_on!,
          lines: [...m.lines, ...((m.variation && variationLines.get(m.variation)) || [])],
        })),
      lists
        .filter((l) => l.kind === 'food')
        .map((l) => ({ when: l.item.do_on ?? l.item.created_at, lines: l.lines })),
    )
  }, [food.recipes, meals, lists])

  const keptHere = useMemo(
    () => new Map(kept.filter((k) => k.space_id === space).map((k) => [k.pantry_id, k])),
    [kept, space],
  )
  const showing = entries.filter(
    (e) => view.showing === 'all' || keptHere.get(e.id)?.kind === view.showing,
  )
  const { groups, household } = pantryShown(showing, search, view.sort, view.dir, use)
  const shown = groups.length > 0 || household.length > 0

  const remove = (entry: PantryEntry) => {
    const used = [...(using.get(entry.id) ?? []), ...(mealUses.get(entry.id) ?? [])]
    if (used.length) {
      toast(usedIn(used))
      return
    }
    // Only a deleted Recipe uses it (Settings → Deleted).
    if (inUse.has(entry.id)) {
      toast('Used in a deleted recipe')
      return
    }
    // Its place among my Spaces' staples and Essentials comes back with it.
    const keptIn = kept.filter((k) => k.pantry_id === entry.id)
    removePantry(entry.id)
    toast(`Deleted "${entry.name}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          addPantry(entry, entry.id)
          for (const k of keptIn) keepEntry(k.space_id, entry.id, k.kind as Kept, k.needed)
        },
      },
    })
  }

  /** A staple or Essential, or neither, in the Space chosen (SHP-005 1). */
  const setKept = (e: PantryEntry, kind: Kept | null) => {
    if (!space) return
    const was = keptHere.get(e.id)
    if (kind) keepEntry(space, e.id, kind)
    else {
      removeEntry(space, e.id)
      // Gone from the list in view: Undo brings it back.
      if (view.showing !== 'all' && was)
        toast(`Took "${e.name}" off ${was.kind === 'staple' ? 'staples' : 'essentials'}`, {
          action: {
            label: 'Undo',
            onClick: () => keepEntry(space, e.id, was.kind as Kept, was.needed),
          },
        })
    }
  }

  const meta = (e: PantryEntry) =>
    [
      view.aisle &&
        (e.kind === 'household' ? 'Household' : AISLES[(e.aisle ?? 'cupboard') as Aisle]),
      view.unit && e.default_unit,
    ]
      .filter(Boolean)
      .join(' · ') || undefined

  const row = (e: PantryEntry) => {
    const mine = e.added_by === food.me
    const k = keptHere.get(e.id)
    return (
      <PantryRow
        key={e.id}
        name={e.name}
        meta={meta(e)}
        recipes={view.recipes ? using.get(e.id)?.length : undefined}
        actions={
          space && (
            <KeepToggles
              name={e.name}
              kept={(k?.kind as Kept | undefined) ?? null}
              needed={k?.needed}
              onKept={(kind) => setKept(e, kind)}
              onNeeded={(on) => k && keepEntry(space, e.id, k.kind as Kept, on)}
            />
          )
        }
        menu={
          <MoreMenu>
            {mine && (
              <DropdownMenuItem onClick={() => setOpen({ kind: 'edit', entry: e })}>
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setOpen({ kind: 'recipes', entry: e })}>
              Recipes that use it
            </DropdownMenuItem>
            {mine && mergeable(e, food.pantry, food.me).length > 0 && (
              <DropdownMenuItem onClick={() => setOpen({ kind: 'merge', entry: e })}>
                Merge into…
              </DropdownMenuItem>
            )}
            {mine && (
              <DropdownMenuItem variant="destructive" onClick={() => remove(e)}>
                Delete
              </DropdownMenuItem>
            )}
          </MoreMenu>
        }
      />
    )
  }

  const empty = search.trim()
    ? { icon: SearchIcon, title: 'Nothing matches' }
    : view.showing === 'staple'
      ? { icon: PackageIcon, title: 'No staples yet' }
      : view.showing === 'essential'
        ? { icon: StarIcon, title: 'No essentials yet' }
        : { icon: PackageIcon, title: 'Nothing in the Pantry' }

  return (
    <>
      {(creating || open?.kind === 'edit') && (
        <PantryEntryDialog
          entry={open?.kind === 'edit' ? open.entry : undefined}
          pantry={food.pantry}
          onClose={close}
        />
      )}
      {open?.kind === 'recipes' && (
        <RecipesUsingDialog
          entry={open.entry}
          recipes={using.get(open.entry.id) ?? []}
          onClose={close}
        />
      )}
      {open?.kind === 'merge' && (
        <MergeDialog entry={open.entry} pantry={food.pantry} me={food.me} onClose={close} />
      )}
      <div className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {spaces.spaces.length > 1 && space && (
            <SpaceSelect
              label="Whose staples and essentials"
              spaces={spaces.spaces}
              value={space}
              onChange={(s) => change({ space: s })}
              className="w-40 min-w-0"
            />
          )}
          {/* On a phone, Pending beside whose and the toggle on its own row
              (Joe, 26 October); on a computer all on one. */}
          <div className="max-sm:order-last max-sm:w-full">
            <ToggleGroup
              aria-label="Show"
              value={[view.showing]}
              onValueChange={(v: string[]) => v[0] && change({ showing: v[0] as Showing })}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="staple">Staples</ToggleGroupItem>
              <ToggleGroupItem value="essential">Essentials</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Pending${typed.length ? `, ${typed.length}` : ''}`}
            className="sm:ml-auto"
            onClick={onPending}
          >
            <ClockIcon />
            Pending
            {typed.length > 0 && (
              <Badge variant="secondary" className="-mr-1 tabular-nums">
                {typed.length}
              </Badge>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <SearchField label="Search the Pantry" value={search} onChange={setSearch} />
          <SortMenu<PantrySort>
            options={PANTRY_SORTS}
            value={view.sort}
            direction={view.dir}
            onChange={(sort, dir) => change({ sort, dir })}
          >
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={view.aisle}
                closeOnClick={false}
                onCheckedChange={(on) => change({ aisle: on })}
              >
                Aisle
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={view.unit}
                closeOnClick={false}
                onCheckedChange={(on) => change({ unit: on })}
              >
                Default unit
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={view.recipes}
                closeOnClick={false}
                onCheckedChange={(on) => change({ recipes: on })}
              >
                Number of recipes
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
          </SortMenu>
        </div>
        {!food.isLoading && !shown && <EmptyState icon={empty.icon} title={empty.title} />}
        {groups.length > 0 && <SectionLabel>Ingredients</SectionLabel>}
        {groups.map((g) => (
          <PantryAisle key={g.key} label={g.label} title={view.sort === 'aisle'}>
            {g.entries.map(row)}
          </PantryAisle>
        ))}
        {household.length > 0 && (
          <>
            <SectionLabel>Household items</SectionLabel>
            <PantryAisle label="Household items" title={false}>
              {household.map(row)}
            </PantryAisle>
          </>
        )}
      </div>
    </>
  )
}

/**
 * Pending (PAN-004 2): the names my Recipes' lines kept as typed, each to
 * add to the Pantry with its aisle, or all at once (in Cupboard).
 */
export function PendingTab() {
  const food = useFood(queue)
  const typed = useTyped()
  const [adding, setAdding] = useState<TypedName | null>(null)
  const addAll = () => {
    for (const t of typed) link(t, addPantry({ name: t.name }))
    toast(typed.length === 1 ? `Added "${typed[0]!.name}"` : `Added ${typed.length} to the Pantry`)
  }
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {adding && (
        <AddToPantryDialog
          name={adding.name}
          pantry={food.pantry}
          onAdd={(name, aisle, default_unit) =>
            link(adding, addPantry({ name, aisle, default_unit }))
          }
          onClose={() => setAdding(null)}
        />
      )}
      {!food.isLoading && typed.length === 0 && (
        <EmptyState icon={ClockIcon} title="Nothing pending" />
      )}
      {typed.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel className="mb-0">Kept as typed</SectionLabel>
            <Button variant="outline" size="sm" onClick={addAll}>
              Add all
            </Button>
          </div>
          <PantryAisle label="Kept as typed" title={false}>
            {typed.map((t) => (
              <CardRow
                key={t.name}
                className="px-3"
                label={t.name}
                value={`${t.recipes} ${t.recipes === 1 ? 'recipe' : 'recipes'}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Add ${t.name}`}
                  onClick={() => setAdding(t)}
                >
                  Add
                </Button>
              </CardRow>
            ))}
          </PantryAisle>
        </>
      )}
    </div>
  )
}
