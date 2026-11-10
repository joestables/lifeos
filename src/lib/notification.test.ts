import { describe, expect, it } from 'vitest'
import { notificationFor } from './notification'

describe('a push becomes a notification', () => {
  it('REM-004 1, REM-005, REM-006: title, time, tag, link and buttons', () => {
    const push = JSON.stringify({
      title: 'Call mum',
      body: 'Mon 12 Oct 18:30',
      url: '/item/abc',
      tag: 'reminder:r1',
      actions: [
        { action: 'done', title: 'Done' },
        { action: 'snooze', title: 'Snooze 1 hour' },
      ],
      delivery: 7,
      token: 't',
    })
    expect(notificationFor(push)).toEqual({
      title: 'Call mum',
      options: {
        body: 'Mon 12 Oct 18:30',
        icon: '/icon-192.png',
        tag: 'reminder:r1',
        data: { url: '/item/abc', delivery: 7, token: 't' },
        actions: [
          { action: 'done', title: 'Done' },
          { action: 'snooze', title: 'Snooze 1 hour' },
        ],
      },
    })
  })

  it("shows something for a push it can't read, and opens only LifeOS's own pages", () => {
    expect(notificationFor('not json').title).toBe('LifeOS')
    expect(
      notificationFor(JSON.stringify({ url: 'https://elsewhere.example' })).options.data.url,
    ).toBe('/today')
  })
})
