import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  AlarmClockIcon,
  BellIcon,
  BellRingIcon,
  CalendarDaysIcon,
  ChefHatIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  ListTodoIcon,
  RepeatIcon,
  ShirtIcon,
  ShoppingCartIcon,
  StarIcon,
  StickyNoteIcon,
  SunIcon,
  TargetIcon,
  Trash2Icon,
  UtensilsIcon,
  WalletIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AddAlertMenu,
  AddToDay,
  AlarmChip,
  AppShell,
  CaptureDialog,
  CardRow,
  DateField,
  Fab,
  FilterChip,
  ItemDialog,
  ItemRow,
  LabelChips,
  NoteCard,
  NoteGrid,
  ParsedTitle,
  PageAction,
  PageHeader,
  PlanCard,
  PlanDay,
  PlanToolbar,
  PlanWeek,
  ReminderDialog,
  ReminderList,
  RepeatField,
  SectionLabel,
  TabsRow,
  TimeField,
  TodayWidget,
  TYPE_ICONS,
  TypeScope,
  TypeTile,
  WeekStrip,
  WhenChip,
  type AddChoice,
  type CaptureLook,
  type DrawerPage,
  type PlanWeekDay,
  type ReminderLine,
  type WidgetCard,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'

/**
 * Stage 7b's designs — Today, Week, Plan, Notes' Thoughts, the Reminder
 * Type and Alerts, and five ways "New" could work — drawn with the real
 * components and made-up data, for Joe to choose and agree (Stage 7b plan,
 * step 3). In development and preview builds only, as /design is.
 * `?screen=` chooses the screen. "Now" is Monday 9 November, 14:20.
 */
export const Route = createFileRoute('/design-stage-7b')({
  beforeLoad: () => {
    if (!__DESIGN_PAGE__) throw notFound()
  },
  validateSearch: (s: Record<string, unknown>): { screen?: string } =>
    typeof s.screen === 'string' ? { screen: s.screen } : {},
  component: Screens,
})

const nothing = () => {}

const TaskIcon = TYPE_ICONS.task!
const EventIcon = TYPE_ICONS.event!
const ThoughtIcon = TYPE_ICONS.thought!
/** The Reminder Type's icon: a ringing bell; an Alert's line keeps the plain bell. */
const ReminderIcon = BellRingIcon

const PAGES = (here: string): DrawerPage[] =>
  [
    { to: '/today', label: 'Today', colour: 'none' as const, icon: SunIcon, count: 13 },
    { to: '/week', label: 'Week', colour: 'none' as const, icon: CalendarDaysIcon },
    { to: '/plan', label: 'Plan', colour: 'blue' as const, icon: ListTodoIcon },
    { to: '/notes', label: 'Notes', colour: 'yellow' as const, icon: StickyNoteIcon },
    { to: '/gym', label: 'Gym', colour: 'coral' as const, icon: DumbbellIcon },
    { to: '/cardio', label: 'Cardio', colour: 'coral' as const, icon: FootprintsIcon },
    { to: '/recipes', label: 'Recipes', colour: 'green' as const, icon: ChefHatIcon },
    { to: '/meal-plan', label: 'Meal plan', colour: 'green' as const, icon: UtensilsIcon },
    { to: '/shopping', label: 'Shopping', colour: 'yellow' as const, icon: ShoppingCartIcon },
    { to: '/goals', label: 'Goals', colour: 'purple' as const, icon: TargetIcon },
    { to: '/wardrobe', label: 'Wardrobe', colour: 'orange' as const, icon: ShirtIcon },
    {
      to: '/finance',
      label: 'Finance',
      colour: 'none' as const,
      icon: WalletIcon,
      later: true,
    },
  ].map((p) => (p.label === here ? { ...p, to: '/design-stage-7b' } : p))

function Shell({
  here,
  look = 'ghost',
  children,
}: {
  here: string
  look?: CaptureLook
  children: ReactNode
}) {
  return (
    <AppShell
      captureLook={look}
      pages={PAGES(here)}
      me={{ name: 'Joe Stables', space: 'Personal' }}
      sync={{ pending: 0, failed: 0 }}
      onCapture={nothing}
      onSearch={nothing}
    >
      {children}
    </AppShell>
  )
}

/* ---------- Small parts ---------- */

const menu = (title: string, items: ReactNode) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={<Button variant="ghost" size="icon-sm" aria-label={`${title} options`} />}
    >
      <EllipsisIcon />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-48">
      {items}
    </DropdownMenuContent>
  </DropdownMenu>
)

const convertMenu = (title: string, to: ('task' | 'event' | 'reminder')[]) =>
  menu(
    title,
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Convert to</DropdownMenuLabel>
        {to.includes('task') && (
          <DropdownMenuItem>
            <TaskIcon /> Task
          </DropdownMenuItem>
        )}
        {to.includes('event') && (
          <DropdownMenuItem>
            <EventIcon /> Event
          </DropdownMenuItem>
        )}
        {to.includes('reminder') && (
          <DropdownMenuItem>
            <ReminderIcon /> Reminder
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <Trash2Icon /> Delete
      </DropdownMenuItem>
    </>,
  )

/** A muted icon and words, inside a row's meta line. */
function Bit({ icon: Icon, children }: { icon: typeof BellIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  )
}

/** A Reminder's alert times on a day: the bell, or the alarm clock for an Alarm. */
const alertTimes = (times: { at: string; alarm?: boolean }[]) =>
  times.map((t) => (
    <Bit key={t.at} icon={t.alarm ? AlarmClockIcon : BellIcon}>
      {t.at}
    </Bit>
  ))

const repeats = (words: string) => <Bit icon={RepeatIcon}>{words}</Bit>

function TaskLine({
  title,
  meta = [],
  done = false,
  starred = false,
}: {
  title: string
  meta?: ReactNode[]
  done?: boolean
  starred?: boolean
}) {
  return (
    <ItemRow
      leading={<Checkbox colour="blue" aria-label={`Done: ${title}`} defaultChecked={done} />}
      title={title}
      meta={meta}
      done={done}
      onOpen={nothing}
      actions={
        !done && (
          <>
            <Button variant="outline" size="sm">
              Tomorrow
            </Button>
            <Toggle data-colour="blue" aria-label="Star" defaultPressed={starred}>
              <StarIcon />
            </Toggle>
          </>
        )
      }
      menu={convertMenu(title, ['event', 'reminder'])}
    />
  )
}

function ReminderLineRow({
  title,
  times,
  meta = [],
  past = false,
}: {
  title: string
  times: { at: string; alarm?: boolean }[]
  meta?: ReactNode[]
  past?: boolean
}) {
  return (
    <ItemRow
      leading={<TypeTile colour="blue" icon={ReminderIcon} />}
      title={title}
      meta={[...alertTimes(times), ...meta]}
      past={past}
      onOpen={nothing}
      menu={convertMenu(title, ['task', 'event'])}
    />
  )
}

function TileLine({
  colour,
  icon,
  title,
  meta,
  past = false,
  done = false,
}: {
  colour: 'blue' | 'green' | 'coral' | 'yellow'
  icon: typeof BellIcon
  title: string
  meta: ReactNode[]
  past?: boolean
  done?: boolean
}) {
  return (
    <ItemRow
      leading={<TypeTile colour={colour} icon={icon} />}
      title={title}
      meta={meta}
      past={past}
      done={done}
      onOpen={nothing}
    />
  )
}

function Group({
  label,
  count,
  danger,
  children,
}: {
  label: string
  count?: number
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section>
      <SectionLabel count={count} danger={danger}>
        {label}
      </SectionLabel>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

/** The quiet line at the foot of Today: how many Thoughts wait, never which. */
function ThoughtsToSort({ count }: { count: number }) {
  return (
    <CardRow
      render={<a href="/design-stage-7b?screen=notes-thoughts" />}
      icon={<TypeTile colour="yellow" icon={ThoughtIcon} size="sm" />}
      label={`${count} thoughts to sort`}
      className="text-muted-foreground"
    />
  )
}

/* ---------- Today ---------- */

function TodayList() {
  return (
    <>
      <Group label="Overdue" count={1} danger>
        <TaskLine
          title="Send passport photos"
          meta={[<span className="text-destructive">Due Fri 6 Nov</span>]}
        />
      </Group>
      <Group label="Anytime">
        <TileLine colour="coral" icon={DumbbellIcon} title="Push" meta={['Workout']} />
        <TaskLine title="Pick up dry cleaning" />
        <TaskLine title="Renew car insurance" done />
      </Group>
      <Group label="Morning">
        <TileLine
          colour="green"
          icon={UtensilsIcon}
          title="Overnight oats"
          meta={['Breakfast']}
          past
        />
        <ReminderLineRow
          title="Take vitamins"
          times={[{ at: '08:00' }]}
          meta={[repeats('Daily')]}
          past
        />
        <TileLine
          colour="blue"
          icon={EventIcon}
          title="Stand-up"
          meta={['09:30–09:45', 'Zoom']}
          past
        />
      </Group>
      <Group label="Afternoon">
        <TileLine
          colour="blue"
          icon={EventIcon}
          title="Dentist"
          meta={['13:30–14:00', 'Smile Clinic']}
          past
        />
        <ReminderLineRow
          title="Move the car before 16:00"
          times={[{ at: '15:00' }, { at: '15:40', alarm: true }]}
        />
      </Group>
      <Group label="Evening">
        <TileLine colour="green" icon={UtensilsIcon} title="Thai green curry" meta={['Dinner']} />
        <TaskLine title="Call mum" meta={['18:00']} starred />
        <ReminderLineRow title="Bins out" times={[{ at: '19:00' }]} meta={[repeats('Weekly')]} />
        <TileLine
          colour="blue"
          icon={EventIcon}
          title="5-a-side"
          meta={['20:00–21:00', 'Goals, Wembley']}
        />
      </Group>
    </>
  )
}

function Today({ empty = false, look }: { empty?: boolean; look?: CaptureLook }) {
  return (
    <Shell here="Today" look={look}>
      <PageHeader title="Today" eyebrow="Monday 9 November" />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        {empty ? (
          <div className="flex flex-col items-center gap-3.5 py-16">
            <TypeTile colour="none" icon={SunIcon} size="lg" />
            <h2 className="text-h2">Nothing today</h2>
          </div>
        ) : (
          <TodayList />
        )}
        <ThoughtsToSort count={5} />
      </div>
    </Shell>
  )
}

/* ---------- Week (was Plan) ---------- */

const ADD: AddChoice[] = [
  { key: 'task', label: 'Task', colour: 'blue', icon: TaskIcon },
  { key: 'event', label: 'Event', colour: 'blue', icon: EventIcon },
  { key: 'reminder', label: 'Reminder', colour: 'blue', icon: ReminderIcon },
  { key: 'meal', label: 'Meal', colour: 'green', icon: UtensilsIcon },
  { key: 'shopping', label: 'Shopping list', colour: 'yellow', icon: ShoppingCartIcon },
  { key: 'workout', label: 'Workout', colour: 'coral', icon: DumbbellIcon },
]

const R = (title: string, time: string, past = false) => (
  <PlanCard
    colour="blue"
    icon={ReminderIcon}
    type="Reminder"
    title={title}
    time={time}
    past={past}
  />
)
const T = (title: string, time?: string, opts: { done?: boolean; detail?: string } = {}) => (
  <PlanCard colour="blue" icon={TaskIcon} type="Task" title={title} time={time} {...opts} />
)
const E = (title: string, time: string, detail?: string, past = false) => (
  <PlanCard
    colour="blue"
    icon={EventIcon}
    type="Event"
    title={title}
    time={time}
    detail={detail}
    past={past}
  />
)
const M = (slot: string, title: string, past = false) => (
  <PlanCard colour="green" icon={UtensilsIcon} type={slot} title={title} past={past} />
)
const W = (title: string, done = false) => (
  <PlanCard colour="coral" icon={DumbbellIcon} type="Workout" title={title} done={done} />
)

function weekDays(add?: string): PlanWeekDay[] {
  const plus = (day: string, key: string) => (
    <AddToDay day={day} choices={ADD} onChoose={nothing} open={add === key ? true : undefined} />
  )
  return [
    {
      key: 'mon',
      name: 'Mon',
      number: 9,
      today: true,
      add: plus('Today', 'mon'),
      children: (
        <>
          {W('Push')}
          {M('Dinner', 'Thai green curry')}
          {T('Renew car insurance', undefined, { done: true })}
          {R('Take vitamins', '08:00', true)}
          {E('Dentist', '13:30–14:00', 'Smile Clinic', true)}
          {R('Move the car', '15:00, 15:40')}
          {T('Call mum', '18:00')}
          {R('Bins out', '19:00')}
        </>
      ),
    },
    {
      key: 'tue',
      name: 'Tue',
      number: 10,
      add: plus('Tue 10 Nov', 'tue'),
      children: (
        <>
          {M('Dinner', 'Miso salmon traybake')}
          {R('Take vitamins', '08:00')}
          {E('Haircut', '12:30', 'Ruffians')}
        </>
      ),
    },
    {
      key: 'wed',
      name: 'Wed',
      number: 11,
      add: plus('Wed 11 Nov', 'wed'),
      children: (
        <>
          {W('Pull')}
          {R('Take vitamins', '08:00')}
          {T('Book Japan flights', undefined, { detail: 'Due Fri' })}
          {R('Ring the garage', '10:00')}
        </>
      ),
    },
    {
      key: 'thu',
      name: 'Thu',
      number: 12,
      add: plus('Thu 12 Nov', 'thu'),
      children: (
        <>
          {E('Annual leave', 'All day')}
          {R('Take vitamins', '08:00')}
          {R('Parcel arriving', '09:00, 12:00')}
        </>
      ),
    },
    {
      key: 'fri',
      name: 'Fri',
      number: 13,
      add: plus('Fri 13 Nov', 'fri'),
      children: (
        <>
          {E('Annual leave', 'All day')}
          {M('Dinner', 'Leftovers')}
          {R('Take vitamins', '08:00')}
          {E('Leaving drinks for Priya', '18:00', 'The Crown')}
        </>
      ),
    },
    {
      key: 'sat',
      name: 'Sat',
      number: 14,
      add: plus('Sat 14 Nov', 'sat'),
      children: (
        <>
          <PlanCard
            colour="yellow"
            icon={ShoppingCartIcon}
            type="Shopping list"
            title="Food shop"
          />
          {W('Legs')}
          {E("Mum's birthday lunch", '13:00', 'The Ivy, Richmond')}
        </>
      ),
    },
    {
      key: 'sun',
      name: 'Sun',
      number: 15,
      add: plus('Sun 15 Nov', 'sun'),
      children: (
        <>
          {R('Take vitamins', '08:00')}
          {R('Water the plants', '10:00')}
        </>
      ),
    },
  ]
}

function WeekFilters() {
  const [on, setOn] = useState<Record<string, boolean>>({})
  const chip = (key: string, label: string, colour: 'blue' | 'green' | 'yellow' | 'coral') => (
    <FilterChip
      colour={colour}
      pressed={on[key] ?? true}
      onPressedChange={(p) => setOn((o) => ({ ...o, [key]: p }))}
    >
      {label}
    </FilterChip>
  )
  return (
    <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Show on Week">
      {chip('task', 'Tasks', 'blue')}
      {chip('event', 'Events', 'blue')}
      {chip('reminder', 'Reminders', 'blue')}
      {chip('meal', 'Meals', 'green')}
      {chip('shopping', 'Shopping', 'yellow')}
      {chip('workout', 'Workouts', 'coral')}
    </div>
  )
}

function Week({ add }: { add?: string }) {
  return (
    <Shell here="Week">
      <PageHeader title="Week" />
      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        <PlanToolbar
          title="9 – 15 November"
          layout="week"
          onLayout={nothing}
          onToday={nothing}
          onPrevious={nothing}
          onNext={nothing}
          step="week"
          action={<PageAction label="Add" onClick={nothing} />}
        />
        <WeekFilters />
        <PlanWeek days={weekDays(add)} />
      </div>
    </Shell>
  )
}

const STRIP = [
  { key: 'mon', name: 'Mon', number: 9, today: true, dots: ['coral', 'green', 'blue'] },
  { key: 'tue', name: 'Tue', number: 10, dots: ['green', 'blue'] },
  { key: 'wed', name: 'Wed', number: 11, dots: ['coral', 'blue'] },
  { key: 'thu', name: 'Thu', number: 12, dots: ['blue'] },
  { key: 'fri', name: 'Fri', number: 13, dots: ['green', 'blue'] },
  { key: 'sat', name: 'Sat', number: 14, dots: ['yellow', 'coral', 'blue'] },
  { key: 'sun', name: 'Sun', number: 15, dots: ['blue'] },
] as const

function PhoneWeek({ adding = false }: { adding?: boolean }) {
  const [chosen, setChosen] = useState('mon')
  const w = (node: ReactNode) => node
  return (
    <Shell here="Week">
      <PageHeader title="Week" />
      <div className="flex flex-col gap-3 px-5 pb-28">
        <PlanToolbar
          title="Mon 9 November"
          layout="day"
          onLayout={nothing}
          onToday={nothing}
          onPrevious={nothing}
          onNext={nothing}
          step="week"
        />
        <WeekStrip
          days={STRIP.map((d) => ({ ...d, dots: [...d.dots] }))}
          chosen={chosen}
          onChoose={setChosen}
        />
        <WeekFilters />
        <PlanDay>
          {w(<PlanCard wide colour="coral" icon={DumbbellIcon} type="Workout" title="Push" />)}
          <PlanCard
            wide
            colour="green"
            icon={UtensilsIcon}
            type="Dinner"
            title="Thai green curry"
          />
          <PlanCard
            wide
            colour="blue"
            icon={TaskIcon}
            type="Task"
            title="Renew car insurance"
            done
          />
          <PlanCard
            wide
            colour="blue"
            icon={ReminderIcon}
            type="Reminder"
            title="Take vitamins"
            time="08:00"
            past
          />
          <PlanCard
            wide
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Dentist"
            time="13:30–14:00"
            detail="Smile Clinic"
            past
          />
          <PlanCard
            wide
            colour="blue"
            icon={ReminderIcon}
            type="Reminder"
            title="Move the car"
            time="15:00, 15:40"
          />
          <PlanCard wide colour="blue" icon={TaskIcon} type="Task" title="Call mum" time="18:00" />
          <PlanCard
            wide
            colour="blue"
            icon={ReminderIcon}
            type="Reminder"
            title="Bins out"
            time="19:00"
          />
        </PlanDay>
      </div>
      <AddToDay
        day="Mon 9 Nov"
        choices={ADD}
        onChoose={nothing}
        open={adding ? true : undefined}
        side="top"
        trigger={<Fab label="Add" />}
      />
    </Shell>
  )
}

/* ---------- Plan (was Tasks): Tasks, Events, Reminders, Recurring ---------- */

type PlanTab = 'tasks' | 'events' | 'reminders' | 'recurring'
const TABS: { value: PlanTab; label: string; action: string }[] = [
  { value: 'tasks', label: 'Tasks', action: 'New task' },
  { value: 'events', label: 'Events', action: 'New event' },
  { value: 'reminders', label: 'Reminders', action: 'New reminder' },
  { value: 'recurring', label: 'Recurring', action: 'New' },
]

function PlanTasks() {
  return (
    <>
      <Group label="Overdue" count={1} danger>
        <TaskLine
          title="Send passport photos"
          meta={[<span className="text-destructive">Due Fri 6 Nov</span>]}
        />
      </Group>
      <Group label="Today" count={3}>
        <TaskLine title="Pick up dry cleaning" />
        <TaskLine title="Call mum" meta={['18:00']} starred />
        <TaskLine title="Renew car insurance" done />
      </Group>
      <Group label="Tomorrow" count={1}>
        <TaskLine title="Order Sarah's present" meta={['Due Fri 13 Nov']} />
      </Group>
      <Group label="Wednesday" count={2}>
        <TaskLine title="Book Japan flights" meta={['Due Fri 13 Nov']} starred />
        <TaskLine title="Clean the bathroom" meta={[repeats('Every 2 weeks')]} />
      </Group>
      <Group label="Later" count={2}>
        <TaskLine title="Service the boiler" meta={['Tue 24 Nov']} />
        <TaskLine title="Renew the TV licence" meta={['Tue 1 Dec', 'Due Mon 7 Dec']} />
      </Group>
      <Group label="No date" count={1}>
        <TaskLine title="Fix the shed door" />
      </Group>
      <Group label="Someday" count={1}>
        <TaskLine title="Learn to make sourdough" />
      </Group>
    </>
  )
}

function PlanEvents() {
  const ev = (title: string, meta: ReactNode[], past = false) => (
    <TileLine colour="blue" icon={EventIcon} title={title} meta={meta} past={past} />
  )
  return (
    <>
      <Group label="Today" count={3}>
        {ev('Dentist', ['13:30–14:00', 'Smile Clinic'], true)}
        {ev('5-a-side', ['20:00–21:00', 'Goals, Wembley', repeats('Weekly')])}
      </Group>
      <Group label="Tomorrow" count={1}>
        {ev('Haircut', ['12:30–13:15', 'Ruffians'])}
      </Group>
      <Group label="Thursday" count={1}>
        {ev('Annual leave', ['All day', 'Until Fri'])}
      </Group>
      <Group label="Friday" count={1}>
        {ev('Leaving drinks for Priya', ['18:00', 'The Crown'])}
      </Group>
      <Group label="Saturday" count={1}>
        {ev("Mum's birthday lunch", ['13:00', 'The Ivy, Richmond'])}
      </Group>
      <Group label="Later" count={2}>
        {ev('Edinburgh', ['Fri 20 Nov', 'All day', 'Until Sun'])}
        {ev('Christmas party', ['Fri 11 Dec', '19:00', 'Shoreditch'])}
      </Group>
    </>
  )
}

function PlanReminders() {
  return (
    <>
      <Group label="Today" count={3}>
        <ReminderLineRow
          title="Take vitamins"
          times={[{ at: '08:00' }]}
          meta={[repeats('Daily')]}
          past
        />
        <ReminderLineRow
          title="Move the car before 16:00"
          times={[{ at: '15:00' }, { at: '15:40', alarm: true }]}
        />
        <ReminderLineRow title="Bins out" times={[{ at: '19:00' }]} meta={[repeats('Weekly')]} />
      </Group>
      <Group label="Wednesday" count={1}>
        <ReminderLineRow title="Ring the garage" times={[{ at: '10:00' }]} />
      </Group>
      <Group label="Thursday" count={1}>
        <ReminderLineRow title="Parcel arriving" times={[{ at: '09:00' }, { at: '12:00' }]} />
      </Group>
      <Group label="Sunday" count={1}>
        <ReminderLineRow
          title="Water the plants"
          times={[{ at: '10:00' }]}
          meta={[repeats('Weekly')]}
        />
      </Group>
      <Group label="Later" count={2}>
        <ReminderLineRow
          title="Check the tyre pressure"
          times={[{ at: '09:00' }]}
          meta={['Sat 21 Nov']}
        />
        <ReminderLineRow
          title="Wake up for the airport"
          times={[{ at: '04:30', alarm: true }]}
          meta={['Fri 20 Nov']}
        />
      </Group>
    </>
  )
}

function PlanRecurring() {
  return (
    <>
      <Group label="Tasks" count={2}>
        <TaskLine title="Clean the bathroom" meta={[repeats('Every 2 weeks'), 'Next Wed 11 Nov']} />
        <TaskLine
          title="Change the bed"
          meta={[repeats('1 week after it’s done'), 'Next Sat 14 Nov']}
        />
      </Group>
      <Group label="Events" count={1}>
        <TileLine
          colour="blue"
          icon={EventIcon}
          title="5-a-side"
          meta={[repeats('Every Monday'), 'Next today, 20:00']}
        />
      </Group>
      <Group label="Reminders" count={3}>
        <ReminderLineRow
          title="Take vitamins"
          times={[{ at: '08:00' }]}
          meta={[repeats('Every day'), 'Next tomorrow']}
        />
        <ReminderLineRow
          title="Bins out"
          times={[{ at: '19:00' }]}
          meta={[repeats('Every Monday'), 'Next today']}
        />
        <ReminderLineRow
          title="Water the plants"
          times={[{ at: '10:00' }]}
          meta={[repeats('Every Sunday'), 'Next Sun 15 Nov']}
        />
      </Group>
    </>
  )
}

function Plan({ tab, children }: { tab: PlanTab; children?: ReactNode }) {
  const t = TABS.find((x) => x.value === tab)!
  return (
    <Shell here="Plan">
      <TypeScope colour="blue">
        <PageHeader title="Plan" action={{ label: t.action, onClick: nothing }} />
        <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
          <TabsRow>
            <Tabs value={tab}>
              <TabsList aria-label="View">
                {TABS.map((v) => (
                  <TabsTrigger key={v.value} value={v.value}>
                    {v.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <PageAction label={t.action} onClick={nothing} />
          </TabsRow>
          {tab === 'tasks' && <PlanTasks />}
          {tab === 'events' && <PlanEvents />}
          {tab === 'reminders' && <PlanReminders />}
          {tab === 'recurring' && <PlanRecurring />}
        </div>
        {children}
      </TypeScope>
    </Shell>
  )
}

/* ---------- A Task, an Alert, a Reminder ---------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Alerts({ lines }: { lines: ReminderLine[] }) {
  return (
    <ReminderList
      noun="alert"
      reminders={lines}
      onOpen={nothing}
      onRemove={nothing}
      onAdd={nothing}
    />
  )
}

/** New task, from Plan's Tasks: do-on today to start, its alert an hour from now. */
function NewTask() {
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="blue"
      icon={TaskIcon}
      typeLabel="New task"
      title="New task"
      standard
      titleField={
        <input
          aria-label="Title"
          placeholder="Title"
          defaultValue="Book the MOT"
          className="min-w-0 bg-transparent pt-1 text-day outline-none placeholder:text-muted-foreground"
        />
      }
      footer={
        <>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </>
      }
    >
      <Textarea aria-label="Notes" placeholder="Notes" className="min-h-16" />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <Field label="Do on">
          <DateField value="2026-11-09" onChange={nothing} />
        </Field>
        <Field label="Time">
          <TimeField none value="" onChange={nothing} />
        </Field>
        <Field label="Due">
          <DateField value={null} onChange={nothing} />
        </Field>
        <Field label="Repeat">
          <RepeatField value={null} startsOn="2026-11-09" onChange={nothing} />
        </Field>
      </div>
      <Field label="Alerts">
        <Alerts lines={[{ id: '1', when: 'Today 15:20', says: 'In an hour' }]} />
      </Field>
    </ItemDialog>
  )
}

/** A Reminder opened: its title, its Alerts and its Repeat. Nothing else. */
function OpenReminder({ alert = false }: { alert?: boolean }) {
  return (
    <>
      <ItemDialog
        open
        onOpenChange={nothing}
        colour="blue"
        icon={ReminderIcon}
        typeLabel="Reminder"
        title="Move the car before 16:00"
        actions={convertMenu('Move the car before 16:00', ['task', 'event'])}
      >
        <Field label="Alerts">
          <Alerts
            lines={[
              { id: '1', when: 'Today 15:00', says: '' },
              { id: '2', when: 'Today 15:40', says: 'Alarm', alarm: true },
            ]}
          />
        </Field>
        <Field label="Repeat">
          <RepeatField value={null} startsOn="2026-11-09" onChange={nothing} />
        </Field>
      </ItemDialog>
      {alert && (
        <ReminderDialog
          title="Alert"
          value={{ kind: 'fixed', day: '2026-11-09', time: '15:40', alarm: true }}
          anchors={[]}
          onSave={nothing}
          onClose={nothing}
        />
      )}
    </>
  )
}

/** A new Reminder (Week's "+", Plan's New reminder, option C): one alert, an hour from now. */
function NewReminder({ title = '' }: { title?: string }) {
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="blue"
      icon={ReminderIcon}
      typeLabel="New reminder"
      title="New reminder"
      titleField={
        <input
          aria-label="Title"
          placeholder="Title"
          defaultValue={title}
          className="min-w-0 bg-transparent pt-1 text-day outline-none placeholder:text-muted-foreground"
        />
      }
      footer={
        <>
          <Button variant="outline">Cancel</Button>
          <Button disabled={!title}>Save</Button>
        </>
      }
    >
      <Field label="Alerts">
        <Alerts lines={[{ id: '1', when: 'Today 15:20', says: 'In an hour' }]} />
      </Field>
      <Field label="Repeat">
        <RepeatField value={null} startsOn="2026-11-09" onChange={nothing} />
      </Field>
    </ItemDialog>
  )
}

/* ---------- Notes: Notes and Thoughts ---------- */

const LABELS = [
  { id: 'home', name: 'Home' },
  { id: 'ideas', name: 'Ideas' },
  { id: 'japan', name: 'Japan' },
  { id: 'work', name: 'Work' },
]

function ThoughtLine({ title, meta }: { title: string; meta: ReactNode[] }) {
  return (
    <ItemRow
      leading={<Checkbox colour="yellow" aria-label={`Done: ${title}`} />}
      title={title}
      meta={meta}
      onOpen={nothing}
      actions={
        <>
          <Button variant="outline" size="sm">
            <ReminderIcon data-colour="blue" className="text-tc-text" /> Reminder
          </Button>
          <Button variant="outline" size="sm">
            <TaskIcon data-colour="blue" className="text-tc-text" /> Task
          </Button>
          <Button variant="outline" size="sm">
            <StickyNoteIcon data-colour="yellow" className="text-tc-text" /> Note
          </Button>
        </>
      }
      menu={menu(
        title,
        <>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Convert to</DropdownMenuLabel>
            <DropdownMenuItem>
              <ReminderIcon /> Reminder
            </DropdownMenuItem>
            <DropdownMenuItem>
              <TaskIcon /> Task
            </DropdownMenuItem>
            <DropdownMenuItem>
              <EventIcon /> Event
            </DropdownMenuItem>
            <DropdownMenuItem>
              <StickyNoteIcon /> Note
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ChefHatIcon /> Recipe idea
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </>,
      )}
    />
  )
}

function Notes({ tab }: { tab: 'notes' | 'thoughts' }) {
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const action = tab === 'notes' ? 'New note' : 'New thought'
  return (
    <Shell here="Notes">
      <TypeScope colour="yellow">
        <PageHeader title="Notes" action={{ label: action, onClick: nothing }} />
        <div className="flex flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
          <div className="flex flex-col gap-3">
            <TabsRow>
              <Tabs value={tab}>
                <TabsList aria-label="View">
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="thoughts">Thoughts</TabsTrigger>
                </TabsList>
              </Tabs>
              <PageAction label={action} onClick={nothing} />
            </TabsRow>
            <LabelChips
              labels={LABELS}
              chosen={chosen}
              onChange={(ids) => setChosen(new Set(ids))}
            />
          </div>
          {tab === 'notes' ? (
            <>
              <section>
                <SectionLabel>Pinned</SectionLabel>
                <NoteGrid>
                  <NoteCard
                    title="Japan itinerary"
                    body={'Tokyo 4 nights, then Kyoto.\n- Book the ryokan\n- JR pass?'}
                    labels={['Japan']}
                    onOpen={nothing}
                  />
                  <NoteCard
                    title="Wifi and alarm codes"
                    body={'Router on the landing. Codes in 1Password.'}
                    labels={['Home']}
                    onOpen={nothing}
                  />
                </NoteGrid>
              </section>
              <section>
                <SectionLabel>Others</SectionLabel>
                <NoteGrid>
                  <NoteCard
                    title="Gift ideas"
                    body={'Mum: ceramics class\nSarah: the green Le Creuset'}
                    labels={['Ideas']}
                    onOpen={nothing}
                  />
                  <NoteCard
                    title="1:1 with Priya"
                    body={'Roadmap for Q1, hiring, the offsite.'}
                    labels={['Work']}
                    onOpen={nothing}
                  />
                  <NoteCard
                    title="Boiler"
                    body={'Worcester Bosch 30i. Last serviced Nov 2025.'}
                    labels={['Home']}
                    onOpen={nothing}
                  />
                </NoteGrid>
              </section>
            </>
          ) : (
            <div className="flex max-w-3xl flex-col gap-1.5">
              <ThoughtLine
                title="Ceramics class for the anniversary?"
                meta={['2 hours ago', 'Ideas']}
              />
              <ThoughtLine title="That podcast Sam mentioned about sleep" meta={['Yesterday']} />
              <ThoughtLine title="Look at standing desks" meta={['Sat', 'Home']} />
              <ThoughtLine title="Ask Priya about the offsite dates" meta={['Fri', 'Work']} />
              <ThoughtLine title="Ramen place near Shibuya station" meta={['Thu', 'Japan']} />
            </div>
          )}
        </div>
      </TypeScope>
    </Shell>
  )
}

/* ---------- "New": A, refined ---------- */

/** Reminder first: "New" opens on it. */
const REMINDER_AND_THOUGHT = [
  { key: 'reminder', label: 'Reminder', colour: 'blue' as const, icon: ReminderIcon },
  { key: 'thought', label: 'Thought', colour: 'yellow' as const, icon: ThoughtIcon },
]

const QUICK = [
  { label: 'In an hour', when: '15:20' },
  { label: 'This evening', when: '18:00' },
  { label: 'Tomorrow morning', when: 'Tue 09:00' },
  { label: 'This weekend', when: 'Sat 09:00' },
]

function Behind({ look, children }: { look?: CaptureLook; children: ReactNode }) {
  return (
    <Shell here="Today" look={look}>
      <PageHeader title="Today" eyebrow="Monday 9 November" />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-28 sm:px-9 sm:pb-8">
        <TodayList />
      </div>
      {children}
    </Shell>
  )
}

type AState = 'empty' | 'parsed' | 'more' | 'menu' | 'repeat' | 'notime' | 'thought'

const TYPED: Record<AState, string> = {
  empty: '',
  parsed: 'clean bedroom tues 8pm',
  more: 'clean bedroom tues 8pm and 9pm',
  menu: 'clean bedroom tues 8pm',
  repeat: 'bins out every tue 7pm',
  notime: 'call the garage',
  thought: 'ceramics class for the anniversary?',
}

/**
 * A, refined: opens on Reminder. What is typed is understood as it is
 * typed — the words for the time come out of the title and become Alerts
 * ("clean bedroom tues 8pm": "Clean bedroom", Tue 10 Nov 20:00), a repeat
 * becomes the Repeat; more Alerts with "+ Alert". No time: an hour from now.
 */
function OptionA({ state }: { state: AState }) {
  const thought = state === 'thought'
  const chips: ReactNode[] = []
  const chip = (key: string, icon: typeof BellIcon, label: string, alarm = false) =>
    chips.push(
      <WhenChip key={key} icon={icon} alarm={alarm} removeLabel={`Remove ${label}`}>
        {label}
      </WhenChip>,
    )
  if (state === 'parsed' || state === 'menu') chip('1', BellIcon, 'Tue 10 Nov, 20:00')
  if (state === 'more') {
    chip('1', AlarmClockIcon, 'Tue 10 Nov, 20:00', true)
    chip('2', AlarmClockIcon, 'Tue 10 Nov, 21:00', true)
  }
  if (state === 'repeat') {
    chip('1', BellIcon, 'Tue 10 Nov, 19:00')
    chip('r', RepeatIcon, 'Every Tuesday')
  }
  if (state === 'notime') chip('1', BellIcon, 'In an hour, 15:20')
  const title =
    state === 'repeat'
      ? 'Bins out'
      : state === 'notime'
        ? 'Call the garage'
        : state === 'empty'
          ? ''
          : 'Clean bedroom'
  return (
    <Behind>
      <CaptureDialog
        open
        onOpenChange={nothing}
        title="New"
        types={REMINDER_AND_THOUGHT}
        type={thought ? 'thought' : 'reminder'}
        onTypeChange={nothing}
        placeholder={thought ? 'What’s on your mind?' : 'Remind me to…'}
        text={TYPED[state]}
        onTextChange={nothing}
        labels={thought ? LABELS : []}
        chosenLabels={new Set(['ideas'])}
        onLabelsChange={nothing}
        onSave={nothing}
      >
        {!thought && (
          <ParsedTitle colour="blue" icon={ReminderIcon} title={title} placeholder="Your reminder">
            {chips}
            <AddAlertMenu
              label={state === 'empty' ? 'Add a time' : 'Alert'}
              choices={QUICK}
              open={state === 'menu' ? true : undefined}
            />
            {state !== 'empty' && <AlarmChip defaultPressed={state === 'more'} />}
          </ParsedTitle>
        )}
      </CaptureDialog>
    </Behind>
  )
}

/* ---------- The Today widget, the same as Today ---------- */

const WIDGET: WidgetCard[] = [
  { colour: 'blue', icon: TaskIcon, type: 'Task', title: 'Send passport photos', time: 'Overdue' },
  { colour: 'coral', icon: DumbbellIcon, type: 'Workout', title: 'Push' },
  { colour: 'green', icon: UtensilsIcon, type: 'Dinner', title: 'Thai green curry' },
  { colour: 'blue', icon: TaskIcon, type: 'Task', title: 'Renew car insurance', done: true },
  { colour: 'blue', icon: ReminderIcon, type: 'Reminder', title: 'Move the car', time: '15:00' },
  { colour: 'blue', icon: TaskIcon, type: 'Task', title: 'Call mum', time: '18:00' },
  { colour: 'blue', icon: ReminderIcon, type: 'Reminder', title: 'Bins out', time: '19:00' },
]

function Widget() {
  return (
    <div className="flex min-h-svh flex-col items-start gap-5 bg-muted p-4">
      <SectionLabel>4 × 4</SectionLabel>
      <TodayWidget size="4x4" date="Mon 9 Nov" cards={WIDGET} />
    </div>
  )
}

/* ---------- The screens ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  today: () => <Today />,
  'today-empty': () => <Today empty />,
  week: () => <Week />,
  'week-add': () => <Week add="tue" />,
  'week-day': () => <PhoneWeek />,
  'week-day-add': () => <PhoneWeek adding />,
  'plan-tasks': () => <Plan tab="tasks" />,
  'plan-events': () => <Plan tab="events" />,
  'plan-reminders': () => <Plan tab="reminders" />,
  'plan-recurring': () => <Plan tab="recurring" />,
  'task-new': () => (
    <Plan tab="tasks">
      <NewTask />
    </Plan>
  ),
  reminder: () => (
    <Plan tab="reminders">
      <OpenReminder />
    </Plan>
  ),
  'reminder-alert': () => (
    <Plan tab="reminders">
      <OpenReminder alert />
    </Plan>
  ),
  'reminder-new': () => (
    <Plan tab="reminders">
      <NewReminder />
    </Plan>
  ),
  'notes-notes': () => <Notes tab="notes" />,
  'notes-thoughts': () => <Notes tab="thoughts" />,
  'a-empty': () => <OptionA state="empty" />,
  'a-parsed': () => <OptionA state="parsed" />,
  'a-more': () => <OptionA state="more" />,
  'a-menu': () => <OptionA state="menu" />,
  'a-repeat': () => <OptionA state="repeat" />,
  'a-notime': () => <OptionA state="notime" />,
  'a-thought': () => <OptionA state="thought" />,
  'look-ghost': () => <Today look="ghost" />,
  'look-primary': () => <Today look="primary" />,
  'look-icon': () => <Today look="icon" />,
  'look-split': () => <Today look="split" />,
  'look-field': () => <Today look="field" />,
  widget: () => <Widget />,
}

function Screens() {
  const { screen = 'today' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS.today!)()}</>
}
