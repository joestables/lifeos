import { createFileRoute, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
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
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { IdeaDialog } from '@/app/idea-dialog'
import { archiveRecipes, deleteRecipes } from '@/app/recipe-actions'
import { HeadingDialog } from '@/app/recipe-heading'
import { SearchField } from '@/app/search-field'
import { queue, setMark, useFood, useFoodSpaces, usePhotoUrls } from '@/data'
import type { RecipeView } from '@/data/food-hooks'
import { capturedWhen } from '@/lib/dates'
import {
  FILTERS,
  IDEA_SORTS,
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
  type IdeaSort,
  type Sort,
  type StateFilter,
} from '@/lib/recipes'
import { useLongPress } from '@/hooks/use-long-press'
import { MoreMenu } from '@/app/more-menu'

type Tab = 'recipes' | 'ideas'

/** The Recipes library and the Ideas list (RCP-001, RCP-002, RCP-004). */
export const Route = createFileRoute('/_app/recipes/')({
  validateSearch: (s: Record<string, unknown>): { tab?: 'ideas'; idea?: string } => ({
    ...(s.tab === 'ideas' ? { tab: 'ideas' as const } : {}),
    // An Idea open in its popup (RCP-002, Joe, 20 October).
    ...(typeof s.idea === 'string' ? { idea: s.idea } : {}),
  }),
  component: Recipes,
})

function Recipes() {
  const search = Route.useSearch()
  const tab: Tab = search.tab ?? 'recipes'
  const navigate = useNavigate()
  const router = useRouter()
  const location = useLocation()
  const food = useFood(queue)
  const [making, setMaking] = useState<'recipe' | 'idea' | null>(null)
  // By id, so it opens on the Idea as just kept, not as it was.
  const [draftingId, setDraftingId] = useState<string | null>(null)
  const drafting = draftingId ? food.byId.get(draftingId) : undefined
  // While choosing several, the actions are the selection's: no Fab.
  const [choosing, setChoosing] = useState(false)
  const open = (id: string, search: { edit?: 'variation' } = {}) =>
    void navigate({ to: '/recipes/$id', params: { id }, search })
  /** A Recipe's page, then its Variation to fill, so Done lands on the page. */
  const openToFill = (id: string) =>
    void navigate({ to: '/recipes/$id', params: { id } }).then(() =>
      open(id, { edit: 'variation' }),
    )
  const idea = search.idea ? food.byId.get(search.idea) : undefined
  const openIdea = (id: string) =>
    void navigate({ to: '.', search: { tab: 'ideas', idea: id }, state: { itemOpened: true } })
  const closeIdea = () =>
    location.state.itemOpened
      ? router.history.back()
      : void navigate({ to: '.', search: { tab: 'ideas' }, replace: true })

  const newRecipe = () => setMaking('recipe')
  const newIdea = () => setMaking('idea')

  return (
    <TypeScope colour="green">
      <PageHeader
        title="Recipes"
        action={
          choosing
            ? undefined
            : tab === 'ideas'
              ? { label: 'New idea', onClick: newIdea }
              : { label: 'New recipe', onClick: newRecipe }
        }
      />
      {making === 'recipe' && (
        <HeadingDialog
          food={food}
          onClose={() => setMaking(null)}
          onCreated={({ recipe }) => openToFill(recipe)}
        />
      )}
      {/* Once all is loaded: it starts from the Idea as kept. */}
      {idea && idea.state === 'idea' && !drafting && !food.isLoading && (
        <IdeaDialog
          key={idea.item.id}
          idea={idea}
          food={food}
          onClose={closeIdea}
          onMakeDraft={() => setDraftingId(idea.item.id)}
        />
      )}
      {drafting && (
        <HeadingDialog
          food={food}
          recipe={drafting}
          drafting
          onClose={() => setDraftingId(null)}
          onDrafted={() => openToFill(drafting.item.id)}
        />
      )}
      {making === 'idea' && <NewIdeaDialog food={food} onClose={() => setMaking(null)} />}
      {/* Both tabs alike, so the search stays put between them (Joe, 20 October). */}
      <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
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
          <Ideas
            recipes={food.recipes}
            loading={food.isLoading}
            onOpen={openIdea}
            onMakeDraft={(r) => setDraftingId(r.item.id)}
            onChoosing={setChoosing}
          />
        ) : (
          <Library food={food} onOpen={(id) => open(id)} onChoosing={setChoosing} />
        )}
      </div>
    </TypeScope>
  )
}

/** New recipe, New idea; Import from a link waits for its step (plan step 9). */
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

/** Choosing several of my own (RCP-004); the page is told, to put away its Fab. */
function useChoosing(onChoosing: (on: boolean) => void) {
  const [choosing, setChoosingHere] = useState(false)
  const setChoosing = (on: boolean) => {
    setChoosingHere(on)
    onChoosing(on)
  }
  // Another tab: the page's Fab comes back.
  const told = useRef(onChoosing)
  useEffect(() => () => told.current(false), [])
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
  onChoosing,
}: {
  food: ReturnType<typeof useFood>
  onOpen: (id: string) => void
  onChoosing: (on: boolean) => void
}) {
  const { view, size, change, setSearch } = useLibraryView()
  const [sheet, setSheet] = useState(false)
  const choosing = useChoosing(onChoosing)
  const all = useMemo(() => food.recipes.filter(inLibrary), [food.recipes])
  const spaces = useFoodSpaces(queue)
  // Created by, in a Household only (RCP-001 5): me, then each member.
  const shared = spaces.people.length > 1
  const names = new Map(spaces.people.map((p) => [p.id, p.name]))
  const author = shared
    ? (r: RecipeView) => (r.mine ? 'Me' : (names.get(r.item.owner_id) ?? 'Someone'))
    : undefined
  const shown = libraryRecipes(food.recipes, view, food.pantry, author)
  const photos = usePhotoUrls(shown.map((r) => r.photo?.path))
  const values = filterValues(all, author)
  if (shared) values['Created by'] = spaces.people.map((p) => p.name)
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
  }).filter((g) => g.values.length > 0 && (g.name !== 'Created by' || shared))
  const chosenCount =
    groups.reduce((n, g) => n + (g.chosen?.length ?? 0), 0) + (view.state === 'all' ? 0 : 1)
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
          <FilterPanel groups={groups} active={chosenCount > 0} onChange={onChange} onReset={reset}>
            {stateFilter}
          </FilterPanel>
        }
      >
        {choosing.choosing ? (
          <SelectionBar
            count={picked.length}
            onDone={choosing.done}
            actions={[
              { label: 'Archive', icon: ArchiveIcon, onClick: act((rs) => archiveRecipes(rs)) },
              {
                label: 'Delete',
                icon: Trash2Icon,
                onClick: act((rs) => deleteRecipes(rs)),
                destructive: true,
              },
            ]}
          />
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
            <FilterPanel
              bare
              groups={groups}
              active={chosenCount > 0}
              onChange={onChange}
              onReset={reset}
            >
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
  onMakeDraft,
}: {
  idea: RecipeView
  choosing: boolean
  chosen: boolean
  onChoose: (on: boolean) => void
  onStart?: () => void
  onOpen: () => void
  onMakeDraft: () => void
}) {
  const longPress = useLongPress(onStart)
  const fields = idea.defaultVariation?.fields
  const source = fields?.sources[0]
  return (
    <div {...longPress}>
      <ItemRow
        leading={
          choosing && idea.mine ? (
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
              <DropdownMenuItem onClick={onMakeDraft}>
                <ChefHatIcon /> Make it a draft
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
  onMakeDraft,
  onChoosing,
}: {
  recipes: RecipeView[]
  loading: boolean
  onOpen: (id: string) => void
  onMakeDraft: (idea: RecipeView) => void
  onChoosing: (on: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const { ideaSort, change } = useLibraryView()
  const choosing = useChoosing(onChoosing)
  const ideas = ideaRecipes(recipes, search, ideaSort)
  const any = recipes.some((r) => r.state === 'idea')
  const picked = ideas.filter((r) => choosing.chosen.has(r.item.id))
  const act = (fn: (rs: RecipeView[]) => void) => () => {
    if (picked.length) fn(picked)
    choosing.done()
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {choosing.choosing ? (
        // Ideas are deleted, never archived (Joe, 20 October).
        <SelectionBar
          count={picked.length}
          onDone={choosing.done}
          actions={[
            {
              label: 'Delete',
              icon: Trash2Icon,
              onClick: act((rs) => deleteRecipes(rs, 'idea')),
              destructive: true,
            },
          ]}
        />
      ) : (
        <div className="flex items-center gap-2">
          <SearchField label="Search ideas" value={search} onChange={setSearch} />
          <SmallSelect<IdeaSort>
            label="Sort"
            value={ideaSort}
            options={IDEA_SORTS}
            onChange={(ideaSort) => change({ ideaSort })}
          />
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
            onMakeDraft={() => onMakeDraft(i)}
          />
        ))}
      </div>
    </div>
  )
}
