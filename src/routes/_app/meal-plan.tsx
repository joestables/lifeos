import { createFileRoute } from '@tanstack/react-router'
import { PackageIcon, SearchIcon, StarIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  CardRow,
  EmptyState,
  PageAction,
  PantryAisle,
  PageHeader,
  PantryRow,
  SectionLabel,
  TypeScope,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AddToPantryDialog } from '@/app/add-to-pantry'
import { MoreMenu } from '@/app/more-menu'
import { MergeDialog, RecipesUsingDialog } from '@/app/pantry-dialogs'
import { PantryEntryDialog } from '@/app/pantry-entry'
import { SearchField } from '@/app/search-field'
import {
  addPantry,
  queue,
  removePantry,
  setStaple,
  updateLine,
  useFood,
  useStaples,
  type PantryEntry,
} from '@/data'
import {
  mergeable,
  pantryGroups,
  recipesUsing,
  typedNames,
  usedIn,
  type PantryRecipe,
  type PantryShow,
  type TypedName,
} from '@/lib/pantry'

/**
 * The Meal plan (patterns.md#meal-plan). Until the week is built (plan step
 * 7) it is the Pantry alone (PAN-001–004).
 */
export const Route = createFileRoute('/_app/meal-plan')({ component: MealPlanPage })

type Open =
  | { kind: 'new' }
  | { kind: 'edit' | 'recipes' | 'merge'; entry: PantryEntry }
  | { kind: 'typed'; typed: TypedName }

const EMPTY: Record<PantryShow, string> = {
  all: 'Nothing in the Pantry',
  staples: 'No staples',
  out: 'Nothing out of stock',
}

function MealPlanPage() {
  const food = useFood(queue)
  const { space, staples } = useStaples(queue)
  const [search, setSearch] = useState('')
  const [show, setShow] = useState<PantryShow>('all')
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => setOpen(null)

  const recipes: PantryRecipe[] = useMemo(
    () =>
      food.recipes.map((r) => ({
        id: r.item.id,
        name: r.item.title,
        mine: r.mine,
        variations: r.variations.map((v) => ({ id: v.item.id, mine: v.mine, lines: v.lines })),
      })),
    [food.recipes],
  )
  const entries = useMemo(() => [...food.pantry.values()], [food.pantry])
  const using = useMemo(() => recipesUsing(recipes), [recipes])
  const typed = useMemo(() => typedNames(recipes, entries), [recipes, entries])
  const { aisles, household } = pantryGroups(entries, staples, show, search)
  const shown = aisles.length > 0 || household.length > 0

  const remove = (entry: PantryEntry) => {
    const used = using.get(entry.id) ?? []
    if (used.length) {
      toast(usedIn(used))
      return
    }
    const staple = staples.get(entry.id)
    removePantry(entry.id)
    toast(`Deleted "${entry.name}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          addPantry(entry, entry.id)
          if (staple && space) setStaple(space, entry.id, true, staple.out)
        },
      },
    })
  }

  /** Lines kept as typed in my Recipes, now using the entry (PAN-004 2). */
  const link = (t: TypedName, pantry: string) => {
    for (const l of t.lines) updateLine(l.variation, l.line, { pantry_id: pantry, text: null })
  }
  const addAll = () => {
    for (const t of typed) link(t, addPantry({ name: t.name }))
    toast(typed.length === 1 ? `Added "${typed[0]!.name}"` : `Added ${typed.length} to the Pantry`)
  }

  const row = (e: PantryEntry) => {
    const staple = staples.get(e.id)
    const mine = e.added_by === food.me
    return (
      <PantryRow
        key={e.id}
        name={e.name}
        unit={e.default_unit ?? undefined}
        recipes={using.get(e.id)?.length}
        staple={staple !== undefined}
        out={staple?.out ?? false}
        onStaple={space ? (on) => setStaple(space, e.id, on) : undefined}
        onOut={space ? (on) => setStaple(space, e.id, true, on) : undefined}
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
                Merge with…
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

  return (
    <TypeScope colour="green">
      <PageHeader
        title="Meal plan"
        action={{ label: 'New entry', onClick: () => setOpen({ kind: 'new' }) }}
      />
      {(open?.kind === 'new' || open?.kind === 'edit') && (
        <PantryEntryDialog
          entry={open.kind === 'edit' ? open.entry : undefined}
          pantry={food.pantry}
          space={space}
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
      {open?.kind === 'typed' && (
        <AddToPantryDialog
          name={open.typed.name}
          pantry={food.pantry}
          onAdd={(name, aisle) => link(open.typed, addPantry({ name, aisle }))}
          onClose={close}
        />
      )}
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-28 sm:px-9 sm:pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 basis-56">
            <SearchField label="Search the Pantry" value={search} onChange={setSearch} />
          </div>
          <ToggleGroup
            aria-label="Show"
            value={[show]}
            onValueChange={(v: string[]) => v[0] && setShow(v[0] as PantryShow)}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="staples">Staples</ToggleGroupItem>
            <ToggleGroupItem value="out">Out of stock</ToggleGroupItem>
          </ToggleGroup>
          <PageAction label="New entry" onClick={() => setOpen({ kind: 'new' })} />
        </div>
        {!food.isLoading && !shown && (
          <EmptyState
            icon={search.trim() ? SearchIcon : show === 'all' ? PackageIcon : StarIcon}
            title={search.trim() ? 'Nothing matches' : EMPTY[show]}
          />
        )}
        {aisles.length > 0 && <SectionLabel>Ingredients</SectionLabel>}
        {aisles.map((a) => (
          <PantryAisle key={a.aisle} label={a.label}>
            {a.entries.map(row)}
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
        {show === 'all' && !search.trim() && typed.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Kept as typed</SectionLabel>
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
                    onClick={() => setOpen({ kind: 'typed', typed: t })}
                  >
                    Add
                  </Button>
                </CardRow>
              ))}
            </PantryAisle>
          </>
        )}
      </div>
    </TypeScope>
  )
}
