import { describe, expect, it } from 'vitest'
import { firings, type Rpc } from './run.ts'

describe('REM-010: the Alerts the Android app sets', () => {
  it('asks the database as the device, and hands over what each says', async () => {
    const calls: [string, Record<string, unknown>][] = []
    const rpc: Rpc = async (fn, args) => {
      calls.push([fn, args])
      return [
        { alert_id: 'r1', fires_at: '2026-11-07T09:00:00+00:00', payload: { title: 'Bins' } },
        // Its Item was done meanwhile: nothing to say, so not set.
        { alert_id: 'r2', fires_at: '2026-11-07T10:00:00+00:00', payload: null },
      ]
    }
    expect(await firings(rpc, { device: 'd1', secret: 's' })).toEqual({
      firings: [{ reminder: 'r1', at: '2026-11-07T09:00:00+00:00', payload: { title: 'Bins' } }],
    })
    expect(calls).toEqual([['device_alerts', { p_device: 'd1', p_secret: 's' }]])
  })

  it('without a device and its secret, nothing is asked', async () => {
    const rpc: Rpc = async () => {
      throw new Error('should not ask')
    }
    expect(await firings(rpc, { device: 'd1' })).toBeNull()
  })
})
