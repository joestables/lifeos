import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  CalendarDaysIcon,
  ChefHatIcon,
  ClockIcon,
  CopyIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  HouseIcon,
  InboxIcon,
  LinkIcon,
  ListChecksIcon,
  LogOutIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  TagIcon,
  TargetIcon,
  Trash2Icon,
  UsersIcon,
  UtensilsIcon,
  WalletIcon,
  XIcon,
  ArchiveIcon,
  HeartIcon,
  CheckIcon,
  GitCompareArrowsIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AddMealButton,
  AppShell,
  CardRow,
  IngredientList,
  ItemDialog,
  ItemRow,
  LabelChips,
  LogEntry,
  MealCard,
  MealDay,
  MealSlot,
  MealWeek,
  MethodSteps,
  PageAction,
  PageHeader,
  PlanToolbar,
  RecipeCard,
  RecipeFact,
  RecipeGrid,
  RecipePhoto,
  SectionLabel,
  ServingsStepper,
  StarRating,
  StepEditor,
  TabsRow,
  TimerChip,
  TypeScope,
  TypeTile,
  type DrawerPage,
  type IngredientGroup,
  type Slot,
} from '@/components/lifeos'
import { Fab } from '@/components/lifeos/Fab'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/**
 * Stage 4's screens, drawn with the real components and made-up data, for
 * Joe to agree in the design step (plan step 3). In development and preview
 * builds only, as /design is. `?screen=` chooses the screen.
 */
export const Route = createFileRoute('/design-stage-4')({
  beforeLoad: () => {
    if (!__DESIGN_PAGE__) throw notFound()
  },
  validateSearch: (s: Record<string, unknown>): { screen?: string } =>
    typeof s.screen === 'string' ? { screen: s.screen } : {},
  component: Screens,
})

const nothing = () => {}

const PAGES: DrawerPage[] = [
  { to: '/inbox', label: 'Inbox', colour: 'none', icon: InboxIcon, count: 4 },
  { to: '/plan', label: 'Plan', colour: 'none', icon: CalendarDaysIcon },
  { to: '/tasks', label: 'Tasks', colour: 'blue', icon: SquareCheckBigIcon },
  { to: '/notes', label: 'Notes', colour: 'yellow', icon: StickyNoteIcon },
  { to: '/gym', label: 'Gym', colour: 'coral', icon: DumbbellIcon },
  { to: '/cardio', label: 'Cardio', colour: 'coral', icon: FootprintsIcon },
  { to: '/recipes', label: 'Recipes', colour: 'green', icon: ChefHatIcon },
  { to: '/meal-plan', label: 'Meal plan', colour: 'green', icon: UtensilsIcon },
  { to: '/shopping', label: 'Shopping', colour: 'yellow', icon: ShoppingCartIcon },
  { to: '/goals', label: 'Goals', colour: 'purple', icon: TargetIcon },
  { to: '/wardrobe', label: 'Wardrobe', colour: 'orange', icon: ShirtIcon },
  { to: '/finance', label: 'Finance', colour: 'none', icon: WalletIcon, later: true },
]

function Shell({ page, children }: { page: string; children: ReactNode }) {
  return (
    <AppShell
      pages={PAGES.map((p) => (p.label === page ? { ...p, to: '/design-stage-4' } : p))}
      me={{ name: 'Joe Stables', space: 'Personal' }}
      sync={{ pending: 0, failed: 0 }}
      onCapture={nothing}
      onSearch={nothing}
    >
      {children}
    </AppShell>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

const more = (items: ReactNode, label = 'More') => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} />}>
      <EllipsisIcon />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">{items}</DropdownMenuContent>
  </DropdownMenu>
)

function SmallSelect({
  value,
  options,
  label,
}: {
  value: string
  options: string[]
  label: string
}) {
  return (
    <Select defaultValue={value}>
      <SelectTrigger size="sm" aria-label={label} className="w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ---------- Recipes: the library ---------- */

const RECIPES = [
  { name: 'Katsu curry', cuisine: 'Japanese', favourite: true },
  { name: 'Chicken shawarma', cuisine: 'Middle Eastern', favourite: true },
  { name: 'Gochujang noodles', cuisine: 'Korean', draft: true },
  { name: 'Shakshuka', cuisine: 'North African' },
  { name: 'Chilli con carne', cuisine: 'Mexican', favourite: true },
  { name: 'Thai green curry', cuisine: 'Thai', by: 'Sam' },
  { name: 'Mushroom risotto', cuisine: 'Italian', by: 'Sam', favourite: true },
  { name: 'Miso salmon traybake', cuisine: 'Japanese', draft: true },
  { name: 'Lamb kofta', cuisine: 'Middle Eastern' },
  { name: 'Banana bread', cuisine: 'British', by: 'Sam' },
  { name: 'Chicken tikka masala', cuisine: 'Indian' },
  { name: 'Pad thai', cuisine: 'Thai', draft: true },
]

function RecipesTabs({ tab, action }: { tab: 'recipes' | 'ideas'; action?: ReactNode }) {
  return (
    <TabsRow>
      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
        </TabsList>
      </Tabs>
      {action}
    </TabsRow>
  )
}

function NewRecipeMenu({ open }: { open?: boolean }) {
  return (
    <DropdownMenu open={open}>
      <DropdownMenuTrigger render={<Button size="sm" className="hidden md:inline-flex" />}>
        <PlusIcon /> New recipe
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>
          <ChefHatIcon /> New recipe
        </DropdownMenuItem>
        <DropdownMenuItem>
          <StickyNoteIcon /> New idea
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LinkIcon /> Import from a link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const FILTER_GROUPS: { name: string; values: string[]; chosen?: string[] }[] = [
  {
    name: 'Category',
    values: ['Breakfast', 'Lunch', 'Dinner', 'Condiments', 'Baking', 'Smoothies'],
    chosen: ['Dinner'],
  },
  {
    name: 'Cuisine',
    values: [
      'British',
      'Indian',
      'Italian',
      'Japanese',
      'Korean',
      'Mexican',
      'Middle Eastern',
      'Thai',
    ],
  },
  { name: 'Tags', values: ['Quick', 'Batch', 'High protein', 'Freezes well'] },
  { name: 'Protein', values: ['Beef', 'Chicken', 'Fish', 'Lamb', 'Tofu'], chosen: ['Chicken'] },
  { name: 'Carbs', values: ['Noodles', 'Pasta', 'Potato', 'Rice'] },
  { name: 'Created by', values: ['Me', 'Sam'] },
  { name: 'Favourites', values: ['Mine', 'Sam’s', 'Both of ours'] },
]

function FiltersButton({ open, count = 0 }: { open?: boolean; count?: number }) {
  return (
    <Popover open={open}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <SlidersHorizontalIcon /> Filters
        {count > 0 && <Badge className="-mr-1">{count}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-[380px] flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-h2">Filters</span>
          <Button variant="ghost" size="sm">
            Reset
          </Button>
        </div>
        {FILTER_GROUPS.map((g) => (
          <div key={g.name} className="flex flex-col gap-2">
            <Label>{g.name}</Label>
            <LabelChips
              aria-label={g.name}
              icon={null}
              className="flex-wrap overflow-visible"
              labels={g.values.map((v) => ({ id: v, name: v }))}
              chosen={new Set(g.chosen ?? [])}
              onChange={nothing}
            />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function LibraryToolbar({ filters }: { filters?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup aria-label="State" defaultValue={['all']}>
        <ToggleGroupItem value="draft">Draft</ToggleGroupItem>
        <ToggleGroupItem value="complete">Complete</ToggleGroupItem>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
      </ToggleGroup>
      <div className="relative min-w-0 flex-1 basis-56">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          size="sm"
          aria-label="Search recipes"
          placeholder="Search recipes"
          className="pl-9"
        />
      </div>
      <FiltersButton open={filters} count={filters ? 2 : 0} />
      <SmallSelect
        label="Sort"
        value="Recently added"
        options={['Recently added', 'Recently cooked', 'A–Z']}
      />
      <SmallSelect
        label="Group"
        value="No groups"
        options={['No groups', 'By category', 'By cuisine', 'By state']}
      />
    </div>
  )
}

function Library({ filters, menu }: { filters?: boolean; menu?: boolean }) {
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <PageHeader title="Recipes" action={{ label: 'New recipe', onClick: nothing }} />
        <div className="flex flex-col gap-4 px-5 pb-28 sm:px-9">
          <RecipesTabs tab="recipes" action={<NewRecipeMenu open={menu} />} />
          <LibraryToolbar filters={filters} />
          <RecipeGrid>
            {RECIPES.map((r) => (
              <RecipeCard key={r.name} {...r} onOpen={nothing} />
            ))}
          </RecipeGrid>
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- Recipes: Ideas ---------- */

const IDEAS = [
  {
    name: 'Crispy chilli beef',
    source: 'tiktok.com',
    saved: 'Today',
    note: '@cookingwithkian — double fry the beef',
  },
  {
    name: 'Birria tacos',
    source: 'youtube.com',
    saved: 'Yesterday',
    note: 'Find one without the slow cooker',
  },
  { name: 'Miso butter pasta', source: 'instagram.com', saved: 'Mon' },
  { name: 'Smash burgers', saved: '12 Oct', note: 'Like the ones at Bleecker' },
  { name: 'Chicken adobo', source: 'seriouseats.com', saved: '8 Oct' },
  { name: 'Green shakshuka', source: 'bbcgoodfood.com', saved: '2 Oct', note: 'With feta' },
]

function Ideas({ selecting = false }: { selecting?: boolean }) {
  const chosen = ['Birria tacos', 'Chicken adobo']
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <PageHeader title="Recipes" action={{ label: 'New idea', onClick: nothing }} />
        <div className="flex max-w-3xl flex-col gap-4 px-5 pb-28 sm:px-9">
          <RecipesTabs tab="ideas" action={<PageAction label="New idea" onClick={nothing} />} />
          {selecting ? (
            <div className="flex h-10 items-center gap-2 rounded-control bg-muted pr-1.5 pl-3">
              <span className="flex-1 text-sm font-semibold">2 selected</span>
              <Button variant="ghost" size="sm">
                <ChefHatIcon /> Make drafts
              </Button>
              <Button variant="ghost" size="sm">
                <ArchiveIcon /> Archive
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2Icon /> Delete
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Stop selecting">
                <XIcon />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  size="sm"
                  aria-label="Search ideas"
                  placeholder="Search ideas"
                  className="pl-9"
                />
              </div>
              <Button variant="ghost" size="sm">
                <ListChecksIcon /> Select
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {IDEAS.map((i) => (
              <ItemRow
                key={i.name}
                leading={
                  selecting ? (
                    <Checkbox
                      colour="green"
                      defaultChecked={chosen.includes(i.name)}
                      aria-label={i.name}
                    />
                  ) : (
                    <TypeTile colour="green" icon={ChefHatIcon} />
                  )
                }
                title={i.name}
                meta={[i.source, i.saved, i.note].filter(Boolean)}
                menu={more(
                  <>
                    <DropdownMenuItem>Make it a draft</DropdownMenuItem>
                    <DropdownMenuItem>Import from its link</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                  </>,
                )}
                onOpen={nothing}
              />
            ))}
          </div>
        </div>
      </TypeScope>
    </Shell>
  )
}

function NewIdea() {
  return (
    <>
      <Ideas />
      <TypeScope colour="green">
        <Dialog open>
          <DialogContent className="max-w-[520px]">
            <DialogHeader>
              <DialogTitle>New idea</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field label="Name">
                <Input defaultValue="Crispy chilli beef" />
              </Field>
              <Field label="Links">
                <div className="flex flex-col gap-2">
                  <Input defaultValue="https://www.tiktok.com/@cookingwithkian/video/74…" />
                  <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
                    <PlusIcon /> Add a link
                  </Button>
                </div>
              </Field>
              <Field label="Note">
                <Textarea placeholder="Note" defaultValue="Double fry the beef" />
              </Field>
              <Button variant="outline" size="sm" className="self-start">
                <PlusIcon /> Add a photo
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TypeScope>
    </>
  )
}

function ImportDialog({ step }: { step: 'link' | 'working' }) {
  const steps = ['Reading the page', 'Writing it in your style', 'Matching the Pantry']
  return (
    <>
      <Library />
      <TypeScope colour="green">
        <Dialog open>
          <DialogContent className="max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Import a recipe</DialogTitle>
            </DialogHeader>
            <Field label="Link">
              <Input defaultValue="https://www.youtube.com/watch?v=Kx8f…" />
            </Field>
            {step === 'working' && (
              <ol className="flex flex-col gap-2.5">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={
                        i === 0
                          ? 'grid size-5 place-items-center rounded-full bg-primary text-primary-foreground'
                          : i === 1
                            ? 'size-5 animate-spin rounded-full border-2 border-primary border-t-transparent'
                            : 'size-5 rounded-full border-2 border-muted'
                      }
                    >
                      {i === 0 && <CheckIcon className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={i === 2 ? 'text-muted-foreground' : 'font-semibold'}>{s}</span>
                  </li>
                ))}
              </ol>
            )}
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button disabled={step === 'working'}>Import</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TypeScope>
    </>
  )
}

/* ---------- A Recipe ---------- */

const KATSU: IngredientGroup[] = [
  {
    lines: [
      { key: 'a', amount: '4', name: 'Chicken thighs' },
      { key: 'b', amount: '100 g', name: 'Panko breadcrumbs' },
      { key: 'c', amount: '2', name: 'Eggs' },
      { key: 'd', amount: '50 g', name: 'Plain flour' },
      { key: 'e', amount: '300 g', name: 'Sushi rice' },
    ],
  },
  {
    heading: 'For the sauce',
    lines: [
      { key: 'f', amount: '1', name: 'Onion' },
      { key: 'g', amount: '2', name: 'Carrots' },
      { key: 'h', amount: '2 tbsp', name: 'Curry powder' },
      { key: 'i', amount: '600 ml', name: 'Chicken stock' },
      { key: 'j', amount: '1–2 tbsp', name: 'Honey' },
      { key: 'k', amount: '~1 tbsp', name: 'Soy sauce' },
      { key: 'l', name: 'Salt' },
    ],
  },
]

const STEPS = [
  { key: '1', parts: ['Rinse the rice and cook it.'] },
  {
    key: '2',
    parts: ['Make the ', { recipe: 'Katsu sauce' }, ' and keep it warm.'],
  },
  {
    key: '3',
    parts: ['Flatten the chicken to 1 cm. Dip in flour, then egg, then panko.'],
  },
  {
    key: '4',
    parts: ['Air fry at 200°C for 12 minutes, turning halfway, until golden.'],
  },
  { key: '5', parts: ['Rest for 2 minutes, slice, and serve over the rice with the sauce.'] },
]

function RecipeHeading({ other = false }: { other?: boolean }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start">
      <RecipePhoto className="w-full shrink-0 rounded-lg md:w-72" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h1 className="text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] sm:text-h1">
              Katsu curry
            </h1>
            <Select defaultValue="Air fryer · Complete">
              <SelectTrigger size="sm" aria-label="Variation" className="w-auto self-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Air fryer · Complete">Air fryer · Complete</SelectItem>
                <SelectItem value="Standard · Complete">Standard · Complete</SelectItem>
                <SelectItem value="Tofu (Sam) · Draft">Tofu (Sam) · Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {other && <RecipeFact>By Sam</RecipeFact>}
          <RecipeFact>Dinner</RecipeFact>
          <RecipeFact>Japanese</RecipeFact>
          <RecipeFact>Chicken</RecipeFact>
          <RecipeFact>Rice</RecipeFact>
          <RecipeFact>Freezes well</RecipeFact>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground [&_svg]:size-4">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon /> Prep 20 min · Cook 25 min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon /> Serves 4
          </span>
          <a href="#s" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <LinkIcon /> justonecookbook.com
          </a>
        </div>
        <div className="text-sm text-muted-foreground">Cooked 6 times · last Sat</div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button>
            <UtensilsIcon /> Start cooking
          </Button>
          {other ? (
            <Button variant="outline">
              <CopyIcon /> Add my variation
            </Button>
          ) : (
            <Button variant="outline">
              <PencilIcon /> Edit
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Favourite">
            <HeartIcon className="fill-current text-tc-text" />
          </Button>
          {more(
            other ? (
              <>
                <DropdownMenuItem>Log a cook</DropdownMenuItem>
                <DropdownMenuItem>Compare variations</DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem>Edit heading</DropdownMenuItem>
                <DropdownMenuItem>Duplicate this variation</DropdownMenuItem>
                <DropdownMenuItem>Compare variations</DropdownMenuItem>
                <DropdownMenuItem>Log a cook</DropdownMenuItem>
                <DropdownMenuItem>Make it the default</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Archive</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete variation</DropdownMenuItem>
              </>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className="gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h2">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

function RecipeLog() {
  return (
    <Panel
      title="Log"
      action={
        <Button variant="ghost" size="sm">
          See all
        </Button>
      }
    >
      <LogEntry
        who="Joe Stables"
        what="Cooked"
        when="Sat"
        verdict={<StarRating value={4} size="sm" />}
        notes="Sauce a touch thin; more honey next time."
      >
        <a href="#c" className="font-semibold text-tc-text hover:underline">
          What I cooked · Serves 4
        </a>
      </LogEntry>
      <LogEntry who="Joe Stables" what="Changed" when="12 Oct">
        Honey 1 → 1–2 tbsp; step 4 rewritten
      </LogEntry>
      <LogEntry who="Sam" what="Cooked" when="3 Oct" verdict={<StarRating value={5} size="sm" />} />
    </Panel>
  )
}

function RecipePage({ other = false }: { other?: boolean }) {
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <PageHeader title="" back={{ label: 'Recipes', onClick: nothing }} />
        <div className="flex flex-col gap-5 px-5 pb-12 sm:px-9">
          <RecipeHeading other={other} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel title="Ingredients">
              <IngredientList groups={KATSU} />
            </Panel>
            <Panel title="Method">
              <MethodSteps steps={STEPS} />
            </Panel>
            <div className="flex flex-col gap-4">
              <Panel title="Notes">
                <p className="leading-[1.6]">
                  Thighs stay juicier than breast. The sauce freezes well; make double.
                </p>
              </Panel>
              <RecipeLog />
            </div>
          </div>
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- Editing ---------- */

function EditLine({ text, parsed, typed }: { text: string; parsed: string; typed?: boolean }) {
  return (
    <div className="group/line flex items-center gap-2">
      <Input defaultValue={text} aria-label="Ingredient" className="flex-1" />
      <span className="hidden w-44 shrink-0 truncate text-sm text-muted-foreground sm:block">
        {typed ? 'Kept as typed' : parsed}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Remove"
        className="opacity-0 group-hover/line:opacity-100"
      >
        <XIcon />
      </Button>
    </div>
  )
}

function EditVariation({
  suggesting = false,
  referencing = false,
}: {
  suggesting?: boolean
  referencing?: boolean
}) {
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <PageHeader title="" back={{ label: 'Katsu curry', onClick: nothing }} />
        <div className="flex flex-col gap-5 px-5 pb-12 sm:px-9">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Editing a variation
              </span>
              <h1 className="text-h1">Katsu curry</h1>
            </div>
            <Button>Done</Button>
          </div>
          <Card className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
            <Field label="Variation">
              <Input defaultValue="Air fryer" />
            </Field>
            <Field label="State">
              <SmallSelect
                label="State"
                value="Complete"
                options={['Draft', 'Complete', 'Archived']}
              />
            </Field>
            <Field label="Prep (min)">
              <Input defaultValue="20" inputMode="numeric" />
            </Field>
            <Field label="Cook (min)">
              <Input defaultValue="25" inputMode="numeric" />
            </Field>
            <Field label="Serves">
              <Input defaultValue="4" inputMode="numeric" />
            </Field>
          </Card>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <Panel
              title="Ingredients"
              action={
                <Button variant="ghost" size="sm">
                  <SparklesIcon /> Fill from method
                </Button>
              }
            >
              <div className="flex flex-col gap-2">
                <EditLine text="4 chicken thighs" parsed="4 · Chicken thighs" />
                <EditLine text="100 g panko" parsed="100 g · Panko breadcrumbs" />
                <EditLine text="2 eggs" parsed="2 · Eggs" />
                <Popover open={suggesting}>
                  <PopoverTrigger nativeButton={false} render={<div />}>
                    <Input
                      defaultValue="1 tbsp gochuj"
                      aria-label="Ingredient"
                      autoFocus={suggesting}
                    />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[320px] p-1.5">
                    <div className="px-2 pt-1 pb-1.5 text-xs font-semibold text-muted-foreground">
                      Pantry
                    </div>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-sm bg-accent px-2 text-sm"
                    >
                      <span>
                        <b>Gochuj</b>ang
                      </span>
                      <span className="text-xs text-muted-foreground">Cupboard</span>
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-sm px-2 text-sm hover:bg-accent"
                    >
                      <span>
                        <b>Gochuj</b>ang mayo
                      </span>
                      <span className="text-xs text-muted-foreground">Chilled</span>
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent"
                    >
                      <PlusIcon className="size-4" /> Add “Gochujang paste” to the Pantry
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent"
                    >
                      <TagIcon className="size-4" /> Keep as typed
                    </button>
                  </PopoverContent>
                </Popover>
                <div className="pt-2 text-sm font-bold text-muted-foreground">For the sauce</div>
                <EditLine text="1 onion" parsed="1 · Onion" />
                <EditLine text="1-2 tbsp honey" parsed="1–2 tbsp · Honey" />
                <EditLine text="pinch of shichimi" parsed="" typed />
                <div className="flex gap-1 pt-1">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <PlusIcon /> Add an ingredient
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <PlusIcon /> Add a subheading
                  </Button>
                </div>
              </div>
            </Panel>
            <Panel title="Method">
              <div className="flex flex-col gap-2.5">
                <StepEditor n={1} text="Rinse the rice and cook it." />
                <Popover open={referencing}>
                  <PopoverTrigger nativeButton={false} render={<div />}>
                    <StepEditor
                      n={2}
                      text={
                        <>
                          Make the <span className="font-semibold text-tc-text">@kats</span>
                        </>
                      }
                    />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[280px] p-1.5">
                    {['Katsu sauce', 'Katsu curry', 'Katsu sando'].map((r, i) => (
                      <button
                        key={r}
                        type="button"
                        className={`flex h-9 w-full items-center gap-2 rounded-sm px-2 text-sm ${i === 0 ? 'bg-accent' : 'hover:bg-accent'}`}
                      >
                        <TypeTile colour="green" icon={ChefHatIcon} size="sm" /> {r}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <StepEditor
                  n={3}
                  text="Flatten the chicken to 1 cm. Dip in flour, then egg, then panko."
                />
                <StepEditor
                  n={4}
                  text="Air fry at 200°C for 12 minutes, turning halfway, until golden."
                />
                <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
                  <PlusIcon /> Add a step
                </Button>
              </div>
            </Panel>
          </div>
          <Panel title="Notes and sources">
            <Textarea defaultValue="Thighs stay juicier than breast. The sauce freezes well; make double." />
            <Input
              defaultValue="https://www.justonecookbook.com/chicken-katsu-curry/"
              aria-label="Source"
            />
          </Panel>
        </div>
      </TypeScope>
    </Shell>
  )
}

function EditHeading() {
  return (
    <>
      <RecipePage />
      <TypeScope colour="green">
        <Dialog open>
          <DialogContent className="max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Edit heading</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <RecipePhoto className="w-28 rounded-md" />
                <div className="flex flex-col gap-1.5">
                  <Button variant="outline" size="sm">
                    Change photo
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Remove
                  </Button>
                </div>
              </div>
              <Field label="Name">
                <Input defaultValue="Katsu curry" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <SmallSelect
                    label="Category"
                    value="Dinner"
                    options={['Breakfast', 'Lunch', 'Dinner', 'Baking']}
                  />
                </Field>
                <Field label="Cuisine">
                  <SmallSelect
                    label="Cuisine"
                    value="Japanese"
                    options={['Japanese', 'Korean', 'Thai']}
                  />
                </Field>
              </div>
              {[
                ['Tags', ['Freezes well']],
                ['Protein', ['Chicken']],
                ['Carbs', ['Rice']],
              ].map(([label, values]) => (
                <Field key={label as string} label={label as string}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(values as string[]).map((v) => (
                      <Badge key={v}>
                        {v} <XIcon />
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      Add
                    </Button>
                  </div>
                </Field>
              ))}
            </div>
            <DialogFooter>
              <Button>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TypeScope>
    </>
  )
}

/* ---------- Cooking ---------- */

function Cooking({ scaled = false }: { scaled?: boolean }) {
  const steps = STEPS.map((s) =>
    s.key === '4'
      ? { ...s, timer: <TimerChip label="Air fry" time="08:42" state="running" /> }
      : s.key === '5'
        ? { ...s, timer: <TimerChip time="2:00" /> }
        : s,
  )
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <div className="flex flex-col gap-5 px-5 pt-4 pb-12 sm:px-9 sm:pt-[30px]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-tc-text">Cooking · Air fryer</span>
              <h1 className="text-[22px] leading-[1.2] font-[750] tracking-[-0.025em] sm:text-h1">
                Katsu curry
              </h1>
            </div>
            <ServingsStepper value={scaled ? 6 : 4} />
            <Button>Finish</Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
            <Panel title="Ingredients">
              <IngredientList
                cooking
                ticked={['a', 'b', 'c', 'd']}
                groups={
                  scaled
                    ? KATSU.map((g) => ({
                        ...g,
                        lines: g.lines.map((l) => ({
                          ...l,
                          amount:
                            l.amount &&
                            {
                              '4': '6',
                              '100 g': '150 g',
                              '2': '3',
                              '50 g': '75 g',
                              '300 g': '450 g',
                              '1': '1.5',
                              '2 tbsp': '3 tbsp',
                              '600 ml': '900 ml',
                              '1–2 tbsp': '1.5–3 tbsp',
                              '~1 tbsp': '~1.5 tbsp',
                            }[l.amount],
                        })),
                      }))
                    : KATSU
                }
              />
            </Panel>
            <Panel title="Method" action={scaled && <Badge variant="outline">Not scaled</Badge>}>
              <MethodSteps cooking steps={steps} done={['1', '2', '3']} current="4" />
            </Panel>
          </div>
        </div>
      </TypeScope>
    </Shell>
  )
}

function Cooked() {
  const [stars, setStars] = useState(4)
  return (
    <>
      <Cooking />
      <TypeScope colour="green">
        <Dialog open>
          <DialogContent className="max-w-[460px]">
            <DialogHeader>
              <DialogTitle>How did it go?</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <StarRating value={stars} onChange={setStars} />
              <Textarea
                placeholder="Notes"
                defaultValue="Sauce a touch thin; more honey next time."
              />
            </div>
            <DialogFooter>
              <Button variant="outline">Don’t log</Button>
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TypeScope>
    </>
  )
}

function Compare() {
  const col = (name: string, lines: [string, string, boolean?][]) => (
    <Panel title={name}>
      <div className="flex flex-col">
        {lines.map(([a, n, changed]) => (
          <div
            key={n}
            className={`-mx-2 flex items-baseline gap-3 rounded-sm px-2 py-1.5 ${changed ? 'bg-selected' : ''}`}
          >
            <span className="w-16 shrink-0 font-semibold tabular-nums">{a}</span>
            <span className="min-w-0 flex-1">{n}</span>
            {changed && <Badge variant="outline">Differs</Badge>}
          </div>
        ))}
      </div>
    </Panel>
  )
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <PageHeader title="Compare variations" back={{ label: 'Katsu curry', onClick: nothing }} />
        <div className="flex flex-col gap-4 px-5 pb-12 sm:px-9">
          <div className="flex items-center gap-2">
            <SmallSelect
              label="First"
              value="Air fryer"
              options={['Air fryer', 'Standard', 'Tofu (Sam)']}
            />
            <GitCompareArrowsIcon className="size-4 text-muted-foreground" />
            <SmallSelect
              label="Second"
              value="Standard"
              options={['Air fryer', 'Standard', 'Tofu (Sam)']}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {col('Air fryer', [
              ['4', 'Chicken thighs'],
              ['100 g', 'Panko breadcrumbs'],
              ['—', 'Vegetable oil', true],
              ['1–2 tbsp', 'Honey', true],
              ['600 ml', 'Chicken stock'],
            ])}
            {col('Standard', [
              ['4', 'Chicken thighs'],
              ['100 g', 'Panko breadcrumbs'],
              ['500 ml', 'Vegetable oil', true],
              ['1 tbsp', 'Honey', true],
              ['600 ml', 'Chicken stock'],
            ])}
          </div>
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- Meal plan ---------- */

const MP_DAYS = [
  { key: 'mon', name: 'Mon', number: 12 },
  { key: 'tue', name: 'Tue', number: 13 },
  { key: 'wed', name: 'Wed', number: 14, today: true },
  { key: 'thu', name: 'Thu', number: 15 },
  { key: 'fri', name: 'Fri', number: 16 },
  { key: 'sat', name: 'Sat', number: 17 },
  { key: 'sun', name: 'Sun', number: 18 },
]

type MealData = Parameters<typeof MealCard>[0]
const MEALS: Record<string, Partial<Record<Slot, MealData>>> = {
  mon: {
    Breakfast: { name: 'Overnight oats', servings: 1, eaten: true },
    Dinner: {
      name: 'Katsu curry',
      servings: 4,
      variation: 'Air fryer',
      household: 'Home',
      eaten: true,
    },
  },
  tue: {
    Lunch: { name: 'Katsu curry', kind: 'leftovers', household: 'Home' },
    Dinner: { name: 'Gochujang noodles', servings: 2, household: 'Home' },
  },
  wed: {
    Breakfast: { name: 'Berry smoothie', servings: 1 },
    Dinner: { name: 'Out: Dishoom', kind: 'typed', household: 'Home' },
  },
  thu: {
    Lunch: { name: 'Shakshuka', servings: 2 },
    Dinner: { name: 'Chilli con carne', servings: 6, household: 'Home' },
  },
  fri: {
    Lunch: { name: 'Chilli con carne', kind: 'leftovers', household: 'Home' },
    Dinner: { name: 'Takeaway', kind: 'typed', household: 'Home' },
  },
  sat: { Dinner: { name: 'Thai green curry', servings: 2, household: 'Home' } },
  sun: {
    Breakfast: { name: 'Shakshuka', servings: 2 },
    Dinner: { name: 'Mushroom risotto', servings: 4, household: 'Home' },
  },
}

function MealPlanTabs({ tab, action }: { tab: 'week' | 'pantry'; action?: ReactNode }) {
  return (
    <TabsRow>
      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="pantry">Pantry</TabsTrigger>
        </TabsList>
      </Tabs>
      {action}
    </TabsRow>
  )
}

function WeekMenu() {
  return more(
    <>
      <DropdownMenuItem>
        <CopyIcon /> Copy this week…
      </DropdownMenuItem>
    </>,
    'Week',
  )
}

function SlotFor({
  day,
  slot,
  adding,
  dragging,
}: {
  day: string
  slot: Slot
  adding?: string
  dragging?: boolean
}) {
  const meal = MEALS[day]?.[slot]
  const key = `${day}-${slot}`
  if (dragging && key === 'thu-Dinner')
    return (
      <MealSlot slot={slot}>
        <div className="h-[46px] rounded-control border-[1.5px] border-dashed border-muted-foreground/35" />
      </MealSlot>
    )
  if (dragging && key === 'sat-Lunch')
    return (
      <MealSlot slot={slot}>
        <MealCard {...MEALS.thu!.Dinner!} dragging />
      </MealSlot>
    )
  return (
    <MealSlot
      slot={slot}
      adding={adding === key}
      add={adding === key ? <AddMealPopover slot={slot} /> : undefined}
    >
      {meal && <MealCard {...meal} onOpen={nothing} />}
    </MealSlot>
  )
}

function AddMealPopover({ slot }: { slot: Slot }) {
  const recent = [
    ['Katsu curry', 'Japanese'],
    ['Chilli con carne', 'Mexican'],
    ['Gochujang noodles', 'Korean'],
    ['Thai green curry', 'Thai · Sam'],
    ['Mushroom risotto', 'Italian · Sam'],
  ]
  return (
    <Popover open>
      <PopoverTrigger render={<AddMealButton slot={slot} />} />
      <PopoverContent align="start" className="flex w-[340px] flex-col gap-2.5 p-2.5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            size="sm"
            autoFocus
            placeholder="Search recipes"
            aria-label="Search recipes"
            className="pl-9"
          />
        </div>
        <LabelChips
          aria-label="Category"
          icon={null}
          labels={['Dinner', 'Lunch', 'Breakfast', 'Baking', 'Smoothies'].map((c) => ({
            id: c,
            name: c,
          }))}
          chosen={new Set(['Dinner'])}
          onChange={nothing}
        />
        <div className="px-1 text-xs font-semibold text-muted-foreground">Planned lately</div>
        <div className="flex flex-col">
          {recent.map(([name, meta], i) => (
            <button
              key={name}
              type="button"
              className={`flex h-11 items-center gap-2.5 rounded-sm px-1.5 text-left text-sm ${i === 0 ? 'bg-accent' : 'hover:bg-accent'}`}
            >
              <TypeTile colour="green" icon={ChefHatIcon} size="sm" />
              <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
              <span className="text-xs text-muted-foreground">{meta}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 border-t border-border pt-2">
          <Button variant="ghost" size="sm" className="flex-1">
            <UtensilsIcon /> Type a meal
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            <RotateCcwIcon /> Leftovers
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MealPlanToolbar() {
  return (
    <PlanToolbar
      title="12 – 18 October"
      layout="week"
      onToday={nothing}
      onPrevious={nothing}
      onNext={nothing}
      step="week"
      action={
        <div className="flex items-center gap-1">
          <SmallSelect
            label="Show"
            value="All my meals"
            options={['All my meals', 'Personal', 'Home']}
          />
          <WeekMenu />
        </div>
      }
    />
  )
}

function MealPlanWeek({ adding, dragging }: { adding?: string; dragging?: boolean }) {
  return (
    <Shell page="Meal plan">
      <TypeScope colour="green">
        <PageHeader title="Meal plan" />
        <div className="flex flex-col gap-4 px-5 pb-12 sm:px-9">
          <MealPlanTabs
            tab="week"
            action={<PageAction label="New shopping list" onClick={nothing} />}
          />
          <MealPlanToolbar />
          <MealWeek
            days={MP_DAYS.map((d) => ({
              ...d,
              dropping: dragging && d.key === 'sat' ? 'Lunch' : undefined,
            }))}
            slots={['Breakfast', 'Lunch', 'Dinner']}
            cell={(day, slot) => (
              <SlotFor day={day} slot={slot} adding={adding} dragging={dragging} />
            )}
          />
        </div>
      </TypeScope>
    </Shell>
  )
}

function OpenMeal() {
  return (
    <>
      <MealPlanWeek />
      <ItemDialog
        open
        onOpenChange={nothing}
        colour="green"
        icon={UtensilsIcon}
        typeLabel="Meal · Thu dinner"
        title="Chilli con carne"
        leading={<Checkbox colour="green" aria-label="Eaten" />}
        actions={more(
          <>
            <DropdownMenuItem>Move to…</DropdownMenuItem>
            <DropdownMenuItem>Add leftovers…</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
          </>,
        )}
      >
        <a
          href="#r"
          className="flex items-center gap-3 rounded-row bg-card p-2 shadow-card hover:bg-accent"
        >
          <RecipePhoto className="w-16 rounded-sm" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">Chilli con carne</span>
            <span className="text-sm text-muted-foreground">Open recipe · Standard</span>
          </span>
        </a>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Servings">
            <Input defaultValue="6" inputMode="numeric" />
          </Field>
          <Field label="For">
            <SmallSelect label="For" value="Home" options={['Personal', 'Home']} />
          </Field>
        </div>
        <Field label="Leftovers">
          <ItemRow
            leading={<TypeTile colour="green" icon={RotateCcwIcon} size="sm" />}
            title="Fri lunch"
            menu={more(<DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>)}
          />
        </Field>
      </ItemDialog>
    </>
  )
}

/* ---------- Pantry ---------- */

const AISLES: { aisle: string; entries: [string, string, number, boolean?, boolean?][] }[] = [
  {
    aisle: 'Fruit & Veg',
    entries: [
      ['Carrots', '', 6],
      ['Garlic', 'clove', 14, true],
      ['Onion', '', 18, true, true],
      ['Spring onions', '', 5],
    ],
  },
  {
    aisle: 'Protein',
    entries: [
      ['Beef mince', 'g', 3],
      ['Chicken thighs', '', 7],
      ['Eggs', '', 9, true],
    ],
  },
  {
    aisle: 'Cupboard',
    entries: [
      ['Curry powder', 'tbsp', 4, true],
      ['Gochujang', 'tbsp', 2],
      ['Olive oil', 'tbsp', 21, true, true],
      ['Soy sauce', 'tbsp', 11, true],
    ],
  },
]

function PantryRow({
  name,
  unit,
  used,
  staple,
  out,
}: {
  name: string
  unit: string
  used: number
  staple?: boolean
  out?: boolean
}) {
  return (
    <CardRow
      label={name}
      value={[unit, used ? `${used} recipes` : null].filter(Boolean).join(' · ')}
      chevron={false}
    >
      <div className="flex items-center gap-1.5">
        {out && <Badge variant="outline">Out of stock</Badge>}
        {staple && <Badge>Staple</Badge>}
        {more(
          <>
            <DropdownMenuItem>{staple ? 'Not a staple' : 'Make it a staple'}</DropdownMenuItem>
            {staple && (
              <DropdownMenuItem>{out ? 'Back in stock' : 'Out of stock'}</DropdownMenuItem>
            )}
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Recipes that use it</DropdownMenuItem>
            <DropdownMenuItem>Merge with…</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </>,
        )}
      </div>
    </CardRow>
  )
}

function Pantry() {
  return (
    <Shell page="Meal plan">
      <TypeScope colour="green">
        <PageHeader title="Meal plan" action={{ label: 'New entry', onClick: nothing }} />
        <div className="flex max-w-3xl flex-col gap-4 px-5 pb-28 sm:px-9">
          <MealPlanTabs tab="pantry" action={<PageAction label="New entry" onClick={nothing} />} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 basis-56">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                size="sm"
                aria-label="Search the Pantry"
                placeholder="Search the Pantry"
                className="pl-9"
              />
            </div>
            <ToggleGroup aria-label="Show" defaultValue={['all']}>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="staples">Staples</ToggleGroupItem>
              <ToggleGroupItem value="out">Out of stock</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <SectionLabel>Ingredients</SectionLabel>
          {AISLES.map((a) => (
            <Card key={a.aisle} className="gap-0 px-2 py-1.5">
              <div className="px-2 pt-2 pb-1 text-sm font-bold">{a.aisle}</div>
              {a.entries.map(([n, u, used, staple, out]) => (
                <PantryRow key={n} name={n} unit={u} used={used} staple={staple} out={out} />
              ))}
            </Card>
          ))}
          <SectionLabel>Household items</SectionLabel>
          <Card className="gap-0 px-2 py-1.5">
            <PantryRow name="Bin bags" unit="" used={0} staple out />
            <PantryRow name="Kitchen roll" unit="" used={0} staple />
            <PantryRow name="Washing-up liquid" unit="" used={0} />
          </Card>
        </div>
      </TypeScope>
    </Shell>
  )
}

function NewEntry() {
  return (
    <>
      <Pantry />
      <TypeScope colour="green">
        <Dialog open>
          <DialogContent className="max-w-[460px]">
            <DialogHeader>
              <DialogTitle>New entry</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <ToggleGroup aria-label="Kind" defaultValue={['ingredient']} className="self-start">
                <ToggleGroupItem value="ingredient">Ingredient</ToggleGroupItem>
                <ToggleGroupItem value="household">Household item</ToggleGroupItem>
              </ToggleGroup>
              <Field label="Name">
                <Input defaultValue="Gochujang" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Aisle">
                  <SmallSelect
                    label="Aisle"
                    value="Cupboard"
                    options={['Fruit & Veg', 'Bakery', 'Protein', 'Chilled', 'Cupboard', 'Frozen']}
                  />
                </Field>
                <Field label="Default unit">
                  <SmallSelect
                    label="Default unit"
                    value="tbsp"
                    options={['None', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp']}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <Switch /> One of our staples
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TypeScope>
    </>
  )
}

/* ---------- Households and Settings ---------- */

function Settings() {
  return (
    <Shell page="">
      <PageHeader title="Settings" />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        <Card className="gap-0 px-2 py-1.5">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <CardTitle>Households</CardTitle>
            <Button variant="outline" size="sm">
              <PlusIcon /> New household
            </Button>
          </div>
          <CardRow
            icon={<HouseIcon />}
            label="Home"
            value="Owner · 2 members"
            render={<a href="#h" />}
          />
          <CardRow
            icon={<HouseIcon />}
            label="The Stables"
            value="Member · 4 members"
            render={<a href="#h2" />}
          />
        </Card>
        <Card className="gap-0 px-2 py-1.5">
          <div className="px-3 pt-2 pb-1">
            <CardTitle>Food</CardTitle>
          </div>
          <CardRow label="New meals are for" chevron={false}>
            <SmallSelect
              label="New meals are for"
              value="Home"
              options={['Personal', 'Home', 'The Stables']}
            />
          </CardRow>
          <CardRow
            icon={<TagIcon />}
            label="Categories, cuisines and tags"
            render={<a href="#l" />}
          />
          <CardRow
            icon={<ArchiveIcon />}
            label="Archived recipes"
            value={3}
            render={<a href="#a" />}
          />
        </Card>
        <Card className="gap-0 px-2 py-1.5">
          <CardRow
            icon={<Trash2Icon />}
            label="Recently deleted"
            value={2}
            render={<a href="#d" />}
          />
          <CardRow
            icon={<LogOutIcon />}
            label="Sign out"
            render={<button type="button" />}
            chevron={false}
          />
        </Card>
      </div>
    </Shell>
  )
}

function Household({ inviting = false }: { inviting?: boolean }) {
  const member = (name: string, role: string, you = false) => (
    <CardRow
      icon={
        <Avatar>
          <AvatarFallback>
            {name
              .split(' ')
              .map((w) => w[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      }
      label={you ? `${name} (you)` : name}
      value={role}
      chevron={false}
    >
      {!you && more(<DropdownMenuItem variant="destructive">Remove from Home</DropdownMenuItem>)}
    </CardRow>
  )
  return (
    <>
      <Shell page="">
        <PageHeader title="Home" back={{ label: 'Settings', onClick: nothing }} />
        <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
          <Card className="gap-0 px-2 py-1.5">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <CardTitle>Members</CardTitle>
              <Button variant="outline" size="sm">
                <MailIcon /> Invite
              </Button>
            </div>
            {member('Joe Stables', 'Owner', true)}
            {member('Sam Carter', 'Member')}
            <CardRow icon={<MailIcon />} label="alex@gmail.com" value="Invited Thu" chevron={false}>
              <Button variant="ghost" size="sm">
                Withdraw
              </Button>
            </CardRow>
          </Card>
          <Card className="gap-0 px-2 py-1.5">
            <CardRow
              icon={<PencilIcon />}
              label="Rename"
              render={<button type="button" />}
              chevron={false}
            />
            <CardRow
              icon={<Trash2Icon className="text-destructive" />}
              label={<span className="text-destructive">Delete Home</span>}
              render={<button type="button" />}
              chevron={false}
            />
          </Card>
        </div>
      </Shell>
      {inviting && (
        <Dialog open>
          <DialogContent className="max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Invite to Home</DialogTitle>
            </DialogHeader>
            <Field label="Google email">
              <Input type="email" defaultValue="alex@gmail.com" />
            </Field>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function Invited() {
  return (
    <Shell page="Inbox">
      <PageHeader title="Inbox" action={{ label: 'Capture', onClick: nothing }} />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-8 sm:px-9">
        <Alert>
          <HouseIcon />
          <AlertTitle>Sam Carter invited you to Home</AlertTitle>
          <AlertDescription>Share recipes, meals and shopping lists</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm">
              Decline
            </Button>
            <Button variant="outline" size="sm">
              Join
            </Button>
          </AlertAction>
        </Alert>
        <section className="flex flex-col gap-2">
          <SectionLabel count={2}>Today</SectionLabel>
          <ItemRow
            leading={<Checkbox colour="blue" aria-label="Done" />}
            title="Book Japan flights"
            meta={['Due today']}
          />
          <ItemRow
            leading={<Checkbox colour="blue" aria-label="Done" />}
            title="Call mum"
            meta={['18:00']}
          />
        </section>
      </div>
    </Shell>
  )
}

/* ---------- Phone ---------- */

function PhoneRecipe() {
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <div className="flex flex-col gap-4 px-5 pt-3 pb-12">
          <RecipeHeading />
          <Panel title="Ingredients">
            <IngredientList groups={KATSU} />
          </Panel>
          <Panel title="Method">
            <MethodSteps steps={STEPS} />
          </Panel>
        </div>
      </TypeScope>
    </Shell>
  )
}

function PhoneCooking() {
  const steps = STEPS.slice(2).map((s) =>
    s.key === '4' ? { ...s, timer: <TimerChip label="Air fry" time="08:42" state="running" /> } : s,
  )
  return (
    <Shell page="Recipes">
      <TypeScope colour="green">
        <div className="flex flex-col gap-4 px-5 pt-3 pb-12">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-tc-text">Cooking · Air fryer</span>
              <h1 className="text-[22px] leading-[1.2] font-[750] tracking-[-0.025em]">
                Katsu curry
              </h1>
            </div>
            <Button size="sm">Finish</Button>
          </div>
          <ServingsStepper value={4} />
          <Tabs defaultValue="method">
            <TabsList>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="method">Method</TabsTrigger>
            </TabsList>
          </Tabs>
          <MethodSteps
            cooking
            steps={steps.map((s, i) => ({ ...s, key: String(i + 3) }))}
            done={['3']}
            current="4"
          />
        </div>
      </TypeScope>
    </Shell>
  )
}

function PhoneMealPlan() {
  return (
    <Shell page="Meal plan">
      <TypeScope colour="green">
        <PageHeader title="Meal plan" action={{ label: 'New shopping list', onClick: nothing }} />
        <div className="flex flex-col gap-4 px-5 pb-28">
          <MealPlanTabs tab="week" />
          <PlanToolbar
            title="12 – 18 Oct"
            layout="week"
            onToday={nothing}
            onPrevious={nothing}
            onNext={nothing}
            step="week"
          />
          {MP_DAYS.slice(2, 5).map((d) => (
            <MealDay key={d.key} name={d.name} date={`${d.number} Oct`} today={d.today}>
              {(['Breakfast', 'Lunch', 'Dinner'] as const).map((slot) => (
                <SlotFor key={slot} day={d.key} slot={slot} />
              ))}
            </MealDay>
          ))}
        </div>
        <Fab label="New shopping list" />
      </TypeScope>
    </Shell>
  )
}

/* ---------- The screens ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  recipes: () => <Library />,
  'recipes-filters': () => <Library filters />,
  'recipes-new': () => <Library menu />,
  ideas: () => <Ideas />,
  'ideas-select': () => <Ideas selecting />,
  'idea-new': () => <NewIdea />,
  import: () => <ImportDialog step="working" />,
  recipe: () => <RecipePage />,
  'recipe-other': () => <RecipePage other />,
  'recipe-edit': () => <EditVariation />,
  'recipe-edit-suggest': () => <EditVariation suggesting />,
  'recipe-edit-ref': () => <EditVariation referencing />,
  'recipe-heading': () => <EditHeading />,
  compare: () => <Compare />,
  cooking: () => <Cooking />,
  'cooking-scaled': () => <Cooking scaled />,
  cooked: () => <Cooked />,
  'meal-plan': () => <MealPlanWeek />,
  'meal-plan-add': () => <MealPlanWeek adding="thu-Breakfast" />,
  'meal-plan-drag': () => <MealPlanWeek dragging />,
  meal: () => <OpenMeal />,
  pantry: () => <Pantry />,
  'pantry-new': () => <NewEntry />,
  settings: () => <Settings />,
  household: () => <Household />,
  'household-invite': () => <Household inviting />,
  invited: () => <Invited />,
  'm-recipes': () => <Library />,
  'm-ideas': () => <Ideas />,
  'm-recipe': () => <PhoneRecipe />,
  'm-cooking': () => <PhoneCooking />,
  'm-meal-plan': () => <PhoneMealPlan />,
  'm-pantry': () => <Pantry />,
}

function Screens() {
  const { screen = 'recipes' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS.recipes!)()}</>
}
