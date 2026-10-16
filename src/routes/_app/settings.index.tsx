import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LogOutIcon, TagIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Card } from '@/components/ui/card'
import { GoogleCalendarCard } from '@/app/google-calendar'
import { LabelsCard } from '@/app/labels'
import { toast } from '@/components/ui/sonner'
import { NotificationsCard, RemindersCard } from '@/app/notification-settings'
import { queue, signOut, unsentWrites, useDeletedItems, useLabels } from '@/data'

/**
 * Settings: notifications and Reminders, Google Calendar, Labels, Recently
 * deleted and signing out (REM-001, REM-007, REM-008, GCL-001, GCL-002,
 * ITM-003, ITM-005, ACC-003).
 */
export const Route = createFileRoute('/_app/settings/')({
  // Where Google sends me back after connecting (GCL-001).
  validateSearch: (search: Record<string, unknown>): { calendar?: string } =>
    typeof search.calendar === 'string' ? { calendar: search.calendar } : {},
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
  const { calendar: outcome } = Route.useSearch()
  useEffect(() => {
    if (!outcome) return
    toast(OUTCOMES[outcome] ?? OUTCOMES.failed!)
    void navigate({ to: '.', search: {}, replace: true })
  }, [outcome, navigate])

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
        <GoogleCalendarCard />
        <div className="hidden md:block">
          <LabelsCard />
        </div>
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
