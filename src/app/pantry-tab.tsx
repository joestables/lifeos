import { todayIn } from '@lifeos/recurrence'
import { PackageIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CardRow, EmptyState, PantryAisle, PantryRow, SectionLabel } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { AddToPantryDialog } from './add-to-pantry'
import { MoreMenu } from './more-menu'
import { MergeDialog, RecipesUsingDialog } from './pantry-dialogs'
import { PantryEntryDialog } from './pantry-entry'
import { SearchField } from './search-field'
import {
  addPantry,
  queue,
  keepEntry,
  removePantry,
  updateLine,
  useFood,
  useMeals,
  useSettings,
  usePantryInUse,
  useShopping,
  type PantryEntry,
} from '@/data'
import {
  mealsUsing,
  mergeable,
  pantryGroups,
  recipesUsing,
  typedNames,
  usedIn,
  type PantryRecipe,
  type TypedName,
} from '@/lib/pantry'

type Open =
  { kind: 'edit' | 'recipes' | 'merge'; entry: PantryEntry } | { kind: 'typed'; typed: TypedName }

/**
 * The Meal plan's Pantry (PAN-001–004): ingredients by aisle, household
 * items, and names kept as typed; New entry is opened by the page's action.
 * Staples and Essentials are kept on Shopping → Food (SHP-005).
 */
export function PantryTab({
  creating,
  onCreating,
}: {
  creating: boolean
  onCreating: (on: boolean) => void
}) {
  const food = useFood(queue)
  const kept = useShopping(queue).entries
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => {
    setOpen(null)
    onCreating(false)
  }

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
  const typed = useMemo(() => typedNames(recipes, entries), [recipes, entries])
  const { aisles, household } = pantryGroups(entries, search)
  const shown = aisles.length > 0 || household.length > 0

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
          for (const k of keptIn)
            keepEntry(k.space_id, entry.id, k.kind as 'staple' | 'essential', k.needed)
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
    const mine = e.added_by === food.me
    return (
      <PantryRow
        key={e.id}
        name={e.name}
        recipes={using.get(e.id)?.length}
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
      {open?.kind === 'typed' && (
        <AddToPantryDialog
          name={open.typed.name}
          pantry={food.pantry}
          onAdd={(name, aisle, default_unit) =>
            link(open.typed, addPantry({ name, aisle, default_unit }))
          }
          onClose={close}
        />
      )}
      <div className="flex max-w-3xl flex-col gap-4">
        <SearchField label="Search the Pantry" value={search} onChange={setSearch} />
        {!food.isLoading && !shown && (
          <EmptyState
            icon={search.trim() ? SearchIcon : PackageIcon}
            title={search.trim() ? 'Nothing matches' : 'Nothing in the Pantry'}
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
        {!search.trim() && typed.length > 0 && (
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
    </>
  )
}
