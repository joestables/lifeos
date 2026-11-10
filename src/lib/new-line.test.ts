import { describe, expect, it } from 'vitest'
import { likeliest, pillLabel, quickTimes, settled, withoutWords } from './new-line'

// Monday 9 November 2026, 14:20, on the device.
const NOW = new Date(2026, 10, 9, 14, 20)

describe('"New"', () => {
  it('NEW-004 1: a pill says Today, Tomorrow, or the date, and the time', () => {
    expect(pillLabel({ day: '2026-11-09', time: '18:00' }, NOW)).toBe('Today 18:00')
    expect(pillLabel({ day: '2026-11-10', time: '07:00' }, NOW)).toBe('Tomorrow 07:00')
    expect(pillLabel({ day: '2026-11-12', time: '20:00' }, NOW)).toBe('Thu 12 Nov, 20:00')
  })

  it('NEW-005: the quick times for the afternoon', () => {
    const times = quickTimes(NOW, '09:00')
    expect(times.map((t) => [t.label, t.alert.day, t.alert.time, t.when])).toEqual([
      ['In 1 hour', '2026-11-09', '15:20', '15:20'],
      ['This evening', '2026-11-09', '18:00', '18:00'],
      ['Tomorrow morning', '2026-11-10', '09:00', 'Tue 09:00'],
      ['This weekend', '2026-11-14', '09:00', 'Sat 09:00'],
    ])
    expect(likeliest(times, NOW).label).toBe('This evening')
  })

  it('NEW-005 1: from 17:00 the likeliest is Tomorrow morning; after 18:00 This evening has gone', () => {
    const five = new Date(2026, 10, 9, 17, 30)
    expect(likeliest(quickTimes(five, '09:00'), five).label).toBe('Tomorrow morning')
    const late = new Date(2026, 10, 9, 19, 0)
    expect(quickTimes(late, '09:00').map((t) => t.label)).toEqual([
      'In 1 hour',
      'Tomorrow morning',
      'This weekend',
    ])
  })

  it('NEW-005 3: This weekend on a Saturday morning is today; once its time has gone, the next', () => {
    expect(quickTimes(new Date(2026, 10, 14, 8, 0), '09:00').at(-1)!.alert.day).toBe('2026-11-14')
    expect(quickTimes(new Date(2026, 10, 14, 10, 0), '09:00').at(-1)!.alert.day).toBe('2026-11-21')
  })

  it('NEW-003 1: the words leave once a whole word that is not part of a time follows them', () => {
    const line = 'clean bedroom tues 8pm'
    const alert = { to: line.length }
    expect(settled(line, alert)).toBe(false)
    expect(settled(`${line} and `, alert)).toBe(false)
    expect(settled(`${line} w`, alert)).toBe(false)
    expect(settled(`${line} with `, alert)).toBe(true)
    expect(withoutWords(`${line} with `, [{ from: 14, to: line.length }])).toBe(
      'clean bedroom with ',
    )
    expect(withoutWords('bins out 7pm', [{ from: 9, to: 12 }])).toBe('bins out ')
  })
})
