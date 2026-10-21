import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { EllipsisIcon, HouseIcon, LogOutIcon, MailIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { CardRow, EmptyState, PageHeader } from '@/components/lifeos'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HouseholdNameDialog, InviteDialog } from '@/app/households'
import {
  deleteHousehold,
  leaveHousehold,
  queue,
  removeMember,
  useHouseholds,
  withdrawInvite,
  type Member,
} from '@/data'
import { invitedWhen } from '@/lib/dates'

/**
 * A Household's page (HSH-001–004, patterns.md#settings): its members and
 * the invitations waiting; the owner invites, renames, removes and deletes,
 * a member leaves.
 */
export const Route = createFileRoute('/_app/settings/households/$id')({
  component: HouseholdPage,
})

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** "Sam Carter", "Sam Carter and Alex Ito", "Sam, Alex and Kim". */
const listed = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

type Asking =
  { kind: 'leave' } | { kind: 'delete' } | { kind: 'remove'; member: Member } | undefined

function HouseholdPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { me, households, sent, isLoading } = useHouseholds(queue)
  const [inviting, setInviting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [asking, setAsking] = useState<Asking>()
  const back = () => void navigate({ to: '/settings' })
  const household = households.find((h) => h.id === id)

  if (!household)
    return (
      <>
        <PageHeader title="Household" back={{ label: 'Settings', onClick: back }} />
        <div className="max-w-3xl px-5 pb-8 sm:px-9">
          {!isLoading && <EmptyState icon={HouseIcon} title="Not one of your households" />}
        </div>
      </>
    )

  const owner = household.members.find((m) => m.person_id === me)?.role === 'owner'
  const waiting = sent.filter((i) => i.space_id === id)
  const others = household.members.filter((m) => m.person_id !== me).map((m) => m.name)

  const confirm = () => {
    if (asking?.kind === 'leave') {
      leaveHousehold(id)
      back()
    } else if (asking?.kind === 'delete') {
      deleteHousehold(id)
      back()
    } else if (asking?.kind === 'remove') removeMember(id, asking.member.person_id)
    setAsking(undefined)
  }

  return (
    <>
      <PageHeader title={household.name} back={{ label: 'Settings', onClick: back }} />
      <div className="flex max-w-3xl flex-col gap-4 px-5 pb-8 sm:px-9">
        <Card className="gap-0 px-2 py-1.5">
          <div className="flex items-center gap-3 px-3 pt-2 pb-1">
            <CardTitle className="flex-1">Members</CardTitle>
            {owner && (
              <Button variant="outline" size="sm" onClick={() => setInviting(true)}>
                <MailIcon /> Invite
              </Button>
            )}
          </div>
          {household.members.map((m) => (
            <CardRow
              key={m.person_id}
              className="px-3"
              icon={
                <Avatar>
                  <AvatarFallback>{initials(m.name)}</AvatarFallback>
                </Avatar>
              }
              label={m.person_id === me ? `${m.name || 'You'} (you)` : m.name}
              value={m.role === 'owner' ? 'Owner' : 'Member'}
            >
              {owner && m.person_id !== me && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label={`${m.name} options`} />
                    }
                  >
                    <EllipsisIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setAsking({ kind: 'remove', member: m })}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardRow>
          ))}
          {waiting.map((i) => (
            <CardRow
              key={i.id}
              className="px-3"
              icon={<MailIcon />}
              label={<span className="font-normal">{i.email}</span>}
              value={invitedWhen(i.created_at)}
            >
              <Button variant="ghost" size="sm" onClick={() => withdrawInvite(i.id)}>
                Withdraw
              </Button>
            </CardRow>
          ))}
        </Card>
        <Card className="gap-0 px-2 py-1.5">
          {owner ? (
            <>
              <CardRow
                icon={<PencilIcon />}
                label="Rename"
                render={<button type="button" />}
                chevron={false}
                onClick={() => setRenaming(true)}
              />
              <CardRow
                destructive
                icon={<Trash2Icon />}
                label="Delete household"
                render={<button type="button" />}
                chevron={false}
                onClick={() => setAsking({ kind: 'delete' })}
              />
            </>
          ) : (
            <CardRow
              icon={<LogOutIcon />}
              label="Leave household"
              render={<button type="button" />}
              chevron={false}
              onClick={() => setAsking({ kind: 'leave' })}
            />
          )}
        </Card>
      </div>
      {inviting && <InviteDialog household={household} open onClose={() => setInviting(false)} />}
      {renaming && (
        <HouseholdNameDialog household={household} open onClose={() => setRenaming(false)} />
      )}
      <AlertDialog open={asking !== undefined} onOpenChange={(o) => !o && setAsking(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {asking?.kind === 'remove'
                ? `Remove ${asking.member.name}?`
                : asking?.kind === 'delete'
                  ? `Delete ${household.name}?`
                  : `Leave ${household.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {asking?.kind === 'remove'
                ? 'What they shared becomes theirs alone'
                : asking?.kind === 'delete'
                  ? others.length
                    ? `Deleted for ${listed(others)} too. What each shared becomes theirs alone`
                    : 'What you shared becomes yours alone'
                  : 'What you shared becomes yours alone'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="destructive" onClick={confirm}>
              {asking?.kind === 'remove'
                ? 'Remove'
                : asking?.kind === 'delete'
                  ? 'Delete'
                  : 'Leave'}
            </AlertDialogAction>
            <AlertDialogCancel />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
