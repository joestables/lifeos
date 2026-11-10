import { describe, expect, it } from 'vitest'
import { readLine } from './reminder.ts'

// Monday 9 November 2026, 14:20, on the device.
const NOW = new Date(2026, 10, 9, 14, 20)
const read = (line: string, now = NOW) => {
  const r = readLine(line, now, '09:00')
  return { title: r.title, alerts: r.alerts.map((a) => `${a.day} ${a.time}`) }
}

describe('NEW-003: times are understood, and kept out of the title', () => {
  it('1: "clean bedroom tues 8pm" is Clean bedroom, Tuesday 20:00', () => {
    expect(read('clean bedroom tues 8pm')).toEqual({
      title: 'Clean bedroom',
      alerts: ['2026-11-10 20:00'],
    })
    expect(read('dentist thurs 3pm').alerts).toEqual(['2026-11-12 15:00'])
    expect(read('bins weds 7am').alerts).toEqual(['2026-11-11 07:00'])
  })

  it('2: "and 9pm" is a second Alert the same day', () => {
    expect(read('clean bedroom tues 8pm and 9pm')).toEqual({
      title: 'Clean bedroom',
      alerts: ['2026-11-10 20:00', '2026-11-10 21:00'],
    })
    expect(read('parcel thu 9am, 12pm')).toEqual({
      title: 'Parcel',
      alerts: ['2026-11-12 09:00', '2026-11-12 12:00'],
    })
  })

  it('3: a date with no time is at my default time', () => {
    expect(read('call mum tomorrow')).toEqual({ title: 'Call mum', alerts: ['2026-11-10 09:00'] })
  })

  it('4: a time with no date is today, or tomorrow once it has gone; a weekday the next, today while its time is to come', () => {
    expect(read('bins out 7pm').alerts).toEqual(['2026-11-09 19:00'])
    expect(read('bins out 9am').alerts).toEqual(['2026-11-10 09:00'])
    expect(read('gym mon 8pm').alerts).toEqual(['2026-11-09 20:00'])
    expect(read('gym mon 9am').alerts).toEqual(['2026-11-16 09:00'])
  })

  it('5: "in 2 hours", "tonight", "this weekend" as the quick times', () => {
    expect(read('water plants in 2 hours')).toEqual({
      title: 'Water plants',
      alerts: ['2026-11-09 16:20'],
    })
    expect(read('tidy up tonight').alerts).toEqual(['2026-11-09 18:00'])
    expect(read('paint shed this weekend').alerts).toEqual(['2026-11-14 09:00'])
  })

  it('6: nothing typed is in the past; the words stay', () => {
    expect(read('pay it today 9am')).toEqual({ title: 'Pay it today 9am', alerts: [] })
  })

  it('7: "every tuesday" sets no Repeat, only the coming Tuesday', () => {
    expect(read('bins out every tuesday')).toEqual({
      title: 'Bins out',
      alerts: ['2026-11-10 09:00'],
    })
  })

  it('a line with no time has no Alert; ordinary words stay words', () => {
    expect(read('buy milk')).toEqual({ title: 'Buy milk', alerts: [] })
    expect(read('may I borrow the ladder')).toEqual({
      title: 'May I borrow the ladder',
      alerts: [],
    })
  })

  it('a short day name is one word: "tues" is all the words for Tuesday', () => {
    expect(readLine('clean bedroom tues', NOW, '09:00').alerts[0]).toMatchObject({
      text: 'tues',
      to: 18,
    })
  })

  it('words I kept as words are not read again (NEW-004 3)', () => {
    expect(readLine('meet at 8pm', NOW, '09:00', ['at 8pm'])).toMatchObject({
      title: 'Meet at 8pm',
      alerts: [],
    })
  })
})
