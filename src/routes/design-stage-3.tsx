import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  BellIcon,
  CalendarDaysIcon,
  CalendarSyncIcon,
  CalendarX2Icon,
  ChefHatIcon,
  DumbbellIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  FootprintsIcon,
  InboxIcon,
  LinkIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  PlusIcon,
  ShirtIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  TagIcon,
  TargetIcon,
  Trash2Icon,
  WalletIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AddToDay,
  AppShell,
  CardRow,
  DateField,
  DropSlot,
  FilterChip,
  ItemDialog,
  ItemRow,
  PageAction,
  PageHeader,
  PlanCard,
  PlanDay,
  PlanToolbar,
  PlanWeek,
  TaskLinker,
  ReminderList,
  RepeatField,
  SectionLabel,
  TimeField,
  TYPE_ICONS,
  WeekStrip,
  type AddChoice,
  type DrawerPage,
  type PlanWeekDay,
} from '@/components/lifeos'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { Fab } from '@/components/lifeos/Fab'

/**
 * Stage 3's screens, drawn with the real components and made-up data, for
 * Joe to agree in the design step (plan step 3). In development and preview
 * builds only, as /design is. `?screen=` chooses the screen.
 */
export const Route = createFileRoute('/design-stage-3')({
  beforeLoad: () => {
    if (!__DESIGN_PAGE__) throw notFound()
  },
  validateSearch: (s: Record<string, unknown>): { screen?: string } =>
    typeof s.screen === 'string' ? { screen: s.screen } : {},
  component: Screens,
})

const TaskIcon = TYPE_ICONS.task!
const EventIcon = TYPE_ICONS.event!

const PAGES: DrawerPage[] = [
  { to: '/inbox', label: 'Inbox', colour: 'none', icon: InboxIcon, count: 6 },
  { to: '/design-stage-3', label: 'Plan', colour: 'none', icon: CalendarDaysIcon },
  { to: '/tasks', label: 'Tasks', colour: 'blue', icon: SquareCheckBigIcon },
  { to: '/notes', label: 'Notes', colour: 'yellow', icon: StickyNoteIcon },
  { to: '/recipes', label: 'Recipes', colour: 'green', icon: ChefHatIcon },
  { to: '/gym', label: 'Gym', colour: 'coral', icon: DumbbellIcon },
  { to: '/goals', label: 'Goals', colour: 'purple', icon: TargetIcon },
  { to: '/wardrobe', label: 'Wardrobe', colour: 'orange', icon: ShirtIcon },
  { to: '/cardio', label: 'Cardio', colour: 'coral', icon: FootprintsIcon, later: true },
  { to: '/finance', label: 'Finance', colour: 'none', icon: WalletIcon, later: true },
]

const ADD: AddChoice[] = [
  { key: 'task', label: 'Task', colour: 'blue', icon: TaskIcon },
  { key: 'event', label: 'Event', colour: 'blue', icon: EventIcon },
]

const nothing = () => {}
const task = () => <Checkbox colour="blue" aria-label="Done" />

function Shell({ children, inbox = false }: { children: ReactNode; inbox?: boolean }) {
  return (
    <AppShell
      pages={PAGES.map((p) =>
        inbox && p.label === 'Inbox'
          ? { ...p, to: '/design-stage-3' }
          : inbox && p.label === 'Plan'
            ? { ...p, to: '/plan' }
            : p,
      )}
      me={{ name: 'Joe Stables', space: 'Personal' }}
      sync={{ pending: 0, failed: 0 }}
      onCapture={nothing}
      onSearch={nothing}
    >
      {children}
    </AppShell>
  )
}

/* ---------- The week's Items ---------- */

function weekDays({
  add,
  dragging = false,
  tasks = true,
}: {
  add?: string
  dragging?: boolean
  tasks?: boolean
}): PlanWeekDay[] {
  const addButton = (day: string, key: string) => (
    <AddToDay day={day} choices={ADD} onChoose={nothing} open={add === key ? true : undefined} />
  )
  const T = (node: ReactNode) => (tasks ? node : null)
  const haircut = (drag = false) => (
    <PlanCard
      colour="blue"
      icon={EventIcon}
      type="Event"
      title="Haircut"
      time="12:30"
      detail="Ruffians"
      dragging={drag}
    />
  )
  return [
    {
      key: 'mon',
      name: 'Mon',
      number: 12,
      add: addButton('Mon 12 Oct', 'mon'),
      children: (
        <>
          <PlanCard colour="blue" icon={EventIcon} type="Event" title="Dentist" time="08:30" past />
          {T(
            <PlanCard
              colour="blue"
              icon={TaskIcon}
              type="Task"
              title="Take the bins out"
              time="20:00"
              done
            />,
          )}
        </>
      ),
    },
    {
      key: 'tue',
      name: 'Tue',
      number: 13,
      add: addButton('Tue 13 Oct', 'tue'),
      children: (
        <>
          {T(
            <PlanCard colour="blue" icon={TaskIcon} type="Task" title="Renew car insurance" done />,
          )}
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Dinner with Sam"
            time="19:30"
            detail="Dishoom"
            past
          />
        </>
      ),
    },
    {
      key: 'wed',
      name: 'Wed',
      number: 14,
      today: true,
      add: addButton('Today', 'wed'),
      children: (
        <>
          {T(
            <PlanCard
              colour="blue"
              icon={TaskIcon}
              type="Task"
              title="Book Japan flights"
              detail="Due today"
            />,
          )}
          {T(<PlanCard colour="blue" icon={TaskIcon} type="Task" title="Call mum" time="18:00" />)}
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="5-a-side"
            time="19:00"
            detail="Goals, Wembley"
          />
        </>
      ),
    },
    {
      key: 'thu',
      name: 'Thu',
      number: 15,
      add: addButton('Thu 15 Oct', 'thu'),
      children: (
        <>
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Annual leave"
            time="All day"
          />
          {T(<PlanCard colour="blue" icon={TaskIcon} type="Task" title="Pick up dry cleaning" />)}
          {dragging ? <DropSlot /> : haircut()}
        </>
      ),
    },
    {
      key: 'fri',
      name: 'Fri',
      number: 16,
      dropping: dragging,
      add: addButton('Fri 16 Oct', 'fri'),
      children: (
        <>
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Annual leave"
            time="All day"
          />
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Sarah's birthday"
            time="All day"
          />
          {T(
            <PlanCard
              colour="blue"
              icon={TaskIcon}
              type="Task"
              title="Order Sarah's present"
              detail="Due Fri"
            />,
          )}
          {dragging && (
            <div className="relative">
              <DropSlot />
              <div className="absolute -top-2 left-3 w-full">{haircut(true)}</div>
            </div>
          )}
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Leaving drinks for Priya"
            time="18:00"
            detail="The Crown"
          />
        </>
      ),
    },
    {
      key: 'sat',
      name: 'Sat',
      number: 17,
      add: addButton('Sat 17 Oct', 'sat'),
      children: (
        <>
          {T(<PlanCard colour="blue" icon={TaskIcon} type="Task" title="Buy a card for mum" />)}
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Mum's birthday lunch"
            time="13:00"
            detail="The Ivy, Richmond"
          />
        </>
      ),
    },
    {
      key: 'sun',
      name: 'Sun',
      number: 18,
      add: addButton('Sun 18 Oct', 'sun'),
      children: (
        <>
          <PlanCard
            colour="blue"
            icon={EventIcon}
            type="Event"
            title="Edinburgh"
            time="All day"
            detail="Until Tue"
          />
          {T(
            <PlanCard
              colour="blue"
              icon={TaskIcon}
              type="Task"
              title="Take the bins out"
              time="20:00"
            />,
          )}
        </>
      ),
    },
  ]
}

function Filters({ tasks = true }: { tasks?: boolean }) {
  const [t, setT] = useState(tasks)
  const [e, setE] = useState(true)
  return (
    <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Show on Plan">
      <FilterChip colour="blue" pressed={t} onPressedChange={setT}>
        Tasks
      </FilterChip>
      <FilterChip colour="blue" pressed={e} onPressedChange={setE}>
        Events
      </FilterChip>
    </div>
  )
}

function PlanPage({
  layout,
  children,
  tasks,
  title,
}: {
  layout: 'week' | 'day'
  children: ReactNode
  tasks?: boolean
  title: string
}) {
  return (
    <>
      <PageHeader title="Plan" action={{ label: 'Add', onClick: nothing }} />
      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        <PlanToolbar
          title={title}
          layout={layout}
          onLayout={nothing}
          onToday={nothing}
          onPrevious={nothing}
          onNext={nothing}
          step={layout}
          action={<PageAction label="Add" onClick={nothing} />}
        />
        <Filters tasks={tasks} />
        {children}
      </div>
    </>
  )
}

function Week({ add, dragging, tasks }: { add?: string; dragging?: boolean; tasks?: boolean }) {
  return (
    <Shell>
      <PlanPage layout="week" title="12 – 18 October" tasks={tasks}>
        <PlanWeek days={weekDays({ add, dragging, tasks })} />
      </PlanPage>
    </Shell>
  )
}

/* ---------- A day ---------- */

const STRIP = [
  { key: 'mon', name: 'Mon', number: 12, dots: ['blue', 'blue'] as const },
  { key: 'tue', name: 'Tue', number: 13, dots: ['blue', 'blue'] as const },
  { key: 'wed', name: 'Wed', number: 14, today: true, dots: ['blue', 'blue', 'blue'] as const },
  { key: 'thu', name: 'Thu', number: 15, dots: ['blue', 'blue', 'blue'] as const },
  { key: 'fri', name: 'Fri', number: 16, dots: ['blue', 'blue', 'blue'] as const },
  { key: 'sat', name: 'Sat', number: 17, dots: ['blue', 'blue'] as const },
  { key: 'sun', name: 'Sun', number: 18, dots: ['blue', 'blue'] as const },
].map((d) => ({ ...d, dots: [...d.dots] }))

function DayList() {
  return (
    <PlanDay>
      <PlanCard
        wide
        colour="blue"
        icon={EventIcon}
        type="Event"
        title="Annual leave"
        time="All day"
        detail="Thu – Fri"
      />
      <PlanCard wide colour="blue" icon={TaskIcon} type="Task" title="Pick up dry cleaning" />
      <PlanCard
        wide
        colour="blue"
        icon={EventIcon}
        type="Event"
        title="Haircut"
        time="12:30–13:15"
        detail="Ruffians"
      />
      <PlanCard
        wide
        colour="blue"
        icon={TaskIcon}
        type="Task"
        title="Call the garage about the MOT"
        time="16:00"
      />
      <PlanCard
        wide
        colour="blue"
        icon={EventIcon}
        type="Event"
        title="Pub quiz"
        time="20:00–22:30"
        detail="The Railway"
      />
    </PlanDay>
  )
}

function Day() {
  const [chosen, setChosen] = useState('thu')
  return (
    <Shell>
      <PlanPage layout="day" title="Thursday 15 October">
        <div className="flex max-w-3xl flex-col gap-4">
          <WeekStrip days={STRIP} chosen={chosen} onChoose={setChosen} />
          <DayList />
        </div>
      </PlanPage>
    </Shell>
  )
}

function PhoneDay({ adding = false }: { adding?: boolean }) {
  const [chosen, setChosen] = useState('thu')
  return (
    <Shell>
      <PageHeader title="Plan" />
      <div className="flex flex-col gap-3 px-5 pb-28">
        <PlanToolbar
          title="Thu 15 October"
          layout="day"
          onLayout={nothing}
          onToday={nothing}
          onPrevious={nothing}
          onNext={nothing}
          step="week"
        />
        <WeekStrip days={STRIP} chosen={chosen} onChoose={setChosen} />
        <Filters />
        <DayList />
      </div>
      <AddToDay
        day="Thu 15 Oct"
        choices={ADD}
        onChoose={nothing}
        open={adding ? true : undefined}
        side="top"
        trigger={<Fab label="Add" />}
      />
    </Shell>
  )
}

/* ---------- An Event ---------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

const OPEN_TASKS = [
  { id: 'a', title: 'Order flowers for mum', when: 'Fri 16 Oct' },
  { id: 'b', title: 'Pick up dry cleaning', when: 'Thu 15 Oct' },
  { id: 'c', title: 'Book Japan flights', when: 'Today' },
  { id: 'd', title: 'Renew passport', when: 'No date' },
]

/** An Event's Tasks: each is a Task of its own, linked *for* the Event (EVT-006). */
function TasksFor({
  tasks,
  linking = false,
}: {
  tasks: { title: string; when?: string; done?: boolean }[]
  linking?: boolean
}) {
  return (
    <Field label="Tasks">
      <div className="flex flex-col gap-1.5">
        {tasks.map((t) => (
          <ItemRow
            key={t.title}
            leading={<Checkbox colour="blue" aria-label="Done" checked={t.done} />}
            title={t.title}
            meta={t.when ? [t.when] : []}
            done={t.done}
            menu={rowMenu}
          />
        ))}
        <TaskLinker
          open={linking ? true : undefined}
          initialQuery={linking ? 'flow' : ''}
          tasks={OPEN_TASKS}
          onLink={nothing}
          onCreate={nothing}
          trigger={
            <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
              <LinkIcon />
              Link a task
            </Button>
          }
        />
      </div>
    </Field>
  )
}

const rowMenu = (
  <Button variant="ghost" size="icon-sm" aria-label="More">
    <EllipsisIcon />
  </Button>
)

function Labels({ names }: { names: string[] }) {
  return (
    <Field label="Labels">
      <div className="flex flex-wrap items-center gap-1.5">
        {names.map((n) => (
          <Badge key={n}>{n}</Badge>
        ))}
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Add
        </Button>
      </div>
    </Field>
  )
}

function EventFields({ isNew = false }: { isNew?: boolean }) {
  const [allDay, setAllDay] = useState(false)
  return (
    <>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Starts">
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <DateField value="2026-10-17" onChange={nothing} />
            {!allDay && <TimeField aria-label="Start time" defaultValue="13:00" />}
          </div>
        </Field>
        <Field label="Ends">
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <DateField value="2026-10-17" onChange={nothing} />
            {!allDay && (
              <TimeField aria-label="End time" defaultValue={isNew ? '14:00' : '15:00'} />
            )}
          </div>
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <Switch checked={allDay} onCheckedChange={setAllDay} />
        All day
      </label>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label="Place">
          <Input placeholder="None" defaultValue={isNew ? '' : 'The Ivy, Richmond'} />
        </Field>
        <Field label="Repeat">
          <RepeatField value={null} startsOn="2026-10-17" onChange={nothing} />
        </Field>
      </div>
      <Textarea
        aria-label="Notes"
        placeholder="Notes"
        defaultValue={isNew ? '' : 'Table for six, booked under Stables'}
      />
      <Field label="Reminders">
        <ReminderList
          reminders={[{ id: '1', when: 'Sat 12:30', says: '30 minutes before' }]}
          onOpen={nothing}
          onRemove={nothing}
          onAdd={nothing}
        />
      </Field>
      <Labels names={isNew ? [] : ['Family']} />
    </>
  )
}

function EventMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More" />}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Open in Google Calendar</DropdownMenuItem>
        <DropdownMenuItem>Convert to a Task</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NewEvent() {
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="blue"
      icon={EventIcon}
      typeLabel="New event"
      title="New event"
      keepOnOutsideClick
      titleField={
        <input
          aria-label="Title"
          placeholder="Title"
          autoComplete="off"
          defaultValue="Mum's birthday lunch"
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
      <EventFields isNew />
    </ItemDialog>
  )
}

function OpenEvent({ linking = false }: { linking?: boolean }) {
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="blue"
      icon={EventIcon}
      typeLabel="Event"
      title="Mum's birthday lunch"
      actions={<EventMenu />}
      titleField={
        <input
          aria-label="Title"
          defaultValue="Mum's birthday lunch"
          className="min-w-0 bg-transparent pt-1 text-day outline-none"
        />
      }
    >
      <SyncedFrom calendar="Joe Stables" level="Two-way" />
      <EventFields />
      <TasksFor
        linking={linking}
        tasks={[
          { title: 'Buy a card for mum', when: 'Sat 17 Oct' },
          { title: 'Book the table', done: true },
        ]}
      />
    </ItemDialog>
  )
}

/** Where an Event comes from: a muted line with the calendar and its level. */
function SyncedFrom({ calendar, level }: { calendar: string; level: string }) {
  return (
    <div className="-mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
      <CalendarSyncIcon className="size-3.5" />
      Google Calendar · {calendar} · {level}
    </div>
  )
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-start gap-3 py-1.5 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function GoogleEvent() {
  return (
    <ItemDialog
      open
      onOpenChange={nothing}
      colour="blue"
      icon={EventIcon}
      typeLabel="Event"
      title="Sarah's birthday party"
      actions={
        <Button variant="ghost" size="icon-sm" aria-label="More">
          <EllipsisIcon />
        </Button>
      }
    >
      <SyncedFrom calendar="Family" level="Incoming" />
      <div className="flex flex-col">
        <Fact icon={<CalendarDaysIcon />}>
          <span className="font-semibold">Sat 24 Oct</span>
          <span className="text-muted-foreground tabular-nums"> · 19:00–23:00</span>
        </Fact>
        <Fact icon={<MapPinIcon />}>The Lexington, Islington</Fact>
        <Fact icon={<StickyNoteIcon />}>
          <span className="text-muted-foreground">Bring a bottle. Upstairs room from 7</span>
        </Fact>
      </div>
      <Button variant="outline" size="sm" className="self-start">
        <ExternalLinkIcon />
        Open in Google Calendar
      </Button>
      <Field label="Reminders">
        <ReminderList reminders={[]} onOpen={nothing} onRemove={nothing} onAdd={nothing} />
      </Field>
      <Labels names={['Family']} />
      <TasksFor tasks={[{ title: "Order Sarah's present", when: 'Due Fri' }]} />
    </ItemDialog>
  )
}

function EventOver({ which }: { which: 'new' | 'open' | 'google' | 'link' }) {
  return (
    <>
      <Week />
      {which === 'new' && <NewEvent />}
      {which === 'open' && <OpenEvent />}
      {which === 'link' && <OpenEvent linking />}
      {which === 'google' && <GoogleEvent />}
    </>
  )
}

/* ---------- Settings ---------- */

const LEVELS = [
  { value: 'off', label: 'Off' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'two-way', label: 'Two-way' },
]

function Level({ value, twoWay = true, name }: { value: string; twoWay?: boolean; name: string }) {
  const items = twoWay ? LEVELS : LEVELS.slice(0, 2)
  return (
    <Select defaultValue={value} items={items}>
      <SelectTrigger size="sm" className="w-32" aria-label={`${name}: sync`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CardTitleRow({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-8 items-center gap-3 pb-2">
      <h2 className="flex-1 text-h2">{title}</h2>
      {children}
    </div>
  )
}

function CalendarCard({ connected = true }: { connected?: boolean }) {
  return (
    <Card className="gap-0">
      <CardTitleRow title="Google Calendar">
        {connected && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Google Calendar options" />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Sync now</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Disconnect</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardTitleRow>
      {connected ? (
        <>
          <CardRow icon={<MailIcon />} label="joe.stables2002@gmail.com" value="Synced 2 min ago" />
          <div className="my-1.5 h-px bg-foreground/7" />
          <CardRow label="Joe Stables">
            <Level value="two-way" name="Joe Stables" />
          </CardRow>
          <CardRow label="Family" value="Can't edit">
            <Level value="incoming" twoWay={false} name="Family" />
          </CardRow>
          <CardRow label="Work">
            <Level value="off" name="Work" />
          </CardRow>
          <CardRow label="UK holidays" value="Can't edit">
            <Level value="incoming" twoWay={false} name="UK holidays" />
          </CardRow>
          <div className="my-1.5 h-px bg-foreground/7" />
          <CardRow label="Default calendar">
            <Select
              defaultValue="joe"
              items={[
                { value: '', label: 'None' },
                { value: 'joe', label: 'Joe Stables' },
              ]}
            >
              <SelectTrigger size="sm" className="w-32" aria-label="Default calendar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="joe">Joe Stables</SelectItem>
              </SelectContent>
            </Select>
          </CardRow>
        </>
      ) : (
        <CardRow label="Not connected">
          <Button variant="outline" size="sm">
            Connect
          </Button>
        </CardRow>
      )}
    </Card>
  )
}

function RemindersCard() {
  return (
    <Card className="gap-0">
      <CardTitleRow title="Reminders" />
      <CardRow label="Default time">
        <TimeField aria-label="Default time" defaultValue="09:00" className="h-8 w-28" />
      </CardRow>
      <CardRow label="Dated tasks">
        <Switch defaultChecked aria-label="Dated tasks" />
      </CardRow>
      <CardRow label="Dated thoughts">
        <Switch defaultChecked aria-label="Dated thoughts" />
      </CardRow>
      <CardRow label="Events, 30 min before">
        <Switch defaultChecked aria-label="Events, 30 minutes before" />
      </CardRow>
      <CardRow label="Morning digest">
        <Switch defaultChecked aria-label="Morning digest" />
      </CardRow>
    </Card>
  )
}

function NotificationsCard() {
  return (
    <Card className="gap-0">
      <CardTitleRow title="Notifications" />
      <CardRow icon={<BellIcon />} label="Pixel 8" value="This device">
        <Switch defaultChecked aria-label="Pixel 8" />
      </CardRow>
      <CardRow icon={<BellIcon />} label="Chrome on MacBook">
        <Switch defaultChecked aria-label="Chrome on MacBook" />
      </CardRow>
    </Card>
  )
}

function Settings({ connected = true }: { connected?: boolean }) {
  return (
    <Shell>
      <PageHeader title="Settings" />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <RemindersCard />
          <NotificationsCard />
        </div>
        <CalendarCard connected={connected} />
        <Card className="gap-0 px-2 py-1.5">
          <CardRow icon={<TagIcon />} label="Labels" value={5} render={<a href="#l" />} />
          <CardRow
            icon={<Trash2Icon />}
            label="Recently deleted"
            value={6}
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

/* ---------- Inbox, Calendar broken ---------- */

function InboxBroken() {
  return (
    <Shell inbox>
      <PageHeader title="Inbox" action={{ label: 'Capture', onClick: nothing }} />
      <div className="flex max-w-3xl flex-col gap-5 px-5 pb-8 sm:px-9">
        <Alert>
          <CalendarX2Icon />
          <AlertTitle>Google Calendar isn't syncing</AlertTitle>
          <AlertDescription>Since 09:12 today</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm">
              <PlusIcon className="hidden" />
              Reconnect
            </Button>
          </AlertAction>
        </Alert>
        <section className="flex flex-col gap-2">
          <SectionLabel count={2}>Today</SectionLabel>
          <ItemRow
            leading={task()}
            title="Book Japan flights"
            meta={['Due today', 'Travel']}
            menu={rowMenu}
          />
          <ItemRow leading={task()} title="Call mum" meta={['18:00', 'Family']} menu={rowMenu} />
        </section>
        <section className="flex flex-col gap-2">
          <SectionLabel count={2}>Thoughts</SectionLabel>
          <ItemRow
            leading={<Checkbox colour="yellow" aria-label="Done" />}
            title="Ceramics class for the anniversary?"
            meta={['2 h ago']}
            menu={rowMenu}
          />
          <ItemRow
            leading={<Checkbox colour="yellow" aria-label="Done" />}
            title="Look at standing desks"
            meta={['Yesterday', 'Home']}
            menu={rowMenu}
          />
        </section>
      </div>
    </Shell>
  )
}

/* ---------- Which screen ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  week: () => <Week />,
  'week-add': () => <Week add="thu" />,
  'week-drag': () => <Week dragging />,
  day: () => <Day />,
  'event-new': () => <EventOver which="new" />,
  event: () => <EventOver which="open" />,
  'event-link': () => <EventOver which="link" />,
  'event-google': () => <EventOver which="google" />,
  settings: () => <Settings />,
  'settings-new': () => <Settings connected={false} />,
  'inbox-broken': () => <InboxBroken />,
  'm-day': () => <PhoneDay />,
  'm-add': () => <PhoneDay adding />,
}

function Screens() {
  const { screen = 'week' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS.week!)()}</>
}
