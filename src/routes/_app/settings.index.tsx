import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LogOutIcon, TagIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
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
import { LabelsCard } from '@/app/labels'
import { NotificationsCard, RemindersCard } from '@/app/notification-settings'
import { queue, signOut, unsentWrites, useDeletedItems, useLabels } from '@/data'

/**
 * Settings: notifications and Reminders, Labels, Recently deleted and signing
 * out (REM-001, REM-007, REM-008, ITM-003, ITM-005, ACC-003).
 */
export const Route = createFileRoute('/_app/settings/')({
  component: Settings,
})

function Settings() {
  const navigate = useNavigate()
  const { labels } = useLabels(queue)
  const { items: deleted } = useDeletedItems(queue)
  const [confirming, setConfirming] = useState(false)
  const waiting = unsentWrites()

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
