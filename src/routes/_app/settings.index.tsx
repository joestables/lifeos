import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArchiveIcon, ListIcon, LogOutIcon, TagIcon, Trash2Icon, UtensilsIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CardRow, PageHeader } from '@/components/lifeos'
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
import { Card, CardTitle } from '@/components/ui/card'
import { AndroidAppCard } from '@/app/android-settings'
import { GoogleCalendarCard } from '@/app/google-calendar'
import { GymCard } from '@/app/gym-settings'
import { HouseholdsCard } from '@/app/households'
import { LabelsCard } from '@/app/labels'
import { SpaceSelect } from '@/app/space-select'
import { toast } from '@/components/ui/sonner'
import { NotificationsCard, RemindersCard } from '@/app/notification-settings'
import {
  calendarAction,
  queue,
  signOut,
  unsentWrites,
  useDeletedItems,
  updateSettings,
  useFood,
  useFoodSpaces,
  useLabels,
} from '@/data'

/**
 * Settings: notifications and Reminders, Google Calendar, Labels,
 * Households, Food, the Gym, Recently deleted and signing out (REM-001,
 * REM-007, REM-008, GCL-001, GCL-002, ITM-003, ITM-005, HSH-001, HSH-002,
 * GYM-020, ACC-003).
 */
export const Route = createFileRoute('/_app/settings/')({
  // Where Google sends me back after connecting (GCL-001): to finish, with
  // its code, or how it went.
  validateSearch: (search: Record<string, unknown>): { calendar?: string; code?: string } => ({
    ...(typeof search.calendar === 'string' ? { calendar: search.calendar } : {}),
    ...(typeof search.code === 'string' ? { code: search.code } : {}),
  }),
  component: Settings,
})

const OUTCOMES: Record<string, string> = {
  connected: 'Google Calendar connected',
  cancelled: 'Google Calendar wasn’t connected',
  expired: 'That took too long. Connect again',
  failed: 'Google didn’t connect. Try again',
}

function Settings() {
  const navigate = useNavigate()
  const { labels } = useLabels(queue)
  const { items: deleted } = useDeletedItems(queue)
  const [confirming, setConfirming] = useState(false)
  const waiting = unsentWrites()
  const { calendar: outcome, code } = Route.useSearch()
  const finished = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!outcome || (code && finished.current === code)) return
    finished.current = code
    void navigate({ to: '.', search: {}, replace: true })
    if (outcome !== 'finish') return void toast(OUTCOMES[outcome] ?? OUTCOMES.failed!)
    // Finished as me: only the person who began can (GCL-001).
    calendarAction('finish', code)
      .then(() => toast(OUTCOMES.connected!))
      .catch(() => toast(OUTCOMES.expired!))
  }, [outcome, code, navigate])

  const finishSignOut = async () => {
    await signOut()
    await navigate({ to: '/sign-in' })
  }
  const startSignOut = () => (unsentWrites() > 0 ? setConfirming(true) : void finishSignOut())

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <NotificationsCard />
          <RemindersCard />
        </div>
        <AndroidAppCard />
        <GoogleCalendarCard />
        <div className="hidden md:block">
          <LabelsCard />
        </div>
        <HouseholdsCard />
        <FoodCard />
        <GymCard />
        <Card className="gap-0 px-2 py-1.5">
          <CardRow
            className="md:hidden"
            icon={<TagIcon />}
            label="Labels"
            value={labels.length}
            render={<Link to="/settings/labels" />}
          />
          <CardRow
            icon={<Trash2Icon />}
            label="Recently deleted"
            value={deleted.length}
            render={<Link to="/settings/deleted" />}
          />
          <CardRow
            icon={<LogOutIcon />}
            label="Sign out"
            render={<button type="button" />}
            chevron={false}
            onClick={startSignOut}
          />
        </Card>
      </div>
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
    </>
  )
}

/**
 * Food (RCP-018, MPL-005): where new Meals go, with a Household; my Recipe
 * lists; Archived recipes.
 */
function FoodCard() {
  const food = useFood(queue)
  const spaces = useFoodSpaces(queue)
  const archived = food.recipes.filter((r) => r.mine && r.state === 'cancelled').length
  return (
    <Card className="gap-0 px-2 py-1.5">
      <div className="px-3 pt-2 pb-1">
        <CardTitle>Food</CardTitle>
      </div>
      {spaces.spaces.length > 1 && (
        <CardRow className="px-3" icon={<UtensilsIcon />} label="New meals are for">
          <SpaceSelect
            spaces={spaces.spaces}
            value={spaces.home ?? ''}
            onChange={(space) =>
              updateSettings({ meal_space_id: space === spaces.personal ? null : space })
            }
            label="New meals are for"
          />
        </CardRow>
      )}
      <CardRow
        icon={<ListIcon />}
        label="Recipe lists"
        render={<Link to="/settings/recipe-lists" />}
      />
      <CardRow
        icon={<ArchiveIcon />}
        label="Archived recipes"
        value={archived}
        render={<Link to="/settings/archived-recipes" />}
      />
    </Card>
  )
}
