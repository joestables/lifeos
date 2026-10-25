import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  CalendarDaysIcon,
  CheckIcon,
  ChefHatIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  InboxIcon,
  ListChecksIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  TargetIcon,
  Trash2Icon,
  UtensilsIcon,
  WalletIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import {
  AddRow,
  AppShell,
  CardRow,
  ItemRow,
  KeptRow,
  MealCard,
  MealDay,
  MealSlot,
  MealWeek,
  OfferRow,
  PageAction,
  PageHeader,
  PantryAisle,
  PlanToolbar,
  SectionLabel,
  SelectionBar,
  ShoppingLine,
  Suggestions,
  TabsRow,
  TypeScope,
  TypeTile,
  type DrawerPage,
  type Slot,
} from '@/components/lifeos'
import { Fab } from '@/components/lifeos/Fab'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { Tabs, TabsCount, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Stage 4b's screens, drawn with the real components and made-up data, for
 * Joe to agree in the design step (Stage 4b plan, step 3). In development
 * and preview builds only, as /design is. `?screen=` chooses the screen.
 */
export const Route = createFileRoute('/design-stage-4b')({
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
      pages={PAGES.map((p) => (p.label === page ? { ...p, to: '/design-stage-4b' } : p))}
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

const lineMenu = more(
  <>
    <DropdownMenuItem>
      <PencilIcon /> Amount…
    </DropdownMenuItem>
    <DropdownMenuItem variant="destructive">
      <Trash2Icon /> Delete
    </DropdownMenuItem>
  </>,
  'Line',
)

function SmallSelect({
  value,
  options,
  label,
  full = false,
}: {
  value: string
  options: string[]
  label: string
  full?: boolean
}) {
  return (
    <Select defaultValue={value}>
      <SelectTrigger
        size={full ? 'default' : 'sm'}
        aria-label={label}
        className={full ? 'w-full' : 'w-auto'}
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

/* ---------- Shopping: Food and Lists ---------- */

function ShoppingTabs({ tab, action }: { tab: 'food' | 'lists'; action?: ReactNode }) {
  return (
    <TabsRow>
      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="food">Food</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
        </TabsList>
      </Tabs>
      {action}
    </TabsRow>
  )
}

const cart = <TypeTile colour="yellow" icon={ShoppingCartIcon} />

const STAPLES = [
  ['Olive oil', true],
  ['Salt', false],
  ['Cumin', false],
  ['Chilli powder', false],
  ['Vegetable stock', false],
  ['Soy sauce', false],
] as const
const ESSENTIALS = [
  ['Milk', true],
  ['Bananas', false],
  ['Greek yoghurt', false],
  ['Sourdough', false],
] as const

function Kept({
  title,
  flag,
  rows,
}: {
  title: string
  flag: string
  rows: readonly (readonly [string, boolean])[]
}) {
  return (
    <Card className="gap-0 px-2 py-1.5">
      <CardTitle className="px-3 pt-2.5 pb-1 text-sm text-muted-foreground">{title}</CardTitle>
      {rows.map(([name, on]) => (
        <KeptRow
          key={name}
          name={name}
          flag={flag}
          on={on}
          menu={more(
            <DropdownMenuItem variant="destructive">
              <XIcon /> Take off
            </DropdownMenuItem>,
            name,
          )}
        />
      ))}
      <AddRow
        placeholder={flag === 'Required' ? 'Add an essential' : 'Add a staple'}
        onAdd={nothing}
        className="px-3 pb-1.5"
      />
    </Card>
  )
}

function Food({ phone = false }: { phone?: boolean }) {
  return (
    <Shell page="Shopping">
      <TypeScope colour="yellow">
        <PageHeader title="Shopping" action={{ label: 'New shop', onClick: nothing }} />
        <div className={`flex max-w-3xl flex-col gap-6 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
          <ShoppingTabs tab="food" action={<PageAction label="New shop" onClick={nothing} />} />
          <section className="flex flex-col gap-1.5">
            <SectionLabel>Shops</SectionLabel>
            <ItemRow
              leading={cart}
              title="Big shop"
              meta={['Sat 26 Oct', '4 meals', '2 of 27']}
              menu={more(null)}
              onOpen={nothing}
            />
            <ItemRow
              leading={cart}
              title="Top-up"
              meta={['Wed 30 Oct', '1 meal', '0 of 6']}
              menu={more(null)}
              onOpen={nothing}
            />
            <ItemRow
              leading={cart}
              title="Barbecue at Mum's"
              meta={['Mum & Dad', '0 of 9']}
              menu={more(null)}
              onOpen={nothing}
            />
            <Button variant="link" className="self-start pt-1">
              Done shops
            </Button>
          </section>
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <SectionLabel className="mb-0 flex-1">Staples and essentials</SectionLabel>
              <SmallSelect label="Whose" value="Home" options={['Home', 'Personal', 'Mum & Dad']} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Kept title="Staples" flag="Out of stock" rows={STAPLES} />
              <Kept title="Essentials" flag="Required" rows={ESSENTIALS} />
            </div>
          </section>
        </div>
        {phone && <Fab label="New shop" />}
      </TypeScope>
    </Shell>
  )
}

function Lists({ phone = false }: { phone?: boolean }) {
  return (
    <Shell page="Shopping">
      <TypeScope colour="yellow">
        <PageHeader title="Shopping" action={{ label: 'New list', onClick: nothing }} />
        <div className={`flex max-w-3xl flex-col gap-6 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
          <ShoppingTabs tab="lists" action={<PageAction label="New list" onClick={nothing} />} />
          <section className="flex flex-col gap-1.5">
            <ItemRow
              leading={cart}
              title="Screwfix"
              meta={['Sat 26 Oct', '1 of 5']}
              menu={more(null)}
              onOpen={nothing}
            />
            <ItemRow
              leading={cart}
              title="Boots"
              meta={['0 of 3']}
              menu={more(null)}
              onOpen={nothing}
            />
            <ItemRow
              leading={cart}
              title="Lisbon trip"
              meta={['Home', '4 of 11']}
              menu={more(null)}
              onOpen={nothing}
            />
            <Button variant="link" className="self-start pt-1">
              Done lists
            </Button>
          </section>
        </div>
        {phone && <Fab label="New list" />}
      </TypeScope>
    </Shell>
  )
}

/* ---------- A food shop ---------- */

type Line = { name: string; amount?: string; meta?: string; checked?: boolean; extra?: boolean }

const AISLES: { aisle: string; lines: Line[] }[] = [
  {
    aisle: 'Fruit & Veg',
    lines: [
      { name: 'Red peppers', amount: '3', meta: 'Chilli Thu, Shakshuka Sun' },
      { name: 'Chestnut mushrooms', amount: '400 g', meta: 'Risotto Sun' },
      { name: 'Thai basil', amount: '1 bunch', meta: 'Curry Sat' },
      { name: 'Limes', amount: '2', meta: 'Curry Sat' },
      { name: 'Onions', amount: '3', meta: 'Chilli Thu, Risotto Sun', checked: true },
    ],
  },
  { aisle: 'Bakery', lines: [{ name: 'Sourdough', amount: '1', meta: 'Extra', extra: true }] },
  {
    aisle: 'Protein',
    lines: [
      { name: 'Chicken thighs', amount: '500 g', meta: 'Curry Sat' },
      { name: 'Eggs', amount: '10', meta: 'Shakshuka Sun, Extra' },
      { name: 'Beef mince', amount: '1 kg', meta: 'Chilli Thu', checked: true },
    ],
  },
  {
    aisle: 'Chilled',
    lines: [
      { name: 'Milk', amount: '4 pints', meta: 'Extra', extra: true },
      { name: 'Parmesan', amount: '80 g', meta: 'Risotto Sun' },
      { name: 'Feta', amount: '100 g', meta: 'Shakshuka Sun' },
    ],
  },
  {
    aisle: 'Cupboard',
    lines: [
      { name: 'Chopped tomatoes', amount: '3 tins', meta: 'Chilli Thu, Shakshuka Sun' },
      { name: 'Kidney beans', amount: '2 tins', meta: 'Chilli Thu' },
      { name: 'Arborio rice', amount: '300 g', meta: 'Risotto Sun' },
      { name: 'Coconut milk', amount: '1 tin', meta: 'Curry Sat' },
      { name: 'Green curry paste', amount: '2 tbsp', meta: 'Curry Sat' },
    ],
  },
  { aisle: 'Household', lines: [{ name: 'Bin bags', meta: 'Extra', extra: true }] },
  { aisle: 'Other', lines: [{ name: 'Scotch bonnet', amount: '1', meta: 'Chilli Thu' }] },
]

function ShopTabs({ tab }: { tab: 'all' | 'meals' | 'extra' }) {
  return (
    <Tabs defaultValue={tab}>
      <TabsList>
        <TabsTrigger value="all">
          All <TabsCount>27</TabsCount>
        </TabsTrigger>
        <TabsTrigger value="meals">
          Meals <TabsCount>4</TabsCount>
        </TabsTrigger>
        <TabsTrigger value="extra">
          Extra <TabsCount>4</TabsCount>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

function ShopMenu() {
  return more(
    <>
      <DropdownMenuItem>
        <PencilIcon /> Edit details…
      </DropdownMenuItem>
      <DropdownMenuItem>
        <CheckIcon /> Complete list
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <Trash2Icon /> Delete
      </DropdownMenuItem>
    </>,
    'Shop',
  )
}

function AddToShop({ suggesting = false }: { suggesting?: boolean }) {
  const field = (
    <div className="relative">
      <PlusIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Add to the shop"
        placeholder="Add to the shop"
        defaultValue={suggesting ? 'chick' : ''}
        className="pl-9"
      />
    </div>
  )
  if (!suggesting) return field
  return (
    <Suggestions
      open
      onDismiss={nothing}
      field={field}
      title="Pantry"
      query="chick"
      active={0}
      onChoose={nothing}
      items={[
        { key: '1', label: 'Chickpeas', meta: 'Cupboard' },
        { key: '2', label: 'Chicken stock', meta: 'Cupboard' },
        { key: '3', label: 'Chicken thighs', meta: 'Protein' },
      ]}
      actions={[{ key: 'typed', label: 'Add "chick" as typed', onClick: nothing }]}
    />
  )
}

function ShopPage({
  tab = 'all',
  phone = false,
  suggesting = false,
  children,
}: {
  tab?: 'all' | 'meals' | 'extra'
  phone?: boolean
  suggesting?: boolean
  children?: ReactNode
}) {
  return (
    <Shell page="Shopping">
      <TypeScope colour="yellow">
        <PageHeader
          back={{ label: 'Shopping', onClick: nothing }}
          title="Big shop"
          trailing={<ShopMenu />}
        />
        <div className={`flex flex-col gap-4 px-5 sm:px-9 ${phone ? 'pb-16' : 'pb-12'}`}>
          <p className="-mt-3 text-sm text-muted-foreground tabular-nums">Sat 26 Oct · Home</p>
          <ShopTabs tab={tab} />
          {tab !== 'meals' && <AddToShop suggesting={suggesting} />}
          {tab === 'all' && <AllLines />}
          {tab === 'meals' && <ShopMeals />}
          {tab === 'extra' && <Extra />}
        </div>
        {children}
      </TypeScope>
    </Shell>
  )
}

function AllLines() {
  return (
    <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {AISLES.map(({ aisle, lines }) => (
        <PantryAisle key={aisle} label={aisle}>
          {lines.map((l) => (
            <ShoppingLine key={l.name} {...l} menu={l.extra ? lineMenu : undefined} />
          ))}
        </PantryAisle>
      ))}
    </div>
  )
}

const SHOP_MEALS: {
  name: string
  when: string
  servings: number
  personal?: boolean
  lines: Line[]
}[] = [
  {
    name: 'Chilli con carne',
    when: 'Thu · Dinner',
    servings: 6,
    lines: [
      { name: 'Beef mince', amount: '1 kg', checked: true },
      { name: 'Onions', amount: '2', checked: true },
      { name: 'Red peppers', amount: '2' },
      { name: 'Chopped tomatoes', amount: '2 tins' },
      { name: 'Kidney beans', amount: '2 tins' },
      { name: 'Scotch bonnet', amount: '1' },
    ],
  },
  {
    name: 'Thai green curry',
    when: 'Sat · Dinner',
    servings: 2,
    lines: [
      { name: 'Chicken thighs', amount: '500 g' },
      { name: 'Coconut milk', amount: '1 tin' },
      { name: 'Green curry paste', amount: '2 tbsp' },
      { name: 'Thai basil', amount: '1 bunch' },
      { name: 'Limes', amount: '2' },
    ],
  },
  {
    name: 'Mushroom risotto',
    when: 'Sun · Dinner',
    servings: 4,
    lines: [
      { name: 'Chestnut mushrooms', amount: '400 g' },
      { name: 'Arborio rice', amount: '300 g' },
      { name: 'Parmesan', amount: '80 g' },
      { name: 'Onions', amount: '1', checked: true },
    ],
  },
  {
    name: 'Shakshuka',
    when: 'Sun · Breakfast',
    servings: 2,
    personal: true,
    lines: [
      { name: 'Eggs', amount: '4' },
      { name: 'Red peppers', amount: '1' },
      { name: 'Chopped tomatoes', amount: '1 tin' },
      { name: 'Feta', amount: '100 g' },
    ],
  },
]

function ShopMeals() {
  return (
    <div className="flex flex-col gap-4">
      <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {SHOP_MEALS.map((m) => (
          <Card key={m.name} className="gap-0 px-2 py-1.5">
            <div className="flex items-center gap-3 px-3 pt-2 pb-1.5">
              <TypeTile colour="green" icon={UtensilsIcon} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{m.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {[m.when, `Serves ${m.servings}`, m.personal ? 'Personal' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {more(
                <DropdownMenuItem variant="destructive">
                  <XIcon /> Take off the shop
                </DropdownMenuItem>,
                m.name,
              )}
            </div>
            {m.lines.map((l) => (
              <ShoppingLine key={l.name} {...l} />
            ))}
          </Card>
        ))}
      </div>
      <Button variant="outline" className="self-start">
        <PlusIcon /> Add a meal
      </Button>
    </div>
  )
}

function Extra() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <PantryAisle label="Added">
          <ShoppingLine name="Sourdough" amount="1" meta="Bakery" menu={lineMenu} />
          <ShoppingLine
            name="Milk"
            amount="4 pints"
            meta="Chilled · from Home's essentials"
            menu={lineMenu}
          />
          <ShoppingLine name="Eggs" amount="6" meta="Protein" menu={lineMenu} />
          <ShoppingLine name="Bin bags" meta="Household" menu={lineMenu} />
        </PantryAisle>
        <PantryAisle label="Staples the meals use · check you have them">
          <OfferRow name="Cumin" meta="Chilli Thu" />
          <OfferRow name="Chilli powder" meta="Chilli Thu" />
          <OfferRow name="Vegetable stock" meta="Risotto Sun" />
          <OfferRow name="Salt" meta="Chilli Thu, Curry Sat, Risotto Sun" />
        </PantryAisle>
      </div>
      <div className="flex flex-col gap-4">
        <PantryAisle label="Needed · Home">
          <OfferRow name="Olive oil" needed="Out of stock" onAdd={nothing} />
          <OfferRow name="Milk" needed="Required" added onAdd={nothing} />
        </PantryAisle>
        <PantryAisle label="Needed · Mum & Dad">
          <OfferRow name="Salt" needed="Out of stock" onAdd={nothing} />
        </PantryAisle>
        <PantryAisle label="Essentials · Home">
          <OfferRow name="Bananas" onAdd={nothing} />
          <OfferRow name="Greek yoghurt" onAdd={nothing} />
          <OfferRow name="Sourdough" added onAdd={nothing} />
        </PantryAisle>
        <PantryAisle label="Essentials · Mum & Dad">
          <OfferRow name="Semi-skimmed milk" onAdd={nothing} />
          <OfferRow name="Tea bags" onAdd={nothing} />
        </PantryAisle>
      </div>
    </div>
  )
}

function Complete() {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete Big shop?</AlertDialogTitle>
          <AlertDialogDescription>4 lines aren't ticked.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Complete</AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Ticking the last line: a toast offering Done (SHP-001 5). */
function AllTicked() {
  useEffect(() => {
    toast("Everything's ticked", {
      duration: Infinity,
      action: { label: 'Done', onClick: nothing },
    })
  }, [])
  return null
}

/* ---------- New shop ---------- */

const PLAN_MEALS: { day: string; meals: [Slot, string, boolean, string?][] }[] = [
  {
    day: 'Thu 24 Oct',
    meals: [
      ['Lunch', 'Shakshuka', false, 'Personal'],
      ['Dinner', 'Chilli con carne', true],
    ],
  },
  { day: 'Fri 25 Oct', meals: [['Dinner', 'Katsu curry', false, 'On Top-up']] },
  { day: 'Sat 26 Oct', meals: [['Dinner', 'Thai green curry', true]] },
  {
    day: 'Sun 27 Oct',
    meals: [
      ['Breakfast', 'Shakshuka', true, 'Personal'],
      ['Dinner', 'Mushroom risotto', true],
    ],
  },
]

function MealChoice() {
  return (
    <div className="flex flex-col gap-3">
      {PLAN_MEALS.map((d) => (
        <div key={d.day} className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-muted-foreground">{d.day}</span>
          {d.meals.map(([slot, name, on, note]) => (
            <label
              key={slot + name}
              className="flex h-10 items-center gap-3 rounded-sm px-1.5 hover:bg-accent has-disabled:opacity-50"
            >
              <Checkbox colour="yellow" defaultChecked={on} disabled={note === 'On Top-up'} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {[slot, note].filter(Boolean).join(' · ')}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

function NewShop() {
  return (
    <>
      <Food />
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New shop</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <Input defaultValue="Big shop" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input defaultValue="Sat 26 Oct" />
              </Field>
              <Field label="For">
                <SmallSelect
                  full
                  label="For"
                  value="Home"
                  options={['Personal', 'Home', 'Mum & Dad']}
                />
              </Field>
            </div>
            <Field label="Meals">
              <MealChoice />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- A list ---------- */

function ListPage({ phone = false }: { phone?: boolean }) {
  return (
    <Shell page="Shopping">
      <TypeScope colour="yellow">
        <PageHeader
          back={{ label: 'Shopping', onClick: nothing }}
          title="Screwfix"
          trailing={more(
            <>
              <DropdownMenuItem>
                <PencilIcon /> Edit details…
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PlusIcon /> Add a subheading
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CheckIcon /> Complete list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </>,
            'List',
          )}
        />
        <div className={`flex max-w-3xl flex-col gap-4 px-5 sm:px-9 ${phone ? 'pb-16' : 'pb-12'}`}>
          <p className="-mt-3 text-sm text-muted-foreground tabular-nums">Sat 26 Oct · Personal</p>
          <PantryAisle label="Bathroom">
            <ShoppingLine name="Silicone sealant, white" menu={lineMenu} />
            <ShoppingLine name="Caulking gun" menu={lineMenu} />
            <ShoppingLine name="Masking tape" checked menu={lineMenu} />
          </PantryAisle>
          <PantryAisle label="Garden">
            <ShoppingLine name="Hose connector" menu={lineMenu} />
            <ShoppingLine name="Bin bags" meta="Household" menu={lineMenu} />
            <AddRow placeholder="Add to Garden" onAdd={nothing} className="px-3 pb-1.5" />
          </PantryAisle>
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- The Meal plan: choosing Meals ---------- */

const MP_DAYS = [
  { key: 'mon', name: 'Mon', number: 21 },
  { key: 'tue', name: 'Tue', number: 22 },
  { key: 'wed', name: 'Wed', number: 23 },
  { key: 'thu', name: 'Thu', number: 24, today: true },
  { key: 'fri', name: 'Fri', number: 25 },
  { key: 'sat', name: 'Sat', number: 26 },
  { key: 'sun', name: 'Sun', number: 27 },
]

type MealData = Parameters<typeof MealCard>[0]
const MEALS: Record<string, Partial<Record<Slot, MealData>>> = {
  mon: { Dinner: { name: 'Katsu curry', servings: 4, eaten: true } },
  tue: { Dinner: { name: 'Gochujang noodles', servings: 2, eaten: true } },
  wed: { Dinner: { name: 'Out: Dishoom', kind: 'typed', eaten: true } },
  thu: {
    Lunch: { name: 'Shakshuka', servings: 2, personal: true },
    Dinner: { name: 'Chilli con carne', servings: 6, selected: true },
  },
  fri: {
    Lunch: { name: 'Chilli con carne', kind: 'leftovers' },
    Dinner: { name: 'Katsu curry', servings: 4 },
  },
  sat: { Dinner: { name: 'Thai green curry', servings: 2, selected: true } },
  sun: {
    Breakfast: { name: 'Shakshuka', servings: 2, personal: true, selected: true },
    Dinner: { name: 'Mushroom risotto', servings: 4 },
  },
}

function Choosing() {
  return (
    <SelectionBar
      count={3}
      onDone={nothing}
      actions={[{ label: 'Add to shop', icon: ShoppingCartIcon, onClick: nothing }]}
    />
  )
}

function MealPlanTabs() {
  return (
    <TabsRow>
      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="pantry">Pantry</TabsTrigger>
        </TabsList>
      </Tabs>
    </TabsRow>
  )
}

function Slotted({
  day,
  slot,
  label = false,
  selecting,
}: {
  day: string
  slot: Slot
  label?: boolean
  selecting: boolean
}) {
  const meal = MEALS[day]?.[slot]
  return (
    <MealSlot slot={slot} label={label}>
      {meal && (
        <MealCard
          {...meal}
          selected={selecting && meal.selected}
          selecting={selecting && !meal.eaten && meal.kind !== 'leftovers'}
          onOpen={nothing}
        />
      )}
    </MealSlot>
  )
}

function MealPlanSelect({ selecting = true }: { selecting?: boolean }) {
  return (
    <Shell page="Meal plan">
      <TypeScope colour="green">
        <PageHeader title="Meal plan" />
        <div className="flex flex-col gap-4 px-5 pb-12 sm:px-9">
          <MealPlanTabs />
          {selecting ? (
            <Choosing />
          ) : (
            <PlanToolbar
              title="21 – 27 October"
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
                  <Button variant="ghost" size="sm">
                    <ListChecksIcon /> Select
                  </Button>
                </div>
              }
            />
          )}
          <MealWeek
            days={MP_DAYS}
            slots={['Breakfast', 'Lunch', 'Dinner']}
            cell={(day, slot) => <Slotted day={day} slot={slot} selecting={selecting} />}
          />
        </div>
      </TypeScope>
    </Shell>
  )
}

function PhoneMealPlanSelect() {
  return (
    <Shell page="Meal plan">
      <TypeScope colour="green">
        <PageHeader title="Meal plan" />
        <div className="flex flex-col gap-4 px-5 pb-28">
          <MealPlanTabs />
          <Choosing />
          {MP_DAYS.slice(3, 7).map((d) => (
            <MealDay key={d.key} name={d.name} date={`${d.number} Oct`} today={d.today}>
              {(['Breakfast', 'Lunch', 'Dinner'] as const).map((slot) => (
                <Slotted key={slot} day={d.key} slot={slot} label selecting />
              ))}
            </MealDay>
          ))}
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- Saved as an idea (a share from another app) ---------- */

function Saved({ before = false }: { before?: boolean }) {
  return (
    <TypeScope colour="green">
      <main className="flex min-h-dvh flex-col items-center gap-4 bg-background px-6 pt-40 text-center">
        <TypeTile colour="green" icon={before ? ChefHatIcon : CheckIcon} size="lg" />
        <h1 className="text-h2">{before ? 'Already saved' : 'Saved as an idea'}</h1>
        <Card className="w-full max-w-xs flex-row items-center gap-3 p-2.5 text-left">
          <div className="size-12 shrink-0 rounded-sm bg-muted" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">Crispy chilli beef noodles</span>
            <span className="truncate text-xs text-muted-foreground">tiktok.com · @chefjack</span>
          </div>
        </Card>
        {before && (
          <Button variant="outline" size="sm">
            Open
          </Button>
        )}
      </main>
    </TypeScope>
  )
}

/* ---------- Search with a shop ---------- */

function SearchResult() {
  return (
    <Shell page="Shopping">
      <div className="flex max-w-2xl flex-col gap-2 px-5 pt-8 sm:px-9">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input defaultValue="parmesan" className="pl-9" aria-label="Search" />
        </div>
        <ItemRow
          leading={cart}
          title="Big shop"
          meta={['Shopping list', 'Parmesan 80 g']}
          onOpen={nothing}
        />
        <CardRow label="Mushroom risotto" value="Recipe" />
      </div>
    </Shell>
  )
}

/* ---------- The screens ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  food: () => <Food />,
  lists: () => <Lists />,
  'shop-new': () => <NewShop />,
  shop: () => <ShopPage />,
  'shop-add': () => <ShopPage suggesting />,
  'shop-meals': () => <ShopPage tab="meals" />,
  'shop-extra': () => <ShopPage tab="extra" />,
  'shop-done': () => (
    <ShopPage>
      <AllTicked />
    </ShopPage>
  ),
  'shop-complete': () => (
    <>
      <ShopPage />
      <Complete />
    </>
  ),
  list: () => <ListPage />,
  'meal-plan': () => <MealPlanSelect selecting={false} />,
  'meal-plan-select': () => <MealPlanSelect />,
  search: () => <SearchResult />,
  'm-food': () => <Food phone />,
  'm-lists': () => <Lists phone />,
  'm-shop': () => <ShopPage phone />,
  'm-shop-meals': () => <ShopPage phone tab="meals" />,
  'm-shop-extra': () => <ShopPage phone tab="extra" />,
  'm-shop-new': () => <NewShop />,
  'm-list': () => <ListPage phone />,
  'm-meal-plan-select': () => <PhoneMealPlanSelect />,
  'm-saved': () => <Saved />,
  'm-saved-before': () => <Saved before />,
}

function Screens() {
  const { screen = 'food' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS.food!)()}</>
}
