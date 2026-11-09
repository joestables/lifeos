import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  AlarmClockIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChefHatIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  InboxIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  TargetIcon,
  UtensilsIcon,
  WalletIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import {
  AlarmScreen,
  AppShell,
  CardRow,
  DateField,
  MonochromeIcon,
  NoConnection,
  PageHeader,
  AlertList,
  SectionLabel,
  TimeField,
  TodayWidget,
  type DrawerPage,
  type WidgetCard,
} from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'

/**
 * Stage 7's designs, the Android app's own parts, drawn with the real
 * components and made-up data, for Joe to agree in the design step (Stage 7
 * plan, step 3). In development and preview builds only, as /design is.
 * `?screen=` chooses the screen; they are phone screens.
 */
export const Route = createFileRoute('/design-stage-7')({
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

function Shell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      pages={PAGES}
      me={{ name: 'Joe Stables', space: 'Personal' }}
      sync={{ pending: 0, failed: 0 }}
      onCapture={nothing}
      onSearch={nothing}
    >
      {children}
    </AppShell>
  )
}

/** Today, Thursday 5 November, as Plan orders it: untimed first, then by time. */
const TODAY: WidgetCard[] = [
  { colour: 'coral', icon: DumbbellIcon, type: 'Workout', title: 'Push' },
  { colour: 'green', icon: UtensilsIcon, type: 'Dinner', title: 'Thai green curry' },
  { colour: 'yellow', icon: ShoppingCartIcon, type: 'Shopping list', title: 'Food shop' },
  {
    colour: 'blue',
    icon: SquareCheckBigIcon,
    type: 'Task',
    title: 'Renew car insurance',
    time: '09:00',
    done: true,
  },
  { colour: 'blue', icon: CalendarIcon, type: 'Event', title: 'Dentist', time: '13:30–14:00' },
  { colour: 'blue', icon: SquareCheckBigIcon, type: 'Task', title: 'Call mum', time: '18:00' },
]

/** A home screen behind the widgets: the phone's wallpaper, in the muted fill. */
function HomeScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh flex-col items-start gap-5 bg-muted p-4">{children}</div>
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  )
}

function Widget() {
  return (
    <HomeScreen>
      <Labelled label="4 × 3, to start">
        <TodayWidget date="Thu 5 Nov" cards={TODAY} />
      </Labelled>
    </HomeScreen>
  )
}

function WidgetSizes() {
  return (
    <HomeScreen>
      <Labelled label="4 × 2">
        <TodayWidget size="4x2" date="Thu 5 Nov" cards={TODAY} />
      </Labelled>
      <Labelled label="2 × 2">
        <TodayWidget size="2x2" date="Thu 5 Nov" cards={TODAY} />
      </Labelled>
      <Labelled label="4 × 4">
        <TodayWidget size="4x4" date="Thu 5 Nov" cards={TODAY} />
      </Labelled>
    </HomeScreen>
  )
}

function WidgetStates() {
  return (
    <HomeScreen>
      <Labelled label="Nothing today">
        <TodayWidget size="4x2" date="Sun 8 Nov" />
      </Labelled>
      <Labelled label="Signed out">
        <TodayWidget size="4x2" date="Thu 5 Nov" signedOut />
      </Labelled>
    </HomeScreen>
  )
}

const ON = [
  { value: 'do', label: 'Do-on date' },
  { value: 'fixed', label: 'A set time' },
]

function AlertPopup() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alert</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="on">On</Label>
            <Select defaultValue="fixed" items={ON}>
              <SelectTrigger id="on">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ON.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <DateField id="date" value="2026-11-06" onChange={nothing} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="time">Time</Label>
              <TimeField id="time" value="07:00" onChange={nothing} />
            </div>
          </div>
          <CardRow icon={<AlarmClockIcon />} label="Alarm" chevron={false}>
            <Switch defaultChecked aria-label="Alarm" className="ml-auto" />
          </CardRow>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Alerts({ popup = false }: { popup?: boolean }) {
  return (
    <Shell>
      <PageHeader title="Alerts" />
      <div className="flex flex-col gap-5 px-5 pb-28">
        <Card className="gap-2">
          <SectionLabel>Renew car insurance</SectionLabel>
          <AlertList
            alerts={[
              { id: '1', when: 'Fri 6 Nov 07:00', says: 'At a set time', alarm: true },
              { id: '2', when: 'Fri 6 Nov 09:00', says: 'On the day' },
            ]}
            onOpen={nothing}
            onRemove={nothing}
            onAdd={nothing}
          />
        </Card>
      </div>
      {popup && <AlertPopup />}
    </Shell>
  )
}

const more = (label: string) => (
  <Button variant="ghost" size="icon-sm" aria-label={`${label} options`}>
    <EllipsisIcon />
  </Button>
)

function Settings({ update = false }: { update?: boolean }) {
  useEffect(() => {
    if (!update) return
    toast('A new version of the app is ready', {
      action: { label: 'Install', onClick: nothing },
      duration: Infinity,
    })
  }, [update])
  return (
    <Shell>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4 px-5 pb-28">
        <Card className="gap-1.5">
          <h2 className="mb-2 flex h-8 items-center text-h2">Notifications</h2>
          <CardRow label="Android app" value="This device">
            <Switch defaultChecked aria-label="Notifications on Android app" />
            {more('Android app')}
          </CardRow>
          <CardRow label="Chrome on MacBook">
            <Switch defaultChecked aria-label="Notifications on Chrome on MacBook" />
            {more('Chrome on MacBook')}
          </CardRow>
          <CardRow label="Full-screen alarms" value="Not allowed">
            <Button variant="outline" size="sm">
              Allow
            </Button>
          </CardRow>
        </Card>
        <Card className="gap-1.5">
          <h2 className="mb-2 flex h-8 items-center text-h2">Android app</h2>
          <CardRow label="Version" value="1.0.2" />
          {update && (
            <CardRow label="Update ready" value="1.0.3">
              <Button variant="outline" size="sm">
                Install
              </Button>
            </CardRow>
          )}
        </Card>
      </div>
    </Shell>
  )
}

function Icon() {
  return (
    <HomeScreen>
      <Labelled label="Adaptive icon: circle, rounded square, themed">
        <div className="flex items-center gap-5">
          <img src="/icon.svg" alt="" className="size-24 rounded-full" />
          <img src="/icon.svg" alt="" className="size-24 rounded-xl" />
          <div className="flex size-24 items-center justify-center rounded-full bg-secondary text-foreground">
            <MonochromeIcon className="size-16" />
          </div>
        </div>
      </Labelled>
    </HomeScreen>
  )
}

/* ---------- The screens ---------- */

const SCREENS: Record<string, () => ReactNode> = {
  'm-widget': () => <Widget />,
  'm-widget-sizes': () => <WidgetSizes />,
  'm-widget-states': () => <WidgetStates />,
  'm-alarm': () => (
    <AlarmScreen
      colour="blue"
      icon={SquareCheckBigIcon}
      time="07:00"
      date="Fri 6 Nov"
      title="Renew car insurance"
      completable
    />
  ),
  'm-alarm-event': () => (
    <AlarmScreen
      colour="blue"
      icon={CalendarIcon}
      time="05:30"
      date="Sat 7 Nov"
      title="Leave for the airport"
    />
  ),
  'm-alerts': () => <Alerts />,
  'm-alert': () => <Alerts popup />,
  'm-settings': () => <Settings />,
  'm-settings-update': () => <Settings update />,
  'm-no-connection': () => <NoConnection action={<Button variant="outline">Try again</Button>} />,
  'm-icon': () => <Icon />,
}

function Screens() {
  const { screen = 'm-widget' } = Route.useSearch()
  return <>{(SCREENS[screen] ?? SCREENS['m-widget']!)()}</>
}
