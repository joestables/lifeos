import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ChefHatIcon,
  LinkIcon,
  ListChecksIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  StickyNoteIcon,
  Trash2Icon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import {
  EmptyState,
  FilterLayout,
  FilterPanel,
  FilterSection,
  ItemRow,
  PageAction,
  PageHeader,
  RecipeCard,
  RecipeGrid,
  SectionLabel,
  SelectionBar,
  TabsRow,
  TypeScope,
  TypeTile,
  type CardSize,
  type FilterGroup,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLibraryView } from '@/app/library-view'
import { NewIdeaDialog } from '@/app/new-idea'
import { archiveRecipes, deleteRecipes, makeDrafts } from '@/app/recipe-actions'
import { HeadingDialog } from '@/app/recipe-heading'
import { queue, setMark, useFood, usePhotoUrls } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { capturedWhen } from '@/lib/dates'
import {
  FILTERS,
  GROUPINGS,
  MINE,
  SORTS,
  filterValues,
  groupRecipes,
  ideaRecipes,
  inLibrary,
  libraryRecipes,
  sourceHost,
  type Grouping,
  type Sort,
  type StateFilter,
} from '@/lib/recipes'
import { useLongPress } from '@/hooks/use-long-press'
import { MoreMenu } from '@/app/more-menu'

type Tab = 'recipes' | 'ideas'

/** The Recipes library and the Ideas list (RCP-001, RCP-002, RCP-004). */
export const Route = createFileRoute('/_app/recipes/')({
  validateSearch: (s: Record<string, unknown>): { tab?: 'ideas' } =>
    s.tab === 'ideas' ? { tab: 'ideas' } : {},
  component: Recipes,
})

function Recipes() {
  const tab: Tab = Route.useSearch().tab ?? 'recipes'
  const navigate = useNavigate()
  const food = useFood(queue)
  const [making, setMaking] = useState<'recipe' | 'idea' | null>(null)
  const open = (id: string, search: { edit?: 'variation' } = {}) =>
    void navigate({ to: '/recipes/$id', params: { id }, search })

  const newRecipe = () => setMaking('recipe')
  const newIdea = () => setMaking('idea')

  return (
    <TypeScope colour="green">
      <PageHeader
        title="Recipes"
        action={
          tab === 'ideas'
            ? { label: 'New idea', onClick: newIdea }
            : { label: 'New recipe', onClick: newRecipe }
        }
      />
      {making === 'recipe' && (
        <HeadingDialog
          food={food}
          onClose={() => setMaking(null)}
          // Its page first, so Done in editing lands on it.
          onCreated={({ recipe }) =>
            void navigate({ to: '/recipes/$id', params: { id: recipe } }).then(() =>
              open(recipe, { edit: 'variation' }),
            )
          }
        />
      )}
      {making === 'idea' && <NewIdeaDialog food={food} onClose={() => setMaking(null)} />}
      <div
        className={
          tab === 'ideas'
            ? 'flex max-w-3xl flex-col gap-4 px-5 pb-28 sm:px-9 sm:pb-8'
            : 'flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8'
        }
      >
        <TabsRow>
          <Tabs
            value={tab}
            onValueChange={(value: Tab) =>
              void navigate({
                to: '.',
                search: { tab: value === 'ideas' ? 'ideas' : undefined },
                replace: true,
              })
            }
          >
            <TabsList aria-label="View">
              <TabsTrigger value="recipes">Recipes</TabsTrigger>
              <TabsTrigger value="ideas">Ideas</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === 'ideas' ? (
            <PageAction label="New idea" onClick={newIdea} />
          ) : (
            <NewRecipeMenu onRecipe={newRecipe} onIdea={newIdea} />
          )}
        </TabsRow>
        {tab === 'ideas' ? (
          <Ideas recipes={food.recipes} loading={food.isLoading} onOpen={(id) => open(id)} />
        ) : (
          <Library food={food} onOpen={(id) => open(id)} />
        )}
      </div>
    </TypeScope>
  )
}

/** New recipe, New idea; Import from a link waits for its step (plan step 8). */
function NewRecipeMenu({ onRecipe, onIdea }: { onRecipe: () => void; onIdea: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" className="hidden md:inline-flex" />}>
        <PlusIcon /> New recipe
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onRecipe}>
          <ChefHatIcon /> New recipe
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onIdea}>
          <StickyNoteIcon /> New idea
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SearchField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        size="sm"
        type="search"
        aria-label={label}
        placeholder={label}
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SmallSelect<T extends string>({
  value,
  options,
  label,
  fill,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  label: string
  /** Sharing the row's width (a phone). */
  fill?: boolean
  onChange: (value: T) => void
}) {
  return (
    <Select value={value} items={options} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        className={fill ? 'min-w-0 flex-1 lg:w-auto lg:flex-none' : 'w-auto'}
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
  )
}

const BULK = (onArchive: () => void, onDelete: () => void, extra?: ReactNode) => (
  <>
    {extra}
    <Button variant="ghost" size="sm" onClick={onArchive}>
      <ArchiveIcon /> Archive
    </Button>
    <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
      <Trash2Icon /> Delete
    </Button>
  </>
)

/** Choosing several of my own (RCP-004). */
function useChoosing() {
  const [choosing, setChoosing] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const choose = (id: string, on: boolean) =>
    setChosen((c) => {
      const next = new Set(c)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const start = (id?: string) => {
    setChoosing(true)
    setChosen(new Set(id ? [id] : []))
  }
  const done = () => {
    setChoosing(false)
    setChosen(new Set())
  }
  return { choosing, chosen, choose, start, done }
}

function Library({
  food,
  onOpen,
}: {
  food: ReturnType<typeof useFood>
  onOpen: (id: string) => void
}) {
  const { view, size, change, setSearch } = useLibraryView()
  const [sheet, setSheet] = useState(false)
  const choosing = useChoosing()
  const all = useMemo(() => food.recipes.filter(inLibrary), [food.recipes])
  const shown = libraryRecipes(food.recipes, view, food.pantry)
  const photos = usePhotoUrls(shown.map((r) => r.photo?.path))
  const values = filterValues(all)
  const groups: FilterGroup[] = FILTERS.map((name) => {
    const chosen = view.chosen[name] ?? []
    // A chosen value no Recipe has now still shows, to be taken off.
    const extra = chosen.filter((c) => !values[name].includes(c))
    return {
      name,
      values: name === 'Favourites' ? [MINE] : [...values[name], ...extra],
      chosen,
      open: name === 'Category',
    }
  }).filter((g) => g.values.length > 0)
  const chosenCount =
    Object.values(view.chosen).reduce((n, vs) => n + (vs?.length ?? 0), 0) +
    (view.state === 'all' ? 0 : 1)
  const onChange = (group: string, chosen: string[]) =>
    change({ chosen: { ...view.chosen, [group]: chosen } })
  const reset = () => change({ chosen: {}, state: 'all' })
  const stateFilter = (
    <FilterSection title="State">
      <ToggleGroup
        aria-label="State"
        value={[view.state]}
        onValueChange={(v: string[]) => v[0] && change({ state: v[0] as StateFilter })}
        className="self-start"
      >
        <ToggleGroupItem value="draft">Draft</ToggleGroupItem>
        <ToggleGroupItem value="complete">Complete</ToggleGroupItem>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
      </ToggleGroup>
    </FilterSection>
  )
  const sortAndGroup = (fill: boolean) => (
    <>
      <SmallSelect<Sort>
        fill={fill}
        label="Sort"
        value={view.sort}
        options={SORTS}
        onChange={(sort) => change({ sort })}
      />
      <SmallSelect<Grouping>
        fill={fill}
        label="Group"
        value={view.group}
        options={GROUPINGS}
        onChange={(group) => change({ group })}
      />
    </>
  )
  const picked = shown.filter((r) => choosing.chosen.has(r.item.id))
  const act = (fn: (rs: RecipeView[]) => void) => () => {
    if (picked.length) fn(picked)
    choosing.done()
  }

  return (
    <>
      <FilterLayout
        filters={
          <FilterPanel groups={groups} onChange={onChange} onReset={reset}>
            {stateFilter}
          </FilterPanel>
        }
      >
        {choosing.choosing ? (
          <SelectionBar count={picked.length} onDone={choosing.done}>
            {BULK(act(archiveRecipes), act(deleteRecipes))}
          </SelectionBar>
        ) : (
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex items-center gap-2 lg:contents">
              <SearchField label="Search recipes" value={view.search} onChange={setSearch} />
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setSheet(true)}
              >
                <SlidersHorizontalIcon /> Filters
                {chosenCount > 0 && <Badge className="-mr-1">{chosenCount}</Badge>}
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
              <Button
                variant="ghost"
                size="sm"
                className="max-md:hidden"
                onClick={() => choosing.start()}
              >
                <ListChecksIcon /> Select
              </Button>
            </div>
          </div>
        )}
        {!food.isLoading && all.length === 0 && (
          <EmptyState icon={ChefHatIcon} title="No recipes yet" />
        )}
        {all.length > 0 && shown.length === 0 && (
          <EmptyState icon={SlidersHorizontalIcon} title="No recipes match" />
        )}
        {groupRecipes(shown, view.group).map((g) => {
          const grid = (
            <RecipeGrid size={size}>
              {g.recipes.map((r) => (
                <RecipeCard
                  key={r.item.id}
                  name={r.item.title}
                  photo={r.photo && photos.get(r.photo.path)}
                  cuisine={r.heading.cuisine ?? undefined}
                  draft={r.state === 'active'}
                  favourite={r.favourite}
                  selecting={choosing.choosing}
                  selected={choosing.chosen.has(r.item.id)}
                  onOpen={() => onOpen(r.item.id)}
                  onFavourite={(on) => setMark(r.item.id, on)}
                  onSelect={(on) => r.mine && choosing.choose(r.item.id, on)}
                  onLongPress={
                    choosing.choosing || !r.mine ? undefined : () => choosing.start(r.item.id)
                  }
                />
              ))}
            </RecipeGrid>
          )
          return g.label ? (
            <section key={g.key}>
              <SectionLabel>{g.label}</SectionLabel>
              {grid}
            </section>
          ) : (
            <div key={g.key}>{grid}</div>
          )
        })}
      </FilterLayout>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="right" initialFocus={false} data-colour="green">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div>
            <FilterPanel bare groups={groups} onChange={onChange} onReset={reset}>
              {stateFilter}
            </FilterPanel>
          </div>
          <SheetFooter className="grid grid-cols-2">
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button onClick={() => setSheet(false)}>
              {shown.length === 1 ? 'Show 1 recipe' : `Show ${shown.length} recipes`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

function IdeaRow({
  idea,
  choosing,
  chosen,
  onChoose,
  onStart,
  onOpen,
}: {
  idea: RecipeView
  choosing: boolean
  chosen: boolean
  onChoose: (on: boolean) => void
  onStart?: () => void
  onOpen: () => void
}) {
  const longPress = useLongPress(onStart)
  const fields = idea.defaultVariation?.fields
  const source = fields?.sources[0]
  return (
    <div {...longPress}>
      <ItemRow
        leading={
          choosing ? (
            <Checkbox
              colour="green"
              checked={chosen}
              onCheckedChange={onChoose}
              aria-label={idea.item.title}
            />
          ) : (
            <TypeTile colour="green" icon={ChefHatIcon} />
          )
        }
        title={idea.item.title}
        meta={[
          source && (
            <span key="source" className="inline-flex items-center gap-1">
              <LinkIcon className="size-3.5" /> {sourceHost(source)}
            </span>
          ),
          capturedWhen(idea.item.created_at),
          fields?.notes,
        ].filter(Boolean)}
        sync={idea.item.sync}
        menu={
          idea.mine && !choosing ? (
            <MoreMenu>
              <DropdownMenuItem onClick={() => makeDrafts([idea])}>
                <ChefHatIcon /> Make it a draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => archiveRecipes([idea], 'idea')}>
                <ArchiveIcon /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => deleteRecipes([idea], 'idea')}>
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </MoreMenu>
          ) : undefined
        }
        onOpen={choosing ? () => idea.mine && onChoose(!chosen) : onOpen}
      />
    </div>
  )
}

function Ideas({
  recipes,
  loading,
  onOpen,
}: {
  recipes: RecipeView[]
  loading: boolean
  onOpen: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const choosing = useChoosing()
  const ideas = ideaRecipes(recipes, search)
  const any = recipes.some((r) => r.state === 'idea')
  const picked = ideas.filter((r) => choosing.chosen.has(r.item.id))
  const act = (fn: (rs: RecipeView[]) => void) => () => {
    if (picked.length) fn(picked)
    choosing.done()
  }

  return (
    <>
      {choosing.choosing ? (
        <SelectionBar count={picked.length} onDone={choosing.done}>
          {BULK(
            act((rs) => archiveRecipes(rs, 'idea')),
            act((rs) => deleteRecipes(rs, 'idea')),
            <Button variant="ghost" size="sm" onClick={act(makeDrafts)}>
              <ChefHatIcon /> Make drafts
            </Button>,
          )}
        </SelectionBar>
      ) : (
        <div className="flex items-center gap-2">
          <SearchField label="Search ideas" value={search} onChange={setSearch} />
          <Button
            variant="ghost"
            size="sm"
            className="max-md:hidden"
            onClick={() => choosing.start()}
          >
            <ListChecksIcon /> Select
          </Button>
        </div>
      )}
      {!loading && !any && <EmptyState icon={StickyNoteIcon} title="No ideas yet" />}
      {any && ideas.length === 0 && <EmptyState icon={SearchIcon} title="No ideas match" />}
      <div className="flex flex-col gap-1.5">
        {ideas.map((i) => (
          <IdeaRow
            key={i.item.id}
            idea={i}
            choosing={choosing.choosing}
            chosen={choosing.chosen.has(i.item.id)}
            onChoose={(on) => choosing.choose(i.item.id, on)}
            onStart={choosing.choosing || !i.mine ? undefined : () => choosing.start(i.item.id)}
            onOpen={() => onOpen(i.item.id)}
          />
        ))}
      </div>
    </>
  )
}
