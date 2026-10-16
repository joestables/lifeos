import { describe, expect, it } from 'vitest'
import { applyPendingCalendar, type Calendar, type CalendarLink } from './calendar'
import type { QueueEntry } from './queue/store'

const entry = (fn: string, args: Record<string, unknown>): QueueEntry =>
  ({ id: fn + JSON.stringify(args), fn, args, itemIds: [], state: 'pending', attempts: 0 }) as never

const link = (id: string, level: CalendarLink['level'], new_events = false): CalendarLink => ({
  id,
  calendar_id: id,
  name: id,
  can_edit: true,
  is_primary: false,
  level,
  new_events,
})

const cal = (links: CalendarLink[]): Calendar => ({ connection: null, links, refs: [] })
const shape = (c: Calendar) => c.links.map((l) => [l.id, l.level, l.new_events])

describe('calendar', () => {
  it('GCL-002 1, 2: a calendar made two-way, then where new Events go, shows at once', () => {
    const now = applyPendingCalendar(cal([link('ann', 'two_way', true), link('work', 'off')]), [
      entry('set_calendar_level', { p_link: 'work', p_level: 'two_way' }),
      entry('set_new_events_calendar', { p_link: 'work' }),
    ])
    expect(shape(now)).toEqual([
      ['ann', 'two_way', false],
      ['work', 'two_way', true],
    ])
  })

  it('GCL-002 2: a calendar that stops being two-way stops being where new Events go', () => {
    const now = applyPendingCalendar(cal([link('ann', 'two_way', true)]), [
      entry('set_calendar_level', { p_link: 'ann', p_level: 'incoming' }),
    ])
    expect(shape(now)).toEqual([['ann', 'incoming', false]])
  })
})
