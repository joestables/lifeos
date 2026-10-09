import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  ChefHatIcon,
  DumbbellIcon,
  EllipsisIcon,
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
  UtensilsIcon,
  WifiOffIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  DayColumn,
  FilterChip,
  ItemRow,
  ModuleBadge,
  ModuleDot,
  ModuleScope,
  ModuleTile,
  PageHeader,
  PlanCard,
  SectionLabel,
  SyncStatus,
  TYPE_ICONS,
  type ModuleKey,
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
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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

const MODULE_SWATCHES: { module: Exclude<ModuleKey, 'core'>; name: string; pages: string }[] = [
  { module: 'lists', name: 'Lists', pages: 'Lists and Shops' },
  { module: 'food', name: 'Food', pages: 'Recipes' },
  { module: 'fitness', name: 'Fitness', pages: 'Gym, Cardio' },
  { module: 'goals', name: 'Goals', pages: 'Goals' },
  { module: 'wardrobe', name: 'Wardrobe', pages: 'Wardrobe' },
  { module: 'finance', name: 'Finance', pages: 'Finance' },
]

const TaskIcon = TYPE_ICONS.task!
const NoteIcon = TYPE_ICONS.note!

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
  const [chips, setChips] = useState({ core: true, food: true, fitness: false })
  const toggleMode = () => {
    document.documentElement.classList.toggle('dark', !dark)
    setDark(!dark)
  }

  return (
    <div className="min-h-svh bg-background">
      <PageHeader
        kicker="Stage 1"
        title="Design system"
        actions={
          <Button variant="outline" size="sm" onClick={toggleMode}>
            {dark ? <SunIcon /> : <MoonIcon />}
            {dark ? 'Light' : 'Dark'}
          </Button>
        }
      />
      <main className="flex flex-col gap-8 px-3.5 pb-8 sm:px-9">
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

        <Section title="Module colours">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            <div className="flex flex-col gap-2.5 rounded-lg bg-card p-3.5 shadow-card">
              <div className="flex items-center gap-2 font-bold">
                <ModuleDot module="core" /> Core
              </div>
              <div className="text-xs text-muted-foreground">Inbox, Plan, Tasks, Notes</div>
              <div className="flex gap-2">
                {(['thought', 'note', 'task', 'event'] as const).map((t) => (
                  <ModuleTile key={t} module="core" icon={TYPE_ICONS[t]!} />
                ))}
              </div>
            </div>
            {MODULE_SWATCHES.map(({ module, name, pages }) => (
              <div
                key={module}
                className="flex flex-col gap-2.5 rounded-lg bg-card p-3.5 shadow-card"
              >
                <div className="flex items-center gap-2 font-bold">
                  <ModuleDot module={module} /> {name}
                </div>
                <div className="text-xs text-muted-foreground">{pages}</div>
                <div data-module={module} className="h-9 rounded-md bg-mc" />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-2 rounded-lg bg-card p-5 shadow-card">
            <div className="text-kicker text-muted-foreground uppercase">Kicker · 12</div>
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
            <ModuleBadge module="food">Last cooked Mon</ModuleBadge>
            <ModuleBadge module="fitness">Push</ModuleBadge>
            <ModuleBadge module="goals">On track</ModuleBadge>
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
              <p className="text-xs text-muted-foreground">Help text sits below the field.</p>
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
              <TabsTrigger value="starred">Starred</TabsTrigger>
              <TabsTrigger value="ideas">Ideas</TabsTrigger>
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

        <Section title="A Module's page (ModuleScope)">
          <ModuleScope
            module="food"
            className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card"
          >
            <div className="text-kicker text-mc uppercase">Food</div>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="ideas">Ideas</TabsTrigger>
              </TabsList>
            </Tabs>
            <Row>
              <Button>
                <PlusIcon /> New recipe
              </Button>
              <Checkbox defaultChecked aria-label="Cooked" />
              <Switch defaultChecked aria-label="Staple" />
              <Toggle aria-label="Star" defaultPressed>
                <StarIcon />
              </Toggle>
              <Progress value={60} className="w-40" />
            </Row>
          </ModuleScope>
        </Section>

        <Section title="Lists of Items">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <ItemRow
              leading={<Checkbox aria-label="Done" />}
              title="Book the dentist"
              meta={['Errands', 'Fri 9 Oct', <span className="text-destructive">Due today</span>]}
              actions={
                <Button size="icon-sm" variant="ghost" aria-label="More">
                  <EllipsisIcon />
                </Button>
              }
            />
            <ItemRow
              leading={<Checkbox aria-label="Done" defaultChecked />}
              title="Renew passport"
              meta={['Done Tue']}
              done
            />
            <ItemRow
              leading={<ModuleTile module="core" icon={TYPE_ICONS.thought!} />}
              title="Milk, eggs, panko"
              meta={['Thought', 'Just now']}
              sync="pending"
            />
            <ItemRow
              leading={<ModuleTile module="core" icon={TYPE_ICONS.note!} />}
              title="Japan ideas"
              meta={['Note']}
              sync="failed"
            />
            <ItemRow
              leading={<ModuleTile module="food" icon={ChefHatIcon} />}
              title="Chicken katsu"
              meta={[<ModuleBadge module="food">Last cooked Mon</ModuleBadge>, '4 variations']}
            />
            <ItemRow
              leading={<ModuleTile module="fitness" icon={DumbbellIcon} />}
              title="Push day"
              meta={['Thu 18:30', '6 exercises']}
            />
            <ItemRow
              leading={<ModuleTile module="goals" icon={TargetIcon} />}
              title="Bench 60 kg"
              meta={['52.5 kg', 'On track']}
            />
          </div>
        </Section>

        <Section title="Plan">
          <Row>
            <FilterChip
              module="core"
              pressed={chips.core}
              onPressedChange={(core) => setChips({ ...chips, core })}
            >
              Tasks and events
            </FilterChip>
            <FilterChip
              module="food"
              pressed={chips.food}
              onPressedChange={(food) => setChips({ ...chips, food })}
            >
              Meals
            </FilterChip>
            <FilterChip
              module="fitness"
              pressed={chips.fitness}
              onPressedChange={(fitness) => setChips({ ...chips, fitness })}
            >
              Gym
            </FilterChip>
          </Row>
          <div className="grid max-w-3xl grid-cols-3 gap-2.5">
            <DayColumn name="Thu" number={8}>
              <PlanCard
                module="core"
                icon={TYPE_ICONS.task!}
                type="Task"
                title="Renew passport"
                past
              />
              <PlanCard
                module="fitness"
                icon={DumbbellIcon}
                type="Workout"
                title="Push day"
                time="18:30"
                past
              />
            </DayColumn>
            <DayColumn name="Fri" number={9} today>
              <PlanCard
                module="core"
                icon={TYPE_ICONS.event!}
                type="Event"
                title="Dishoom"
                time="19:30"
              />
              <PlanCard
                module="lists"
                icon={ShoppingCartIcon}
                type="Shop"
                title="Tesco"
                time="10:00"
              />
            </DayColumn>
            <DayColumn name="Sat" number={10}>
              <PlanCard module="food" icon={UtensilsIcon} type="Dinner" title="Chicken katsu" />
              <PlanCard module="wardrobe" icon={ShirtIcon} type="Outfit" title="Olive knit" />
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
            <AlertDescription>
              Changes are saved here and sent when you're back online
            </AlertDescription>
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
                  <ModuleTile module="core" icon={TYPE_ICONS.task!} size="sm" /> Errands
                </AccordionTrigger>
                <AccordionContent>
                  <ItemRow leading={<Checkbox aria-label="Done" />} title="Post the parcel" />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="home">
                <AccordionTrigger>
                  <ModuleTile module="core" icon={TYPE_ICONS.task!} size="sm" /> Home
                </AccordionTrigger>
                <AccordionContent>
                  <ItemRow leading={<Checkbox aria-label="Done" />} title="Fix the shelf" />
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
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>Dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Capture</DialogTitle>
                  <DialogDescription>Saved to Inbox as a Thought</DialogDescription>
                </DialogHeader>
                <Input placeholder="What's on your mind?" aria-label="Thought" />
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
            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>Sheet</SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Book the dentist</SheetTitle>
                  <SheetDescription>Task · Errands</SheetDescription>
                </SheetHeader>
                <Separator />
              </SheetContent>
            </Sheet>
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
