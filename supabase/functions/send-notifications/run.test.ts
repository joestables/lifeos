import { describe, expect, it } from 'vitest'
import {
  fcmMessage,
  fcmSender,
  sendAll,
  sendLooks,
  vapidKeys,
  type Claimed,
  type FcmMessage,
  type Rpc,
  type Send,
} from './run.ts'

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

describe('ADR-0063: the Android app by FCM', () => {
  const fcm = (id: number, tag = `reminder:r${id}`): Claimed => ({
    id,
    kind: 'fcm',
    endpoint: `fcm-token-${id}`,
    p256dh: null,
    auth: null,
    ttl: 3600,
    payload: {
      title: 'Renew car insurance',
      body: 'Fri 6 Nov 09:00',
      url: '/item/i1',
      tag,
      colour: 'blue',
      actions: [{ action: 'done', title: 'Done' }],
      delivery: id,
      token: 't',
    },
  })

  it('REM-001 4: a data message with what Web Push would say, high priority, collapsed by delivery', () => {
    expect(fcmMessage(fcm(7), 'reminder')).toEqual({
      token: 'fcm-token-7',
      data: {
        type: 'notify',
        kind: 'reminder',
        title: 'Renew car insurance',
        body: 'Fri 6 Nov 09:00',
        url: '/item/i1',
        tag: 'reminder:r7',
        colour: 'blue',
        actions: '[{"action":"done","title":"Done"}]',
        delivery: '7',
        token: 't',
      },
      android: { priority: 'HIGH', ttl: '3600s', collapse_key: 'd7' },
    })
  })

  it('goes by FCM, Web Push devices as before; the digest and nudges say their kind', async () => {
    const db = database([[fcm(1), fcm(2, 'digest:p'), claimed(3)]])
    const viaFcm: FcmMessage[] = []
    const viaPush: string[] = []
    const totals = await sendAll(
      db.rpc,
      async (s) => void viaPush.push(s.endpoint),
      5,
      async (m) => void viaFcm.push(m),
    )
    expect(totals).toEqual({ sent: 3, failed: 0, gone: 0, skipped: 0 })
    expect(viaFcm.map((m) => [m.token, m.data.kind])).toEqual([
      ['fcm-token-1', 'reminder'],
      ['fcm-token-2', 'digest'],
    ])
    expect(viaPush).toEqual(['https://push.example/3'])
  })

  it('a token FCM no longer knows is gone; with no key, FCM devices fail and are tried again', async () => {
    const db = database([[fcm(1)]])
    await sendAll(
      db.rpc,
      async () => undefined,
      5,
      async () => {
        throw Object.assign(new Error('refused'), { statusCode: 404, body: 'UNREGISTERED' })
      },
    )
    expect(db.recorded).toEqual([{ id: 1, outcome: 'gone', error: '404 UNREGISTERED' }])
    const none = database([[fcm(2)]])
    await sendAll(none.rpc, async () => undefined)
    expect(none.recorded).toEqual([{ id: 2, outcome: 'failed', error: 'FCM is not set up' }])
  })

  it('signs in as the service account once, then sends to the project', async () => {
    const pair = (await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )) as {
      privateKey: Parameters<typeof crypto.subtle.exportKey>[1]
      publicKey: Parameters<typeof crypto.subtle.verify>[1]
    }
    const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`
    const calls: [string, RequestInit][] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push([url, init])
      if (url.includes('oauth2')) return Response.json({ access_token: 'ya29.x' })
      return Response.json({ name: 'projects/p/messages/1' })
    }) as unknown as typeof fetch
    const send = fcmSender(
      { project_id: 'lifeos-test', client_email: 'sa@lifeos-test.iam', private_key: pem },
      fetcher,
    )
    await send(fcmMessage(fcm(1), 'reminder'))
    await send(fcmMessage(fcm(2), 'reminder'))
    expect(calls.map(([u]) => u)).toEqual([
      'https://oauth2.googleapis.com/token',
      'https://fcm.googleapis.com/v1/projects/lifeos-test/messages:send',
      'https://fcm.googleapis.com/v1/projects/lifeos-test/messages:send',
    ])
    const assertion = new URLSearchParams(String(calls[0]![1].body)).get('assertion')!
    const [header, claims, signature] = assertion.split('.')
    const decode = (s: string) =>
      Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))
    expect(JSON.parse(new TextDecoder().decode(decode(claims!)))).toMatchObject({
      iss: 'sa@lifeos-test.iam',
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })
    expect(
      await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        pair.publicKey,
        decode(signature!),
        new TextEncoder().encode(`${header}.${claims}`),
      ),
    ).toBe(true)
    expect((calls[1]![1].headers as Record<string, string>).Authorization).toBe('Bearer ya29.x')
  })
})

describe('REM-010 2: telling the Android app to look again', () => {
  it('sends each device whose Reminders changed a message saying only that', async () => {
    const rpc: Rpc = async (fn) =>
      fn === 'claim_looks' ? [{ device_id: 'd1', endpoint: 'fcm-token-1' }] : null
    const sent: FcmMessage[] = []
    expect(await sendLooks(rpc, async (m) => void sent.push(m))).toBe(1)
    expect(sent).toEqual([
      {
        token: 'fcm-token-1',
        data: { type: 'look' },
        android: { priority: 'HIGH', ttl: '86400s', collapse_key: 'look' },
      },
    ])
  })

  it('without FCM set up, nothing is claimed', async () => {
    const rpc: Rpc = async () => {
      throw new Error('should not claim')
    }
    expect(await sendLooks(rpc, undefined)).toBe(0)
  })
})
