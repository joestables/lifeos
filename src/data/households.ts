import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from './auth'
import { useQueueEntries } from './hooks'
import { newId } from './ids'
import type { WriteQueue } from './queue/queue'
import type { QueueEntry } from './queue/store'
import { supabase } from './supabase'

/** Someone in a Household, and whether they own it (ADR-0039). */
export type Member = {
  person_id: string
  role: 'owner' | 'member'
  joined_at: string
  name: string
}

/** A Household I'm in, with its members, the owner first (HSH-001). */
export type Household = { id: string; name: string; members: Member[] }

/** An invitation I sent as an owner, waiting to be answered (HSH-002). */
export type SentInvite = { id: string; space_id: string; email: string; created_at: string }

/** An invitation waiting for me: which Household, and who sent it (HSH-002 2). */
export type MyInvite = {
  id: string
  space_id: string
  space_name: string
  from_name: string
  created_at: string
}

export const householdsKey = ['core', 'households'] as const
export const sentInvitesKey = ['core', 'space_invites'] as const
export const myInvitesKey = ['core', 'my_invites'] as const

/** The writes that change who is in which Household, and so what I see. */
export const HOUSEHOLD_FNS = [
  'create_household',
  'rename_household',
  'invite',
  'withdraw_invite',
  'join_household',
  'decline_invite',
  'leave_household',
  'remove_member',
  'delete_household',
] as const

/** Writes after which much of what I see may have moved Space. */
export const PARTING_FNS: readonly string[] = [
  'join_household',
  'leave_household',
  'remove_member',
  'delete_household',
]

const byOwner = (a: Member, b: Member) =>
  a.role === b.role ? a.joined_at.localeCompare(b.joined_at) : a.role === 'owner' ? -1 : 1

export async function fetchHouseholds(): Promise<Household[]> {
  const { data, error } = await supabase()
    .from('spaces')
    .select('id, name, space_members(person_id, role, joined_at, people(name))')
    .eq('kind', 'household')
    .order('name')
  if (error) throw error
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    members: s.space_members
      .map((m) => ({
        person_id: m.person_id,
        role: m.role as Member['role'],
        joined_at: m.joined_at,
        name: m.people?.name ?? '',
      }))
      .sort(byOwner),
  }))
}

export async function fetchSentInvites(): Promise<SentInvite[]> {
  const { data, error } = await supabase()
    .from('space_invites')
    .select('id, space_id, email, created_at')
    .order('created_at')
  if (error) throw error
  return data
}

export async function fetchMyInvites(): Promise<MyInvite[]> {
  const { data, error } = await supabase().rpc('my_invites')
  if (error) throw error
  return data
}

type Args = Record<string, unknown>

/**
 * Lays unsent Household writes over the Households the server last sent:
 * one I make or join is there at once, one I leave or delete goes.
 */
export function applyPendingHouseholds(
  rows: readonly Household[],
  entries: readonly QueueEntry[],
  me: string,
  invites: readonly MyInvite[] = [],
): Household[] {
  let out = rows.map((h) => ({ ...h, members: [...h.members] }))
  for (const entry of entries) {
    const a = entry.args as Args
    const at = new Date(entry.createdAt).toISOString()
    switch (entry.fn) {
      case 'create_household':
        if (out.some((h) => h.id === a.p_id)) break
        out.push({
          id: String(a.p_id),
          name: String(a.p_name).trim(),
          members: [{ person_id: me, role: 'owner', joined_at: at, name: '' }],
        })
        break
      case 'rename_household':
        out = out.map((h) => (h.id === a.p_id ? { ...h, name: String(a.p_name).trim() } : h))
        break
      case 'join_household': {
        const invite = invites.find((i) => i.id === a.p_invite)
        if (!invite || out.some((h) => h.id === invite.space_id)) break
        out.push({
          id: invite.space_id,
          name: invite.space_name,
          members: [{ person_id: me, role: 'member', joined_at: at, name: '' }],
        })
        break
      }
      case 'leave_household':
      case 'delete_household':
        out = out.filter((h) => h.id !== a.p_id)
        break
      case 'remove_member':
        out = out.map((h) =>
          h.id === a.p_space
            ? { ...h, members: h.members.filter((m) => m.person_id !== a.p_person) }
            : h,
        )
        break
    }
  }
  return out.sort((x, y) => x.name.localeCompare(y.name))
}

/** Lays unsent invitations and withdrawals over the ones the server last sent. */
export function applyPendingSentInvites(
  rows: readonly SentInvite[],
  entries: readonly QueueEntry[],
): SentInvite[] {
  let out = [...rows]
  for (const entry of entries) {
    const a = entry.args as Args
    switch (entry.fn) {
      case 'invite': {
        const email = String(a.p_email).trim().toLowerCase()
        if (out.some((i) => i.id === a.p_id || (i.space_id === a.p_space && i.email === email)))
          break
        out.push({
          id: String(a.p_id),
          space_id: String(a.p_space),
          email,
          created_at: new Date(entry.createdAt).toISOString(),
        })
        break
      }
      case 'withdraw_invite':
        out = out.filter((i) => i.id !== a.p_id)
        break
      case 'delete_household':
        out = out.filter((i) => i.space_id !== a.p_id)
        break
    }
  }
  return out
}

/** An invitation answered here is gone at once. */
export function applyPendingMyInvites(
  rows: readonly MyInvite[],
  entries: readonly QueueEntry[],
): MyInvite[] {
  const answered = new Set(
    entries
      .filter((e) => e.fn === 'join_household' || e.fn === 'decline_invite')
      .map((e) => (e.args as Args).p_invite),
  )
  return rows.filter((i) => !answered.has(i.id))
}

/** Making, sharing and leaving Households (HSH-001, HSH-002, HSH-004). */
export function householdWrites(queue: WriteQueue) {
  return {
    createHousehold(name: string): string {
      const id = newId()
      queue.enqueue('create_household', { p_id: id, p_name: name.trim() }, [])
      return id
    },
    renameHousehold(id: string, name: string): void {
      queue.enqueue('rename_household', { p_id: id, p_name: name.trim() }, [])
    },
    invite(space: string, email: string): void {
      const p_email = email.trim().toLowerCase()
      queue.enqueue('invite', { p_id: newId(), p_space: space, p_email }, [])
    },
    withdrawInvite(id: string): void {
      queue.enqueue('withdraw_invite', { p_id: id }, [])
    },
    joinHousehold(invite: string): void {
      queue.enqueue('join_household', { p_invite: invite }, [])
    },
    declineInvite(invite: string): void {
      queue.enqueue('decline_invite', { p_invite: invite }, [])
    },
    leaveHousehold(id: string): void {
      queue.enqueue('leave_household', { p_id: id }, [])
    },
    removeMember(space: string, person: string): void {
      queue.enqueue('remove_member', { p_space: space, p_person: person }, [])
    },
    deleteHousehold(id: string): void {
      queue.enqueue('delete_household', { p_id: id }, [])
    },
  }
}

export type HouseholdsData = {
  me: string
  households: Household[]
  sent: SentInvite[]
  invites: MyInvite[]
  isLoading: boolean
}

/** My Households, the invitations I've sent, and those waiting for me. */
export function useHouseholds(queue: WriteQueue): HouseholdsData {
  const auth = useAuth()
  const me = auth.status === 'signed-in' ? auth.me.id : ''
  const entries = useQueueEntries(queue)
  const households = useQuery({ queryKey: householdsKey, queryFn: fetchHouseholds })
  const sent = useQuery({ queryKey: sentInvitesKey, queryFn: fetchSentInvites })
  const mine = useQuery({ queryKey: myInvitesKey, queryFn: fetchMyInvites })
  return useMemo(() => {
    const waiting = mine.data ?? []
    return {
      me,
      households: applyPendingHouseholds(households.data ?? [], entries, me, waiting),
      sent: applyPendingSentInvites(sent.data ?? [], entries),
      invites: applyPendingMyInvites(waiting, entries),
      isLoading: households.isLoading,
    }
  }, [me, households.data, households.isLoading, sent.data, mine.data, entries])
}
