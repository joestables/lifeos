import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ArrowLeftRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChefHatIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  HistoryIcon,
  InboxIcon,
  ListIcon,
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
  UndoIcon,
  UtensilsIcon,
  WalletIcon,
  WrenchIcon,
  ActivityIcon,
  UndoDotIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  AppShell,
  BodyMap,
  CardRow,
  ChartKey,
  ExerciseBlock,
  ItemRow,
  MuscleReadiness,
  OverallReadiness,
  PageAction,
  PageHeader,
  PickRow,
  ProgressChart,
  ReadinessBar,
  ReadinessScale,
  SectionLabel,
  SetHeads,
  SetRow,
  SideColumns,
  SortMenu,
  StimulusRow,
  TabsRow,
  TemplateExercise,
  TypeBadge,
  TypeScope,
  TypeTile,
  ValueStepper,
  type DrawerPage,
} from '@/components/lifeos'
import { Fab } from '@/components/lifeos/Fab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
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
 * data, for Joe to agree in the design step (Stage 5 plan, step 3). In
 * development and preview builds only, as /design is. `?screen=` chooses
 * the screen.
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

const workout = <TypeTile colour="coral" icon={DumbbellIcon} />
const template = <TypeTile colour="coral" icon={ListIcon} />
const exercise = <TypeTile colour="coral" icon={ActivityIcon} />

type Tab = 'workouts' | 'recovery' | 'progression'

function GymPage({
  tab,
  phone = false,
  action,
  wide = false,
  children,
}: {
  tab: Tab
  phone?: boolean
  action?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader title="Gym" action={action ? { label: action, onClick: nothing } : undefined} />
        <div
          className={`flex flex-col gap-6 px-5 sm:px-9 ${wide ? '' : 'max-w-3xl'} ${phone ? 'pb-28' : 'pb-12'}`}
        >
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
        </div>
        {phone && action && <Fab label={action} />}
      </TypeScope>
    </Shell>
  )
}

/* ---------- Workouts ---------- */

const TEMPLATES = [
  ['Push A', '5 exercises · 15 sets · Last Mon'],
  ['Pull A', '6 exercises · 17 sets · Last Sat'],
  ['Legs', '5 exercises · 14 sets · Last Thu 24 Oct'],
  ['Upper', '7 exercises · 18 sets · Never'],
] as const

const WORKOUTS: [string, string[], string?][] = [
  ['Push A', ['Mon 28 Oct', '1 h 04', '6 exercises', '17 sets', 'Went 4/5']],
  ['Pull A', ['Sat 26 Oct', '58 min', '6 exercises', '16 sets', 'Went 3/5']],
  ['Legs', ['Thu 24 Oct', '1 h 11', '5 exercises', '15 sets', 'Went 5/5']],
  ['Upper', ['Tue 22 Oct'], 'Skipped'],
  ['Push A', ['Mon 21 Oct', '1 h 02', '5 exercises', '15 sets', 'Went 4/5']],
]

function Workouts({ phone = false }: { phone?: boolean }) {
  return (
    <GymPage tab="workouts" phone={phone} action="New workout">
      <section className="flex flex-col gap-1.5">
        <SectionLabel>Today</SectionLabel>
        <ItemRow
          leading={workout}
          title="Pull A"
          meta={['In progress', '42 min', '3 of 6 exercises']}
          trailing={
            <Button variant="outline" size="sm">
              Open
            </Button>
          }
          onOpen={nothing}
        />
        <ItemRow
          leading={workout}
          title="Legs"
          meta={['Planned', 'Thu 31 Oct']}
          menu={more(null)}
          onOpen={nothing}
        />
      </section>
      <section className="flex flex-col gap-1.5">
        <SectionLabel count={TEMPLATES.length}>Templates</SectionLabel>
        {TEMPLATES.map(([name, meta]) => (
          <ItemRow
            key={name}
            leading={template}
            title={name}
            meta={[meta]}
            trailing={
              <Button variant="outline" size="sm">
                Start
              </Button>
            }
            menu={more(
              <>
                <DropdownMenuItem>
                  <CalendarDaysIcon /> Plan for a day…
                </DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </>,
              name,
            )}
            onOpen={nothing}
          />
        ))}
        <Button variant="link" className="self-start pt-1">
          New template
        </Button>
      </section>
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <SectionLabel className="mb-0 flex-1">All workouts</SectionLabel>
          <Button variant="ghost" size="sm">
            <SlidersHorizontalIcon /> Filters
            <Badge variant="secondary">1</Badge>
          </Button>
          <SortMenu
            options={[
              { value: 'date', label: 'Date', initial: 'desc' },
              { value: 'duration', label: 'Duration', initial: 'desc' },
              { value: 'sets', label: 'Sets', initial: 'desc' },
              { value: 'went', label: 'How it went', initial: 'desc' },
              { value: 'motivation', label: 'Motivation', initial: 'desc' },
            ]}
            value="date"
            direction="desc"
            onChange={nothing}
          />
        </div>
        {WORKOUTS.map(([name, meta, badge], i) => (
          <ItemRow
            key={i}
            leading={workout}
            title={name}
            meta={meta}
            trailing={badge && <Badge variant="outline">{badge}</Badge>}
            onOpen={nothing}
          />
        ))}
      </section>
    </GymPage>
  )
}

function NewWorkout() {
  return (
    <>
      <Workouts />
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workout</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Template">
              <SmallSelect
                full
                label="Template"
                value="Legs"
                options={['Empty', 'Push A', 'Pull A', 'Legs', 'Upper']}
              />
            </Field>
            <Field label="Day">
              <SmallSelect
                full
                label="Day"
                value="Today"
                options={['Today', 'Tomorrow', 'Thu 31 Oct']}
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

const exerciseMenu = (begun: boolean) =>
  more(
    <>
      <DropdownMenuItem>
        <HistoryIcon /> Set history
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
    'Exercise',
  )

function Session({ phone = false }: { phone?: boolean }) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader
          back={{ label: 'Workouts', onClick: nothing }}
          eyebrow="In progress · 42 min"
          title="Pull A"
          trailing={<Button size={phone ? 'sm' : 'default'}>End workout</Button>}
        />
        <div className={`flex max-w-3xl flex-col gap-6 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
          <section className="flex flex-col gap-1.5">
            <SectionLabel count={3}>Session</SectionLabel>
            <ExerciseBlock
              name="Lat pulldown"
              meta="Lats · 3 of 3 · Best 65 × 10"
              done
              action={
                <Button variant="ghost" size="sm" aria-label="Undo done">
                  <CheckIcon /> Done
                </Button>
              }
              menu={exerciseMenu(true)}
            />
            <ExerciseBlock
              name="Chest-supported row"
              meta="Traps · 2 of 3 · Best 30 × 10"
              open
              action={
                <Button variant="outline" size="sm">
                  Done
                </Button>
              }
              menu={exerciseMenu(true)}
            >
              <SetHeads />
              <SetRow n={1} weight="30" reps={10} rir={2} logged pr onRemove={nothing} />
              <SetRow n={2} weight="30" reps={9} rir={1} logged onRemove={nothing} />
              <SetRow n={3} weight="30" reps={10} rir={1} onRemove={nothing} />
              <div className="flex items-center gap-2 pt-1">
                <Button variant="ghost" size="sm">
                  <PlusIcon /> Add set
                </Button>
                <span className="flex-1" />
                <Button variant="link" className="text-sm">
                  Last time: 27.5 × 10, 10, 9
                </Button>
              </div>
            </ExerciseBlock>
            <ExerciseBlock
              name="Incline curl"
              meta="Biceps · 1 of 2 · Best 12 × 11"
              action={
                <Button variant="outline" size="sm">
                  Done
                </Button>
              }
              menu={exerciseMenu(true)}
            />
          </section>
          <section className="flex flex-col gap-1.5">
            <SectionLabel count={3}>Backlog</SectionLabel>
            {[
              ['Face pull', 'Rear delts · 3 sets'],
              ['Hammer curl', 'Brachialis · 2 sets'],
              ['Shrug', 'Traps · 2 sets'],
            ].map(([name, meta]) => (
              <ItemRow
                key={name}
                leading={exercise}
                title={name}
                meta={[meta]}
                trailing={
                  <Button variant="outline" size="sm">
                    Begin
                  </Button>
                }
                menu={more(
                  <>
                    <DropdownMenuItem>
                      <HistoryIcon /> Set history
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
              />
            ))}
            <Button variant="outline" size="sm" className="mt-1 self-start">
              <PlusIcon /> Add exercise
            </Button>
          </section>
        </div>
      </TypeScope>
    </Shell>
  )
}

function Swap() {
  return (
    <>
      <Session />
      <Dialog open>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Swap Face pull</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input placeholder="Find an exercise" className="pl-9" aria-label="Find an exercise" />
          </div>
          <div className="flex flex-col">
            <span className="px-1.5 pt-1 pb-1 text-xs font-semibold text-muted-foreground">
              Rear delts
            </span>
            <PickRow
              leading={<TypeTile size="sm" colour="coral" icon={ActivityIcon} />}
              title="Reverse pec deck"
              meta="Machine · 45 × 12"
            />
            <PickRow
              leading={<TypeTile size="sm" colour="coral" icon={ActivityIcon} />}
              title="Cable rear delt fly"
              meta="Cable · 7.5 × 15"
            />
            <PickRow
              leading={<TypeTile size="sm" colour="coral" icon={ActivityIcon} />}
              title="Rear delt raise"
              meta="Dumbbell · 8 × 15"
            />
            <span className="px-1.5 pt-3 pb-1 text-xs font-semibold text-muted-foreground">
              Others
            </span>
            <PickRow
              leading={<TypeTile size="sm" colour="coral" icon={ActivityIcon} />}
              title="Band pull-apart"
              meta="Band"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function OneToFive({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <ToggleGroup defaultValue={[value]} aria-label={label} className="self-start">
        {['1', '2', '3', '4', '5'].map((n) => (
          <ToggleGroupItem key={n} value={n} className="w-10 justify-center tabular-nums">
            {n}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  )
}

function End() {
  return (
    <>
      <Session />
      <Dialog open>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End workout</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <OneToFive label="How it went" value="4" />
            <OneToFive label="Motivation beforehand" value="3" />
            <Field label="Notes">
              <Textarea placeholder="Notes" />
            </Field>
            <span className="text-sm text-muted-foreground">3 in the backlog are left out</span>
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

function History() {
  return (
    <>
      <Session />
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chest-supported row</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {[
              [
                'Sat 26 Oct',
                [
                  ['27.5', 10, 2, false],
                  ['27.5', 10, 1, false],
                  ['27.5', 9, 0, false],
                ],
              ],
              [
                'Thu 17 Oct',
                [
                  ['27.5', 9, 1, false],
                  ['27.5', 8, 1, false],
                ],
              ],
              [
                'Mon 7 Oct',
                [
                  ['30', 8, 0, true],
                  ['25', 10, 1, false],
                ],
              ],
            ].map(([day, sets]) => (
              <section key={day as string} className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{day as string}</span>
                <SetsTable sets={sets as [string, number, number, boolean][]} />
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function epley(w: string, reps: number, rir: number) {
  return (Number(w) * (1 + (reps + rir) / 30)).toFixed(1)
}

function SetsTable({ sets }: { sets: [string, number, number, boolean][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Set</TableHead>
          <TableHead className="text-right">kg</TableHead>
          <TableHead className="text-right">Reps</TableHead>
          <TableHead className="text-right">RIR</TableHead>
          <TableHead className="text-right">Epley</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sets.map(([w, reps, rir, pr], i) => (
          <TableRow key={i}>
            <TableCell className="tabular-nums">
              {i + 1}{' '}
              {pr && (
                <TypeBadge colour="coral" className="ml-1">
                  PR
                </TypeBadge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{w}</TableCell>
            <TableCell className="text-right tabular-nums">{reps}</TableCell>
            <TableCell className="text-right tabular-nums">{rir}</TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">
              {epley(w, reps, rir)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ---------- The review ---------- */

function Review({ phone = false }: { phone?: boolean }) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader
          back={{ label: 'Workouts', onClick: nothing }}
          eyebrow="Done · Sat 26 Oct · 58 min"
          title="Pull A"
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
        />
        <div className={`flex flex-col gap-5 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
          <SideColumns>
            <div className="flex min-w-0 flex-col gap-4">
              <Card className="flex-row flex-wrap gap-x-8 gap-y-2">
                {[
                  ['How it went', '4 / 5'],
                  ['Motivation beforehand', '3 / 5'],
                  ['Sets', '16'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-sm text-muted-foreground">{k}</span>
                    <span className="text-h2 tabular-nums">{v}</span>
                  </div>
                ))}
                <p className="w-full text-sm text-muted-foreground">
                  Grip went on the last row set
                </p>
              </Card>
              <Card className="gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex-1">Chest-supported row</CardTitle>
                  <TypeBadge colour="coral">PR</TypeBadge>
                </div>
                <SetsTable
                  sets={[
                    ['30', 10, 2, true],
                    ['30', 9, 1, false],
                    ['30', 10, 1, false],
                  ]}
                />
                <WorkingSet now={['27.5', 10]} suggest="30 × 10" />
              </Card>
              <Card className="gap-3">
                <CardTitle>Lat pulldown</CardTitle>
                <SetsTable
                  sets={[
                    ['65', 10, 2, false],
                    ['65', 9, 1, false],
                    ['65', 8, 1, false],
                  ]}
                />
                <WorkingSet now={['65', 10]} />
              </Card>
            </div>
            <Card className="gap-2 self-start">
              <CardTitle>Stimulus sets</CardTitle>
              <StimulusRow muscle="Lats" sets={4.6} target={4} />
              <StimulusRow muscle="Traps" sets={3.1} target={4} />
              <StimulusRow muscle="Biceps" sets={3.4} target={4} />
              <StimulusRow muscle="Rear delts" sets={2.2} target={4} />
              <StimulusRow muscle="Brachialis" sets={1.6} target={3} />
              <StimulusRow muscle="Forearms" sets={0.9} target={0} />
            </Card>
          </SideColumns>
        </div>
      </TypeScope>
    </Shell>
  )
}

function WorkingSet({ now, suggest }: { now: [string, number]; suggest?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-control bg-muted/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1 text-sm font-semibold">Working set</span>
        <ValueStepper label="Weight" width="lg" value={`${now[0]} kg`} />
        <ValueStepper label="Reps" value={`× ${now[1]}`} />
      </div>
      {suggest && (
        <div className="flex items-center gap-2 text-sm">
          <span className="flex-1 text-muted-foreground">Beat it with 30 × 10 @ 2</span>
          <Button variant="outline" size="sm">
            Use {suggest}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ---------- A template ---------- */

function TemplatePage({ phone = false }: { phone?: boolean }) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader
          back={{ label: 'Workouts', onClick: nothing }}
          title="Push A"
          trailing={more(
            <>
              <DropdownMenuItem>
                <PencilIcon /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </>,
            'Template',
          )}
        />
        <div className={`flex flex-col gap-5 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
          <SideColumns>
            <section className="flex min-w-0 flex-col gap-1.5">
              <SectionLabel count={4}>Exercises</SectionLabel>
              <TemplateExercise name="Bench press" meta="Chest · Barbell" rirs={[2, 1, 1]} />
              <TemplateExercise name="Overhead press" meta="Front delts · Barbell" rirs={[2, 1]} />
              <TemplateExercise
                name="Cable lateral raise"
                meta="Lateral delts · Cable"
                rirs={[1, 1, 0]}
              />
              <TemplateExercise
                name="Overhead triceps extension"
                meta="Triceps · Cable"
                rirs={[1]}
              />
              <Button variant="outline" size="sm" className="mt-1 self-start">
                <PlusIcon /> Add exercise
              </Button>
            </section>
            <Card className="gap-1 self-start">
              <CardTitle className="pb-2">Coverage</CardTitle>
              <span className="pt-1 text-xs font-semibold text-muted-foreground">Push</span>
              <StimulusRow muscle="Chest" sets={2.6} target={4} />
              <StimulusRow muscle="Front delts" sets={2.5} target={3} />
              <StimulusRow muscle="Lateral delts" sets={2.7} target={4} />
              <StimulusRow muscle="Triceps" sets={2.0} target={4} />
              <span className="pt-2 text-xs font-semibold text-muted-foreground">Core</span>
              <StimulusRow muscle="Abs" sets={0.2} target={3} />
            </Card>
          </SideColumns>
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- Recovery ---------- */

const READINESS: Record<string, number> = {
  Chest: 94,
  'Front delts': 88,
  'Lateral delts': 100,
  Triceps: 97,
  Lats: 41,
  Traps: 56,
  'Rear delts': 63,
  Biceps: 48,
  Brachialis: 72,
  Forearms: 85,
  Abs: 100,
  Obliques: 100,
  Erectors: 80,
  Glutes: 100,
  Quads: 100,
  Hamstrings: 100,
  Adductors: 100,
  Abductors: 100,
  Calves: 100,
  Tibialis: 100,
  Serratus: 90,
}

const CATEGORIES: [string, string[]][] = [
  ['Push', ['Chest', 'Front delts', 'Lateral delts', 'Triceps', 'Serratus']],
  ['Pull', ['Lats', 'Traps', 'Rear delts', 'Biceps', 'Brachialis', 'Forearms']],
  ['Core', ['Abs', 'Obliques', 'Erectors']],
  ['Legs', ['Glutes', 'Quads', 'Hamstrings', 'Adductors', 'Abductors', 'Calves', 'Tibialis']],
]

function Recovery({ phone = false, selected }: { phone?: boolean; selected?: string }) {
  return (
    <GymPage tab="recovery" phone={phone} wide>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="items-stretch gap-4">
          <OverallReadiness percent={82} />
          <BodyMap readiness={READINESS} selected={selected} className="mx-auto w-full max-w-md" />
          <ReadinessScale className="mx-auto w-full max-w-xs" />
        </Card>
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-1.5">
            <SectionLabel>Up next</SectionLabel>
            {[
              ['Legs', 'Quads and glutes 100 % · 1.4 of 4 sets this week'],
              ['Push A', 'Chest 94 % · 2.6 of 4 sets this week'],
              ['Upper', 'Lats 41 %, still recovering'],
            ].map(([name, why], i) => (
              <ItemRow
                key={name}
                leading={template}
                title={`${i + 1}. ${name}`}
                meta={[why]}
                trailing={
                  i === 0 ? (
                    <Button variant="outline" size="sm">
                      Plan for today
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </section>
          <section className="flex flex-col gap-1.5">
            <SectionLabel count={3}>Below target</SectionLabel>
            <Card className="gap-1 py-3">
              <StimulusRow muscle="Quads" meta="1 of 2 workouts" sets={1.4} target={4} />
              <StimulusRow muscle="Hamstrings" meta="1 of 2 workouts" sets={2.2} target={4} />
              <StimulusRow muscle="Calves" meta="0 of 2 workouts" sets={0} target={3} />
            </Card>
          </section>
        </div>
      </div>
      <section className="flex flex-col gap-2">
        <SectionLabel>All muscle groups</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          {CATEGORIES.map(([cat, muscles]) => (
            <Card key={cat} className="gap-1.5 py-4">
              <CardTitle className="pb-1 text-sm text-muted-foreground">{cat}</CardTitle>
              {muscles.map((m) => (
                <MuscleReadiness key={m} muscle={m} percent={READINESS[m] ?? 100} />
              ))}
            </Card>
          ))}
        </div>
      </section>
    </GymPage>
  )
}

function Muscle() {
  return (
    <>
      <Recovery selected="Lats" />
      <Dialog open>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Lats</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <ReadinessBar percent={41} />
            <div className="flex flex-col">
              {[
                ['Last trained', 'Sat 26 Oct'],
                ['Workouts this week', '2 of 2'],
                ['Stimulus sets this week', '7.8 of 4'],
                ['Fully recovered', 'Wed 30 Oct, 21:00'],
                ['Recovers', 'Normal · 42 h'],
              ].map(([k, v]) => (
                <div key={k} className="flex min-h-9 items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline">Progression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------- Progression ---------- */

function Period() {
  return (
    <ToggleGroup defaultValue={['3m']} aria-label="Period">
      <ToggleGroupItem value="1m">1 M</ToggleGroupItem>
      <ToggleGroupItem value="3m">3 M</ToggleGroupItem>
      <ToggleGroupItem value="1y">1 Y</ToggleGroupItem>
    </ToggleGroup>
  )
}

function ProgressionMuscles({ phone = false }: { phone?: boolean }) {
  const rows: Record<string, [string, string, number?][]> = {
    Push: [
      ['Chest', '4.2 a week · 3 of 3 rising'],
      ['Front delts', '2.9 a week · 1 of 2 rising'],
      ['Lateral delts', '3.8 a week · 2 of 2 rising'],
      ['Triceps', '3.1 a week · 1 of 3 rising', 1],
    ],
    Pull: [
      ['Lats', '5.1 a week · 2 of 3 rising'],
      ['Traps', '3.3 a week · 2 of 2 rising'],
      ['Biceps', '3.6 a week · 0 of 2 rising', 2],
    ],
  }
  return (
    <GymPage tab="progression" phone={phone}>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup defaultValue={['muscles']} aria-label="Show">
          <ToggleGroupItem value="muscles">Muscle groups</ToggleGroupItem>
          <ToggleGroupItem value="exercises">Exercises</ToggleGroupItem>
        </ToggleGroup>
        <Period />
      </div>
      {Object.entries(rows).map(([cat, list]) => (
        <section key={cat} className="flex flex-col gap-1.5">
          <SectionLabel>{cat}</SectionLabel>
          {list.map(([m, meta, stalled]) => (
            <ItemRow
              key={m}
              leading={<TypeTile colour="coral" icon={ActivityIcon} />}
              title={m}
              meta={[meta]}
              trailing={stalled ? <Badge variant="warning">{stalled} stalled</Badge> : undefined}
              onOpen={nothing}
            />
          ))}
        </section>
      ))}
    </GymPage>
  )
}

const LIBRARY: [string, string, string?][] = [
  ['Bench press', 'Barbell · Chest · 60 × 8 · PR 65 × 6 · Mon'],
  ['Cable lateral raise', 'Cable · Lateral delts · 7.5 × 12 · Mon'],
  ['Close-grip bench', 'Barbell · Triceps · 50 × 8 · 9 Oct', 'Stalled'],
  ['Incline curl', 'Dumbbell · Biceps · 12 × 10 · Sat', 'Stalled'],
  ['Lat pulldown', 'Cable · Lats · 65 × 10 · Sat'],
  ['Overhead press', 'Barbell · Front delts · 40 × 6 · Mon'],
]

function Library({ phone = false }: { phone?: boolean }) {
  return (
    <GymPage tab="progression" phone={phone} action="New exercise">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup defaultValue={['exercises']} aria-label="Show">
          <ToggleGroupItem value="muscles">Muscle groups</ToggleGroupItem>
          <ToggleGroupItem value="exercises">Exercises</ToggleGroupItem>
        </ToggleGroup>
        <Period />
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input placeholder="Search exercises" className="pl-9" aria-label="Search exercises" />
        </div>
        <Button variant="ghost" size="sm">
          <SlidersHorizontalIcon /> Filters
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
      <section className="flex flex-col gap-1.5">
        {LIBRARY.map(([name, meta, badge]) => (
          <ItemRow
            key={name}
            leading={exercise}
            title={name}
            meta={[meta]}
            trailing={badge && <Badge variant="warning">{badge}</Badge>}
            menu={more(
              <>
                <DropdownMenuItem>
                  <PencilIcon /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ArchiveIcon /> Archive
                </DropdownMenuItem>
              </>,
              name,
            )}
            onOpen={nothing}
          />
        ))}
      </section>
    </GymPage>
  )
}

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

function ExercisePage({ phone = false }: { phone?: boolean }) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader
          back={{ label: 'Progression', onClick: nothing }}
          title="Bench press"
          trailing={more(
            <>
              <DropdownMenuItem>
                <PencilIcon /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArchiveIcon /> Archive
              </DropdownMenuItem>
            </>,
            'Exercise',
          )}
        />
        <div className={`flex flex-col gap-5 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">Barbell · 2.5 kg</Badge>
            <TypeBadge colour="coral">Chest</TypeBadge>
            <Badge variant="secondary">Triceps 0.4</Badge>
            <Badge variant="secondary">Front delts 0.3</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Working set', '60 × 8', '78.0 at RIR 1'],
              ['PR', '65 × 6 @ 1', '80.2 · 7 Oct'],
              ['Goal', '70 × 8', '91.0 at RIR 1'],
              ['3 months', '+6.4 %', 'Rising'],
            ].map(([k, v, sub]) => (
              <Card key={k} className="gap-0.5 p-4">
                <span className="text-sm text-muted-foreground">{k}</span>
                <span className="text-h2 tabular-nums">{v}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{sub}</span>
              </Card>
            ))}
          </div>
          <Card className="gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="flex-1">Epley strength</CardTitle>
              <Period />
            </div>
            <ProgressChart
              weeks={WEEKS}
              lines={[
                {
                  id: 'best',
                  label: 'Best set',
                  style: 'strong',
                  values: [71.5, 72, 72.6, null, 73.3, 74, 74.8, 74.2, 76, 80.2, 77.5, 78, 80],
                  mark: 9,
                },
                {
                  id: 'ws',
                  label: 'Working set',
                  style: 'dash',
                  values: [72, 72, 72, 72, 74.4, 74.4, 74.4, 74.4, 74.7, 74.7, 78, 78, 78],
                },
              ]}
              refs={[{ label: 'Goal 91.0', value: 91 }]}
              bars={[3.8, 4.2, 4.4, 0, 3.9, 4.6, 4.1, 3.2, 4.8, 5.1, 4.4, 4.2, 3.6]}
              target={4}
              barsLabel="Chest · stimulus sets a week"
            />
            <ChartKey
              items={[
                { label: 'Best set', style: 'strong' },
                { label: 'Working set', style: 'dash' },
                { label: 'Goal', style: 'ref' },
                { label: 'Stimulus sets', style: 'bar' },
              ]}
            />
          </Card>
          <Card className="gap-3">
            <CardTitle>History</CardTitle>
            <span className="text-sm font-semibold">Mon 28 Oct · Push A</span>
            <SetsTable
              sets={[
                ['60', 8, 2, false],
                ['60', 8, 1, false],
                ['60', 7, 1, false],
              ]}
            />
            <Button variant="link" className="self-start">
              Show more
            </Button>
          </Card>
        </div>
      </TypeScope>
    </Shell>
  )
}

function MuscleProgress({ phone = false }: { phone?: boolean }) {
  return (
    <Shell>
      <TypeScope colour="coral">
        <PageHeader back={{ label: 'Progression', onClick: nothing }} title="Chest" />
        <div className={`flex flex-col gap-5 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
          <Card className="gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="flex-1">Change in Epley strength</CardTitle>
              <Period />
            </div>
            <ProgressChart
              weeks={WEEKS}
              unit=" %"
              lines={[
                {
                  id: 'bench',
                  label: 'Bench press',
                  style: 'strong',
                  values: [0, 0.7, 1.5, null, 2.5, 3.5, 4.6, 3.8, 6.3, 12.2, 8.4, 9.1, 10.6],
                },
                {
                  id: 'incline',
                  label: 'Incline DB press',
                  style: 'dash',
                  values: [0, 1.2, null, 2.4, 2.4, 3.6, null, 4.9, 6.1, 6.1, 7.3, 8.5, 8.5],
                },
                {
                  id: 'fly',
                  label: 'Cable fly',
                  style: 'dot',
                  values: [0, null, 2, 2, 4, null, 4, 6, 6, 6, 6, 6, 6],
                },
                {
                  id: 'dips',
                  label: 'Dips (secondary 0.5)',
                  style: 'muted',
                  values: [0, 1, 1, 2, null, 2, 3, 3, 4, 4, null, 5, 5],
                },
              ]}
              bars={[3.8, 4.2, 4.4, 0, 3.9, 4.6, 4.1, 3.2, 4.8, 5.1, 4.4, 4.2, 3.6]}
              target={4}
              barsLabel="Stimulus sets a week"
            />
            <ChartKey
              items={[
                { label: 'Bench press', style: 'strong' },
                { label: 'Incline DB press', style: 'dash' },
                { label: 'Cable fly', style: 'dot' },
                { label: 'Dips', style: 'muted' },
                { label: 'Stimulus sets', style: 'bar' },
              ]}
            />
          </Card>
          <section className="flex max-w-3xl flex-col gap-1.5">
            <SectionLabel>Primary</SectionLabel>
            {[
              ['Bench press', '+10.6 % · Rising'],
              ['Incline DB press', '+8.5 % · Rising'],
              ['Cable fly', '+6.0 % · Flat for 5 weeks'],
            ].map(([n, m]) => (
              <ItemRow key={n} leading={exercise} title={n} meta={[m]} onOpen={nothing} />
            ))}
            <SectionLabel className="pt-3">Secondary</SectionLabel>
            {[
              ['Dips', 'Chest 0.5 · +5.0 % · Rising'],
              ['Push-up', 'Chest 0.6 · No sets in 3 months'],
            ].map(([n, m]) => (
              <ItemRow key={n} leading={exercise} title={n} meta={[m]} onOpen={nothing} />
            ))}
          </section>
        </div>
      </TypeScope>
    </Shell>
  )
}

function ExerciseEditor() {
  return (
    <>
      <Library />
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New exercise</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <Input defaultValue="Bench press" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Equipment">
                <SmallSelect
                  full
                  label="Equipment"
                  value="Barbell"
                  options={['Barbell', 'Dumbbell', 'Cable', 'Machine']}
                />
              </Field>
              <Field label="Primary muscle">
                <SmallSelect
                  full
                  label="Primary muscle"
                  value="Chest"
                  options={['Chest', 'Front delts', 'Triceps']}
                />
              </Field>
            </div>
            <Field label="Secondary muscles">
              <div className="flex flex-col gap-1.5">
                {[
                  ['Triceps', '0.4'],
                  ['Front delts', '0.3'],
                ].map(([m, c]) => (
                  <div key={m} className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-semibold">{m}</span>
                    <ValueStepper compact label="Contribution" value={c!} />
                    <Button variant="ghost" size="icon-sm" aria-label={`Take ${m} off`}>
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="self-start">
                  <PlusIcon /> Add a muscle
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Working set">
                <div className="flex flex-wrap gap-1.5">
                  <ValueStepper label="Weight" width="lg" value="60 kg" />
                  <ValueStepper label="Reps" value="× 8" />
                </div>
              </Field>
              <Field label="Goal">
                <div className="flex flex-wrap gap-1.5">
                  <ValueStepper label="Goal weight" width="lg" value="70 kg" />
                  <ValueStepper label="Goal reps" value="× 8" />
                </div>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea placeholder="Notes" defaultValue="Bench at 4, safeties on 3" />
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

function Settings({ phone = false }: { phone?: boolean }) {
  return (
    <Shell page="">
      <PageHeader title="Settings" />
      <div className={`flex max-w-3xl flex-col gap-5 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
        <Card className="gap-1 px-2 py-3">
          <CardTitle className="px-3 pb-2">Gym</CardTitle>
          <CardRow icon={<UndoDotIcon />} label="Preferred RIR" chevron={false}>
            <ValueStepper compact label="Preferred RIR" value="1" />
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
            icon={<ArchiveIcon />}
            label="Archived exercises"
            value="2"
            render={<button type="button" />}
          />
        </Card>
      </div>
    </Shell>
  )
}

function SettingsMuscles({ phone = false }: { phone?: boolean }) {
  return (
    <Shell page="">
      <PageHeader
        back={{ label: 'Settings', onClick: nothing }}
        title="Muscle groups"
        action={phone ? { label: 'New muscle group', onClick: nothing } : undefined}
      />
      <div className={`flex max-w-3xl flex-col gap-5 px-5 sm:px-9 ${phone ? 'pb-28' : 'pb-12'}`}>
        {CATEGORIES.slice(0, 2).map(([cat, muscles]) => (
          <Card key={cat} className="gap-1 px-2 py-3">
            <div className="flex items-center gap-2 px-3 pb-2">
              <CardTitle className="flex-1">{cat}</CardTitle>
              {cat === 'Push' && !phone && (
                <Button variant="outline" size="sm">
                  <PlusIcon /> New
                </Button>
              )}
            </div>
            {muscles.map((m) => (
              <CardRow
                key={m}
                label={m}
                value={m === 'Lats' ? 'Normal · 2 a week · 5 sets' : 'Normal · 2 a week · 4 sets'}
                render={<button type="button" />}
              />
            ))}
          </Card>
        ))}
      </div>
    </Shell>
  )
}

function MuscleSettings() {
  return (
    <>
      <SettingsMuscles />
      <Dialog open>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Lats</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Recovers">
              <ToggleGroup defaultValue={['normal']} aria-label="Recovers" className="self-start">
                <ToggleGroupItem value="fast">Fast</ToggleGroupItem>
                <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
                <ToggleGroupItem value="slow">Slow</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Workouts a week">
                <ValueStepper label="Workouts a week" value="2" />
              </Field>
              <Field label="Stimulus sets a week">
                <ValueStepper label="Stimulus sets a week" value="5" />
              </Field>
            </div>
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
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-12 sm:px-9">
        <Card className="gap-1 px-2 py-3">
          <CardRow label="Points per fatigue set" chevron={false}>
            <ValueStepper compact label="Points per fatigue set" value="20" />
          </CardRow>
          <CardRow label="Fast muscles recover 50 points in" chevron={false}>
            <ValueStepper compact width="lg" label="Fast" value="30 h" />
          </CardRow>
          <CardRow label="Normal muscles" chevron={false}>
            <ValueStepper compact width="lg" label="Normal" value="42 h" />
          </CardRow>
          <CardRow label="Slow muscles" chevron={false}>
            <ValueStepper compact width="lg" label="Slow" value="60 h" />
          </CardRow>
        </Card>
      </div>
    </Shell>
  )
}

/* ---------- The screens ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  workouts: () => <Workouts />,
  'new-workout': () => <NewWorkout />,
  session: () => <Session />,
  swap: () => <Swap />,
  history: () => <History />,
  end: () => <End />,
  review: () => <Review />,
  template: () => <TemplatePage />,
  recovery: () => <Recovery />,
  muscle: () => <Muscle />,
  progression: () => <ProgressionMuscles />,
  library: () => <Library />,
  exercise: () => <ExercisePage />,
  'exercise-new': () => <ExerciseEditor />,
  'muscle-progress': () => <MuscleProgress />,
  settings: () => <Settings />,
  'settings-muscles': () => <SettingsMuscles />,
  'muscle-settings': () => <MuscleSettings />,
  'settings-recovery': () => <SettingsRecovery />,
  'm-workouts': () => <Workouts phone />,
  'm-session': () => <Session phone />,
  'm-review': () => <Review phone />,
  'm-template': () => <TemplatePage phone />,
  'm-recovery': () => <Recovery phone />,
  'm-progression': () => <ProgressionMuscles phone />,
  'm-library': () => <Library phone />,
  'm-exercise': () => <ExercisePage phone />,
  'm-muscle-progress': () => <MuscleProgress phone />,
  'm-settings': () => <Settings phone />,
}

function Screens() {
  const { screen = 'workouts' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS.workouts!)()}</>
}
