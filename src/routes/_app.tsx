import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import {
  CalendarDaysIcon,
  ChefHatIcon,
  CloudOffIcon,
  DumbbellIcon,
  FootprintsIcon,
  ListTodoIcon,
  ShirtIcon,
  ShoppingCartIcon,
  StickyNoteIcon,
  SunIcon,
  TargetIcon,
  UtensilsIcon,
  WalletIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { AppShell, type DrawerPage } from '@/components/lifeos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CaptureProvider } from '@/app/capture'
import { takeWaiting, useFillShared } from '@/app/share-actions'
import { CookTimerAlerts } from '@/app/cooking-timers'
import { TodayWidgetFeed } from '@/app/today-widget-feed'
import { isAndroidApp } from '@/native/platform'
import { useOpenCapture } from '@/app/open-capture'
import { useMine } from '@/app/mine'
import { ItemPopup } from '@/app/items'
import { useOpenSearch } from '@/app/open-search'
import { SearchProvider } from '@/app/search'
import {
  authReady,
  clearRefused,
  queue,
  useAuth,
  useItems,
  useOnline,
  useSettings,
  useSyncCounts,
} from '@/data'
import { todayIn } from '@lifeos/recurrence'
import { useAlertTimes } from '@/app/alert-times'
import { todayList } from '@/lib/today'

/** The drawer's pages, in ADR-0026's order. */
const PAGES: DrawerPage[] = [
  { to: '/today', label: 'Today', colour: 'none', icon: SunIcon },
  { to: '/week', label: 'Week', colour: 'none', icon: CalendarDaysIcon },
  { to: '/plan', label: 'Plan', colour: 'blue', icon: ListTodoIcon },
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

/**
 * Every signed-in page: the AppShell, an Item open over any page with
 * ?item=<id> (ITM-001), and the offline notice (OFF-005).
 */
export const Route = createFileRoute('/_app')({
  validateSearch: (search: Record<string, unknown>): { item?: string; new?: 'note' } => ({
    ...(typeof search.item === 'string' ? { item: search.item } : {}),
    // A new Note, opened before it is kept (patterns.md#notes).
    ...(search.new === 'note' ? { new: 'note' as const } : {}),
  }),
  beforeLoad: async () => {
    if ((await authReady()).status !== 'signed-in') throw redirect({ to: '/sign-in' })
  },
  component: SignedIn,
})

function SignedIn() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { item, new: isNew } = Route.useSearch()
  const { items, outOfDate } = useItems(queue)
  const mine = useMine()
  const settings = useSettings(queue)
  const alertsOf = useAlertTimes()
  // How much is on Today, done and past too; never Thoughts (TDY-005).
  const waiting = todayList(
    items.filter(mine),
    todayIn(settings.timezone),
    settings.timezone,
    alertsOf,
  ).count
  const online = useOnline()

  useEffect(() => {
    if (auth.status === 'signed-out') void navigate({ to: '/sign-in' })
  }, [auth.status, navigate])
  // A share that arrived signed out carries on now (ADR-0055).
  useEffect(() => {
    const shared = auth.status === 'signed-in' ? takeWaiting() : null
    if (shared) void navigate({ to: '/share', search: shared, replace: true })
  }, [auth.status, navigate])
  useFillShared()
  if (auth.status !== 'signed-in') return null

  return (
    <CaptureProvider>
      <SearchProvider>
        <Shell
          name={auth.me.name}
          item={item}
          isNew={isNew === 'note'}
          outOfDate={outOfDate}
          online={online}
          waiting={waiting}
        />
      </SearchProvider>
    </CaptureProvider>
  )
}

function Shell({
  name,
  item,
  isNew,
  outOfDate,
  online,
  waiting,
}: {
  name: string
  item?: string
  /** A new Note, not kept yet. */
  isNew: boolean
  outOfDate: boolean
  online: boolean
  /** How much is on Today, beside it in the drawer (TDY-005). */
  waiting: number
}) {
  const sync = useSyncCounts(queue)
  const openCapture = useOpenCapture()
  const openSearch = useOpenSearch()
  return (
    <AppShell
      onCapture={() => openCapture()}
      onSearch={openSearch}
      pages={PAGES.map((p) => (p.to === '/today' && waiting > 0 ? { ...p, count: waiting } : p))}
      me={{ name, space: 'Personal' }}
      sync={sync}
      onClearRefused={() => void clearRefused()}
      notice={
        outOfDate && (
          <Alert>
            <CloudOffIcon />
            <AlertTitle>{online ? "Can't refresh" : 'Offline'}</AlertTitle>
            <AlertDescription>These may be out of date</AlertDescription>
          </Alert>
        )
      }
    >
      <Outlet />
      <ItemPopup id={item} isNew={isNew} />
      <CookTimerAlerts />
      {isAndroidApp() && <TodayWidgetFeed />}
    </AppShell>
  )
}
