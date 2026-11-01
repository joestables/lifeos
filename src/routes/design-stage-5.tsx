import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ArrowLeftRightIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChefHatIcon,
  ClipboardListIcon,
  CopyIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  HistoryIcon,
  InboxIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  TargetIcon,
  Trash2Icon,
  TrophyIcon,
  UndoIcon,
  UtensilsIcon,
  WalletIcon,
  WeightIcon,
  WrenchIcon,
  GaugeIcon,
  ActivityIcon,
  ArchiveRestoreIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  AppShell,
  BackLink,
  BodyMap,
  CardRow,
  ChartKey,
  CurrentLine,
  ExerciseCard,
  FilterLayout,
  FilterPanel,
  FilterSection,
  FormNotes,
  LinePill,
  ListDetail,
  LogSetButton,
  LookAhead,
  MotivationBadge,
  MotivationChoice,
  MuscleChoice,
  OverallReadiness,
  PageAction,
  PageHeader,
  PanelFooter,
  PanelHeading,
  PanelRow,
  PickRow,
  ProgressChart,
  RangeFilter,
  ReadinessRing,
  SectionLabel,
  SetLine,
  SetTable,
  SideColumns,
  SortMenu,
  StarRating,
  StatTile,
  StepperField,
  StimulusRow,
  TabsRow,
  TypeBadge,
  TypeScope,
  TypeTile,
  ValueStepper,
  WorkoutStatePill,
  type ChartLine,
  type DrawerPage,
  type LoggedSet,
  type LineDash,
  type WorkoutState,
} from '@/components/lifeos'
import { Fab } from '@/components/lifeos/Fab'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/**
 * Stage 5's screens, the Gym, drawn with the real components and made-up
 * data, for Joe to agree in the design step (Stage 5 plan, step 3; second
 * pass after his comments of 31 October). In development and preview
 * builds only, as /design is. `?screen=` chooses the screen.
 */
export const Route = createFileRoute('/design-stage-5')({
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

function Shell({ page = 'Gym', children }: { page?: string; children: ReactNode }) {
  return (
    <AppShell
      pages={PAGES.map((p) => (p.label === page ? { ...p, to: '/design-stage-5' } : p))}
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
  placeholder,
}: {
  value?: string
  options: string[]
  label: string
  placeholder?: string
}) {
  return (
    <Select defaultValue={value}>
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue placeholder={placeholder} />
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

function Search({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  )
}

/** The page body's padding, as every page has it. */
function Body({
  phone,
  narrow = false,
  children,
}: {
  phone?: boolean
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-5 px-5 sm:px-9 ${narrow ? 'max-w-3xl' : ''} ${phone ? 'pb-28' : 'pb-12'}`}
    >
      {children}
    </div>
  )
}

const workoutTile = <TypeTile colour="coral" icon={DumbbellIcon} />
const templateTile = <TypeTile colour="coral" icon={ClipboardListIcon} />
const exerciseTile = <TypeTile colour="coral" icon={WeightIcon} />
const smallExercise = <TypeTile size="sm" colour="coral" icon={WeightIcon} />

type Tab = 'workouts' | 'recovery' | 'progression'

function GymPage({
  tab,
  phone = false,
  action,
  children,
}: {
  tab: Tab
  phone?: boolean
  action?: string
  children: ReactNode
}) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader title="Gym" action={action ? { label: action, onClick: nothing } : undefined} />
        <Body phone={phone}>
          <TabsRow>
            <Tabs defaultValue={tab}>
              <TabsList>
                <TabsTrigger value="workouts">Workouts</TabsTrigger>
                <TabsTrigger value="recovery">Recovery</TabsTrigger>
                <TabsTrigger value="progression">Progression</TabsTrigger>
              </TabsList>
            </Tabs>
            {action && <PageAction label={action} onClick={nothing} />}
          </TabsRow>
          {children}
        </Body>
        {phone && action && <Fab label={action} />}
      </TypeScope>
    </Shell>
  )
}

/** A Gym page reached from another: a BackLink, its title, and its body. */
function SubPage({
  back,
  title,
  phone = false,
  narrow = false,
  action,
  trailing,
  children,
}: {
  back: string
  title: string
  phone?: boolean
  narrow?: boolean
  action?: string
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader
          back={{ label: back, onClick: nothing }}
          title={title}
          trailing={trailing}
          action={phone && action ? { label: action, onClick: nothing } : undefined}
        />
        <Body phone={phone} narrow={narrow}>
          {children}
        </Body>
      </TypeScope>
    </Shell>
  )
}

/** A workout's line of facts under its title: its state pill, then muted facts. */
function Facts({ state, items }: { state?: WorkoutState; items: string[] }) {
  return (
    <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground tabular-nums">
      {state && <WorkoutStatePill state={state} />}
      {items.map((t, i) => (
        <span key={t} className="flex items-center gap-3">
          {(i > 0 || state) && (
            <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
          )}
          {t}
        </span>
      ))}
    </div>
  )
}

/* ---------- Data ---------- */

const RECENT: [string, string[], WorkoutState][] = [
  ['Push A', ['Mon 28 Oct', '1 h 04', '6 exercises', '17 sets'], 'complete'],
  ['Pull A', ['Sat 26 Oct', '58 min', '6 exercises', '16 sets'], 'complete'],
  ['Legs', ['Thu 24 Oct', '1 h 11', '5 exercises', '15 sets'], 'complete'],
  ['Upper', ['Tue 22 Oct'], 'skipped'],
  ['Push A', ['Mon 21 Oct', '1 h 02', '5 exercises', '15 sets'], 'complete'],
  ['Pull A', ['Sat 19 Oct', '1 h 06', '6 exercises', '17 sets'], 'complete'],
  ['Legs', ['Thu 17 Oct', '1 h 14', '5 exercises', '16 sets'], 'complete'],
  ['Push A', ['Tue 15 Oct', '57 min', '5 exercises', '14 sets'], 'complete'],
]

const TEMPLATES: [string, string][] = [
  ['Push A', '5 exercises · 15 sets · Mon'],
  ['Pull A', '6 exercises · 17 sets · Sat'],
  ['Legs', '5 exercises · 14 sets · Thu 24 Oct'],
  ['Upper', '7 exercises · 18 sets · 8 Oct'],
  ['Push B', '5 exercises · 14 sets · 1 Oct'],
  ['Arms and abs', '6 exercises · 15 sets · 24 Sep'],
  ['Pull B', '6 exercises · 16 sets · 17 Sep'],
  ['Full body', '6 exercises · 12 sets · 2 Sep'],
]

/* ---------- Workouts tab ---------- */

function TodayCard({ upNext = false, phone = false }: { upNext?: boolean; phone?: boolean }) {
  return (
    <Card className="gap-3">
      <PanelHeading title="Today">
        <span className="text-sm text-muted-foreground">Thu 31 Oct</span>
      </PanelHeading>
      {upNext ? (
        <div className="flex flex-col">
          <span className="pb-1 text-sm text-muted-foreground">
            Nothing planned. Most suitable:
          </span>
          <PanelRow
            leading={templateTile}
            title="Legs"
            meta={['Readiness 96 %', 'last used 5 days ago']}
          />
        </div>
      ) : (
        <div className="flex flex-col">
          <PanelRow
            leading={workoutTile}
            title="Pull A"
            meta={
              phone ? ['Started 18:02', '42 min'] : ['Started 18:02', '42 min', '3 of 6 exercises']
            }
            trailing={<WorkoutStatePill state="in-progress" />}
          />
        </div>
      )}
    </Card>
  )
}

function RecentCard({ count, phone = false }: { count: number; phone?: boolean }) {
  return (
    <Card className="gap-3">
      <PanelHeading title="Recent workouts" />
      <div className="flex flex-col">
        {RECENT.slice(0, count).map(([name, meta, state], i) => (
          <PanelRow
            key={i}
            leading={workoutTile}
            title={name}
            meta={meta.filter((m) => !/ h |min/.test(m) && !(phone && m.includes('exercises')))}
            trailing={<WorkoutStatePill state={state} />}
          />
        ))}
      </div>
      <PanelFooter label="All workouts" />
    </Card>
  )
}

function TemplatesCard({ count }: { count: number }) {
  return (
    <Card className="gap-3">
      <PanelHeading title="Templates" />
      <div className="flex flex-col">
        {TEMPLATES.slice(0, count).map(([name, meta]) => (
          <PanelRow key={name} leading={templateTile} title={name} meta={[meta]} />
        ))}
      </div>
      <PanelFooter label="All templates" />
    </Card>
  )
}

function Workouts({ phone = false, upNext = false }: { phone?: boolean; upNext?: boolean }) {
  return (
    <GymPage tab="workouts" phone={phone} action="New workout">
      {phone ? (
        <div className="flex flex-col gap-4">
          <TodayCard upNext={upNext} phone />
          <RecentCard count={5} phone />
          <TemplatesCard count={3} />
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <TodayCard upNext={upNext} />
            <RecentCard count={5} />
          </div>
          <TemplatesCard count={6} />
        </div>
      )}
    </GymPage>
  )
}

/* ---------- All workouts ---------- */

function PageNumbers() {
  return (
    <Pagination className="justify-center pt-1">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        {[1, 2, 3].map((n) => (
          <PaginationItem key={n}>
            <PaginationLink href="#" isActive={n === 1}>
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

const WORKOUT_SORT = [
  { value: 'date', label: 'Date', initial: 'desc' as const },
  { value: 'duration', label: 'Duration', initial: 'desc' as const },
  { value: 'sets', label: 'Sets', initial: 'desc' as const },
  { value: 'stimulus', label: 'Stimulus sets', initial: 'desc' as const },
  { value: 'went', label: 'How it went', initial: 'desc' as const },
  { value: 'motivation', label: 'Motivation', initial: 'desc' as const },
]

function WorkoutFilters() {
  return (
    <FilterPanel
      active
      onChange={nothing}
      onReset={nothing}
      groups={[
        {
          name: 'State',
          values: ['Complete', 'In progress', 'Planned', 'Skipped'],
          chosen: ['Complete'],
          open: true,
        },
        {
          name: 'Template',
          values: ['Push A', 'Pull A', 'Legs', 'Upper', 'Push B', 'None'],
          open: true,
        },
        {
          name: 'Sets logged',
          values: [],
          summary: '12–24',
          control: <RangeFilter label="Sets logged" min={0} max={30} value={[12, 24]} />,
        },
        {
          name: 'Stimulus sets',
          values: [],
          control: <RangeFilter label="Stimulus sets" min={0} max={40} value={[0, 40]} />,
        },
        {
          name: 'Exercises done',
          values: [],
          control: <RangeFilter label="Exercises done" min={0} max={10} value={[0, 10]} />,
        },
        {
          name: 'Duration',
          values: [],
          control: (
            <RangeFilter
              label="Duration"
              min={0}
              max={120}
              value={[0, 120]}
              format={(n) => `${n} min`}
            />
          ),
        },
        { name: 'Exercise', values: ['Bench press', 'Lat pulldown', 'Squat', 'Romanian deadlift'] },
        { name: 'Muscle trained', values: ['Chest', 'Lats', 'Quads', 'Hamstrings', 'Biceps'] },
        {
          name: 'How it went',
          values: [],
          control: (
            <RangeFilter
              label="How it went"
              min={1}
              max={5}
              value={[1, 5]}
              format={(n) => `${n} ★`}
            />
          ),
        },
        { name: 'Motivation', values: ['Low', 'So-so', 'High'] },
      ]}
    >
      <FilterSection title="Dates">
        <div className="grid grid-cols-2 gap-2">
          <SmallSelect label="From" value="1 Aug" options={['1 Aug', '1 Sep', '1 Oct']} />
          <SmallSelect label="To" value="Today" options={['Today', '1 Oct']} />
        </div>
      </FilterSection>
    </FilterPanel>
  )
}

function AllWorkouts({ phone = false }: { phone?: boolean }) {
  const stats = (
    <div className="grid grid-cols-3 gap-3">
      <StatTile label="Average sets" value="16.4" />
      <StatTile label="Average duration" value="1 h 02" />
      <StatTile label="Weekly sessions" value="×3.1" />
    </div>
  )
  const list = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold text-muted-foreground tabular-nums">
          48 workouts
        </span>
        {phone && (
          <Button variant="outline" size="sm">
            <SlidersHorizontalIcon /> Filters
            <Badge variant="secondary">2</Badge>
          </Button>
        )}
        <SortMenu options={WORKOUT_SORT} value="date" direction="desc" onChange={nothing} />
      </div>
      <Card className="gap-0 py-3">
        {RECENT.filter((r) => r[2] === 'complete')
          .concat(RECENT.filter((r) => r[2] === 'complete'))
          .slice(0, phone ? 7 : 10)
          .map(([name, meta, state], i) => (
            <PanelRow
              key={i}
              leading={workoutTile}
              title={name}
              meta={phone ? meta.filter((m) => !m.includes('exercises')) : meta}
              trailing={<WorkoutStatePill state={state} />}
            />
          ))}
      </Card>
      <PageNumbers />
    </>
  )
  return (
    <SubPage back="Gym" title="All workouts" phone={phone}>
      {phone ? (
        <>
          {stats}
          {list}
        </>
      ) : (
        <FilterLayout filters={<WorkoutFilters />}>
          {stats}
          {list}
        </FilterLayout>
      )}
    </SubPage>
  )
}

/* ---------- All templates ---------- */

function AllTemplates({ phone = false }: { phone?: boolean }) {
  return (
    <SubPage back="Gym" title="All templates" phone={phone} narrow action="New template">
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-semibold text-muted-foreground tabular-nums">
          8 templates
        </span>
        <SortMenu
          options={[
            { value: 'recent', label: 'Most recently used', initial: 'desc' },
            { value: 'popular', label: 'Most used this month', initial: 'desc' },
            { value: 'exercises', label: 'Exercises', initial: 'desc' },
            { value: 'sets', label: 'Sets', initial: 'desc' },
            { value: 'az', label: 'A–Z', initial: 'asc' },
          ]}
          value="recent"
          direction="desc"
          onChange={nothing}
        />
        <PageAction label="New template" onClick={nothing} />
      </div>
      <Card className="gap-0 py-3">
        {TEMPLATES.map(([name, meta]) => (
          <PanelRow
            key={name}
            leading={templateTile}
            title={name}
            meta={[meta]}
            trailing={more(
              <>
                <DropdownMenuItem>
                  <CopyIcon /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PencilIcon /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </>,
              name,
            )}
          />
        ))}
      </Card>
      <PageNumbers />
    </SubPage>
  )
}

/* ---------- New workout ---------- */

function NewWorkout({ phone = false }: { phone?: boolean }) {
  return (
    <>
      <Workouts phone={phone} />
      <Dialog open>
        <DialogContent data-colour="coral" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New workout</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <Field label="Template">
              <RadioGroup defaultValue="Push A" className="grid gap-2 sm:grid-cols-2">
                <RadioCard
                  value="Push A"
                  title="Push A"
                  description="5 exercises · 15 sets · Mon"
                />
                <RadioCard
                  value="Pull A"
                  title="Pull A"
                  description="6 exercises · 17 sets · Sat"
                />
                <RadioCard value="Legs" title="Legs" description="5 exercises · 14 sets · Thu" />
                <RadioCard value="Empty" title="Empty" description="Add exercises as you go" />
              </RadioGroup>
              <SmallSelect
                label="Another template"
                placeholder="Another template…"
                options={['Upper', 'Push B', 'Arms and abs', 'Pull B', 'Full body']}
              />
            </Field>
            <Field label="Day">
              <SmallSelect
                label="Day"
                value="Today, Thu 31 Oct"
                options={['Today, Thu 31 Oct', 'Tomorrow, Fri 1 Nov', 'Sat 2 Nov']}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- A workout in progress ---------- */

const sessionMenu = (begun: boolean, name: string) =>
  more(
    <>
      <DropdownMenuItem>
        <HistoryIcon /> Strength history
      </DropdownMenuItem>
      {!begun && (
        <DropdownMenuItem>
          <ArrowLeftRightIcon /> Swap…
        </DropdownMenuItem>
      )}
      <DropdownMenuItem>
        <UndoIcon /> Back to the backlog
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <Trash2Icon /> Remove
      </DropdownMenuItem>
    </>,
    name,
  )

const markDone = (phone?: boolean) =>
  phone ? (
    <Button variant="outline" size="icon-sm" aria-label="Mark done">
      <CheckIcon />
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      Mark done
    </Button>
  )

const ROW_SETS: LoggedSet[] = [
  { weight: '30', reps: 10, rir: 2, pr: true },
  { weight: '30', reps: 9, rir: 1 },
  {},
]

function SessionExercises({ phone }: { phone?: boolean }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel count={3}>Session</SectionLabel>
      <ExerciseCard
        name="Lat pulldown"
        meta={['3 of 3 sets']}
        done
        menu={sessionMenu(true, 'Lat pulldown')}
      />
      <ExerciseCard
        name="Chest-supported row"
        meta={['3 of 3 sets']}
        open
        control={markDone(phone)}
        menu={sessionMenu(true, 'Chest-supported row')}
      >
        <div className="flex flex-col gap-1.5">
          <FormNotes>Chest on the pad at notch 4, elbows at 45°, pause at the top</FormNotes>
          <CurrentLine>27.5 kg × 10</CurrentLine>
        </div>
        <SetTable sets={ROW_SETS} editable />
        <LogSetButton label="Log set" />
      </ExerciseCard>
      <ExerciseCard
        name="Incline curl"
        meta={['1 of 2 sets']}
        control={markDone(phone)}
        menu={sessionMenu(true, 'Incline curl')}
      />
    </section>
  )
}

const BACKLOG = [
  ['Face pull', 'Rear delts · 3 sets'],
  ['Hammer curl', 'Brachialis · 2 sets'],
  ['Shrug', 'Traps · 2 sets'],
] as const

function BacklogRows() {
  return (
    <>
      {BACKLOG.map(([name, meta]) => (
        <PanelRow
          key={name}
          leading={exerciseTile}
          title={name}
          meta={[meta]}
          chevron={false}
          trailing={
            <>
              <Button variant="outline" size="sm">
                <PlusIcon /> Add
              </Button>
              {more(
                <>
                  <DropdownMenuItem>
                    <HistoryIcon /> Strength history
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArrowLeftRightIcon /> Swap…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <Trash2Icon /> Remove
                  </DropdownMenuItem>
                </>,
                name,
              )}
            </>
          }
        />
      ))}
    </>
  )
}

function SessionHeader({ phone }: { phone?: boolean }) {
  return (
    <PageHeader
      back={{ label: 'Workouts', onClick: nothing }}
      title="Pull A"
      trailing={
        <div className="flex items-center gap-1">
          <Button size={phone ? 'sm' : 'default'}>End workout</Button>
          {more(
            <>
              <DropdownMenuItem>
                <PencilIcon /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2Icon /> Discard workout
              </DropdownMenuItem>
            </>,
            'Workout',
          )}
        </div>
      }
    />
  )
}

/** One column, the backlog under the session (Joe, 1 November): logged on a phone. */
function Session({ phone = false }: { phone?: boolean }) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <SessionHeader phone={phone} />
        <Body phone={phone} narrow>
          <Facts state="in-progress" items={['Started 18:02', '42 min', '8 sets']} />
          <SessionExercises phone={phone} />
          <section className="flex flex-col gap-2">
            <SectionLabel count={3}>Backlog</SectionLabel>
            <Card className="gap-1 py-3">
              <BacklogRows />
              <Button variant="ghost" className="-mx-2 -mb-1 justify-start text-muted-foreground">
                <PlusIcon /> Add exercise
              </Button>
            </Card>
          </section>
        </Body>
      </TypeScope>
    </Shell>
  )
}

/* ---------- Logging a set ---------- */

/** Weight and reps side by side, each headed, over RIR as buttons 0 to 5. */
function TrackedFields({ weight, reps, rir }: { weight: string; reps: number; rir: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (kg)">
          <ValueStepper size="lg" label="Weight" value={weight} />
        </Field>
        <Field label="Reps">
          <ValueStepper size="lg" label="Reps" value={String(reps)} />
        </Field>
      </div>
      <Field label="RIR">
        <ToggleGroup
          defaultValue={[String(rir)]}
          aria-label="RIR"
          className="grid w-full grid-cols-6 self-stretch"
        >
          {['0', '1', '2', '3', '4', '5'].map((n) => (
            <ToggleGroupItem
              key={n}
              value={n}
              className="h-10 justify-center text-base tabular-nums"
            >
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
    </div>
  )
}

function LogSet({
  phone = false,
  mode = 'tracked',
}: {
  phone?: boolean
  mode?: 'tracked' | 'quick' | 'edit'
}) {
  const edit = mode === 'edit'
  return (
    <>
      <Session phone={phone} />
      <Dialog open>
        <DialogContent data-colour="coral" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{edit ? 'Set 2' : 'Chest-supported row'}</DialogTitle>
            <span className="text-sm text-muted-foreground tabular-nums">
              {edit ? 'Chest-supported row' : 'Set 4 · Current 27.5 kg × 10'}
            </span>
          </DialogHeader>
          <ToggleGroup defaultValue={[edit ? 'tracked' : mode]} aria-label="How to log it">
            <ToggleGroupItem value="tracked">Tracked</ToggleGroupItem>
            <ToggleGroupItem value="quick">Quick</ToggleGroupItem>
          </ToggleGroup>
          {mode === 'quick' ? (
            <span className="text-sm text-muted-foreground">No weight, reps or RIR</span>
          ) : (
            <TrackedFields weight="30" reps={edit ? 9 : 10} rir={edit ? 1 : 1} />
          )}
          <DialogFooter>
            {edit && (
              <Button variant="ghost-destructive" className="mr-auto">
                <Trash2Icon /> Delete
              </Button>
            )}
            <Button variant="outline">Cancel</Button>
            <Button>{edit ? 'Save' : 'Log set'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- Adding and swapping ---------- */

const GROUPS: [string, [string, number][]][] = [
  [
    'Push',
    [
      ['Chest', 6],
      ['Front delts', 3],
      ['Lateral delts', 3],
      ['Triceps', 5],
      ['Serratus', 1],
    ],
  ],
  [
    'Pull',
    [
      ['Lats', 5],
      ['Traps', 3],
      ['Rear delts', 3],
      ['Biceps', 4],
      ['Brachialis', 2],
      ['Forearms', 2],
    ],
  ],
  [
    'Core',
    [
      ['Abs', 4],
      ['Obliques', 2],
      ['Erectors', 2],
    ],
  ],
  [
    'Legs',
    [
      ['Glutes', 4],
      ['Quads', 5],
      ['Hamstrings', 4],
      ['Adductors', 2],
      ['Abductors', 2],
      ['Calves', 2],
      ['Tibialis', 1],
    ],
  ],
]

function MuscleGroups() {
  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map(([cat, muscles]) => (
        <section key={cat} className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{cat}</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {muscles.map(([m, n]) => (
              <MuscleChoice key={m} name={m} count={n} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MuscleExercises({ muscle }: { muscle: 'Chest' | 'Rear delts' }) {
  const lists =
    muscle === 'Chest'
      ? {
          primary: [
            ['Bench press', 'Barbell · 60 kg × 8'],
            ['Incline dumbbell press', 'Dumbbell · 24 kg × 10'],
            ['Cable fly', 'Cable · 15 kg × 12'],
            ['Machine chest press', 'Machine · 55 kg × 10'],
          ],
          secondary: [
            ['Dips', 'Bodyweight · Chest (0.5)'],
            ['Push-up', 'Bodyweight · Chest (0.6)'],
          ],
        }
      : {
          primary: [
            ['Reverse pec deck', 'Machine · 45 kg × 12'],
            ['Cable rear delt fly', 'Cable · 7.5 kg × 15'],
          ],
          secondary: [
            ['Chest-supported row', 'Machine · Rear delts (0.4)'],
            ['Seated cable row', 'Cable · Rear delts (0.3)'],
          ],
        }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        <span className="px-1.5 pb-1 text-xs font-semibold text-muted-foreground">Primary</span>
        {lists.primary.map(([n, m]) => (
          <PickRow key={n} leading={smallExercise} title={n} meta={m} />
        ))}
      </div>
      <div className="flex flex-col">
        <span className="px-1.5 pb-1 text-xs font-semibold text-muted-foreground">Secondary</span>
        {lists.secondary.map(([n, m]) => (
          <PickRow key={n} leading={smallExercise} title={n} meta={m} />
        ))}
      </div>
    </div>
  )
}

function AddExercise({
  phone = false,
  muscle,
  swap = false,
}: {
  phone?: boolean
  muscle?: 'Chest' | 'Rear delts'
  swap?: boolean
}) {
  return (
    <>
      <Session phone={phone} />
      <Dialog open>
        <DialogContent list data-colour="coral" className="sm:max-w-lg">
          <DialogHeader>
            {muscle && <BackLink label="All muscle groups" className="-mb-1 self-start" />}
            <DialogTitle>{swap ? 'Swap Face pull' : (muscle ?? 'Add exercise')}</DialogTitle>
            {swap && <span className="text-sm text-muted-foreground">{muscle}</span>}
          </DialogHeader>
          <Search placeholder="Find an exercise" />
          {muscle ? <MuscleExercises muscle={muscle} /> : <MuscleGroups />}
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- Strength history ---------- */

function History({ phone = false }: { phone?: boolean }) {
  const days: [string, LoggedSet[]][] = [
    [
      'Sat 26 Oct · Pull A',
      [
        { weight: '27.5', reps: 10, rir: 2, strength: '38.5' },
        { weight: '27.5', reps: 10, rir: 1, strength: '37.6' },
        { weight: '27.5', reps: 9, rir: 0, strength: '35.8' },
      ],
    ],
    [
      'Thu 17 Oct · Pull A',
      [
        { weight: '27.5', reps: 9, rir: 1, strength: '36.7' },
        { weight: '27.5', reps: 8, rir: 1, strength: '35.8' },
        { weight: '25', reps: 10, rir: 1, strength: '34.2' },
      ],
    ],
    [
      'Mon 7 Oct · Upper',
      [
        { weight: '30', reps: 8, rir: 0, pr: true, strength: '38.0' },
        { weight: '25', reps: 10, rir: 1, strength: '34.2' },
        { weight: '25', reps: 10, rir: 2, strength: '35.0' },
        { weight: '25', reps: 9, rir: 1, strength: '33.3' },
      ],
    ],
  ]
  return (
    <>
      <Session phone={phone} />
      <Dialog open>
        <DialogContent list data-colour="coral" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chest-supported row</DialogTitle>
            <span className="text-sm text-muted-foreground">Strength history · last 10 sets</span>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {days.map(([day, sets]) => (
              <section key={day} className="flex flex-col">
                <div className="flex items-center justify-between px-1 pb-1 text-xs font-semibold text-muted-foreground">
                  <span>{day}</span>
                  <span>Strength</span>
                </div>
                {sets.map((set, i) => (
                  <SetLine key={i} n={i + 1} set={set} />
                ))}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- Ending ---------- */

function End({ phone = false }: { phone?: boolean }) {
  return (
    <>
      <Session phone={phone} />
      <Dialog open>
        <DialogContent data-colour="coral" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End workout</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <Field label="How it went">
              <div className="-ml-1.5">
                <StarRating value={4} onChange={nothing} />
              </div>
            </Field>
            <Field label="Motivation beforehand">
              <MotivationChoice value="okay" />
            </Field>
            <Field label="Notes">
              <Textarea placeholder="Notes" />
            </Field>
            <Badge variant="outline" className="self-start">
              3 in the backlog are left out
            </Badge>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>End workout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- The review ---------- */

function ReviewExercise({
  name,
  current,
  pr,
  prSub,
  sets,
  beat = false,
}: {
  name: string
  current: [string, number]
  pr: string
  prSub: string
  sets: LoggedSet[]
  beat?: boolean
}) {
  return (
    <Card className="gap-4">
      <h2 className="text-h2">{name}</h2>
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          inset
          label="Current"
          value={`${current[0]} kg × ${current[1]}`}
          sub="Since 12 Oct"
        />
        <StatTile inset icon={<TrophyIcon />} label="PR" value={pr} sub={prSub} />
      </div>
      <SetTable sets={sets} strength />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm">
          Update current
        </Button>
        {beat && (
          <Badge variant="success">
            <ArrowUpIcon aria-hidden />
            Beat current
          </Badge>
        )}
      </div>
    </Card>
  )
}

function ReviewBody({ phone }: { phone?: boolean }) {
  const stimulus = (
    <Card className="gap-2">
      <PanelHeading title="Stimulus sets" />
      <StimulusRow muscle="Lats" sets={4.6} target={4} />
      <StimulusRow muscle="Traps" sets={3.1} target={4} />
      <StimulusRow muscle="Biceps" sets={3.4} target={4} />
      <StimulusRow muscle="Rear delts" sets={2.2} target={4} />
      <StimulusRow muscle="Brachialis" sets={1.6} target={3} />
      <StimulusRow muscle="Forearms" sets={0.9} target={2} />
    </Card>
  )
  const main = (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile inset label="Duration" value="58 min" />
          <StatTile inset label="Sets" value="16" />
          <StatTile inset label="How it went" value={<StarRating value={4} />} />
          <StatTile
            inset
            label="Motivation"
            value={
              <span className="flex h-7 items-center">
                <MotivationBadge value="okay" />
              </span>
            }
          />
        </div>
        <p className="text-sm text-muted-foreground">Grip went on the last row set</p>
      </Card>
      <ReviewExercise
        beat
        name="Chest-supported row"
        current={['27.5', 10]}
        pr="30 kg × 10"
        prSub="2 RIR · 42.0 · today"
        sets={[
          { weight: '30', reps: 10, rir: 2, pr: true, strength: '42.0' },
          { weight: '30', reps: 9, rir: 1, strength: '40.0' },
          { weight: '30', reps: 10, rir: 1, strength: '41.0' },
        ]}
      />
      <ReviewExercise
        name="Lat pulldown"
        current={['65', 10]}
        pr="70 kg × 9"
        prSub="1 RIR · 93.3 · 12 Oct"
        sets={[
          { weight: '65', reps: 10, rir: 2, strength: '91.0' },
          { weight: '65', reps: 9, rir: 1, strength: '86.7' },
          { weight: '65', reps: 8, rir: 1, strength: '84.5' },
        ]}
      />
    </div>
  )
  return phone ? (
    <>
      {main}
      {stimulus}
    </>
  ) : (
    <SideColumns>
      {main}
      {stimulus}
    </SideColumns>
  )
}

function Review({ phone = false }: { phone?: boolean }) {
  return (
    <SubPage
      back="Workouts"
      title="Pull A"
      phone={phone}
      trailing={more(
        <>
          <DropdownMenuItem>
            <PencilIcon /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </>,
        'Workout',
      )}
    >
      <Facts state="complete" items={['Sat 26 Oct', '18:02–19:00']} />
      <ReviewBody phone={phone} />
    </SubPage>
  )
}

function UpdateCurrent({ phone = false }: { phone?: boolean }) {
  return (
    <>
      <Review phone={phone} />
      <Dialog open>
        <DialogContent data-colour="coral" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update current</DialogTitle>
            <span className="text-sm text-muted-foreground">Chest-supported row</span>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <StatTile inset label="Current" value="27.5 kg × 10" />
            <StatTile inset label="Best set today" value="30 kg × 10" sub="2 RIR · Strength 42.0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight">
              <ValueStepper size="lg" label="Weight" value="30" unit="kg" />
            </Field>
            <Field label="Reps">
              <ValueStepper size="lg" label="Reps" value="10" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- A template ---------- */

function TemplatePage({ phone = false }: { phone?: boolean }) {
  const setsStepper = (n: number) => (
    <ValueStepper size="sm" label="Sets" value={String(n)} unit="sets" canDown={n > 1} />
  )
  const tmplMenu = (name: string) =>
    more(
      <>
        <DropdownMenuItem>
          <ArrowLeftRightIcon /> Swap…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2Icon /> Remove
        </DropdownMenuItem>
      </>,
      name,
    )
  const exercises = (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionLabel count={5}>Exercises</SectionLabel>
      {[
        ['Bench press', 'Chest · Barbell', 3],
        ['Overhead press', 'Front delts · Barbell', 3],
        ['Incline dumbbell press', 'Chest · Dumbbell', 3],
        ['Cable lateral raise', 'Lateral delts · Cable', 3],
        ['Overhead triceps extension', 'Triceps · Cable', 3],
      ].map(([name, meta, n]) => (
        <ExerciseCard
          key={name as string}
          drag
          name={name as string}
          meta={[meta as string]}
          control={setsStepper(n as number)}
          menu={tmplMenu(name as string)}
        />
      ))}
      <Button variant="outline" size="sm" className="mt-1 self-start">
        <PlusIcon /> Add exercise
      </Button>
    </section>
  )
  const coverage = (
    <Card className="gap-1">
      <PanelHeading title="Coverage">
        <span className="text-sm text-muted-foreground">at RIR 1</span>
      </PanelHeading>
      <span className="pt-2 text-xs font-semibold text-muted-foreground">Push</span>
      <StimulusRow muscle="Chest" sets={5.4} target={4} />
      <StimulusRow muscle="Front delts" sets={4.3} target={3} />
      <StimulusRow muscle="Lateral delts" sets={2.7} target={4} />
      <StimulusRow muscle="Triceps" sets={4.0} target={4} />
      <span className="pt-3 text-xs font-semibold text-muted-foreground">Core</span>
      <StimulusRow muscle="Abs" sets={0.3} target={3} />
    </Card>
  )
  return (
    <SubPage
      back="Workouts"
      title="Push A"
      phone={phone}
      trailing={more(
        <>
          <DropdownMenuItem>
            <PencilIcon /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CopyIcon /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </>,
        'Template',
      )}
    >
      <Facts items={['5 exercises', '15 sets', 'Last used Mon 28 Oct']} />
      {phone ? (
        <>
          {exercises}
          {coverage}
        </>
      ) : (
        <SideColumns>
          {exercises}
          {coverage}
        </SideColumns>
      )}
    </SubPage>
  )
}

/* ---------- Recovery ---------- */

const MUSCLES: [string, number, string, string][] = [
  ['Lats', 41, 'Sat', '×2.4'],
  ['Biceps', 48, 'Sat', '×2.1'],
  ['Traps', 56, 'Sat', '×2.3'],
  ['Rear delts', 63, 'Sat', '×1.4'],
  ['Brachialis', 72, 'Sat', '×2.0'],
  ['Erectors', 80, 'Thu', '×1.2'],
  ['Forearms', 85, 'Sat', '×2.2'],
  ['Front delts', 88, 'Mon', '×1.6'],
  ['Serratus', 90, 'Mon', '×0.9'],
  ['Chest', 94, 'Mon', '×1.8'],
  ['Triceps', 97, 'Mon', '×1.9'],
  ['Lateral delts', 100, 'Mon', '×1.7'],
  ['Quads', 100, 'Thu', '×1.1'],
  ['Glutes', 100, 'Thu', '×1.2'],
  ['Hamstrings', 100, 'Thu', '×1.1'],
]

const READINESS: Record<string, number> = Object.fromEntries(MUSCLES.map(([m, p]) => [m, p]))

function MuscleList({ selected }: { selected?: string }) {
  return (
    <Card className="gap-3">
      <PanelHeading title="Muscle groups" count={21}>
        <SortMenu
          options={[
            { value: 'readiness', label: 'Readiness', initial: 'asc' },
            { value: 'recent', label: 'Most recently trained', initial: 'desc' },
            { value: 'frequent', label: 'Most frequently trained', initial: 'desc' },
          ]}
          value="readiness"
          direction="asc"
          onChange={nothing}
        />
      </PanelHeading>
      <div className="flex flex-col">
        {MUSCLES.map(([m, p, last, freq]) => (
          <PanelRow
            key={m}
            selected={selected === m}
            leading={<ReadinessRing percent={p} />}
            title={m}
            meta={[`Trained ${last}`, `${freq} a week`]}
          />
        ))}
      </div>
    </Card>
  )
}

function MapCard({ selected }: { selected?: string }) {
  return (
    <Card className="gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <OverallReadiness percent={82} when="Now" />
      </div>
      <LookAhead hours={0} />
      <BodyMap readiness={READINESS} selected={selected} className="mx-auto w-full max-w-md py-2" />
    </Card>
  )
}

function Recovery({ phone = false, selected }: { phone?: boolean; selected?: string }) {
  return (
    <GymPage tab="recovery" phone={phone}>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <MapCard selected={selected} />
        <MuscleList selected={selected} />
      </div>
    </GymPage>
  )
}

function Muscle() {
  return (
    <>
      <Recovery selected="Lats" />
      <Dialog open>
        <DialogContent data-colour="coral" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Lats</DialogTitle>
            <span className="text-sm text-muted-foreground">Pull · recovers normally</span>
          </DialogHeader>
          <div className="flex items-center gap-4">
            <ReadinessRing percent={41} size={64} />
            <div className="flex flex-col">
              <span className="text-h2 tabular-nums">41 % ready</span>
              <span className="text-sm text-muted-foreground">
                Fully recovered Sat 2 Nov, 09:00
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatTile inset label="Last trained" value="Sat" />
            <StatTile inset label="Frequency" value="×2.4" sub="a week, 28 days" />
            <StatTile inset label="Stimulus" value="7.8 / 5" sub="sets this week" />
          </div>
          <DialogFooter>
            <Button variant="outline">Progression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RecoveryAhead() {
  return (
    <GymPage tab="recovery">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="gap-5">
          <OverallReadiness percent={93} when="+18 h · Fri 12:00" />
          <LookAhead hours={18} />
          <BodyMap
            readiness={Object.fromEntries(
              MUSCLES.map(([m, p]) => [m, Math.min(100, Math.round(p + (100 - p) * 0.7))]),
            )}
            className="mx-auto w-full max-w-md py-2"
          />
        </Card>
        <MuscleList />
      </div>
    </GymPage>
  )
}

/* ---------- Progression ---------- */

const WEEKS = [
  '5 Aug',
  '12 Aug',
  '19 Aug',
  '26 Aug',
  '2 Sep',
  '9 Sep',
  '16 Sep',
  '23 Sep',
  '30 Sep',
  '7 Oct',
  '14 Oct',
  '21 Oct',
  '28 Oct',
]
const CHEST_BARS = [3.8, 4.2, 4.4, 0, 3.9, 4.6, 4.1, 3.2, 4.8, 5.1, 4.4, 4.2, 3.6]

function Period() {
  return (
    <ToggleGroup defaultValue={['3m']} aria-label="Period">
      <ToggleGroupItem value="1m">1 M</ToggleGroupItem>
      <ToggleGroupItem value="3m">3 M</ToggleGroupItem>
      <ToggleGroupItem value="1y">1 Y</ToggleGroupItem>
    </ToggleGroup>
  )
}

function ProgressionBar({ view }: { view: 'muscles' | 'exercises' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ToggleGroup defaultValue={[view]} aria-label="Show">
        <ToggleGroupItem value="muscles">Muscles</ToggleGroupItem>
        <ToggleGroupItem value="exercises">Exercises</ToggleGroupItem>
      </ToggleGroup>
      <Period />
    </div>
  )
}

const MUSCLE_ROWS: [string, [string, string, number?][]][] = [
  [
    'Push',
    [
      ['Chest', '×1.8 a week'],
      ['Front delts', '×1.6 a week'],
      ['Lateral delts', '×1.7 a week'],
      ['Triceps', '×1.9 a week', 1],
    ],
  ],
  [
    'Pull',
    [
      ['Lats', '×2.4 a week'],
      ['Traps', '×2.3 a week'],
      ['Rear delts', '×1.4 a week'],
      ['Biceps', '×2.1 a week', 2],
    ],
  ],
]

function MusclesList({ selected }: { selected?: string }) {
  return (
    <Card className="gap-1">
      {MUSCLE_ROWS.map(([cat, rows], i) => (
        <section key={cat} className="flex flex-col">
          <span className={`text-xs font-semibold text-muted-foreground ${i ? 'pt-3' : ''} pb-1`}>
            {cat}
          </span>
          {rows.map(([m, meta, stalled]) => (
            <PanelRow
              key={m}
              selected={selected === m}
              title={m}
              meta={[meta]}
              trailing={stalled ? <Badge variant="warning">{stalled} stalled</Badge> : undefined}
            />
          ))}
        </section>
      ))}
    </Card>
  )
}

type Pill = { name: string; sub?: string; on: boolean; dash?: LineDash }

const PRIMARY: Pill[] = [
  { name: 'Bench press', on: true, dash: 'solid' },
  { name: 'Incline dumbbell press', on: true, dash: 'dash' },
  { name: 'Cable fly', on: true, dash: 'dot' },
  { name: 'Machine chest press', on: false },
]
const SECONDARY: Pill[] = [
  { name: 'Dips', sub: '(0.5)', on: true, dash: 'solid' },
  { name: 'Push-up', sub: '(0.6)', on: false },
  { name: 'Overhead press', sub: '(0.2)', on: false },
  { name: 'Close-grip bench', sub: '(0.5)', on: false },
]

const MUSCLE_LINES: ChartLine[] = [
  {
    id: 'bench',
    label: 'Bench press',
    tone: 'coral',
    dash: 'solid',
    values: [0, 0.7, 1.5, null, 2.5, 3.5, 4.6, 3.8, 6.3, 12.2, 8.4, 9.1, 10.6],
  },
  {
    id: 'incline',
    label: 'Incline dumbbell press',
    tone: 'coral',
    dash: 'dash',
    values: [0, 1.2, null, 2.4, 2.4, 3.6, null, 4.9, 6.1, 6.1, 7.3, 8.5, 8.5],
  },
  {
    id: 'fly',
    label: 'Cable fly',
    tone: 'coral',
    dash: 'dot',
    values: [0, null, 2, 2, 4, null, 4, 6, 6, 6, 6, 6, 6],
  },
  {
    id: 'dips',
    label: 'Dips',
    tone: 'grey',
    dash: 'solid',
    values: [0, 1, 1, 2, null, 2, 3, 3, 4, 4, null, 5, 5],
  },
]

function Pills({ title, pills, tone }: { title: string; pills: Pill[]; tone: 'coral' | 'grey' }) {
  const full = pills.filter((p) => p.on).length >= 3
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-muted-foreground">
        {title} · {pills.filter((p) => p.on).length} of 3 shown
      </span>
      <div className="flex flex-wrap gap-1.5">
        {pills.map((p) => (
          <LinePill
            key={p.name}
            label={p.name}
            sub={p.sub}
            on={p.on}
            tone={tone}
            dash={p.dash}
            disabled={full && !p.on}
          />
        ))}
      </div>
    </div>
  )
}

function MuscleDetail({ phone = false }: { phone?: boolean }) {
  return (
    <>
      <Card className="gap-5">
        {!phone && (
          <PanelHeading title="Chest">
            <span className="text-sm text-muted-foreground">Change in strength · 3 months</span>
          </PanelHeading>
        )}
        <div className="flex flex-col gap-4">
          <Pills title="Primary" pills={PRIMARY} tone="coral" />
          <Pills title="Secondary" pills={SECONDARY} tone="grey" />
        </div>
        <ProgressChart
          weeks={WEEKS}
          unit=" %"
          lines={MUSCLE_LINES}
          bars={CHEST_BARS}
          target={4}
          barsLabel="Chest · stimulus sets a week"
        />
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Stimulus sets" value="4.2" sub="a week, target 4" />
        <StatTile label="Workouts" value="1.8" sub="a week, target 2" />
        <StatTile label="Rising" value="3 of 4" sub="primary exercises" />
      </div>
    </>
  )
}

function ProgressionMuscles() {
  return (
    <GymPage tab="progression">
      <ProgressionBar view="muscles" />
      <ListDetail list={<MusclesList selected="Chest" />} detail={<MuscleDetail />} />
    </GymPage>
  )
}

const LIBRARY: [string, string, boolean?][] = [
  ['Bench press', 'Chest · Mon'],
  ['Cable fly', 'Chest · Mon'],
  ['Cable lateral raise', 'Lateral delts · Mon'],
  ['Chest-supported row', 'Traps · Sat'],
  ['Close-grip bench', 'Triceps · 9 Oct', true],
  ['Incline curl', 'Biceps · Sat', true],
  ['Incline dumbbell press', 'Chest · Mon'],
  ['Lat pulldown', 'Lats · Sat'],
  ['Overhead press', 'Front delts · Mon'],
]

function ExerciseList({ selected, phone = false }: { selected?: string; phone?: boolean }) {
  return (
    <Card className="gap-3">
      <div className="flex items-center gap-2">
        <Search placeholder="Search" />
        <Button variant="ghost" size="icon-sm" aria-label="Filters">
          <SlidersHorizontalIcon />
        </Button>
        <SortMenu
          options={[
            { value: 'az', label: 'A–Z', initial: 'asc' },
            { value: 'last', label: 'Last done', initial: 'desc' },
            { value: 'muscle', label: 'Primary muscle', initial: 'asc' },
          ]}
          value="az"
          direction="asc"
          onChange={nothing}
        />
      </div>
      <div className="flex flex-col">
        {LIBRARY.slice(0, phone ? 7 : 9).map(([n, meta, stalled]) => (
          <PanelRow
            key={n}
            selected={selected === n}
            leading={exerciseTile}
            title={n}
            meta={[meta]}
            trailing={stalled ? <Badge variant="warning">Stalled</Badge> : undefined}
          />
        ))}
      </div>
    </Card>
  )
}

const BEST_SETS: [string, string, string, number, number, string, boolean?][] = [
  ['Mon 28 Oct', 'Push A', '60', 8, 2, '80.0'],
  ['Mon 21 Oct', 'Push A', '60', 8, 1, '78.0'],
  ['Mon 14 Oct', 'Push A', '57.5', 9, 1, '76.7'],
  ['Mon 7 Oct', 'Upper', '65', 6, 1, '80.2', true],
  ['Mon 30 Sep', 'Push A', '57.5', 8, 2, '76.7'],
  ['Mon 23 Sep', 'Push A', '57.5', 8, 1, '74.8'],
  ['Mon 16 Sep', 'Push A', '55', 9, 2, '75.2'],
  ['Mon 9 Sep', 'Push A', '55', 9, 1, '73.3'],
  ['Mon 2 Sep', 'Push A', '55', 8, 2, '73.3'],
  ['Mon 19 Aug', 'Push A', '55', 8, 1, '71.5'],
]

function ExerciseDetail({ phone = false }: { phone?: boolean }) {
  return (
    <>
      <Card className="gap-5">
        {!phone && (
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h2 className="text-h2">Bench press</h2>
              <div className="flex flex-wrap gap-1.5">
                <TypeBadge colour="coral">Chest</TypeBadge>
                <Badge variant="secondary">Triceps (0.4)</Badge>
                <Badge variant="secondary">Front delts (0.3)</Badge>
                <Badge variant="outline">Barbell · 2.5 kg</Badge>
              </div>
            </div>
            {exerciseMenu}
          </div>
        )}
        <ProgressChart
          weeks={WEEKS}
          lines={[
            {
              id: 'best',
              label: 'Best set',
              tone: 'coral',
              dash: 'solid',
              values: [71.5, 72, 73.3, null, 73.3, 73.3, 75.2, 74.8, 76.7, 80.2, 76.7, 78, 80],
              mark: 9,
            },
            {
              id: 'ws',
              label: 'Current',
              tone: 'grey',
              dash: 'dash',
              values: [71.5, 71.5, 71.5, 71.5, 71.5, 71.5, 74.8, 74.8, 74.8, 74.8, 74.8, 78, 78],
            },
          ]}
          bars={CHEST_BARS}
          target={4}
          barsLabel="Chest · stimulus sets a week"
        />
        <ChartKey
          items={[
            { label: 'Best set', tone: 'coral', dash: 'solid' },
            { label: 'Current', tone: 'grey', dash: 'dash' },
          ]}
        />
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Current" value="60 kg × 8" sub="Strength 78.0 at 1 RIR" />
        <StatTile icon={<TrophyIcon />} label="PR" value="65 kg × 6" sub="1 RIR · 80.2 · 7 Oct" />
        <StatTile label="3 months" value="+11.9 %" sub="Rising" />
        <StatTile label="Last done" value="Mon" sub="28 Oct · Push A" />
      </div>
      <Card className="gap-2">
        <PanelHeading title="Best sets" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workout</TableHead>
              <TableHead className="text-right">kg</TableHead>
              <TableHead className="text-right">Reps</TableHead>
              <TableHead className="text-right">RIR</TableHead>
              <TableHead className="text-right">Strength</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BEST_SETS.map(([day, w, kg, reps, rir, s, pr]) => (
              <TableRow key={day}>
                <TableCell>
                  <span className="font-semibold">{day}</span>
                  {!phone && <span className="text-muted-foreground"> · {w}</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{kg}</TableCell>
                <TableCell className="text-right tabular-nums">{reps}</TableCell>
                <TableCell className="text-right tabular-nums">{rir}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {pr && <TrophyIcon aria-label="PR" className="size-3.5 text-tc-text" />}
                    <span className="font-semibold">{s}</span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}

const exerciseMenu = more(
  <>
    <DropdownMenuItem>
      <PencilIcon /> Edit
    </DropdownMenuItem>
    <DropdownMenuItem>
      <ArchiveIcon /> Archive
    </DropdownMenuItem>
  </>,
  'Exercise',
)

function ProgressionExercises() {
  return (
    <GymPage tab="progression" action="New exercise">
      <ProgressionBar view="exercises" />
      <ListDetail list={<ExerciseList selected="Bench press" />} detail={<ExerciseDetail />} />
    </GymPage>
  )
}

function PhoneProgression({ view }: { view: 'muscles' | 'exercises' }) {
  return (
    <GymPage tab="progression" phone action={view === 'exercises' ? 'New exercise' : undefined}>
      <ProgressionBar view={view} />
      {view === 'muscles' ? <MusclesList /> : <ExerciseList phone />}
    </GymPage>
  )
}

function PhoneMuscle() {
  return (
    <SubPage back="Progression" title="Chest" phone>
      <div className="-mt-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Change in strength</span>
        <Period />
      </div>
      <MuscleDetail phone />
    </SubPage>
  )
}

function PhoneExercise() {
  return (
    <SubPage back="Progression" title="Bench press" phone trailing={exerciseMenu}>
      <div className="-mt-2 flex flex-wrap gap-1.5">
        <TypeBadge colour="coral">Chest</TypeBadge>
        <Badge variant="secondary">Triceps (0.4)</Badge>
        <Badge variant="secondary">Front delts (0.3)</Badge>
        <Badge variant="outline">Barbell · 2.5 kg</Badge>
      </div>
      <div className="flex justify-end">
        <Period />
      </div>
      <ExerciseDetail phone />
    </SubPage>
  )
}

/* ---------- New exercise ---------- */

function ExerciseEditor({ phone = false }: { phone?: boolean }) {
  return (
    <>
      {phone ? <PhoneProgression view="exercises" /> : <ProgressionExercises />}
      <Dialog open>
        <DialogContent data-colour="coral" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New exercise</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <Field label="Name">
              <Input defaultValue="Bench press" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Equipment">
                <SmallSelect
                  label="Equipment"
                  value="Barbell"
                  options={['Barbell', 'Dumbbell', 'Cable', 'Machine']}
                />
              </Field>
              <Field label="Primary muscle">
                <SmallSelect
                  label="Primary muscle"
                  value="Chest"
                  options={['Chest', 'Front delts', 'Triceps']}
                />
              </Field>
            </div>
            <Field label="Secondary muscles">
              <div className="flex flex-col gap-1">
                {[
                  ['Triceps', '0.4'],
                  ['Front delts', '0.3'],
                ].map(([m, c]) => (
                  <div key={m} className="flex h-10 items-center gap-2">
                    <span className="flex-1 text-sm font-semibold">{m}</span>
                    <ValueStepper size="sm" label="Contribution" value={c!} />
                    <Button variant="ghost" size="icon-sm" aria-label={`Take ${m} off`}>
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="-ml-2 self-start">
                  <PlusIcon /> Add a muscle
                </Button>
              </div>
            </Field>
            <Field label="Current">
              <div className="flex flex-wrap items-center gap-2">
                <ValueStepper label="Weight" value="60" unit="kg" />
                <span className="text-muted-foreground">×</span>
                <ValueStepper label="Reps" value="8" unit="reps" />
              </div>
            </Field>
            <Field label="Notes">
              <Textarea placeholder="Setup / form notes" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- Settings → Gym ---------- */

function SettingsPage({ phone = false }: { phone?: boolean }) {
  return (
    <Shell page="">
      <PageHeader title="Settings" />
      <Body phone={phone} narrow>
        <Card className="gap-1 px-2 py-3">
          <div className="px-3 pb-2">
            <PanelHeading title="Gym" />
          </div>
          <CardRow icon={<GaugeIcon />} label="Preferred RIR" chevron={false} className="px-3">
            <ValueStepper size="sm" label="Preferred RIR" value="1" />
          </CardRow>
          <CardRow
            icon={<WrenchIcon />}
            label="Equipment"
            value="6"
            render={<button type="button" />}
          />
          <CardRow
            icon={<ActivityIcon />}
            label="Muscle groups"
            value="21"
            render={<button type="button" />}
          />
          <CardRow icon={<RotateCcwIcon />} label="Recovery" render={<button type="button" />} />
          <CardRow
            icon={<ArchiveRestoreIcon />}
            label="Archived exercises"
            value="2"
            render={<button type="button" />}
          />
        </Card>
      </Body>
    </Shell>
  )
}

const SETTINGS_GROUPS: [string, string[]][] = [
  ['Push', ['Chest', 'Front delts', 'Lateral delts', 'Triceps', 'Serratus']],
  ['Pull', ['Lats', 'Traps', 'Rear delts', 'Biceps', 'Brachialis', 'Forearms']],
]

function SettingsMuscles({ phone = false }: { phone?: boolean }) {
  return (
    <Shell page="">
      <PageHeader back={{ label: 'Settings', onClick: nothing }} title="Muscle groups" />
      <Body narrow phone={phone}>
        <div className="flex justify-end">
          <Button variant="outline" size="sm">
            <PlusIcon /> New muscle group
          </Button>
        </div>
        {SETTINGS_GROUPS.map(([cat, muscles]) => (
          <Card key={cat} className="gap-1 px-2 py-3">
            <div className="px-3 pb-2">
              <PanelHeading title={cat} />
            </div>
            {muscles.map((m) => (
              <CardRow
                key={m}
                label={m}
                value={
                  m === 'Lats'
                    ? 'Normal · 2 a week · 5 sets'
                    : m === 'Serratus'
                      ? 'Yours · Fast · 1 a week · 1 set'
                      : 'Normal · 2 a week · 4 sets'
                }
                render={<button type="button" />}
              />
            ))}
          </Card>
        ))}
      </Body>
    </Shell>
  )
}

function MuscleSettings() {
  return (
    <>
      <SettingsMuscles />
      <Dialog open>
        <DialogContent data-colour="coral" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Lats</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Recovers">
              <ToggleGroup
                defaultValue={['normal']}
                aria-label="Recovers"
                className="grid w-full grid-cols-3 self-stretch"
              >
                <ToggleGroupItem value="fast" className="justify-center">
                  Fast
                </ToggleGroupItem>
                <ToggleGroupItem value="normal" className="justify-center">
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem value="slow" className="justify-center">
                  Slow
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <StepperField label="Desired weekly frequency">
              <ValueStepper label="Desired weekly frequency" value="2" />
            </StepperField>
            <StepperField label="Stimulus sets a week">
              <ValueStepper label="Stimulus sets a week" value="5" />
            </StepperField>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SettingsRecovery() {
  return (
    <Shell page="">
      <PageHeader back={{ label: 'Settings', onClick: nothing }} title="Recovery" />
      <Body narrow>
        <Card className="gap-1 px-2 py-3">
          <CardRow label="Points per fatigue set" chevron={false} className="px-3">
            <ValueStepper size="sm" label="Points per fatigue set" value="20" />
          </CardRow>
          <CardRow label="Fast muscles, 50 points in" chevron={false} className="px-3">
            <ValueStepper size="sm" label="Fast" value="30" unit="h" />
          </CardRow>
          <CardRow label="Normal muscles, 50 points in" chevron={false} className="px-3">
            <ValueStepper size="sm" label="Normal" value="42" unit="h" />
          </CardRow>
          <CardRow label="Slow muscles, 50 points in" chevron={false} className="px-3">
            <ValueStepper size="sm" label="Slow" value="60" unit="h" />
          </CardRow>
        </Card>
      </Body>
    </Shell>
  )
}

/* ---------- The screens ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  workouts: () => <Workouts />,
  'workouts-up-next': () => <Workouts upNext />,
  'all-workouts': () => <AllWorkouts />,
  'all-templates': () => <AllTemplates />,
  'new-workout': () => <NewWorkout />,
  session: () => <Session />,
  'log-set': () => <LogSet />,
  'add-exercise': () => <AddExercise />,
  'add-exercise-muscle': () => <AddExercise muscle="Chest" />,
  swap: () => <AddExercise muscle="Rear delts" swap />,
  history: () => <History />,
  end: () => <End />,
  review: () => <Review />,
  'update-current': () => <UpdateCurrent />,
  template: () => <TemplatePage />,
  recovery: () => <Recovery />,
  'recovery-ahead': () => <RecoveryAhead />,
  muscle: () => <Muscle />,
  'progression-muscles': () => <ProgressionMuscles />,
  'progression-exercises': () => <ProgressionExercises />,
  'exercise-new': () => <ExerciseEditor />,
  settings: () => <SettingsPage />,
  'settings-muscles': () => <SettingsMuscles />,
  'muscle-settings': () => <MuscleSettings />,
  'settings-recovery': () => <SettingsRecovery />,
  'm-workouts': () => <Workouts phone />,
  'm-workouts-up-next': () => <Workouts phone upNext />,
  'm-all-workouts': () => <AllWorkouts phone />,
  'm-all-templates': () => <AllTemplates phone />,
  'm-new-workout': () => <NewWorkout phone />,
  'm-session': () => <Session phone />,
  'm-log-set': () => <LogSet phone />,
  'm-log-set-quick': () => <LogSet phone mode="quick" />,
  'm-edit-set': () => <LogSet phone mode="edit" />,
  'm-add-exercise': () => <AddExercise phone />,
  'm-add-exercise-muscle': () => <AddExercise phone muscle="Chest" />,
  'm-history': () => <History phone />,
  'm-end': () => <End phone />,
  'm-review': () => <Review phone />,
  'm-update-current': () => <UpdateCurrent phone />,
  'm-template': () => <TemplatePage phone />,
  'm-recovery': () => <Recovery phone />,
  'm-progression-muscles': () => <PhoneProgression view="muscles" />,
  'm-progression-exercises': () => <PhoneProgression view="exercises" />,
  'm-muscle': () => <PhoneMuscle />,
  'm-exercise': () => <PhoneExercise />,
  'm-exercise-new': () => <ExerciseEditor phone />,
  'm-settings': () => <SettingsPage phone />,
  'm-settings-muscles': () => <SettingsMuscles phone />,
}

function Screens() {
  const { screen = 'workouts' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS.workouts!)()}</>
}
