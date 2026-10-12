import { describe, expect, it } from 'vitest'
import { extendAll, type SeriesToExtend } from './run.ts'

const series = (fields: Partial<SeriesToExtend>): SeriesToExtend => ({
  id: 's',
  mode: 'schedule',
  rule: 'FREQ=WEEKLY;BYDAY=MO',
  starts_on: '2026-10-12',
  timezone: 'Europe/London',
  generated_until: '2027-01-11',
  ended_on: null,
  last_done_on: null,
  ...fields,
})

/** A stand-in for the database: records each call. */
function database(rows: SeriesToExtend[], failFor?: string) {
  const calls: [string, Record<string, unknown>][] = []
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    calls.push([fn, args])
    if (fn === 'series_to_extend') return rows
    if (fn === 'extend_series' && args.p_series === failFor) throw new Error('refused')
    if (fn === 'finish_series_run') return 0
    return null
  }
  return { rpc, calls }
}

// 02:00 UTC on Tuesday 20 October 2026.
const NIGHT = new Date('2026-10-20T02:00:00Z')

describe('ADR-0045: the nightly series run', () => {
  it('TSK-008 4: keeps each series made twelve weeks ahead, from where it stopped', async () => {
    const db = database([series({})])
    await extendAll(db.rpc, NIGHT)
    expect(db.calls[1]).toEqual([
      'extend_series',
      { p_series: 's', p_days: ['2027-01-18'], p_until: '2027-01-18' },
    ])
  })

  it('makes nothing past the day a series was stopped', async () => {
    const db = database([series({ generated_until: '2026-10-19', ended_on: '2026-10-26' })])
    await extendAll(db.rpc, NIGHT)
    expect(db.calls[1]![1].p_days).toEqual(['2026-10-26'])
  })

  it('TSK-009: makes the next of an after-completion series whose last one is done', async () => {
    const db = database([
      series({
        mode: 'after_completion',
        rule: 'FREQ=MONTHLY;INTERVAL=3',
        last_done_on: '2026-10-10',
      }),
    ])
    await extendAll(db.rpc, NIGHT)
    expect(db.calls[1]).toEqual([
      'extend_series',
      { p_series: 's', p_days: ['2027-01-10'], p_until: '2027-01-10' },
    ])
  })

  it('one series failing doesn’t stop the rest, and the run says so', async () => {
    const db = database(
      [series({ id: 'bad', generated_until: null }), series({ id: 'good', generated_until: null })],
      'bad',
    )
    const result = await extendAll(db.rpc, NIGHT)
    expect(db.calls.filter(([fn]) => fn === 'extend_series')).toHaveLength(2)
    expect(result.failed).toBe(1)
    expect(db.calls.at(-1)![1]).toMatchObject({ p_ok: false })
  })

  it('finishes every run, so its heartbeat is recorded', async () => {
    const db = database([])
    await extendAll(db.rpc, NIGHT)
    expect(db.calls.map(([fn]) => fn)).toEqual(['series_to_extend', 'finish_series_run'])
  })
})
