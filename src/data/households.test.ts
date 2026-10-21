import { describe, expect, it } from 'vitest'
import {
  applyPendingHouseholds,
  applyPendingMyInvites,
  applyPendingSentInvites,
  type Household,
  type MyInvite,
} from './households'
import type { QueueEntry } from './queue/store'
import type { WriteArgs, WriteFn } from './types'

let n = 0
const entry = <F extends WriteFn>(fn: F, args: WriteArgs<F>): QueueEntry => ({
  id: `e${++n}`,
  fn,
  args,
  itemIds: [],
  createdAt: Date.parse('2026-10-22T10:00:00Z'),
  attempts: 0,
  state: 'pending',
})

const home: Household = {
  id: 'h',
  name: 'Home',
  members: [
    { person_id: 'me', role: 'owner', joined_at: '2026-10-01T00:00:00Z', name: 'Ann' },
    { person_id: 'sam', role: 'member', joined_at: '2026-10-02T00:00:00Z', name: 'Sam' },
  ],
}
const club: MyInvite = {
  id: 'i',
  space_id: 'c',
  space_name: 'Book club',
  from_name: 'Sam',
  created_at: '2026-10-21T00:00:00Z',
}

describe('Households before the server has them', () => {
  it('HSH-001: one made is mine to own, one renamed shows its name, sorted', () => {
    const shown = applyPendingHouseholds(
      [home],
      [
        entry('create_household', { p_id: 'f', p_name: ' Allotment ' }),
        entry('rename_household', { p_id: 'h', p_name: 'The flat' }),
      ],
      'me',
    )
    expect(shown.map((h) => h.name)).toEqual(['Allotment', 'The flat'])
    expect(shown[0]!.members).toMatchObject([{ person_id: 'me', role: 'owner' }])
  })

  it('HSH-002 2: one joined is there at once, as a member, and its invitation gone', () => {
    const entries = [entry('join_household', { p_invite: 'i' })]
    const shown = applyPendingHouseholds([home], entries, 'me', [club])
    expect(shown.map((h) => h.name)).toEqual(['Book club', 'Home'])
    expect(shown[0]!.members).toMatchObject([{ person_id: 'me', role: 'member' }])
    expect(applyPendingMyInvites([club], entries)).toEqual([])
    expect(applyPendingMyInvites([club], [entry('decline_invite', { p_invite: 'i' })])).toEqual([])
  })

  it('HSH-004: one left or deleted goes; someone removed leaves its members', () => {
    expect(applyPendingHouseholds([home], [entry('leave_household', { p_id: 'h' })], 'me')).toEqual(
      [],
    )
    expect(
      applyPendingHouseholds([home], [entry('delete_household', { p_id: 'h' })], 'me'),
    ).toEqual([])
    const [h] = applyPendingHouseholds(
      [home],
      [entry('remove_member', { p_space: 'h', p_person: 'sam' })],
      'me',
    )
    expect(h!.members.map((m) => m.person_id)).toEqual(['me'])
  })

  it('HSH-002 1, 4: an invitation sent shows in lower case, once; withdrawn, it goes', () => {
    const sent = applyPendingSentInvites(
      [],
      [
        entry('invite', { p_id: 'a', p_space: 'h', p_email: 'Dan@Example.com' }),
        entry('invite', { p_id: 'b', p_space: 'h', p_email: 'dan@example.com' }),
        entry('invite', { p_id: 'c', p_space: 'h', p_email: 'kim@example.com' }),
        entry('withdraw_invite', { p_id: 'c' }),
      ],
    )
    expect(sent.map((i) => i.email)).toEqual(['dan@example.com'])
    expect(applyPendingSentInvites(sent, [entry('delete_household', { p_id: 'h' })])).toEqual([])
  })
})
