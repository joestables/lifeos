import { describe, expect, it } from 'vitest'
import { sendAll, vapidKeys, type Claimed, type Rpc, type Send } from './run.ts'

const claimed = (id: number, payload: Claimed['payload'] = { title: 'Call mum' }): Claimed => ({
  id,
  endpoint: `https://push.example/${id}`,
  p256dh: 'k',
  auth: 'a',
  ttl: 3600,
  payload,
})

/** A stand-in for the database: hands out the given rounds of deliveries, records results. */
function database(rounds: Claimed[][]) {
  const recorded: unknown[] = []
  const rpc: Rpc = async (fn, args) => {
    if (fn === 'claim_deliveries') return rounds.shift() ?? []
    if (fn === 'record_deliveries') recorded.push(...(args.p_results as unknown[]))
    return null
  }
  return { rpc, recorded }
}

describe('ADR-0044: sending what is due', () => {
  it('REM-004: sends each, once per device, its id as the topic, with high urgency', async () => {
    const db = database([[claimed(1), claimed(2)]])
    const sent: [string, string, object][] = []
    const send: Send = async (s, payload, options) => void sent.push([s.endpoint, payload, options])
    expect(await sendAll(db.rpc, send)).toEqual({ sent: 2, failed: 0, gone: 0, skipped: 0 })
    expect(sent[0]).toEqual([
      'https://push.example/1',
      '{"title":"Call mum"}',
      { TTL: 3600, topic: 'd1', urgency: 'high' },
    ])
    expect(db.recorded).toEqual([
      { id: 1, outcome: 'sent' },
      { id: 2, outcome: 'sent' },
    ])
  })

  it('REM-004 4: a device the push service says is gone; other failures are tried again', async () => {
    const db = database([[claimed(1), claimed(2)]])
    const send: Send = async (s) => {
      throw Object.assign(new Error('refused'), {
        statusCode: s.endpoint.endsWith('1') ? 410 : 500,
        body: 'nope',
      })
    }
    await sendAll(db.rpc, send)
    expect(db.recorded).toEqual([
      { id: 1, outcome: 'gone', error: '410 nope' },
      { id: 2, outcome: 'failed', error: '500 nope' },
    ])
  })

  it('REM-008 2: with nothing to say, nothing is sent', async () => {
    const db = database([[claimed(1, null)]])
    const send: Send = async () => {
      throw new Error('should not send')
    }
    await sendAll(db.rpc, send)
    expect(db.recorded).toEqual([{ id: 1, outcome: 'skipped' }])
  })

  it('takes round after round until nothing is left, and stops', async () => {
    const db = database([[claimed(1)], [claimed(2)], []])
    const totals = await sendAll(db.rpc, async () => undefined)
    expect(totals.sent).toBe(2)
  })
})

describe('the VAPID keys', () => {
  it('are made the first time, as Web Push wants them, and kept', async () => {
    let kept: { public_key: string; private_key: string } | undefined
    const rpc: Rpc = async (fn, args) => {
      if (fn === 'push_keys') return [kept ?? { public_key: null, private_key: null }]
      kept = { public_key: String(args.p_public), private_key: String(args.p_private) }
      return [kept]
    }
    const made = await vapidKeys(rpc)
    // A 65-byte uncompressed P-256 point and a 32-byte private key, base64url.
    expect(made.publicKey).toMatch(/^B[A-Za-z0-9_-]{86}$/)
    expect(made.privateKey).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(await vapidKeys(rpc)).toEqual(made)
  })
})
