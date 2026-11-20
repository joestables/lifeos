import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  ArchiveIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  CameraIcon,
  ChefHatIcon,
  DumbbellIcon,
  EllipsisIcon,
  FolderPlusIcon,
  FootprintsIcon,
  ListChecksIcon,
  ListTodoIcon,
  MapPinIcon,
  PencilIcon,
  PipetteIcon,
  PlusIcon,
  SearchIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  StickyNoteIcon,
  SunIcon,
  TagIcon,
  TagsIcon,
  TargetIcon,
  Trash2Icon,
  UtensilsIcon,
  WalletIcon,
  XIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  AddChip,
  StoredPicture,
  AppShell,
  CameraView,
  ChoiceChips,
  ColourLoupe,
  DayColumn,
  DayGarment,
  DayOutfit,
  DayWeather,
  FilterDialog,
  FilterLayout,
  FilterPanel,
  GarmentCard,
  GarmentLine,
  GarmentPhoto,
  ItemDialog,
  ItemRow,
  ListEntryRow,
  OutfitCard,
  OutfitPicture,
  OutfitPlanCard,
  PageAction,
  PageHeader,
  PlanCard,
  PlanToolbar,
  PlannedOutfitLine,
  RecipeGrid,
  RemoveButton,
  SectionLabel,
  SelectionBar,
  SheetField,
  SortMenu,
  Swatch,
  TabsRow,
  Tray,
  TrayPanel,
  TYPE_ICONS,
  TypeScope,
  TypeTile,
  WardrobePane,
  type CardSize,
  type DrawerPage,
  type FilterGroup,
  type GarmentCardMode,
} from '@/components/lifeos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cameraPhoto, COLOURS, ESTIMATE_NAVY, NEW_TEAL } from './-design-stage-6/art'
import {
  BRANDS,
  CATEGORIES,
  COLLECTIONS,
  FITS,
  G,
  GARMENTS,
  O,
  OUTFITS,
  OWNED,
  PLANNED,
  SIZES,
  TEAL_TEE,
  TAGS,
  WEEK,
  outfitMeta,
  type DesignGarment,
  type DesignOutfit,
} from './-design-stage-6/data'

/**
 * Stage 6's designs — the Wardrobe page's three tabs, adding a garment on
 * a phone, the Outfit builder, Planned Outfits, the Week tab with the
 * weather, the day's card on Today and Week, and Settings → Wardrobe —
 * drawn with the real components and made-up data, for Joe to choose and
 * agree (Stage 6 plan, step 3). In development and preview builds only, as
 * /design is. `?screen=` chooses the screen. "Now" is Wednesday 18
 * November.
 */
export const Route = createFileRoute('/design-stage-6')({
  beforeLoad: () => {
    if (!__DESIGN_PAGE__) throw notFound()
  },
  validateSearch: (s: Record<string, unknown>): { screen?: string } =>
    typeof s.screen === 'string' ? { screen: s.screen } : {},
  component: Screens,
})

const nothing = () => {}

const PAGES = (here: string): DrawerPage[] =>
  [
    { to: '/today', label: 'Today', colour: 'none' as const, icon: SunIcon, count: 6 },
    { to: '/week', label: 'Week', colour: 'none' as const, icon: CalendarDaysIcon },
    { to: '/plan', label: 'Plan', colour: 'blue' as const, icon: ListTodoIcon },
    { to: '/notes', label: 'Notes', colour: 'yellow' as const, icon: StickyNoteIcon },
    { to: '/gym', label: 'Gym', colour: 'coral' as const, icon: DumbbellIcon },
    { to: '/cardio', label: 'Cardio', colour: 'coral' as const, icon: FootprintsIcon },
    { to: '/recipes', label: 'Recipes', colour: 'green' as const, icon: ChefHatIcon },
    { to: '/meal-plan', label: 'Meal plan', colour: 'green' as const, icon: UtensilsIcon },
    { to: '/shopping', label: 'Shopping', colour: 'yellow' as const, icon: ShoppingCartIcon },
    { to: '/wardrobe', label: 'Wardrobe', colour: 'orange' as const, icon: ShirtIcon },
    { to: '/goals', label: 'Goals', colour: 'purple' as const, icon: TargetIcon, later: true },
    { to: '/finance', label: 'Finance', colour: 'none' as const, icon: WalletIcon, later: true },
  ].map((p) => (p.label === here ? { ...p, to: '/design-stage-6' } : p))

function Shell({ page = 'Wardrobe', children }: { page?: string; children: ReactNode }) {
  return (
    <AppShell
      pages={PAGES(page)}
      me={{ name: 'Joe Stables', space: 'Personal' }}
      sync={{ pending: 0, failed: 0 }}
      onCapture={nothing}
      onSearch={nothing}
    >
      {children}
    </AppShell>
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
  fill = false,
  full = false,
}: {
  value: string
  options: string[]
  label: string
  fill?: boolean
  full?: boolean
}) {
  return (
    <Select defaultValue={value}>
      <SelectTrigger
        size={full ? 'default' : 'sm'}
        aria-label={label}
        className={full ? 'w-full' : fill ? 'min-w-0 flex-1' : 'w-auto'}
      >
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

function Search({ label, value }: { label: string; value?: string }) {
  return (
    <div className="relative min-w-36 flex-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        size="sm"
        aria-label={label}
        placeholder={label}
        defaultValue={value}
        className="pl-9"
      />
    </div>
  )
}

/* ---------- The page and its tabs ---------- */

type Tab = 'wardrobe' | 'outfits' | 'week'

const ACTIONS: Record<Tab, string | undefined> = {
  wardrobe: 'New garment',
  outfits: 'New outfit',
  week: undefined,
}

function WardrobePage({
  tab,
  children,
  fab = true,
}: {
  tab: Tab
  children: ReactNode
  /** The phone's "+", hidden while a tray or the SelectionBar holds the foot. */
  fab?: boolean
}) {
  const action = ACTIONS[tab]
  return (
    <Shell>
      <TypeScope colour="orange">
        <PageHeader
          title="Wardrobe"
          action={action && fab ? { label: action, onClick: nothing } : undefined}
        />
        <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
          <TabsRow>
            <Tabs defaultValue={tab}>
              <TabsList aria-label="View">
                <TabsTrigger value="wardrobe">Wardrobe</TabsTrigger>
                <TabsTrigger value="outfits">Outfits</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
            {action && <PageAction label={action} onClick={nothing} />}
          </TabsRow>
          {children}
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- The Wardrobe tab ---------- */

const colourChoices = Object.values(COLOURS)
  .filter((c) => OWNED.some((g) => g.colour.name === c.name))
  .map((c) => ({ id: c.name, name: c.name, hex: c.hex }))

const FILTERS = (chosen: Record<string, string[]> = {}): FilterGroup[] => [
  { name: 'Category', open: true, values: CATEGORIES, chosen: chosen.Category },
  { name: 'Brand', values: BRANDS, chosen: chosen.Brand },
  {
    name: 'Colour',
    values: colourChoices.map((c) => c.name),
    chosen: chosen.Colour,
    control: (
      <ChoiceChips
        compact
        aria-label="Colour"
        choices={colourChoices}
        chosen={new Set(chosen.Colour ?? [])}
        onChange={nothing}
      />
    ),
  },
  { name: 'Size', values: SIZES, chosen: chosen.Size },
  { name: 'Fit', values: FITS, chosen: chosen.Fit },
  { name: 'Tags', values: TAGS, chosen: chosen.Tags },
  { name: 'Favourites', values: ['Favourites'], chosen: chosen.Favourites },
]

const SORTS = [
  { value: 'added', label: 'Recently added', initial: 'desc' as const },
  { value: 'category', label: 'Category', initial: 'asc' as const },
  { value: 'brand', label: 'Brand', initial: 'asc' as const },
  { value: 'size', label: 'Size', initial: 'asc' as const },
  { value: 'worn', label: 'Last worn', initial: 'desc' as const },
  { value: 'times', label: 'Times worn', initial: 'desc' as const },
]

function SortAndGroup({
  fill = false,
  group = 'No groups',
  sortOnly = false,
}: {
  fill?: boolean
  group?: string
  /** Building an outfit, where there's less room: no Group. */
  sortOnly?: boolean
}) {
  return (
    <>
      <SortMenu options={SORTS} value="added" direction="desc" onChange={nothing} fill={fill} />
      {!sortOnly && (
        <SmallSelect
          fill={fill}
          label="Group"
          value={group}
          options={['No groups', 'By category', 'By brand', 'By size', 'By colour']}
        />
      )}
    </>
  )
}

function GarmentsToolbar({
  phone,
  mode,
  size,
  filters = 0,
  group,
}: {
  phone: boolean
  mode: GarmentCardMode
  size: CardSize
  filters?: number
  group?: string
}) {
  if (mode === 'select')
    return (
      <SelectionBar
        count={4}
        onDone={nothing}
        actions={[
          { label: 'Add tag', icon: TagIcon, onClick: nothing },
          { label: 'Remove tag', icon: TagsIcon, onClick: nothing },
          { label: 'Retire', icon: ArchiveIcon, onClick: nothing },
          { label: 'Delete', icon: Trash2Icon, onClick: nothing, destructive: true },
        ]}
      />
    )
  const build = (
    <Button
      variant={mode === 'build' ? 'secondary' : 'outline'}
      size="sm"
      aria-pressed={mode === 'build'}
      className={phone ? 'shrink-0' : undefined}
    >
      {mode === 'build' ? <XIcon /> : <ShirtIcon />}
      {mode === 'build' ? 'Done' : 'Build outfit'}
    </Button>
  )
  if (phone)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Search label="Search clothes" />
          <Button variant="outline" size="sm" className="relative shrink-0">
            <SlidersHorizontalIcon /> Filters
            {filters > 0 && <Badge className="absolute -top-2 -right-2">{filters}</Badge>}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <SortAndGroup fill group={group} />
          <Button
            variant={mode === 'build' ? 'secondary' : 'outline'}
            size="icon-sm"
            aria-label={mode === 'build' ? 'Done building' : 'Build outfit'}
            aria-pressed={mode === 'build'}
            className="size-8 shrink-0"
          >
            {mode === 'build' ? <XIcon /> : <ShirtIcon />}
          </Button>
        </div>
      </div>
    )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Search label="Search clothes" />
      <SortAndGroup group={group} sortOnly={mode === 'build'} />
      {mode !== 'build' && (
        <ToggleGroup aria-label="Card size" defaultValue={[size]}>
          <ToggleGroupItem value="S">S</ToggleGroupItem>
          <ToggleGroupItem value="M">M</ToggleGroupItem>
          <ToggleGroupItem value="L">L</ToggleGroupItem>
        </ToggleGroup>
      )}
      {build}
      {mode === 'browse' && (
        <Button variant="ghost" size="sm">
          <ListChecksIcon /> Select
        </Button>
      )}
    </div>
  )
}

const CHOSEN_SELECT = ['tee-gym', 'hoodie-grey', 'shorts-gym', 'trainers-grey']
const IN_BUILDER = ['jacket-stone', 'tee-white', 'jeans-denim']

function GarmentGrid({
  garments,
  mode,
  size,
  chosen = [],
}: {
  garments: DesignGarment[]
  mode: GarmentCardMode
  size: CardSize
  chosen?: string[]
}) {
  return (
    <RecipeGrid size={size}>
      {garments.map((g) => (
        <GarmentCard
          key={g.id}
          garment={g}
          mode={mode}
          chosen={chosen.includes(g.id)}
          onOpen={nothing}
          onFavourite={nothing}
          onChoose={nothing}
        />
      ))}
    </RecipeGrid>
  )
}

/** Grouped by category, in Joe's order. */
function grouped(garments: DesignGarment[]) {
  return CATEGORIES.map((c) => ({
    name: c,
    garments: garments.filter((g) => `${g.category}s` === c || g.category === c),
  })).filter((g) => g.garments.length > 0)
}

function BuilderContents({ phone = false }: { phone?: boolean }) {
  const garments = IN_BUILDER.map((id) => G[id]!)
  return (
    <>
      <OutfitPicture
        photos={garments.map((g) => g.photo)}
        className={phone ? 'aspect-[2/1] rounded-lg' : 'aspect-[3/2] rounded-lg'}
      />
      <div className="flex flex-col gap-0.5">
        {garments.map((g) => (
          <GarmentLine
            key={g.id}
            garment={g}
            end={<RemoveButton label={`Take ${g.brand} ${g.category} out`} />}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Collections</Label>
        <ChoiceChips
          compact
          aria-label="Collections"
          choices={[
            { id: 'My Outfits', name: 'My Outfits' },
            ...COLLECTIONS.map((c) => ({ id: c, name: c })),
          ]}
          chosen={new Set(['My Outfits', 'Lisbon'])}
          onChange={nothing}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="outfit-name">Name</Label>
        <Input id="outfit-name" placeholder="Optional" />
      </div>
      <label className="flex items-center justify-between gap-3 text-sm font-semibold">
        Clear after saving
        <Switch defaultChecked />
      </label>
    </>
  )
}

function BuilderPane() {
  return (
    <WardrobePane
      title="Outfit builder"
      count={IN_BUILDER.length}
      aside={
        <Button variant="ghost" size="sm">
          Clear
        </Button>
      }
      footer={
        <Button className="flex-1">
          <PlusIcon /> Save outfit
        </Button>
      }
    >
      <BuilderContents />
    </WardrobePane>
  )
}

function WardrobeTab({
  phone = false,
  mode = 'browse',
  size = 'M',
  group,
  trayOpen = false,
  filtersOpen = false,
  tagging = false,
  children,
}: {
  children?: ReactNode
  phone?: boolean
  mode?: GarmentCardMode
  size?: CardSize
  group?: 'category'
  trayOpen?: boolean
  filtersOpen?: boolean
  tagging?: boolean
}) {
  const chosen = mode === 'select' ? CHOSEN_SELECT : mode === 'build' ? IN_BUILDER : []
  const filterChosen: Record<string, string[]> = {}
  const shownSize: CardSize = phone ? 'M' : mode === 'build' ? 'S' : size
  const content = (
    <FilterLayout
      filters={<FilterPanel groups={FILTERS(filterChosen)} onChange={nothing} onReset={nothing} />}
    >
      <GarmentsToolbar
        phone={phone}
        mode={mode}
        size={size}
        group={group ? 'By category' : undefined}
      />
      {group ? (
        grouped(OWNED).map((g) => (
          <section key={g.name}>
            <SectionLabel count={g.garments.length}>{g.name}</SectionLabel>
            <GarmentGrid garments={g.garments} mode={mode} size={shownSize} chosen={chosen} />
          </section>
        ))
      ) : (
        <GarmentGrid garments={OWNED} mode={mode} size={shownSize} chosen={chosen} />
      )}
    </FilterLayout>
  )
  return (
    <WardrobePage tab="wardrobe" fab={mode === 'browse'}>
      {mode === 'build' && !phone ? (
        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1">{content}</div>
          <BuilderPane />
        </div>
      ) : (
        content
      )}
      {mode === 'build' && phone && !trayOpen && (
        <Tray
          title="Outfit builder"
          photos={IN_BUILDER.map((id) => G[id]!.photo)}
          count={IN_BUILDER.length}
          action={<Button size="sm">Save</Button>}
        />
      )}
      {mode === 'build' && phone && trayOpen && (
        <TrayPanel
          title="Outfit builder"
          count={IN_BUILDER.length}
          aside={
            <Button variant="ghost" size="sm">
              Clear
            </Button>
          }
          footer={
            <Button className="flex-1">
              <PlusIcon /> Save outfit
            </Button>
          }
        >
          <BuilderContents phone />
        </TrayPanel>
      )}
      {filtersOpen && (
        <FilterDialog
          open
          onOpenChange={nothing}
          colour="orange"
          onReset={nothing}
          show="Show 6 garments"
        >
          <FilterPanel
            bare
            groups={FILTERS({ Category: ['T-shirt', 'Hoodie'], Tags: ['Gym'] })}
            onChange={nothing}
            onReset={nothing}
          />
        </FilterDialog>
      )}
      {tagging && <TagDialog />}
      {children}
    </WardrobePage>
  )
}

function TagDialog() {
  return (
    <Dialog open onOpenChange={nothing}>
      <DialogContent data-colour="orange" className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add tags to 4 garments</DialogTitle>
        </DialogHeader>
        <ChoiceChips
          aria-label="Tags"
          choices={TAGS.map((t) => ({ id: t, name: t }))}
          chosen={new Set(['Gym'])}
          onChange={nothing}
          add={<AddChip>Tag</AddChip>}
        />
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Add Gym</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Adding a garment ---------- */

type AddState = 'suggested' | 'new' | 'filled'

function ColourField({ state }: { state: AddState }) {
  if (state === 'new')
    return (
      <SheetField label="Colour" aside="None of yours is close">
        <ChoiceChips
          single
          aria-label="Colour"
          choices={[
            { id: 'new', name: 'New: Teal', hex: NEW_TEAL.hex },
            { id: 'Forest green', name: 'Forest green', hex: COLOURS.forest.hex },
            { id: 'Denim', name: 'Mid denim', hex: COLOURS.denim.hex },
          ]}
          chosen={new Set(['new'])}
          onChange={nothing}
          add={<AddChip icon={null}>All colours</AddChip>}
        />
        <div className="flex items-center gap-2 rounded-row bg-muted/60 py-2 pr-2 pl-3">
          <Swatch hex={NEW_TEAL.hex} size="md" />
          <Input
            size="sm"
            aria-label="New colour's name"
            defaultValue="Teal"
            className="flex-1 bg-card"
          />
          <Button variant="ghost" size="sm">
            <PipetteIcon /> Pick
          </Button>
        </div>
      </SheetField>
    )
  return (
    <SheetField label="Colour" aside="From the photo">
      <ChoiceChips
        single
        aria-label="Colour"
        choices={[
          { id: 'Navy', name: 'Navy', hex: COLOURS.navy.hex },
          { id: 'Charcoal', name: 'Charcoal', hex: COLOURS.charcoal.hex },
          { id: 'Black', name: 'Black', hex: COLOURS.black.hex },
        ]}
        chosen={new Set(['Navy'])}
        onChange={nothing}
        add={
          <>
            <AddChip icon={null}>All colours</AddChip>
            <AddChip icon={PipetteIcon}>New colour</AddChip>
          </>
        }
      />
    </SheetField>
  )
}

function AddFields({ state, brandTyping = false }: { state: AddState; brandTyping?: boolean }) {
  const filled = state === 'filled'
  return (
    <>
      {!brandTyping && <ColourField state={state} />}
      {!brandTyping && (
        <SheetField label="Category">
          <ChoiceChips
            single
            aria-label="Category"
            choices={CATEGORIES.map((c) => ({ id: c, name: c }))}
            chosen={new Set(['T-shirt'])}
            onChange={nothing}
          />
        </SheetField>
      )}
      <SheetField label="Size" aside="Used with T-shirt">
        <ChoiceChips
          single
          aria-label="Size"
          choices={['S', 'M', 'L'].map((s) => ({ id: s, name: s }))}
          chosen={new Set(filled ? ['M'] : [])}
          onChange={nothing}
          add={<AddChip icon={null}>More sizes</AddChip>}
        />
      </SheetField>
      <SheetField label="Brand">
        {brandTyping ? (
          <div className="flex flex-col gap-1.5">
            <Input defaultValue="Ar" aria-label="Brand" />
            <div className="flex flex-col rounded-lg bg-popover p-1.5 shadow-pop">
              <button
                type="button"
                className="flex h-9 items-center rounded-sm bg-accent px-2.5 text-sm"
              >
                <b>Ar</b>ket
              </button>
              <button type="button" className="flex h-9 items-center rounded-sm px-2.5 text-sm">
                C<b>ar</b>hartt
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-sm px-2.5 text-sm text-muted-foreground"
              >
                <PlusIcon className="size-4" /> Add "Ar"
              </button>
            </div>
          </div>
        ) : (
          <>
            <ChoiceChips
              single
              aria-label="Recent brands"
              choices={['Uniqlo', 'Arket', 'COS', 'Nike', "Levi's"].map((b) => ({
                id: b,
                name: b,
              }))}
              chosen={new Set(filled ? ['Uniqlo'] : [])}
              onChange={nothing}
              add={<AddChip icon={SearchIcon}>Search brands</AddChip>}
            />
          </>
        )}
      </SheetField>
      {!brandTyping && (
        <>
          <SheetField label="Fit" aside="Optional">
            <ChoiceChips
              single
              aria-label="Fit"
              choices={FITS.map((f) => ({ id: f, name: f }))}
              chosen={new Set(filled ? ['Regular'] : [])}
              onChange={nothing}
              add={<AddChip>Fit</AddChip>}
            />
          </SheetField>
          <SheetField label="Tags" aside="Optional">
            <ChoiceChips
              aria-label="Tags"
              choices={TAGS.map((t) => ({ id: t, name: t }))}
              chosen={new Set(filled ? ['Lounge'] : [])}
              onChange={nothing}
              add={<AddChip>Tag</AddChip>}
            />
          </SheetField>
        </>
      )}
    </>
  )
}

/** The photo, and the title it will have, worked out as it fills (ADR-0066 3). */
function AddHeading({ state, carried = false }: { state: AddState; carried?: boolean }) {
  const photo = state === 'new' ? TEAL_TEE : G['tee-navy']!.photo
  const title =
    state === 'new' ? 'Teal T-shirt' : state === 'filled' ? 'Navy Uniqlo T-shirt' : 'Navy T-shirt'
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <GarmentPhoto src={photo} className="size-24 rounded-lg shadow-card" />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-day leading-tight">{title}</span>
        {carried && (
          <span className="text-xs font-semibold text-muted-foreground">
            Category and size from the last one
          </span>
        )}
        <Button variant="link" size="sm" className="self-start">
          <CameraIcon /> Retake
        </Button>
      </div>
    </div>
  )
}

function AddSheet({ state, brandTyping = false }: { state: AddState; brandTyping?: boolean }) {
  const ready = state === 'filled'
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="orange"
      icon={ShirtIcon}
      typeLabel="New garment"
      title={<span className="sr-only">New garment</span>}
      keepOnOutsideClick
      footer={
        <>
          {!ready && (
            <span className="mr-auto self-center text-sm font-semibold text-muted-foreground">
              {brandTyping ? 'Add a size' : 'Add a size and brand'}
            </span>
          )}
          <Button variant="outline">Cancel</Button>
          <Button disabled={!ready}>Save</Button>
        </>
      }
    >
      <AddHeading state={state} />
      <AddFields state={state} brandTyping={brandTyping} />
    </ItemDialog>
  )
}

function PhoneAdd({ state, brandTyping }: { state: AddState; brandTyping?: boolean }) {
  return (
    <WardrobeTab phone>
      <AddSheet state={state} brandTyping={brandTyping} />
    </WardrobeTab>
  )
}

function CameraScreen() {
  return (
    <CameraView last={G['tee-white']!.photo}>
      <StoredPicture
        src={cameraPhoto('tshirt', COLOURS.navy.hex)}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
    </CameraView>
  )
}

function LoupeScreen() {
  return (
    <WardrobeTab phone>
      <Dialog open onOpenChange={nothing}>
        <DialogContent data-colour="orange" className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>New colour</DialogTitle>
          </DialogHeader>
          <ColourLoupe
            photo={G['jacket-olive']!.photo!}
            at={{ x: 56, y: 52 }}
            hex={COLOURS.olive.hex}
          />
          <div className="flex items-center gap-3">
            <Swatch hex={COLOURS.olive.hex} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="colour-name">Name</Label>
              <Input id="colour-name" defaultValue="Olive" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Use Olive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WardrobeTab>
  )
}

function TwinScreen() {
  return (
    <WardrobeTab phone>
      <Dialog open onOpenChange={nothing}>
        <DialogContent data-colour="orange" className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>New colour</DialogTitle>
          </DialogHeader>
          <ColourLoupe photo={G['tee-navy']!.photo!} at={{ x: 46, y: 58 }} hex={ESTIMATE_NAVY} />
          <div className="flex items-center gap-3">
            <Swatch hex={ESTIMATE_NAVY} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="colour-name">Name</Label>
              <Input id="colour-name" defaultValue="Dark navy" />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-row bg-muted/60 p-3">
            <Swatch hex={COLOURS.navy.hex} size="md" />
            <span className="flex-1 text-sm font-semibold">Close to Navy</span>
            <Button variant="outline" size="sm">
              Use Navy
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Make Dark navy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WardrobeTab>
  )
}

/** The desktop's New garment: the photo beside the fields. */
function DesktopAdd() {
  return (
    <WardrobeTab>
      <Dialog open onOpenChange={nothing}>
        <DialogContent data-colour="orange" className="max-w-[860px] gap-0 p-0">
          <div className="grid grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex flex-col gap-3 bg-muted/50 p-6">
              <GarmentPhoto src={G['tee-navy']!.photo} className="rounded-lg shadow-card" />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <CameraIcon /> Camera
                </Button>
                <Button variant="outline" size="sm">
                  Choose file
                </Button>
              </div>
            </div>
            <div className="flex max-h-[640px] flex-col gap-5 overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle>Navy T-shirt</DialogTitle>
              </DialogHeader>
              <AddFields state="suggested" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-4">
            <span className="mr-auto text-sm font-semibold text-muted-foreground">
              Size and brand
            </span>
            <Button variant="outline">Cancel</Button>
            <Button disabled>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </WardrobeTab>
  )
}

/* ---------- A garment's popup ---------- */

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-semibold">{children}</span>
    </div>
  )
}

function GarmentDialog({ added = false }: { added?: boolean }) {
  const g = added ? G['tee-navy']! : G['shirt-sky']!
  const inOutfits = OUTFITS.filter((o) => o.garments.includes(g))
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="orange"
      icon={ShirtIcon}
      typeLabel={added ? 'Garment · Added' : 'Garment'}
      title={added ? 'Navy Uniqlo T-shirt' : 'Light blue Ralph Lauren Shirt'}
      actions={
        <>
          <Toggle aria-label="Favourite" pressed={!added}>
            <HeartFill />
          </Toggle>
          <Button variant="ghost" size="icon-sm" aria-label="Edit">
            <PencilIcon />
          </Button>
          {more(
            <>
              <DropdownMenuItem>
                <ArchiveIcon /> Retire
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </>,
          )}
        </>
      }
      footer={
        added ? (
          <>
            <Button variant="outline">Done</Button>
            <Button>
              <CameraIcon /> Add another
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <GarmentPhoto src={g.photo} className="w-full shrink-0 rounded-lg sm:w-52" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Fact label="Category">{g.category}</Fact>
          <Fact label="Brand">{g.brand}</Fact>
          <Fact label="Size">{g.size}</Fact>
          <Fact label="Colour">
            <Swatch hex={g.colour.hex} /> {g.colour.name}
          </Fact>
          {g.fit && <Fact label="Fit">{g.fit}</Fact>}
          {!!g.tags?.length && (
            <Fact label="Tags">
              {g.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </Fact>
          )}
        </div>
      </div>
      {!added && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Worn', '11×'],
              ['Last worn', 'Mon 16'],
              ['Added', '2 Oct'],
            ].map(([l, v]) => (
              <div key={l} className="flex flex-col gap-0.5 rounded-row bg-muted/60 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">{l}</span>
                <span className="font-bold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <section className="flex flex-col gap-2.5">
            <SectionLabel count={inOutfits.length}>In outfits</SectionLabel>
            <div className="grid grid-cols-3 gap-2.5">
              {inOutfits.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="flex min-w-0 flex-col gap-1.5 text-left"
                >
                  <OutfitPicture photos={o.photos} className="rounded-row shadow-card" />
                  <span className="truncate text-xs font-semibold">
                    {o.name ?? 'Untitled outfit'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </ItemDialog>
  )
}

function HeartFill() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-current text-tc-text">
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
    </svg>
  )
}

/* ---------- The Outfits tab ---------- */

function PlannedPane() {
  return (
    <WardrobePane
      title="Planned outfits"
      count={PLANNED.length}
      aside={
        <Button variant="ghost" size="sm">
          Clear
        </Button>
      }
    >
      <Tabs defaultValue="outfits">
        <TabsList aria-label="Show">
          <TabsTrigger value="outfits">Outfits</TabsTrigger>
          <TabsTrigger value="garments">Garments</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-col gap-1.5">
        {PLANNED.map((o, i) => (
          <PlannedOutfitLine
            key={o.id}
            photos={o.photos}
            name={o.name}
            meta={`${o.garments.length} garments`}
            dragging={i === 0 && false}
          />
        ))}
      </div>
    </WardrobePane>
  )
}

const OUTFIT_SORTS = [
  { value: 'added', label: 'Recently added', initial: 'desc' as const },
  { value: 'worn', label: 'Last worn', initial: 'desc' as const },
  { value: 'times', label: 'Times worn', initial: 'desc' as const },
]

function OutfitsTab({
  phone = false,
  collection = 'My Outfits',
  selecting = false,
  dialog,
}: {
  phone?: boolean
  collection?: string
  selecting?: boolean
  dialog?: ReactNode
}) {
  const own = collection !== 'My Outfits'
  const outfits = own ? OUTFITS.filter((o) => o.collections.includes(collection)) : OUTFITS
  const chosen = ['o-weekend', 'o-lisbon']
  const toolbar = selecting ? (
    <SelectionBar
      count={2}
      onDone={nothing}
      actions={[
        { label: 'Add to Planned outfits', icon: CalendarPlusIcon, onClick: nothing },
        { label: 'Add to collection', icon: FolderPlusIcon, onClick: nothing },
        own
          ? { label: 'Remove from collection', icon: XIcon, onClick: nothing }
          : { label: 'Delete', icon: Trash2Icon, onClick: nothing, destructive: true },
      ]}
    />
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      {phone && (
        <div className="flex basis-full">
          <Search label="Search outfits" />
        </div>
      )}
      <SmallSelect
        label="Collection"
        value={collection}
        options={['My Outfits', ...COLLECTIONS]}
        fill={phone}
      />
      {!phone && <Search label="Search outfits" />}
      <SortMenu
        options={OUTFIT_SORTS}
        value="added"
        direction="desc"
        onChange={nothing}
        fill={phone}
      />
      {!phone && (
        <Button variant="ghost" size="sm">
          <ListChecksIcon /> Select
        </Button>
      )}
    </div>
  )
  const grid = (
    <RecipeGrid size={phone ? 'M' : 'M'}>
      {outfits.map((o) => (
        <OutfitCard
          key={o.id}
          photos={o.photos}
          name={o.name}
          meta={outfitMeta(o)}
          selecting={selecting}
          selected={selecting && chosen.includes(o.id)}
        />
      ))}
    </RecipeGrid>
  )
  return (
    <WardrobePage tab="outfits" fab={!selecting}>
      {phone ? (
        <>
          {toolbar}
          {grid}
          {!selecting && (
            <Tray
              title="Planned outfits"
              photos={PLANNED.map((o) => o.photos[0])}
              count={PLANNED.length}
              unit="outfit"
            />
          )}
        </>
      ) : (
        <div className="flex items-start gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {toolbar}
            {grid}
          </div>
          <PlannedPane />
        </div>
      )}
      {dialog}
    </WardrobePage>
  )
}

function OutfitDialog({ outfit = O['o-work']! }: { outfit?: DesignOutfit }) {
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="orange"
      icon={ShirtIcon}
      typeLabel="Outfit"
      title={outfit.name ?? 'Untitled outfit'}
      actions={
        <>
          <Button variant="ghost" size="icon-sm" aria-label="Edit">
            <PencilIcon />
          </Button>
          {more(
            <DropdownMenuItem variant="destructive">
              <Trash2Icon /> Delete
            </DropdownMenuItem>,
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">My Outfits</Badge>
        {outfit.collections.map((c) => (
          <Badge key={c} variant="secondary">
            {c}
          </Badge>
        ))}
        <span className="ml-1 text-sm text-muted-foreground tabular-nums">
          Worn {outfit.worn}× · last Mon 16
        </span>
      </div>
      <div className="flex flex-col gap-5 sm:flex-row">
        <OutfitPicture photos={outfit.photos} className="w-full shrink-0 rounded-lg sm:w-56" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {outfit.garments.map((g) => (
            <GarmentLine key={g.id} garment={g} onOpen={nothing} />
          ))}
        </div>
      </div>
      <Button variant="outline" className="self-start">
        <CalendarPlusIcon /> Add to Planned outfits
      </Button>
    </ItemDialog>
  )
}

function NewOutfitDialog() {
  const chosen = ['jumper-navy', 'chinos-stone']
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="orange"
      icon={ShirtIcon}
      typeLabel="New outfit"
      title={<span className="sr-only">New outfit</span>}
      wide
      footer={
        <>
          <span className="mr-auto self-center text-sm font-semibold text-muted-foreground tabular-nums">
            2 garments
          </span>
          <Button variant="outline">Cancel</Button>
          <Button>Save outfit</Button>
        </>
      }
    >
      <div className="flex items-center gap-2">
        <Search label="Search clothes" />
      </div>
      <ChoiceChips
        compact
        aria-label="Category"
        choices={CATEGORIES.slice(0, 8).map((c) => ({ id: c, name: c }))}
        chosen={new Set(['Jumper', 'Trousers'])}
        onChange={nothing}
      />
      <RecipeGrid size="S">
        {OWNED.filter((g) => ['Jumper', 'Trousers'].includes(g.category)).map((g) => (
          <GarmentCard key={g.id} garment={g} mode="build" chosen={chosen.includes(g.id)} />
        ))}
      </RecipeGrid>
      <div className="flex flex-col gap-2">
        <Label>Collections</Label>
        <ChoiceChips
          compact
          aria-label="Collections"
          choices={[
            { id: 'My Outfits', name: 'My Outfits' },
            ...COLLECTIONS.map((c) => ({ id: c, name: c })),
          ]}
          chosen={new Set(['My Outfits', 'Work'])}
          onChange={nothing}
        />
      </div>
    </ItemDialog>
  )
}

/* ---------- The Week tab ---------- */

function WeekDayContents({ day }: { day: (typeof WEEK)[number] }) {
  return (
    <>
      {day.outfits.map(({ outfit }) => (
        <DayOutfit key={outfit.id} name={outfit.name} garments={outfit.garments} past={day.past} />
      ))}
      {day.single.length > 0 && (
        <div className="flex flex-col gap-1.5 px-3">
          {day.single.map((g) => (
            <DayGarment key={g.id} garment={g} alone />
          ))}
        </div>
      )}
      {day.single.length >= 2 && (
        <Button variant="outline" size="sm" className="w-full px-2">
          Create outfit
        </Button>
      )}
    </>
  )
}

function WeekTab({
  phone = false,
  placing = false,
  trayOpen = false,
}: {
  phone?: boolean
  placing?: boolean
  trayOpen?: boolean
}) {
  const toolbar = (
    <PlanToolbar
      title="16 – 22 November"
      layout="week"
      onToday={nothing}
      onPrevious={nothing}
      onNext={nothing}
      step="week"
    />
  )
  if (phone)
    return (
      <WardrobePage tab="week">
        {toolbar}
        <div className="flex flex-col gap-4">
          {WEEK.slice(2).map((d) => (
            <section
              key={d.key}
              aria-label={`${d.name} ${d.number}`}
              className="flex flex-col gap-2"
            >
              <div className="flex h-8 items-center gap-1.5 px-1">
                <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
                  {d.name}
                </span>
                <span
                  className={
                    d.today
                      ? 'rounded-md bg-ink px-2 text-day leading-7 text-ink-foreground'
                      : 'text-day leading-7'
                  }
                >
                  {d.number}
                </span>
                {d.forecast && <DayWeather forecast={d.forecast} className="ml-auto" />}
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2">
                {d.outfits.map(({ outfit }) => (
                  <DayOutfit
                    key={outfit.id}
                    name={outfit.name}
                    garments={outfit.garments}
                    layout="row"
                  />
                ))}
                {d.single.length > 0 && (
                  <div className="flex items-center gap-2">
                    {d.single.map((g) => (
                      <GarmentPhoto
                        key={g.id}
                        src={g.photo}
                        className="size-14 rounded-sm shadow-card"
                      />
                    ))}
                    {d.single.length >= 2 && (
                      <Button variant="ghost" size="sm" className="ml-auto">
                        <PlusIcon /> Create outfit
                      </Button>
                    )}
                  </div>
                )}
                {placing && (
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-1.5 rounded-row border-[1.5px] border-dashed border-ring text-sm font-semibold text-tc-text"
                  >
                    <PlusIcon className="size-4" /> Place here
                  </button>
                )}
                {!placing && d.outfits.length === 0 && d.single.length === 0 && (
                  <span className="px-1 py-2 text-sm text-muted-foreground">Nothing planned</span>
                )}
              </div>
            </section>
          ))}
        </div>
        {placing ? (
          <div className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 flex h-16 items-center gap-3 rounded-lg bg-popover px-2.5 shadow-dialog">
            <OutfitPicture
              photos={O['o-weekend']!.photos}
              className="size-11 shrink-0 rounded-md"
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">Choose a day</span>
              <span className="truncate text-xs text-muted-foreground">
                Untitled outfit · 4 garments
              </span>
            </span>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        ) : trayOpen ? (
          <TrayPanel
            title="Planned outfits"
            count={PLANNED.length}
            aside={
              <Button variant="ghost" size="sm">
                Clear
              </Button>
            }
          >
            <Tabs defaultValue="outfits">
              <TabsList aria-label="Show">
                <TabsTrigger value="outfits">Outfits</TabsTrigger>
                <TabsTrigger value="garments">Garments</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-col gap-1.5">
              {PLANNED.map((o, i) => (
                <PlannedOutfitLine
                  key={o.id}
                  photos={o.photos}
                  name={o.name}
                  meta={`${o.garments.length} garments · Tap, then a day`}
                  picked={i === 0}
                />
              ))}
            </div>
          </TrayPanel>
        ) : (
          <Tray
            title="Planned outfits"
            photos={PLANNED.map((o) => o.photos[0])}
            count={PLANNED.length}
            unit="outfit"
          />
        )}
      </WardrobePage>
    )
  return (
    <WardrobePage tab="week">
      {toolbar}
      <div className="flex items-start gap-6">
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-2.5">
          {WEEK.map(({ key, forecast, ...d }) => (
            <DayColumn
              key={key}
              name={d.name}
              number={d.number}
              today={d.today}
              tall
              add={
                <Button variant="ghost" size="icon-sm" aria-label={`Add to ${d.name}`}>
                  <PlusIcon />
                </Button>
              }
              subhead={forecast ? <DayWeather forecast={forecast} stacked /> : null}
              dropping={key === 'sun'}
            >
              <WeekDayContents day={{ key, forecast, ...d }} />
            </DayColumn>
          ))}
        </div>
        <PlannedPane />
      </div>
    </WardrobePage>
  )
}

/* ---------- Today and Week ---------- */

const TaskIcon = TYPE_ICONS.task!
const EventIcon = TYPE_ICONS.event!

const todayPhotos = [...O['o-work']!.garments, G['coat-navy']!].map((g) => g.photo)

function TodayScreen() {
  return (
    <Shell page="Today">
      <PageHeader title="Today" />
      <div className="flex max-w-reading flex-col gap-5 px-5 pb-28 sm:px-9">
        <span className="-mt-3 text-sm font-semibold text-muted-foreground">
          Wednesday 18 November
        </span>
        <section className="flex flex-col gap-1.5">
          <SectionLabel>Anytime</SectionLabel>
          <ItemRow
            leading={<TypeTile colour="orange" icon={ShirtIcon} />}
            title="Navy work + coat"
            meta={['Outfit', '4 garments', '11° rain']}
            trailing={
              <span className="hidden gap-1 sm:flex">
                {todayPhotos.map((p, i) => (
                  <GarmentPhoto key={i} src={p} className="size-9 rounded-sm" />
                ))}
              </span>
            }
            onOpen={nothing}
          />
          <ItemRow
            leading={<TypeTile colour="blue" icon={TaskIcon} />}
            title="Renew car insurance"
            meta={['Task', 'Due Fri']}
            onOpen={nothing}
          />
        </section>
        <section className="flex flex-col gap-1.5">
          <SectionLabel>Morning</SectionLabel>
          <ItemRow
            leading={<TypeTile colour="blue" icon={EventIcon} />}
            title="Stand-up"
            meta={['09:30–09:45', 'Zoom']}
            onOpen={nothing}
          />
        </section>
      </div>
    </Shell>
  )
}

function CoreWeekScreen() {
  return (
    <Shell page="Week">
      <PageHeader title="Week" />
      <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9">
        <PlanToolbar
          title="16 – 22 November"
          layout="week"
          onToday={nothing}
          onPrevious={nothing}
          onNext={nothing}
          step="week"
        />
        <div className="grid grid-cols-7 gap-2.5">
          {WEEK.map((d) => (
            <DayColumn key={d.key} name={d.name} number={d.number} today={d.today} tall>
              {(d.outfits.length > 0 || d.single.length > 0) && (
                <OutfitPlanCard
                  title={
                    d.outfits.length > 1
                      ? `${d.outfits.length} outfits`
                      : d.outfits.length === 1
                        ? (d.outfits[0]!.outfit.name ?? 'Outfit') +
                          (d.single.length ? ' + coat' : '')
                        : `${d.single.length} garments`
                  }
                  photos={[
                    ...d.outfits.flatMap((o) => o.outfit.garments.map((g) => g.photo)),
                    ...d.single.map((g) => g.photo),
                  ]}
                  past={d.past}
                  onOpen={nothing}
                />
              )}
              {d.key === 'wed' && (
                <PlanCard
                  colour="blue"
                  icon={EventIcon}
                  type="Event"
                  title="Stand-up"
                  time="09:30"
                />
              )}
              {d.key === 'thu' && (
                <PlanCard colour="coral" icon={DumbbellIcon} type="Workout" title="Push day" />
              )}
              {d.key === 'fri' && (
                <PlanCard
                  colour="blue"
                  icon={EventIcon}
                  type="Event"
                  title="Dinner at Dishoom"
                  time="19:30"
                />
              )}
            </DayColumn>
          ))}
        </div>
      </div>
    </Shell>
  )
}

function DayDialog() {
  const day = WEEK[2]!
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="orange"
      icon={ShirtIcon}
      typeLabel="Outfit · Wed 18 November"
      title="Navy work + coat"
    >
      {day.forecast && <DayWeather forecast={day.forecast} className="text-sm" />}
      {day.outfits.map(({ outfit }) => (
        <section key={outfit.id} className="flex flex-col gap-1.5">
          <SectionLabel>{outfit.name ?? 'Outfit'}</SectionLabel>
          {outfit.garments.map((g) => (
            <GarmentLine key={g.id} garment={g} onOpen={nothing} />
          ))}
        </section>
      ))}
      <section className="flex flex-col gap-1.5">
        <SectionLabel>Also</SectionLabel>
        {day.single.map((g) => (
          <GarmentLine key={g.id} garment={g} onOpen={nothing} />
        ))}
      </section>
      <Button variant="outline" className="self-start">
        Open in Wardrobe
      </Button>
    </ItemDialog>
  )
}

/* ---------- Settings → Wardrobe ---------- */

function SettingsCard({
  title,
  count,
  add,
  children,
}: {
  title: string
  count: number
  add?: string
  children: ReactNode
}) {
  return (
    <Card className="gap-2 p-3 pt-2">
      <div className="flex h-11 items-center gap-2 pl-2">
        <h2 className="text-h2">{title}</h2>
        <Badge variant="outline">{count}</Badge>
        {add && (
          <Button variant="ghost" size="sm" className="ml-auto">
            <PlusIcon /> {add}
          </Button>
        )}
      </div>
      <div className="flex flex-col">{children}</div>
    </Card>
  )
}

const uses = (n: number, of = 'garment') => (n === 0 ? 'Unused' : `${n} ${of}${n === 1 ? '' : 's'}`)

const menuFor = (merge = true) =>
  more(
    <>
      <DropdownMenuItem>
        <PencilIcon /> Rename
      </DropdownMenuItem>
      {merge && <DropdownMenuItem>Merge into…</DropdownMenuItem>}
      <DropdownMenuItem variant="destructive">
        <Trash2Icon /> Delete
      </DropdownMenuItem>
    </>,
  )

function SettingsScreen() {
  const count = (pred: (g: DesignGarment) => boolean) => GARMENTS.filter(pred).length
  return (
    <Shell page="Settings">
      <PageHeader title="Wardrobe" back={{ label: 'Settings', onClick: nothing }} />
      <div className="grid gap-5 px-5 pb-28 sm:px-9 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <SettingsCard title="Categories" count={CATEGORIES.length} add="Category">
            {CATEGORIES.slice(0, 7).map((c) => (
              <ListEntryRow
                key={c}
                name={c}
                ordered
                uses={uses(count((g) => `${g.category}s` === c || g.category === c))}
                menu={menuFor()}
              />
            ))}
          </SettingsCard>
          <SettingsCard title="Sizes" count={SIZES.length} add="Size">
            {SIZES.slice(0, 6).map((s) => (
              <ListEntryRow
                key={s}
                name={s}
                ordered
                uses={uses(count((g) => g.size === s))}
                menu={menuFor()}
              />
            ))}
          </SettingsCard>
          <SettingsCard title="Collections" count={COLLECTIONS.length + 1} add="Collection">
            <ListEntryRow name="My Outfits" ordered fixed uses={uses(OUTFITS.length, 'outfit')} />
            {COLLECTIONS.map((c) => (
              <ListEntryRow
                key={c}
                name={c}
                ordered
                uses={uses(OUTFITS.filter((o) => o.collections.includes(c)).length, 'outfit')}
                menu={menuFor(false)}
              />
            ))}
          </SettingsCard>
        </div>
        <div className="flex flex-col gap-5">
          <SettingsCard title="Colours" count={colourChoices.length} add="Colour">
            {colourChoices.slice(0, 8).map((c) => (
              <ListEntryRow
                key={c.id}
                name={c.name}
                hex={c.hex}
                uses={uses(count((g) => g.colour.name === c.name))}
                menu={menuFor()}
              />
            ))}
          </SettingsCard>
          <SettingsCard title="Fits" count={FITS.length} add="Fit">
            {FITS.map((f) => (
              <ListEntryRow
                key={f}
                name={f}
                uses={uses(count((g) => g.fit === f))}
                menu={menuFor()}
              />
            ))}
          </SettingsCard>
          <Card className="gap-3">
            <h2 className="text-h2">Weather</h2>
            <div className="flex items-center gap-3 rounded-row bg-muted/60 px-3 py-2.5">
              <MapPinIcon className="size-4 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">Manchester</span>
                <span className="text-xs text-muted-foreground">England, United Kingdom</span>
              </span>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
          </Card>
          <Card className="gap-0 p-0">
            <button type="button" className="flex h-14 items-center gap-3 px-5 text-left">
              <ArchiveIcon className="size-4 text-muted-foreground" />
              <span className="flex-1 font-semibold">Retired garments</span>
              <Badge variant="outline">1</Badge>
            </button>
          </Card>
        </div>
      </div>
    </Shell>
  )
}

/* ---------- Screens ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  wardrobe: () => <WardrobeTab />,
  'wardrobe-grouped': () => <WardrobeTab group="category" />,
  'wardrobe-select': () => <WardrobeTab mode="select" />,
  'wardrobe-tag': () => <WardrobeTab mode="select" tagging />,
  builder: () => <WardrobeTab mode="build" />,
  add: () => <DesktopAdd />,
  garment: () => (
    <WardrobeTab>
      <GarmentDialog />
    </WardrobeTab>
  ),
  outfits: () => <OutfitsTab />,
  'outfits-select': () => <OutfitsTab selecting collection="Lisbon" />,
  outfit: () => <OutfitsTab dialog={<OutfitDialog />} />,
  'outfit-new': () => <OutfitsTab dialog={<NewOutfitDialog />} />,
  week: () => <WeekTab />,
  today: () => <TodayScreen />,
  'core-week': () => <CoreWeekScreen />,
  day: () => <CoreWeekScreen />,
  'day-open': () => (
    <>
      <CoreWeekScreen />
      <DayDialog />
    </>
  ),
  settings: () => <SettingsScreen />,
  'm-wardrobe': () => <WardrobeTab phone />,
  'm-filters': () => <WardrobeTab phone filtersOpen />,
  'm-select': () => <WardrobeTab phone mode="select" />,
  'm-builder': () => <WardrobeTab phone mode="build" />,
  'm-builder-open': () => <WardrobeTab phone mode="build" trayOpen />,
  'm-camera': () => <CameraScreen />,
  'm-add': () => <PhoneAdd state="suggested" />,
  'm-add-new': () => <PhoneAdd state="new" />,
  'm-add-brand': () => <PhoneAdd state="suggested" brandTyping />,
  'm-add-filled': () => <PhoneAdd state="filled" />,
  'm-loupe': () => <LoupeScreen />,
  'm-twin': () => <TwinScreen />,
  'm-added': () => (
    <WardrobeTab phone>
      <GarmentDialog added />
    </WardrobeTab>
  ),
  'm-garment': () => (
    <WardrobeTab phone>
      <GarmentDialog />
    </WardrobeTab>
  ),
  'm-outfits': () => <OutfitsTab phone />,
  'm-outfit': () => <OutfitsTab phone dialog={<OutfitDialog />} />,
  'm-week': () => <WeekTab phone />,
  'm-week-tray': () => <WeekTab phone trayOpen />,
  'm-week-place': () => <WeekTab phone placing />,
  'm-today': () => <TodayScreen />,
  'm-day': () => (
    <>
      <TodayScreen />
      <DayDialog />
    </>
  ),
  'm-settings': () => <SettingsScreen />,
}

function Screens() {
  const { screen = 'wardrobe' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS.wardrobe!)()}</>
}
