import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  ArchiveIcon,
  BellIcon,
  BellRingIcon,
  ChefHatIcon,
  CloudOffIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  InboxIcon,
  MoonIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  ShirtIcon,
  ShoppingCartIcon,
  StarIcon,
  SunIcon,
  TargetIcon,
  Trash2Icon,
  LinkIcon,
  LogOutIcon,
  TagIcon,
  UtensilsIcon,
  WifiOffIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AddRow,
  AddMealButton,
  AddToDay,
  FilterPanel,
  FilterSection,
  IngredientLineEditor,
  IngredientList,
  LogEntry,
  MealCard,
  MealDay,
  MethodSteps,
  KeepToggles,
  OfferRow,
  PantryAisle,
  PantryRow,
  ShoppingLine,
  RecipeCard,
  RecipeFact,
  RecipeGrid,
  SelectionBar,
  SortMenu,
  ServingsStepper,
  StarRating,
  TimerChip,
  PageAction,
  PlanDay,
  PlanToolbar,
  TaskLinker,
  WeekStrip,
  BackLink,
  BrandMark,
  AddAlertMenu,
  ChipRow,
  NewDialog,
  QuickChip,
  SavesAs,
  SmartLine,
  CardRow,
  DateField,
  EmptyState,
  ItemDialog,
  DayColumn,
  FilterChip,
  ItemRow,
  LabelChips,
  LabelPicker,
  NoteCard,
  NoteGrid,
  Fab,
  PageHeader,
  PlanCard,
  SectionLabel,
  AlertList,
  RepeatField,
  SwipeAction,
  SyncStatus,
  TimeField,
  TYPE_ICONS,
  TodayWidget,
  TypeBadge,
  TypeDot,
  TypeScope,
  TypeTile,
  type TypeColour,
  CurrentLine,
  DoneToggle,
  ExerciseCard,
  FormNotes,
  LinePill,
  LogSetButton,
  MotivationChoice,
  ReadinessRing,
  SetTable,
  StatTile,
  StimulusRow,
  ValueStepper,
  WorkoutStatePill,
} from '@/components/lifeos'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Command, CommandDialog, type CommandGroup } from '@/components/ui/command'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Popover,
  PopoverContent,
  PopoverFooter,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { RadioCard, RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { toast } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsCount, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The design-system page: every component from the real code, in both
 * modes. Development and preview builds only (docs/30-design/README.md).
 */
export const Route = createFileRoute('/design')({
  beforeLoad: () => {
    if (!__DESIGN_PAGE__) throw notFound()
  },
  component: DesignPage,
})

const NEUTRALS = [
  'background',
  'card',
  'popover',
  'secondary',
  'muted',
  'accent',
  'input',
  'border',
  'ink',
  'muted-foreground',
  'foreground',
] as const

const TYPE_SWATCHES: {
  colour: Exclude<TypeColour, 'none'>
  name: string
  types: string
  icons: LucideIcon[]
}[] = [
  {
    colour: 'blue',
    name: 'Blue',
    types: 'Tasks, Events',
    icons: [TYPE_ICONS.task!, TYPE_ICONS.event!],
  },
  {
    colour: 'yellow',
    name: 'Yellow',
    types: 'Thoughts, Notes, Lists, Shops',
    icons: [TYPE_ICONS.thought!, TYPE_ICONS.note!, ShoppingCartIcon],
  },
  { colour: 'coral', name: 'Coral', types: 'Gym, Cardio', icons: [DumbbellIcon, FootprintsIcon] },
  { colour: 'green', name: 'Green', types: 'Recipes, Meals', icons: [ChefHatIcon, UtensilsIcon] },
  { colour: 'orange', name: 'Orange', types: 'Wardrobe', icons: [ShirtIcon] },
  { colour: 'purple', name: 'Purple', types: 'Goals', icons: [TargetIcon] },
]

const TaskIcon = TYPE_ICONS.task!
const NoteIcon = TYPE_ICONS.note!

/** Search's results for "insur", as Command shows them (components.md#command). */
const SEARCH_GROUPS: CommandGroup[] = [
  {
    label: 'Tasks',
    items: [
      {
        id: 'renew',
        label: 'Renew car insurance',
        leading: <TypeTile size="sm" colour="blue" icon={TaskIcon} />,
        title: (
          <>
            Renew car <strong>insur</strong>ance
          </>
        ),
        line: <span className="text-destructive">Due Thu 8 Oct</span>,
      },
      {
        id: 'travel',
        label: 'Check travel insurance covers Japan',
        leading: <TypeTile size="sm" colour="blue" icon={TaskIcon} />,
        title: (
          <>
            Check travel <strong>insur</strong>ance covers Japan
          </>
        ),
        line: 'Completed Sun 4 Oct',
      },
    ],
  },
  {
    label: 'Notes',
    items: [
      {
        id: 'house',
        label: 'House details',
        leading: <TypeTile size="sm" colour="yellow" icon={NoteIcon} />,
        title: 'House details',
        line: (
          <>
            Home <strong>insur</strong>ance renews in January
          </>
        ),
      },
    ],
  },
]
const DEMO_LABELS = [
  { id: 'car', name: 'Car' },
  { id: 'home', name: 'Home' },
  { id: 'travel', name: 'Travel' },
  { id: 'work', name: 'Work' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

function DesignPage() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [itemOpen, setItemOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('insur')
  const [capture, setCapture] = useState({ open: false, text: 'call mum' })
  const [chips, setChips] = useState({ core: true, food: true, fitness: false })
  const [chosenLabels, setChosenLabels] = useState<string[]>(['home'])
  const [planLayout, setPlanLayout] = useState<'week' | 'day'>('week')
  const [stripDay, setStripDay] = useState('fri')
  const toggleMode = () => {
    document.documentElement.classList.toggle('dark', !dark)
    setDark(!dark)
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="flex items-center gap-3 pr-5 sm:pr-9">
        <div className="flex-1">
          <PageHeader title="Design system" />
        </div>
        <Button variant="outline" size="sm" onClick={toggleMode}>
          {dark ? <SunIcon /> : <MoonIcon />}
          {dark ? 'Light' : 'Dark'}
        </Button>
      </div>
      <main className="flex flex-col gap-8 px-5 pb-8 sm:px-9">
        <Section title="Neutral colours">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {NEUTRALS.map((token) => (
              <div key={token} className="flex flex-col gap-2 rounded-md bg-card p-2.5 shadow-card">
                <div
                  className="h-9 rounded-sm shadow-card"
                  style={{ background: `var(--${token})` }}
                />
                <span className="font-mono text-xs text-muted-foreground">--{token}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type colours">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {TYPE_SWATCHES.map(({ colour, name, types, icons }) => (
              <div
                key={colour}
                className="flex flex-col gap-2.5 rounded-lg bg-card p-3.5 shadow-card"
              >
                <div className="flex items-center gap-2 font-bold">
                  <TypeDot colour={colour} /> {name}
                </div>
                <div className="text-xs text-muted-foreground">{types}</div>
                <div className="flex gap-2">
                  {icons.map((icon, i) => (
                    <TypeTile key={i} colour={colour} icon={icon} />
                  ))}
                </div>
                <div data-colour={colour} className="h-9 rounded-md bg-tc" />
              </div>
            ))}
            <div className="flex flex-col gap-2.5 rounded-lg bg-card p-3.5 shadow-card">
              <div className="flex items-center gap-2 font-bold">
                <BrandMark /> LifeOS
              </div>
              <div className="text-xs text-muted-foreground">The app icon, as the brand mark</div>
            </div>
            <div className="flex flex-col gap-2.5 rounded-lg bg-card p-3.5 shadow-card">
              <div className="flex items-center gap-2 font-bold">
                <TypeDot colour="none" /> Neutral
              </div>
              <div className="text-xs text-muted-foreground">Inbox, Plan, Search, Settings</div>
              <div className="flex gap-2">
                <TypeTile colour="none" icon={InboxIcon} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-2 rounded-lg bg-card p-5 shadow-card">
            <div className="text-h1">Page title · 24</div>
            <div className="text-h2">Section title · 17</div>
            <div className="text-day tabular-nums">20 · day number</div>
            <div className="text-base">Body and row titles · 14</div>
            <div className="text-sm text-muted-foreground">Meta and small buttons · 13</div>
            <div className="text-xs text-muted-foreground">Badges and captions · 12</div>
            <div>
              <Kbd>⌘</Kbd> <Kbd>K</Kbd>
            </div>
          </div>
        </Section>

        <Section title="Buttons">
          <Row>
            <Button>
              <PlusIcon /> New <Kbd>N</Kbd>
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2Icon /> Delete
            </Button>
            <Button variant="ghost-destructive">
              <Trash2Icon /> Delete
            </Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="sm" variant="outline">
              Outline
            </Button>
            <Tooltip>
              <TooltipTrigger render={<Button size="icon" variant="outline" aria-label="Search" />}>
                <SearchIcon />
              </TooltipTrigger>
              <TooltipContent>
                Search <Kbd>/</Kbd>
              </TooltipContent>
            </Tooltip>
            <Button size="icon-sm" variant="ghost" aria-label="More">
              <EllipsisIcon />
            </Button>
          </Row>
        </Section>

        <Section title="Badges">
          <Row>
            <Badge>Errands</Badge>
            <Badge variant="outline">Someday</Badge>
            <Badge variant="destructive">Overdue</Badge>
            <Badge variant="warning">Out of stock</Badge>
            <Badge removeLabel="Remove Quick" onRemove={() => undefined}>
              Quick
            </Badge>
            <TypeBadge colour="green">Last cooked Mon</TypeBadge>
            <TypeBadge colour="coral">Push</TypeBadge>
            <TypeBadge colour="purple">On track</TypeBadge>
          </Row>
        </Section>

        <Section title="Forms">
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="d-title">Title</Label>
              <Input id="d-title" placeholder="Book the dentist" />
            </div>
            <div className="grid gap-1.5">
              <Label>Label</Label>
              <Select
                defaultValue="errands"
                items={[
                  { value: 'errands', label: 'Errands' },
                  { value: 'home', label: 'Home' },
                  { value: 'work', label: 'Work' },
                ]}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="errands">Errands</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="d-notes">Notes</Label>
              <Textarea id="d-notes" placeholder="Anything to remember" />
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox id="d-check" defaultChecked />
              <Label htmlFor="d-check">Done</Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Switch id="d-switch" defaultChecked />
              <Label htmlFor="d-switch">Morning digest</Label>
            </div>
            <RadioGroup defaultValue="morning">
              <div className="flex items-center gap-2.5">
                <RadioGroupItem value="morning" id="d-r1" />
                <Label htmlFor="d-r1">Morning</Label>
              </div>
              <div className="flex items-center gap-2.5">
                <RadioGroupItem value="evening" id="d-r2" />
                <Label htmlFor="d-r2">Evening</Label>
              </div>
            </RadioGroup>
            <div className="grid gap-3">
              <Label>Duration</Label>
              <Slider defaultValue={40} min={5} max={120} />
            </div>
            <Input size="sm" placeholder="Small input" />
          </div>
        </Section>

        <Section title="Tabs, toggles">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">
                All tasks <TabsCount>12</TabsCount>
              </TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="done">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
          <LabelChips
            labels={DEMO_LABELS}
            chosen={new Set(chosenLabels)}
            onChange={setChosenLabels}
          />
          <Row>
            <ToggleGroup defaultValue={['week']}>
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
              <ToggleGroupItem value="month">Month</ToggleGroupItem>
            </ToggleGroup>
            <Toggle aria-label="Star" defaultPressed>
              <StarIcon />
            </Toggle>
            <Toggle aria-label="Pin">
              <PinIcon />
            </Toggle>
          </Row>
        </Section>

        <Section title="A page about one Type family (TypeScope)">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <TypeScope
              colour="blue"
              className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card"
            >
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All tasks</TabsTrigger>
                  <TabsTrigger value="recurring">Recurring</TabsTrigger>
                  <TabsTrigger value="done">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
              <LabelChips
                labels={DEMO_LABELS}
                chosen={new Set(chosenLabels)}
                onChange={setChosenLabels}
              />
              <Row>
                <Button size="sm">
                  <PlusIcon /> New task
                </Button>
                <Checkbox defaultChecked aria-label="Done" />
                <Toggle aria-label="Star" defaultPressed>
                  <StarIcon />
                </Toggle>
                <Progress value={60} className="w-24" />
              </Row>
            </TypeScope>
            <TypeScope
              colour="yellow"
              className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card"
            >
              <LabelChips
                labels={DEMO_LABELS}
                chosen={new Set(chosenLabels)}
                onChange={setChosenLabels}
              />
              <Row>
                <Button size="sm">
                  <PlusIcon /> New note
                </Button>
                <Switch defaultChecked aria-label="Pinned first" />
                <Toggle aria-label="Pin" defaultPressed>
                  <PinIcon />
                </Toggle>
                <Fab label="New note" className="static md:grid" />
              </Row>
            </TypeScope>
          </div>
        </Section>

        <Section title="Lists of Items">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <SectionLabel danger count={1}>
              Overdue
            </SectionLabel>
            <ItemRow
              leading={<Checkbox colour="blue" aria-label="Done" />}
              title="Book the dentist"
              meta={[<span className="text-destructive">Due yesterday</span>, 'Errands']}
              onOpen={() => {}}
              actions={
                <Button size="sm" variant="ghost">
                  Tomorrow
                </Button>
              }
              menu={
                <Button size="icon-sm" variant="ghost" aria-label="More">
                  <EllipsisIcon />
                </Button>
              }
            />
            <SwipeAction label="Task" icon={TaskIcon} colour="blue" onAction={() => {}}>
              <ItemRow
                leading={<Checkbox colour="yellow" aria-label="Done" />}
                title="Ceramics class for the anniversary?"
                meta={['08:12', 'Home']}
                onOpen={() => {}}
              />
            </SwipeAction>
            <ItemRow
              leading={<Checkbox colour="blue" aria-label="Done" defaultChecked />}
              title="Renew passport"
              meta={['Done Tue']}
              onOpen={() => {}}
              done
            />
            <ItemRow
              leading={<TypeTile colour="yellow" icon={TYPE_ICONS.thought!} />}
              title="Milk, eggs, panko"
              meta={['Thought', 'Just now']}
              sync="pending"
            />
            <ItemRow
              leading={<TypeTile colour="yellow" icon={TYPE_ICONS.note!} />}
              title="Japan ideas"
              meta={['Note']}
              sync="failed"
            />
            <ItemRow
              leading={<TypeTile colour="green" icon={ChefHatIcon} />}
              title="Chicken katsu"
              meta={[<TypeBadge colour="green">Last cooked Mon</TypeBadge>, '4 variations']}
            />
            <ItemRow
              leading={<TypeTile colour="coral" icon={DumbbellIcon} />}
              title="Push day"
              meta={['Thu 18:30', '6 exercises']}
            />
            <ItemRow
              leading={<TypeTile colour="purple" icon={TargetIcon} />}
              title="Bench 60 kg"
              meta={['52.5 kg', 'On track']}
            />
          </div>
        </Section>

        <Section title="Notes">
          <TypeScope colour="yellow" className="flex max-w-3xl flex-col gap-3.5">
            <NoteGrid>
              <NoteCard
                title="Japan packing list"
                body={'- [x] Passport\n- [ ] Plug adapters ×2\n- [ ] JR Pass voucher'}
                labels={['Travel']}
                onOpen={() => {}}
              />
              <NoteCard
                title="House details"
                body={
                  '**Boiler**: Worcester Greenstar 30i, serviced *March*.\n\nStopcock under the kitchen sink.'
                }
                labels={['Home']}
                onOpen={() => {}}
              />
              <NoteCard
                title="Books to read"
                body={'1. The Wager\n2. Slow Productivity'}
                onOpen={() => {}}
              />
            </NoteGrid>
            <Row>
              <LabelPicker
                trigger={
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <TagIcon /> Label
                  </Button>
                }
                labels={[
                  { id: 'h', name: 'Home' },
                  { id: 'r', name: 'Recipes' },
                  { id: 't', name: 'Travel' },
                ]}
                chosen={new Set(['t'])}
                onToggle={() => {}}
                onCreate={() => {}}
              />
            </Row>
          </TypeScope>
        </Section>

        <Section title="Tasks">
          <TypeScope colour="blue" className="flex max-w-xl flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-do">Do on</Label>
                <DateField id="d-do" value={null} onChange={() => {}} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-at">Time</Label>
                <TimeField id="d-at" defaultValue="18:30" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-repeat">Repeat</Label>
                <RepeatField
                  id="d-repeat"
                  value={{ mode: 'schedule', rule: 'FREQ=WEEKLY;BYDAY=MO' }}
                  startsOn="2026-10-12"
                  onChange={() => {}}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-repeat-none">Repeat</Label>
                <RepeatField
                  id="d-repeat-none"
                  value={null}
                  startsOn="2026-10-12"
                  onChange={() => {}}
                />
              </div>
            </div>
            <RadioGroup
              aria-label="Repeats"
              defaultValue="schedule"
              className="gap-2.5 sm:grid-cols-2"
            >
              <RadioCard value="schedule" title="On a schedule" description="On set days" />
              <RadioCard
                value="after_completion"
                title="After it's done"
                description="A while after you tick it"
              />
            </RadioGroup>
            <AlertList
              alerts={[
                { id: 'a', when: 'Fri 09:00', says: 'On the day' },
                { id: 'b', when: 'Thu 18:00', says: '1 day before' },
                { id: 'c', when: 'Fri 07:00', says: 'At a set time', alarm: true },
              ]}
              onOpen={() => {}}
              onRemove={() => {}}
              onAdd={() => {}}
            />
            <AddRow placeholder="Add a task" onAdd={() => {}} className="px-3.5" />
          </TypeScope>
        </Section>

        <Section title="Plan">
          <PlanToolbar
            title="5 – 11 October"
            layout={planLayout}
            onLayout={setPlanLayout}
            onToday={() => {}}
            onPrevious={() => {}}
            onNext={() => {}}
            step="week"
            action={<PageAction label="Add" onClick={() => {}} />}
          />
          <Row>
            <FilterChip
              colour="blue"
              pressed={chips.core}
              onPressedChange={(core) => setChips({ ...chips, core })}
            >
              Tasks
            </FilterChip>
            <FilterChip
              colour="green"
              pressed={chips.food}
              onPressedChange={(food) => setChips({ ...chips, food })}
            >
              Meals
            </FilterChip>
            <FilterChip
              colour="coral"
              pressed={chips.fitness}
              onPressedChange={(fitness) => setChips({ ...chips, fitness })}
            >
              Workouts
            </FilterChip>
          </Row>
          <div className="grid max-w-3xl grid-cols-3 gap-2.5">
            <DayColumn
              name="Thu"
              number={8}
              add={
                <AddToDay
                  day="Thu 8 Oct"
                  choices={[
                    { key: 'task', label: 'Task', colour: 'blue', icon: TYPE_ICONS.task! },
                    { key: 'event', label: 'Event', colour: 'blue', icon: TYPE_ICONS.event! },
                  ]}
                  onChoose={() => {}}
                />
              }
            >
              <PlanCard
                colour="blue"
                icon={TYPE_ICONS.task!}
                type="Task"
                title="Renew passport"
                done
              />
              <PlanCard
                colour="coral"
                icon={DumbbellIcon}
                type="Workout"
                title="Push day"
                time="18:30"
                past
              />
            </DayColumn>
            <DayColumn name="Fri" number={9} today dropping>
              <PlanCard
                colour="blue"
                icon={TYPE_ICONS.event!}
                type="Event"
                title="Dishoom"
                time="19:30"
                detail="Shoreditch"
              />
              <PlanCard
                colour="yellow"
                icon={ShoppingCartIcon}
                type="Shop"
                title="Tesco"
                time="10:00"
              />
            </DayColumn>
            <DayColumn name="Sat" number={10}>
              <PlanCard colour="green" icon={UtensilsIcon} type="Dinner" title="Chicken katsu" />
              <PlanCard
                colour="orange"
                icon={ShirtIcon}
                type="Outfit"
                title="Olive knit"
                dragging
              />
            </DayColumn>
          </div>
          <div className="flex max-w-md flex-col gap-3">
            <WeekStrip
              days={[
                { key: 'mon', name: 'Mon', number: 5, dots: ['blue'] },
                { key: 'tue', name: 'Tue', number: 6, dots: ['blue', 'green'] },
                { key: 'wed', name: 'Wed', number: 7 },
                { key: 'thu', name: 'Thu', number: 8, dots: ['blue', 'coral'] },
                { key: 'fri', name: 'Fri', number: 9, today: true, dots: ['blue', 'yellow'] },
                { key: 'sat', name: 'Sat', number: 10, dots: ['green', 'orange'] },
                { key: 'sun', name: 'Sun', number: 11 },
              ]}
              chosen={stripDay}
              onChoose={setStripDay}
            />
            <PlanDay>
              <PlanCard
                wide
                colour="blue"
                icon={TYPE_ICONS.event!}
                type="Event"
                title="Dishoom"
                time="19:30–21:30"
                detail="Shoreditch"
              />
            </PlanDay>
            <TaskLinker
              tasks={[
                { id: 'a', title: 'Buy a card for mum', when: 'Sat 10 Oct' },
                { id: 'b', title: 'Book the table', when: 'No date' },
              ]}
              onLink={() => {}}
              onCreate={() => {}}
              trigger={
                <Button variant="ghost" size="sm" className="self-start">
                  <LinkIcon />
                  Link a task
                </Button>
              }
            />
          </div>
        </Section>

        <Section title="The Android app: the Today widget">
          <div className="flex flex-wrap items-start gap-4 rounded-lg bg-muted p-4">
            <TodayWidget
              size="4x2"
              date="Thu 5 Nov"
              cards={[
                { colour: 'coral', icon: DumbbellIcon, type: 'Workout', title: 'Push' },
                {
                  colour: 'blue',
                  icon: TYPE_ICONS.task!,
                  type: 'Task',
                  title: 'Renew passport',
                  time: '09:00',
                  done: true,
                },
                {
                  colour: 'blue',
                  icon: TYPE_ICONS.event!,
                  type: 'Event',
                  title: 'Dentist',
                  time: '13:30',
                },
              ]}
            />
            <TodayWidget size="2x2" date="Sun 8 Nov" />
          </div>
        </Section>

        <Section title="Recipes">
          <TypeScope colour="green" className="flex flex-col gap-4">
            <div className="grid items-start gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
              <FilterPanel
                groups={[
                  {
                    name: 'Category',
                    open: true,
                    values: ['Breakfast', 'Lunch', 'Dinner'],
                    chosen: ['Dinner'],
                  },
                  { name: 'Cuisine', values: ['British', 'Japanese', 'Korean'] },
                  { name: 'Protein', values: ['Beef', 'Chicken', 'Fish'], chosen: ['Chicken'] },
                ]}
                onChange={() => {}}
                onReset={() => {}}
              >
                <FilterSection title="State">
                  <ToggleGroup aria-label="State" defaultValue={['all']} className="self-start">
                    <ToggleGroupItem value="all">All</ToggleGroupItem>
                    <ToggleGroupItem value="draft">Draft</ToggleGroupItem>
                    <ToggleGroupItem value="complete">Complete</ToggleGroupItem>
                  </ToggleGroup>
                </FilterSection>
              </FilterPanel>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex">
                  <SortMenu
                    options={[
                      { value: 'added', label: 'Recently added', initial: 'desc' },
                      { value: 'name', label: 'A–Z', initial: 'asc' },
                    ]}
                    value="added"
                    direction="desc"
                    onChange={() => {}}
                  />
                </div>
                {/* Contained, so the phone's bar sits under its example, not on the screen's foot. */}
                <div className="contain-layout max-md:pb-16">
                  <SelectionBar
                    count={1}
                    onDone={() => {}}
                    actions={[
                      { label: 'Archive', icon: ArchiveIcon, onClick: () => {} },
                      { label: 'Delete', icon: Trash2Icon, onClick: () => {}, destructive: true },
                    ]}
                  />
                </div>
                <RecipeGrid size="S">
                  <RecipeCard name="Katsu curry" cuisine="Japanese" favourite />
                  <RecipeCard name="Gochujang noodles" cuisine="Korean" draft />
                  <RecipeCard
                    name="Shakshuka"
                    cuisine="North African"
                    by="Sam"
                    selecting
                    selected
                  />
                </RecipeGrid>
              </div>
            </div>
            <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between">
                  <CardTitle>Ingredients</CardTitle>
                  <ServingsStepper value={4} />
                </div>
                <IngredientList
                  groups={[
                    {
                      lines: [
                        { key: 'a', amount: '4', name: 'Chicken thighs' },
                        { key: 'b', amount: '100 g', name: 'Panko breadcrumbs' },
                      ],
                    },
                    {
                      heading: 'For the sauce',
                      lines: [{ key: 'c', amount: '1–2 tbsp', name: 'Honey' }],
                    },
                  ]}
                />
                <div className="flex flex-wrap gap-1.5">
                  <RecipeFact>Dinner</RecipeFact>
                  <RecipeFact>Japanese</RecipeFact>
                </div>
              </Card>
              <Card>
                <CardTitle>Method</CardTitle>
                <MethodSteps
                  cooking
                  done={['1']}
                  current="2"
                  steps={[
                    { key: '1', parts: ['Make the ', { recipe: 'Katsu sauce' }, '.'] },
                    {
                      key: '2',
                      parts: ['Air fry for 12 minutes.'],
                      timer: <TimerChip label="Air fry" time="08:42" state="running" />,
                    },
                    { key: '3', parts: ['Rest for 2 minutes.'], timer: <TimerChip time="2:00" /> },
                  ]}
                />
              </Card>
            </div>
            <div className="flex max-w-3xl flex-col gap-3">
              <IngredientLineEditor amount="100" unit="g" ingredient="Panko breadcrumbs" />
              <IngredientLineEditor ingredient="Pinch of shichimi" status="typed" />
              <LogEntry
                who="Joe Stables"
                what="Cooked"
                when="Sat"
                verdict={<StarRating value={4} size="sm" />}
                notes="More honey next time."
              >
                What I cooked · Serves 4
              </LogEntry>
              <StarRating value={3} onChange={() => {}} />
            </div>
          </TypeScope>
        </Section>

        <Section title="Meal plan, Pantry">
          <TypeScope colour="green" className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-5">
              <MealDay
                name="Thu"
                date="15 Oct"
                today
                action={
                  <Button variant="ghost" size="icon-sm" aria-label="Add a meal">
                    <PlusIcon />
                  </Button>
                }
              >
                <div className="grid gap-1.5">
                  <MealCard row slot="Breakfast" name="Berry smoothie" servings={1} personal />
                  <MealCard row slot="Lunch" name="Katsu curry" kind="leftovers" />
                </div>
              </MealDay>
              <MealDay
                name="Fri"
                date="16 Oct"
                action={
                  <Button variant="ghost" size="icon-sm" aria-label="Add a meal">
                    <PlusIcon />
                  </Button>
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <MealCard name="Out: Dishoom" kind="typed" />
              <MealCard name="Overnight oats" servings={1} eaten />
              <MealCard name="Chilli con carne" servings={6} selecting selected />
              <AddMealButton slot="Dinner" />
              <Card className="gap-1 px-2 py-2">
                <PantryRow name="Carrots" recipes={6} />
                <PantryRow name="Garlic" recipes={14} />
                <PantryRow name="Onion" recipes={18} />
              </Card>
            </div>
          </TypeScope>
        </Section>

        <Section title="Shopping">
          <TypeScope colour="yellow" className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <PantryAisle label="Fruit & Veg">
              <ShoppingLine name="Red peppers" amount="3" />
              <ShoppingLine name="Onions" amount="3" checked />
              <ShoppingLine
                name="Bin bags"
                meta="Required"
                menu={
                  <Button variant="ghost" size="icon-sm" aria-label="Remove Bin bags">
                    <XIcon />
                  </Button>
                }
              />
            </PantryAisle>
            <div className="flex flex-col gap-4">
              <PantryAisle label="Add staples">
                <OfferRow name="Olive oil" meta="Out of stock" onToggle={() => undefined} />
                <OfferRow name="Milk" meta="Required" added onToggle={() => undefined} />
                <OfferRow name="Cumin" meta="Chilli Thu" onToggle={() => undefined} />
              </PantryAisle>
              <PantryAisle label="Fruit & Veg">
                <PantryRow
                  name="Onion"
                  meta="Fruit & Veg · g"
                  actions={
                    <KeepToggles
                      name="Onion"
                      kept="staple"
                      needed
                      onKept={() => undefined}
                      onNeeded={() => undefined}
                    />
                  }
                />
                <PantryRow
                  name="Bananas"
                  actions={
                    <KeepToggles
                      name="Bananas"
                      kept="essential"
                      onKept={() => undefined}
                      onNeeded={() => undefined}
                    />
                  }
                />
                <PantryRow
                  name="Garlic"
                  actions={
                    <KeepToggles
                      name="Garlic"
                      kept={null}
                      onKept={() => undefined}
                      onNeeded={() => undefined}
                    />
                  }
                />
              </PantryAisle>
            </div>
          </TypeScope>
        </Section>

        <Section title="Gym">
          <TypeScope colour="coral" className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <ExerciseCard
                name="Chest-supported row"
                meta={['2 of 3 sets']}
                open
                control={<DoneToggle name="Chest-supported row" done={false} />}
              >
                <div className="flex flex-col gap-1.5">
                  <FormNotes>Chest on the pad at notch 4</FormNotes>
                  <CurrentLine>27.5 kg × 10</CurrentLine>
                </div>
                <SetTable
                  editable
                  sets={[
                    { weight: '30', reps: 10, rir: 2, pr: true },
                    { weight: '30', reps: 9, rir: 1 },
                    {},
                  ]}
                />
                <LogSetButton label="Log set" />
              </ExerciseCard>
              <ExerciseCard
                name="Lat pulldown"
                meta={['3 of 3 sets']}
                done
                control={<DoneToggle name="Lat pulldown" done />}
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                <WorkoutStatePill state="complete" />
                <WorkoutStatePill state="in-progress" />
                <WorkoutStatePill state="planned" />
                <WorkoutStatePill state="skipped" />
              </div>
              <MotivationChoice value="okay" />
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Current" value="27.5 kg × 10" sub="Since 12 Oct" />
                <StatTile label="Weekly sessions" value="×3.1" />
              </div>
              <div className="flex items-center gap-3">
                <ReadinessRing percent={41} />
                <ReadinessRing percent={72} />
                <ReadinessRing percent={100} />
                <ValueStepper size="sm" label="Sets" value="3" unit="sets" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <LinePill label="Bench press" on tone="coral" dash="solid" />
                <LinePill label="Dips" sub="(0.5)" on tone="grey" dash="dash" />
                <LinePill label="Push-up" sub="(0.6)" on={false} tone="grey" />
              </div>
              <StimulusRow muscle="Chest" sets={2.6} target={4} />
            </div>
          </TypeScope>
        </Section>

        <Section title="Cards, table, progress">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
                <CardDescription>Default time 09:00</CardDescription>
              </CardHeader>
              <Progress value={40} />
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <span className="font-semibold">Joe</span>
              </div>
            </Card>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Set</TableHead>
                    <TableHead>Reps</TableHead>
                    <TableHead>Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    [1, 8, '50 kg'],
                    [2, 8, '52.5 kg'],
                    [3, 6, '52.5 kg'],
                  ].map(([set, reps, kg]) => (
                    <TableRow key={set}>
                      <TableCell>{set}</TableCell>
                      <TableCell>{reps}</TableCell>
                      <TableCell>{kg}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
          <Pagination className="justify-start">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Section>

        <Section title="States">
          <Alert className="max-w-xl">
            <WifiOffIcon />
            <AlertTitle>Offline</AlertTitle>
            <AlertDescription>These may be out of date</AlertDescription>
          </Alert>
          <Alert className="max-w-xl">
            <BellIcon />
            <AlertTitle>Notifications are off</AlertTitle>
            <AlertDescription>Alerts can’t reach you</AlertDescription>
            <AlertAction>
              <Button variant="ghost" size="sm">
                Not now
              </Button>
              <Button variant="outline" size="sm">
                Turn on
              </Button>
            </AlertAction>
          </Alert>
          <div className="flex max-w-xl flex-col gap-1.5">
            <Skeleton className="h-14 rounded-row" />
            <Skeleton className="h-14 rounded-row" />
          </div>
          <div className="flex flex-col gap-2">
            <SyncStatus pending={0} failed={0} />
            <SyncStatus pending={2} failed={0} />
            <SyncStatus pending={0} failed={1} />
          </div>
        </Section>

        <Section title="Accordion, calendar">
          <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
            <Accordion defaultValue={['errands']}>
              <AccordionItem value="errands">
                <AccordionTrigger>
                  <TypeTile colour="blue" icon={TYPE_ICONS.task!} size="sm" /> Errands
                </AccordionTrigger>
                <AccordionContent>
                  <ItemRow
                    leading={<Checkbox colour="blue" aria-label="Done" />}
                    title="Post the parcel"
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="home">
                <AccordionTrigger>
                  <TypeTile colour="blue" icon={TYPE_ICONS.task!} size="sm" /> Home
                </AccordionTrigger>
                <AccordionContent>
                  <ItemRow
                    leading={<Checkbox colour="blue" aria-label="Done" />}
                    title="Fix the shelf"
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Card className="w-fit">
              <Calendar
                mode="single"
                today={new Date(2026, 9, 9)}
                defaultMonth={new Date(2026, 9, 1)}
                selected={new Date(2026, 9, 12)}
              />
            </Card>
          </div>
        </Section>

        <Section title="Settings, a page reached from another, nothing to show">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <BackLink label="Settings" />
              <Card className="gap-0 px-2 py-1.5">
                <CardRow
                  icon={<TagIcon />}
                  label="Labels"
                  value={5}
                  render={<a href="#labels" />}
                />
                <CardRow
                  icon={<Trash2Icon />}
                  label="Recently deleted"
                  value={3}
                  render={<a href="#deleted" />}
                />
                <CardRow
                  icon={<LogOutIcon />}
                  label="Sign out"
                  render={<button type="button" />}
                  chevron={false}
                />
              </Card>
            </div>
            <Card>
              <EmptyState icon={Trash2Icon} title="Nothing deleted" />
            </Card>
          </div>
        </Section>

        <Section title="ScrollArea">
          <ScrollArea className="h-40 max-w-sm rounded-lg bg-card shadow-card">
            <div className="flex flex-col gap-1.5 p-3">
              {['Bins', 'Dentist', 'Passport', 'Parcel', 'Shelf', 'Plants', 'MOT', 'Boiler'].map(
                (title) => (
                  <ItemRow
                    key={title}
                    leading={<Checkbox colour="blue" aria-label="Done" />}
                    title={title}
                  />
                ),
              )}
            </div>
          </ScrollArea>
        </Section>

        <Section title="Search (Command)">
          <div className="max-w-xl rounded-xl bg-popover shadow-dialog">
            <Command
              label="Search"
              value={search}
              onValueChange={setSearch}
              groups={SEARCH_GROUPS}
              onChoose={() => {}}
            />
          </div>
        </Section>

        <Section title="Overlays">
          <Row>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>Menu</DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Convert to</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <TaskIcon />
                    Task
                    <DropdownMenuShortcut>
                      <Kbd>T</Kbd>
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <NoteIcon /> Note
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>Popover</PopoverTrigger>
              <PopoverContent>
                <PopoverTitle>Plan Chicken katsu</PopoverTitle>
                <Input size="sm" defaultValue="Sun dinner" aria-label="When" />
                <PopoverFooter>
                  <Button size="sm">Add to Sun dinner</Button>
                </PopoverFooter>
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => setItemOpen(true)}>
              Item dialog
            </Button>
            <Button variant="outline" onClick={() => setCapture((c) => ({ ...c, open: true }))}>
              New
            </Button>
            <Button variant="outline" onClick={() => setSearchOpen(true)}>
              Search
            </Button>
            <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Search">
              <Command
                label="Search"
                value={search}
                onValueChange={setSearch}
                groups={SEARCH_GROUPS}
                status={
                  <>
                    <CloudOffIcon aria-hidden /> Offline · Results may be incomplete
                  </>
                }
                onChoose={() => setSearchOpen(false)}
              />
            </CommandDialog>
            <NewDialog
              open={capture.open}
              onOpenChange={(open) => setCapture((c) => ({ ...c, open }))}
              onSave={() => setCapture((c) => ({ ...c, open: false }))}
              savesAs={<SavesAs colour="blue" icon={BellRingIcon} label="Reminder" />}
            >
              <SmartLine
                value={capture.text}
                onValueChange={(text) => setCapture((c) => ({ ...c, text }))}
                placeholder="Remind me to…"
                pills={[{ id: 'fri', label: 'Fri 16 Oct, 18:00' }]}
              />
              <ChipRow>
                <QuickChip>In 1 hour</QuickChip>
                <QuickChip>This evening</QuickChip>
                <AddAlertMenu
                  choices={[
                    { label: 'In 1 hour', when: '15:20' },
                    { label: 'This evening', when: '18:00' },
                  ]}
                />
              </ChipRow>
            </NewDialog>
            <ItemDialog
              open={itemOpen}
              onOpenChange={setItemOpen}
              colour="blue"
              icon={TaskIcon}
              typeLabel="Task"
              title="Renew car insurance"
              leading={<Checkbox colour="blue" aria-label="Done" />}
              actions={
                <Toggle aria-label="Star" defaultPressed>
                  <StarIcon />
                </Toggle>
              }
            >
              <p className="text-muted-foreground">Admiral quoted £412</p>
            </ItemDialog>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>Dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New label</DialogTitle>
                  <DialogDescription>For Thoughts, Notes and Tasks</DialogDescription>
                </DialogHeader>
                <Input aria-label="Name" defaultValue="Travel" />
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <Button>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" />}>
                Alert dialog
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    2 changes haven't been sent yet and will be lost
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction variant="destructive">Sign out</AlertDialogAction>
                  <AlertDialogCancel />
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              onClick={() =>
                toast.success('Restored "Book Japan flights"', {
                  action: { label: 'Undo', onClick: () => {} },
                })
              }
            >
              Toast
            </Button>
          </Row>
        </Section>
      </main>
    </div>
  )
}
