import { Link } from '@tanstack/react-router'
import { CheckIcon, HouseIcon, MailIcon, PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { CardRow } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label as FieldLabel } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import {
  createHousehold,
  declineInvite,
  invite,
  joinHousehold,
  queue,
  renameHousehold,
  useHouseholds,
  type Household,
} from '@/data'

/** "Owner · 2 members" (patterns.md#settings). */
function householdMeta(h: Household, me: string): string {
  const role = h.members.find((m) => m.person_id === me)?.role === 'owner' ? 'Owner' : 'Member'
  const n = h.members.length
  return `${role} · ${n === 1 ? '1 member' : `${n} members`}`
}

/** A Household's name, in a small Dialog: a new one, or a new name for one (HSH-001). */
export function HouseholdNameDialog({
  household,
  open,
  onClose,
  onMade,
}: {
  /** The one renamed; none for a new one. */
  household?: Household
  open: boolean
  onClose: () => void
  onMade?: (id: string) => void
}) {
  const [name, setName] = useState(household?.name ?? '')
  const save = () => {
    if (!name.trim()) return
    if (household) renameHousehold(household.id, name)
    else {
      const id = createHousehold(name)
      onMade?.(id)
    }
    onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{household ? 'Rename household' : 'New household'}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <FieldLabel htmlFor="household-name">Name</FieldLabel>
          <Input
            id="household-name"
            data-autofocus={!household || undefined}
            value={name}
            maxLength={60}
            autoComplete="off"
            placeholder="Home"
            onChange={(e) => setName(e.target.value)}
          />
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Invite someone by their Google email (HSH-002 1): it says sent whether or
 * not the address has an account, and waits for it to sign in.
 */
export function InviteDialog({
  household,
  open,
  onClose,
}: {
  household: Household
  open: boolean
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const valid = EMAIL.test(email.trim())
  const send = () => {
    if (!valid) return
    invite(household.id, email)
    toast(`Invitation sent to ${email.trim().toLowerCase()}`)
    onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {household.name}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <FieldLabel htmlFor="invite-email">Google email</FieldLabel>
          <Input
            id="invite-email"
            data-autofocus
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={send} disabled={!valid}>
            Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Settings → Households (HSH-001, HSH-002 2): each one I'm in, leading to
 * its page, and the invitations waiting for me, here and nowhere else.
 */
export function HouseholdsCard() {
  const { me, households, invites } = useHouseholds(queue)
  const phone = useIsMobile()
  const [making, setMaking] = useState(false)
  return (
    <Card className="gap-0 px-2 py-1.5">
      <div className="flex items-center gap-3 px-3 pt-2 pb-1">
        <CardTitle className="flex-1">Households</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setMaking(true)}>
          <PlusIcon /> New household
        </Button>
      </div>
      {households.length === 0 && invites.length === 0 && (
        <p className="px-3 py-2 text-sm text-muted-foreground">Not in a household yet</p>
      )}
      {invites.map((i) => (
        <CardRow
          key={i.id}
          className="px-3"
          icon={<MailIcon />}
          label={i.space_name}
          value={`From ${i.from_name || 'someone'}`}
        >
          <Button
            variant="ghost"
            size={phone ? 'icon-sm' : 'sm'}
            aria-label={`Decline ${i.space_name}`}
            onClick={() => declineInvite(i.id)}
          >
            {phone ? <XIcon /> : 'Decline'}
          </Button>
          <Button
            variant="outline"
            size={phone ? 'icon-sm' : 'sm'}
            aria-label={`Join ${i.space_name}`}
            onClick={() => {
              joinHousehold(i.id)
              toast(`You joined ${i.space_name}`)
            }}
          >
            {phone ? <CheckIcon /> : 'Join'}
          </Button>
        </CardRow>
      ))}
      {households.map((h) => (
        <CardRow
          key={h.id}
          icon={<HouseIcon />}
          label={h.name}
          value={householdMeta(h, me)}
          render={<Link to="/settings/households/$id" params={{ id: h.id }} />}
        />
      ))}
      {making && <HouseholdNameDialog open onClose={() => setMaking(false)} />}
    </Card>
  )
}
