import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import {
  CalendarDaysIcon,
  ChefHatIcon,
  CloudOffIcon,
  DumbbellIcon,
  FootprintsIcon,
  InboxIcon,
  ShirtIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  TargetIcon,
  WalletIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { AppShell, type DrawerPage } from '@/components/lifeos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CaptureProvider } from '@/app/capture'
import { useOpenCapture } from '@/app/open-capture'
import { ItemPopup } from '@/app/items'
import { authReady, queue, useAuth, useItems, useOnline, useSyncCounts } from '@/data'

/** The drawer's pages, in ADR-0026's order. */
const PAGES: DrawerPage[] = [
  { to: '/inbox', label: 'Inbox', colour: 'none', icon: InboxIcon },
  { to: '/plan', label: 'Plan', colour: 'none', icon: CalendarDaysIcon },
  { to: '/tasks', label: 'Tasks', colour: 'blue', icon: SquareCheckBigIcon },
  { to: '/notes', label: 'Notes', colour: 'yellow', icon: StickyNoteIcon },
  { to: '/recipes', label: 'Recipes', colour: 'green', icon: ChefHatIcon },
  { to: '/gym', label: 'Gym', colour: 'coral', icon: DumbbellIcon },
  { to: '/goals', label: 'Goals', colour: 'purple', icon: TargetIcon },
  { to: '/wardrobe', label: 'Wardrobe', colour: 'orange', icon: ShirtIcon },
  { to: '/cardio', label: 'Cardio', colour: 'coral', icon: FootprintsIcon, later: true },
  { to: '/finance', label: 'Finance', colour: 'none', icon: WalletIcon, later: true },
]

/**
 * Every signed-in page: the AppShell, an Item open over any page with
 * ?item=<id> (ITM-001), and the offline notice (OFF-005).
 */
export const Route = createFileRoute('/_app')({
  validateSearch: (search: Record<string, unknown>): { item?: string } =>
    typeof search.item === 'string' ? { item: search.item } : {},
  beforeLoad: async () => {
    if ((await authReady()).status !== 'signed-in') throw redirect({ to: '/sign-in' })
  },
  component: SignedIn,
})

function SignedIn() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { item } = Route.useSearch()
  const { outOfDate } = useItems(queue)
  const online = useOnline()

  useEffect(() => {
    if (auth.status === 'signed-out') void navigate({ to: '/sign-in' })
  }, [auth.status, navigate])
  if (auth.status !== 'signed-in') return null

  return (
    <CaptureProvider>
      <Shell name={auth.me.name} item={item} outOfDate={outOfDate} online={online} />
    </CaptureProvider>
  )
}

function Shell({
  name,
  item,
  outOfDate,
  online,
}: {
  name: string
  item?: string
  outOfDate: boolean
  online: boolean
}) {
  const sync = useSyncCounts(queue)
  const openCapture = useOpenCapture()
  return (
    <AppShell
      onCapture={openCapture}
      pages={PAGES}
      me={{ name, space: 'Personal' }}
      sync={sync}
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
      <ItemPopup id={item} />
    </AppShell>
  )
}
