import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import {
  CalendarDaysIcon,
  ChefHatIcon,
  DumbbellIcon,
  FootprintsIcon,
  InboxIcon,
  ShirtIcon,
  SquareCheckBigIcon,
  StickyNoteIcon,
  TargetIcon,
  WalletIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell, type DrawerPage } from '@/components/lifeos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { authReady, queue, signOut, unsentWrites, useAuth, useSyncCounts } from '@/data'

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

/** Every signed-in page: the AppShell, and sign-out (ACC-003). */
export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    if ((await authReady()).status !== 'signed-in') throw redirect({ to: '/sign-in' })
  },
  component: SignedIn,
})

function SignedIn() {
  const auth = useAuth()
  const sync = useSyncCounts(queue)
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (auth.status === 'signed-out') void navigate({ to: '/sign-in' })
  }, [auth.status, navigate])
  if (auth.status !== 'signed-in') return null

  const finishSignOut = async () => {
    await signOut()
    await navigate({ to: '/sign-in' })
  }
  const startSignOut = () => (unsentWrites() > 0 ? setConfirming(true) : void finishSignOut())
  const waiting = unsentWrites()

  return (
    <AppShell
      pages={PAGES}
      me={{ name: auth.me.name, space: 'Personal' }}
      sync={sync}
      onSignOut={startSignOut}
    >
      <Outlet />
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              {waiting === 1
                ? "1 change hasn't been sent yet and will be lost"
                : `${waiting} changes haven't been sent yet and will be lost`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="destructive" onClick={() => void finishSignOut()}>
              Sign out
            </AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
