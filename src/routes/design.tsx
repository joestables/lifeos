import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  BellIcon,
  CalendarIcon,
  ChefHatIcon,
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
  LogOutIcon,
  TagIcon,
  UtensilsIcon,
  WifiOffIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AddRow,
  BackLink,
  BrandMark,
  CaptureDialog,
  CardRow,
  DateField,
  EmptyState,
  ItemDialog,
  DayColumn,
  FilterChip,
  ItemRow,
  LabelPicker,
  NoteCard,
  NoteGrid,
  Fab,
  PageHeader,
  PlanCard,
  SectionLabel,
  SubtaskList,
  SwipeAction,
  SyncStatus,
  TimeField,
  TYPE_ICONS,
  TypeBadge,
  TypeDot,
  TypeScope,
  TypeTile,
  type TypeColour,
} from '@/components/lifeos'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
const CAPTURE_TYPES = [
  { key: 'thought', label: 'Thought', colour: 'yellow' as const, icon: TYPE_ICONS.thought! },
  { key: 'task', label: 'Task', colour: 'blue' as const, icon: TaskIcon },
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
  const [capture, setCapture] = useState({ open: false, type: 'thought', text: 'call mum fri 6pm' })
  const [chips, setChips] = useState({ core: true, food: true, fitness: false })
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
              <PlusIcon /> Capture <Kbd>N</Kbd>
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2Icon /> Delete
            </Button>
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
                All <TabsCount>12</TabsCount>
              </TabsTrigger>
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="travel">Travel</TabsTrigger>
            </TabsList>
          </Tabs>
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
                  <TabsTrigger value="label">By label</TabsTrigger>
                  <TabsTrigger value="done">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
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
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="home">Home</TabsTrigger>
                  <TabsTrigger value="travel">Travel</TabsTrigger>
                </TabsList>
              </Tabs>
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
                leading={<TypeTile colour="yellow" icon={TYPE_ICONS.thought!} size="sm" />}
                title="Ceramics class for the anniversary?"
                meta={['08:12']}
                onOpen={() => {}}
              />
            </SwipeAction>
            <ItemRow
              leading={<Checkbox colour="blue" aria-label="Done" defaultChecked />}
              title="Renew passport"
              meta={['Done Tue']}
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
            </div>
            <SubtaskList
              subtasks={[
                { id: 'a', title: 'Get a quote from Admiral', done: true },
                { id: 'b', title: 'Get a quote from Direct Line', done: false },
              ]}
              onToggle={() => {}}
              onRename={() => {}}
              onRemove={() => {}}
              onAdd={() => {}}
            />
            <AddRow placeholder="Add a task" onAdd={() => {}} className="px-3.5" />
          </TypeScope>
        </Section>

        <Section title="Plan">
          <Row>
            <FilterChip
              colour="blue"
              pressed={chips.core}
              onPressedChange={(core) => setChips({ ...chips, core })}
            >
              Tasks and events
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
              Gym
            </FilterChip>
          </Row>
          <div className="grid max-w-3xl grid-cols-3 gap-2.5">
            <DayColumn name="Thu" number={8}>
              <PlanCard
                colour="blue"
                icon={TYPE_ICONS.task!}
                type="Task"
                title="Renew passport"
                past
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
            <DayColumn name="Fri" number={9} today>
              <PlanCard
                colour="blue"
                icon={TYPE_ICONS.event!}
                type="Event"
                title="Dishoom"
                time="19:30"
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
              <PlanCard colour="orange" icon={ShirtIcon} type="Outfit" title="Olive knit" />
            </DayColumn>
          </div>
        </Section>

        <Section title="Cards, table, progress">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reminders</CardTitle>
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
              Capture
            </Button>
            <CaptureDialog
              open={capture.open}
              onOpenChange={(open) => setCapture((c) => ({ ...c, open }))}
              types={CAPTURE_TYPES}
              type={capture.type}
              onTypeChange={(type) => setCapture((c) => ({ ...c, type }))}
              text={capture.text}
              onTextChange={(text) => setCapture((c) => ({ ...c, text }))}
              offer={
                capture.type === 'thought'
                  ? {
                      type: 'task',
                      label: 'Task, Fri 18:00?',
                      onTake: () => setCapture((c) => ({ ...c, type: 'task' })),
                    }
                  : undefined
              }
              understood={
                capture.type === 'task'
                  ? [
                      { icon: CalendarIcon, label: 'Fri 16 Oct 18:00' },
                      { icon: BellIcon, label: '18:00' },
                    ]
                  : []
              }
              onSave={() => setCapture((c) => ({ ...c, open: false }))}
            />
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
                  <DialogDescription>For Notes and Tasks</DialogDescription>
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
