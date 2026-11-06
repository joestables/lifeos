import { describe, expect, it } from 'vitest'
import { plan, type Rpc } from './run.ts'

describe("WID-002: the Today widget's days", () => {
  it('asks the database as the device, and hands over each day', async () => {
    const calls: [string, Record<string, unknown>][] = []
    const rpc: Rpc = async (fn, args) => {
      calls.push([fn, args])
      return [
        { day: '2026-11-06', cards: [{ id: 'i1', title: 'Pay rent' }] },
        { day: '2026-11-07', cards: null },
      ]
    }
    expect(await plan(rpc, { device: 'd1', secret: 's' })).toEqual({
      days: [
        { day: '2026-11-06', cards: [{ id: 'i1', title: 'Pay rent' }] },
        { day: '2026-11-07', cards: [] },
      ],
    })
    expect(calls).toEqual([['device_plan', { p_device: 'd1', p_secret: 's' }]])
  })

  it('without a device and its secret, nothing is asked', async () => {
    const rpc: Rpc = async () => {
      throw new Error('should not ask')
    }
    expect(await plan(rpc, { secret: 's' })).toBeNull()
  })
})
