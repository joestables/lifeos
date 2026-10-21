import { expect, test, type Page } from '@playwright/test'
import { ANN, standIn, type Rows } from './stand-in'

/** Thursday 22 October 2026. */
const NOW = new Date('2026-10-22T10:00:00+01:00')
const SAM = '00000000-0000-4000-8000-00000000000b'
const HOME = '00000000-0000-7000-8000-0000000000f1'
const ALLOTMENT = '00000000-0000-7000-8000-0000000000f2'
const CLUB = '00000000-0000-7000-8000-0000000000f3'

/** Ann owns Home with Sam; she's a member of Allotment; Kim is invited to Home; an invitation to Club waits for Ann. */
function rows(): Rows {
  return {
    spaces: [
      { id: HOME, name: 'Home', created_by: ANN.id },
      { id: ALLOTMENT, name: 'Allotment', created_by: SAM },
    ],
    space_members: [
      { space_id: HOME, person_id: ANN.id, role: 'owner', name: ANN.name },
      { space_id: HOME, person_id: SAM, role: 'member', name: 'Sam Carter' },
      { space_id: ALLOTMENT, person_id: SAM, role: 'owner', name: 'Sam Carter' },
      { space_id: ALLOTMENT, person_id: ANN.id, role: 'member', name: ANN.name },
    ],
    space_invites: [
      {
        id: 'inv-kim',
        space_id: HOME,
        email: 'kim@example.com',
        created_at: '2026-10-20T09:00:00Z',
      },
    ],
    my_invites: [
      {
        id: 'inv-club',
        space_id: CLUB,
        space_name: 'Book club',
        from_name: 'Sam Carter',
        created_at: '2026-10-21T09:00:00Z',
      },
    ],
  }
}

async function start(page: Page, path = '/settings') {
  await page.clock.setFixedTime(NOW)
  const db = await standIn(page, { signedIn: true, rows: rows() })
  await page.goto(path)
  return db
}

const card = (page: Page) =>
  page.locator('[data-slot="card"]').filter({ has: page.getByText('Households', { exact: true }) })

test.describe('Households', () => {
  test('HSH-001 1, 3: my Households, and a new one made', async ({ page }) => {
    const db = await start(page)
    const households = card(page)
    await expect(households.getByRole('link')).toHaveText([
      /Allotment\s*Member · 2 members/,
      /Home\s*Owner · 2 members/,
    ])
    await households.getByRole('button', { name: 'New household' }).click()
    const dialog = page.getByRole('dialog', { name: 'New household' })
    await dialog.getByLabel('Name').fill('  Flat ')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(households.getByRole('link', { name: /Flat/ })).toContainText('Owner · 1 member')
    await expect
      .poll(() => db.spaces.find((s) => s.name === 'Flat'))
      .toMatchObject({ kind: 'household' })
  })

  test('HSH-002 2: an invitation waits in Settings; joined, or declined', async ({ page }) => {
    const db = await start(page)
    const households = card(page)
    await expect(households.getByText('From Sam Carter')).toBeVisible()
    await expect(households.getByText('Book club')).toBeVisible()
    await households.getByRole('button', { name: 'Join Book club' }).click()
    await expect(page.getByText('You joined Book club')).toBeVisible()
    await expect(households.getByText('From Sam Carter')).toHaveCount(0)
    await expect(households.getByRole('link', { name: /Book club/ })).toContainText('Member')
    await expect.poll(() => db.space_members.some((m) => m.space_id === CLUB)).toBe(true)

    // Not on Inbox (HSH-002 2).
    await page.goto('/inbox')
    await expect(page.getByText('From Sam Carter')).toHaveCount(0)
  })

  test('HSH-002 3: declined, it goes', async ({ page }) => {
    const db = await start(page)
    await card(page).getByRole('button', { name: 'Decline Book club' }).click()
    await expect(card(page).getByText('From Sam Carter')).toHaveCount(0)
    await expect.poll(() => db.my_invites.length).toBe(0)
  })

  test('HSH-001 2, HSH-002 1, 4: the owner invites, withdraws and renames', async ({ page }) => {
    const db = await start(page)
    await card(page).getByRole('link', { name: /Home/ }).click()
    await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible()
    const members = page.locator('[data-slot="card"]').filter({ hasText: 'Members' })
    await expect(members.getByText(`${ANN.name} (you)`)).toBeVisible()
    await expect(members.getByText('Sam Carter')).toBeVisible()
    await expect(members.getByText('kim@example.com')).toBeVisible()
    await expect(members.getByText('Invited Tue')).toBeVisible()

    await members.getByRole('button', { name: 'Withdraw' }).click()
    await expect(members.getByText('kim@example.com')).toHaveCount(0)
    await expect.poll(() => db.space_invites.length).toBe(0)

    await members.getByRole('button', { name: 'Invite' }).click()
    const dialog = page.getByRole('dialog', { name: 'Invite to Home' })
    await dialog.getByLabel('Google email').fill('not an address')
    await expect(dialog.getByRole('button', { name: 'Invite' })).toBeDisabled()
    await dialog.getByLabel('Google email').fill(' Dan@Example.com ')
    await dialog.getByRole('button', { name: 'Invite' }).click()
    await expect(page.getByText('Invitation sent to dan@example.com')).toBeVisible()
    await expect(members.getByText('dan@example.com')).toBeVisible()
    await expect(members.getByText('Invited today')).toBeVisible()
    await expect
      .poll(() => db.space_invites.find((i) => i.email === 'dan@example.com'))
      .toMatchObject({ space_id: HOME })

    await page.getByRole('button', { name: 'Rename' }).click()
    const rename = page.getByRole('dialog', { name: 'Rename household' })
    await rename.getByLabel('Name').fill('The flat')
    await rename.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'The flat', level: 1 })).toBeVisible()
    await expect.poll(() => db.spaces.find((s) => s.id === HOME)?.name).toBe('The flat')
  })

  test('HSH-004 2, 3: the owner removes a member, then deletes, warned who it’s deleted for', async ({
    page,
  }) => {
    const db = await start(page, `/settings/households/${HOME}`)
    await page.getByRole('button', { name: 'Sam Carter options' }).click()
    await page.getByRole('menuitem', { name: 'Remove' }).click()
    const removing = page.getByRole('alertdialog', { name: 'Remove Sam Carter?' })
    await removing.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText('Sam Carter')).toHaveCount(0)
    await expect
      .poll(() => db.space_members.some((m) => m.space_id === HOME && m.person_id === SAM))
      .toBe(false)

    // An owner can't leave, only delete.
    await expect(page.getByRole('button', { name: 'Leave household' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Delete household' }).click()
    const deleting = page.getByRole('alertdialog', { name: 'Delete Home?' })
    await expect(deleting).toContainText('What you shared becomes yours alone')
    await deleting.getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(card(page).getByRole('link', { name: /Home/ })).toHaveCount(0)
    await expect.poll(() => db.spaces.some((s) => s.id === HOME)).toBe(false)
  })

  test('HSH-004 3: deleting names everyone it is deleted for', async ({ page }) => {
    await start(page, `/settings/households/${HOME}`)
    await page.getByRole('button', { name: 'Delete household' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Delete Home?' })).toContainText(
      'Deleted for Sam Carter too',
    )
  })

  test('HSH-002 3, HSH-004 1: a member can’t invite or rename, and leaves', async ({ page }) => {
    const db = await start(page, `/settings/households/${ALLOTMENT}`)
    await expect(page.getByRole('heading', { name: 'Allotment', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Invite' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Rename' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sam Carter options' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Leave household' }).click()
    await page
      .getByRole('alertdialog', { name: 'Leave Allotment?' })
      .getByRole('button', { name: 'Leave' })
      .click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(card(page).getByRole('link', { name: /Allotment/ })).toHaveCount(0)
    await expect
      .poll(() => db.space_members.some((m) => m.space_id === ALLOTMENT && m.person_id === ANN.id))
      .toBe(false)
  })
})
