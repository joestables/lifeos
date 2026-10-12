import { describe, expect, it } from 'vitest'
import { act, type Rpc } from './run.ts'

function database(found: object | undefined) {
  const calls: [string, Record<string, unknown>][] = []
  const rpc: Rpc = async (fn, args) => {
    calls.push([fn, args])
    if (fn === 'delivery_for_action') return found ? [found] : []
    return true
  }
  return { rpc, calls }
}

// 09:00 UTC on Saturday 10 October 2026.
const NOW = new Date('2026-10-10T09:00:00Z')
const PLAIN = { mode: null, rule: null, timezone: null }

describe('REM-005: Done and Snooze from a notification', () => {
  it('1: Done ticks the Task', async () => {
    const db = database(PLAIN)
    expect(await act(db.rpc, { delivery: 7, token: 't', action: 'done' }, NOW)).toBe(true)
    expect(db.calls[1]).toEqual([
      'act_on_delivery',
      { p_delivery: 7, p_token: 't', p_action: 'done', p_next: null, p_next_on: null },
    ])
  })

  it('TSK-009: Done on a Task repeated after completion makes its next', async () => {
    const db = database({
      mode: 'after_completion',
      rule: 'FREQ=MONTHLY;INTERVAL=3',
      timezone: 'Europe/London',
    })
    await act(db.rpc, { delivery: 7, token: 't', action: 'done' }, NOW)
    expect(db.calls[1]![1].p_next_on).toBe('2027-01-10')
  })

  it('2: Snooze', async () => {
    const db = database(PLAIN)
    expect(await act(db.rpc, { delivery: 7, token: 't', action: 'snooze' }, NOW)).toBe(true)
    expect(db.calls[1]![1].p_action).toBe('snooze')
  })

  it('does nothing without its delivery and token, or for anything else', async () => {
    expect(await act(database(undefined).rpc, { delivery: 7, token: 't', action: 'done' })).toBe(
      false,
    )
    const db = database(PLAIN)
    expect(await act(db.rpc, { delivery: 7, token: 't', action: 'delete' })).toBe(false)
    expect(await act(db.rpc, { delivery: '7', token: 't', action: 'done' })).toBe(false)
    expect(db.calls).toEqual([])
  })
})
