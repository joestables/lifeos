import { describe, expect, it } from 'vitest'
import { parseCapture } from './parse.ts'

// Sunday 11 October 2026, 14:00, on the device.
const NOW = new Date(2026, 9, 11, 14, 0)
const parse = (line: string, now = NOW) => parseCapture(line, now)

describe('CAP-003: dates and times, understood the same way everywhere', () => {
  it('1: a bare date is the day to do it, the coming one', () => {
    expect(parse('renew insurance fri')).toEqual({ doOn: '2026-10-16', title: 'Renew insurance' })
    expect(parse('bins sun').doOn).toBeUndefined()
    expect(parse('bins on sun').doOn).toBe('2026-10-11')
    expect(parse('call dad friday', new Date(2026, 9, 16, 9)).doOn).toBe('2026-10-16')
  })

  it.each([
    ['today', '2026-10-11'],
    ['tomorrow', '2026-10-12'],
    ['tmrw', '2026-10-12'],
    ['monday', '2026-10-12'],
    ['next week', '2026-10-12'],
    ['in 3 days', '2026-10-14'],
    ['12 oct', '2026-10-12'],
    ['12/10', '2026-10-12'],
    ['3 may', '2027-05-03'],
    ['10 oct', '2027-10-10'],
  ])('1: "pay it %s" is done on %s', (words, day) => {
    expect(parse(`pay it ${words}`)).toEqual({ doOn: day, title: 'Pay it' })
  })

  it('1: "next week" from a Monday is the Monday after', () => {
    expect(parse('plan trip next week', new Date(2026, 9, 12, 9)).doOn).toBe('2026-10-19')
  })

  it('2: a time with the date', () => {
    expect(parse('call mum fri 6pm')).toEqual({
      doOn: '2026-10-16',
      doAt: '18:00',
      title: 'Call mum',
    })
    expect(parse('dentist tue 3pm?')).toEqual({
      doOn: '2026-10-13',
      doAt: '15:00',
      title: 'Dentist?',
    })
  })

  it.each([
    ['18:00', '18:00'],
    ['6.30pm', '18:30'],
    ['6:30pm', '18:30'],
    ['at 5', '17:00'],
    ['at 9', '09:00'],
    ['07:30', '07:30'],
  ])('2: "%s" is %s', (words, at) => {
    expect(parse(`call mum fri ${words}`).doAt).toBe(at)
  })

  it('2: a time with no date is today, or tomorrow if it has passed', () => {
    expect(parse('call mum 6pm')).toMatchObject({ doOn: '2026-10-11', doAt: '18:00' })
    expect(parse('call mum 9am')).toMatchObject({ doOn: '2026-10-12', doAt: '09:00' })
  })

  it('3: "due" or "by" makes it the deadline, not the day to do it', () => {
    expect(parse('renew insurance due fri')).toEqual({
      dueOn: '2026-10-16',
      title: 'Renew insurance',
    })
    expect(parse('renew insurance by fri')).toEqual({
      dueOn: '2026-10-16',
      title: 'Renew insurance',
    })
    expect(parse('start essay tue due fri')).toEqual({
      doOn: '2026-10-13',
      dueOn: '2026-10-16',
      title: 'Start essay',
    })
  })

  it.each([
    'may need new tyres',
    'sun cream',
    'sat by the fire',
    'march for climate',
    'second hand bike',
  ])('4: "%s" has no date', (line) => {
    const parsed = parse(line)
    expect(parsed.doOn ?? parsed.dueOn).toBeUndefined()
  })

  it('4: an ambiguous word is a date next to a number or after "on"', () => {
    expect(parse('dentist 3 may').doOn).toBe('2027-05-03')
    expect(parse('dentist may 3').doOn).toBe('2027-05-03')
    expect(parse('picnic on sat').doOn).toBe('2026-10-17')
    expect(parse('picnic on sat').title).toBe('Picnic')
  })

  it('5: the title loses its date words and starts with a capital', () => {
    expect(parse('buy milk at 5').title).toBe('Buy milk')
    expect(parse('ceramics class for the anniversary?')).toEqual({
      title: 'Ceramics class for the anniversary?',
    })
  })

  it.each([
    'buy 2 eggs',
    'read chapter 3',
    'book a table for 4',
    'pay £40 to Sam',
    'call 0800 123 456',
  ])('a number alone is not a date: "%s"', (line) => {
    const parsed = parse(line)
    expect(parsed.doOn ?? parsed.dueOn).toBeUndefined()
  })
})
