/** Calls a core database function as the service role. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

/** A delivery core.claim_deliveries hands over: where, how long it may wait, what it says. */
export interface Claimed {
  id: number
  /** `web_push`, or `fcm` for the Android app (ADR-0063). */
  kind?: string
  endpoint: string
  p256dh: string | null
  auth: string | null
  ttl: number
  /** Null when there is nothing to say any more (the digest found nothing). */
  payload: Record<string, unknown> | null
}

/** Sends one Web Push message; throws with the push service's statusCode when it refuses. */
export type Send = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  options: { TTL: number; topic: string; urgency: 'high' },
) => Promise<unknown>

/** Sends one FCM message; throws with FCM's statusCode when it refuses. */
export type SendFcm = (message: FcmMessage) => Promise<unknown>

export interface FcmMessage {
  token: string
  /** FCM data is strings only. */
  data: Record<string, string>
  android: { priority: 'HIGH'; ttl: string; collapse_key: string }
}

export type Outcome = {
  id: number
  outcome: 'sent' | 'failed' | 'gone' | 'skipped'
  error?: string
}

/**
 * Sends what is due (ADR-0044): claims deliveries, sends each by Web Push,
 * and records each result, round after round until nothing is left (at most
 * `rounds`, so one run can't go on for ever).
 *
 * - The delivery's id is the message's topic, so a push service holding a
 *   repeat replaces it rather than adding a second (REM-004 2).
 * - Urgency is high: Android holds normal pushes in Doze for tens of
 *   minutes, and every LifeOS notification has a time in it (v1, 14
 *   September 2026).
 * - 404 and 410 mean the device is gone; anything else is tried again next
 *   minute, until its 12 hours are up.
 */
export async function sendAll(rpc: Rpc, send: Send, rounds = 5, sendFcm?: SendFcm) {
  const totals = { sent: 0, failed: 0, gone: 0, skipped: 0 }
  for (let round = 0; round < rounds; round++) {
    const claimed = (await rpc('claim_deliveries', { p_limit: 100 })) as Claimed[]
    if (claimed.length === 0) break
    const results = await Promise.all(
      claimed.map((c) => (c.kind === 'fcm' ? sendOneFcm(sendFcm, c) : sendOne(send, c))),
    )
    await rpc('record_deliveries', { p_results: results })
    for (const r of results) totals[r.outcome]++
  }
  return totals
}

async function sendOne(send: Send, c: Claimed): Promise<Outcome> {
  if (!c.payload || !c.p256dh || !c.auth) return { id: c.id, outcome: 'skipped' }
  try {
    await send(
      { endpoint: c.endpoint, keys: { p256dh: c.p256dh, auth: c.auth } },
      JSON.stringify(c.payload),
      { TTL: c.ttl, topic: `d${c.id}`, urgency: 'high' },
    )
    return { id: c.id, outcome: 'sent' }
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    const error = `${status ?? ''} ${String((e as { body?: string }).body ?? e)}`
      .trim()
      .slice(0, 300)
    return { id: c.id, outcome: status === 404 || status === 410 ? 'gone' : 'failed', error }
  }
}

/**
 * A delivery as the Android app's FCM message (ADR-0063): a data message,
 * so the app shows it itself in LifeOS's own channels, with what the Web
 * Push payload says. High priority, as Web Push's urgency; collapsed by the
 * delivery's id, so a repeat replaces rather than adds (REM-004 2).
 */
export function fcmMessage(c: Claimed, kind: string): FcmMessage {
  const p = c.payload ?? {}
  const text = (v: unknown) => (v === undefined || v === null ? '' : String(v))
  return {
    token: c.endpoint,
    data: {
      type: 'notify',
      kind,
      title: text(p.title),
      body: text(p.body),
      url: text(p.url),
      tag: text(p.tag),
      colour: text(p.colour),
      actions: JSON.stringify(p.actions ?? []),
      delivery: text(p.delivery),
      token: text(p.token),
    },
    android: { priority: 'HIGH', ttl: `${c.ttl}s`, collapse_key: `d${c.id}` },
  }
}

async function sendOneFcm(sendFcm: SendFcm | undefined, c: Claimed): Promise<Outcome> {
  if (!c.payload) return { id: c.id, outcome: 'skipped' }
  if (!sendFcm) return { id: c.id, outcome: 'failed', error: 'FCM is not set up' }
  try {
    const tag = String(c.payload.tag ?? '')
    const kind = tag.startsWith('digest:')
      ? 'digest'
      : tag.startsWith('overdue:')
        ? 'overdue'
        : 'reminder'
    await sendFcm(fcmMessage(c, kind))
    return { id: c.id, outcome: 'sent' }
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    const body = String((e as { body?: string }).body ?? e)
    const error = `${status ?? ''} ${body}`.trim().slice(0, 300)
    // FCM says a token is no longer the app's: 404 (UNREGISTERED).
    return {
      id: c.id,
      outcome: status === 404 || body.includes('UNREGISTERED') ? 'gone' : 'failed',
      error,
    }
  }
}

/**
 * Tells each Android app whose Reminders changed to look again (REM-010 2,
 * ADR-0063): a data message saying only that, so it fetches them itself. A
 * token FCM no longer knows is left for the next delivery to mark gone.
 */
export async function sendLooks(rpc: Rpc, sendFcm: SendFcm | undefined): Promise<number> {
  if (!sendFcm) return 0
  const devices = (await rpc('claim_looks', {})) as { device_id: string; endpoint: string }[]
  const sent = await Promise.allSettled(
    devices.map((d) =>
      sendFcm({
        token: d.endpoint,
        data: { type: 'look' },
        android: { priority: 'HIGH', ttl: '86400s', collapse_key: 'look' },
      }),
    ),
  )
  return sent.filter((s) => s.status === 'fulfilled').length
}

/** The Firebase service account's key, as Google gives it (Vault's `fcm_service_account`). */
export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
  token_uri?: string
}

/**
 * Sends through FCM's HTTP v1 API with the service account (ADR-0063): a
 * signed JWT traded for an access token, kept for the run.
 */
export function fcmSender(account: ServiceAccount, fetcher: typeof fetch): SendFcm {
  let access: Promise<string> | undefined
  return async (message) => {
    access ??= accessToken(account, fetcher)
    const res = await fetcher(
      `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await access}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      },
    )
    if (!res.ok)
      throw Object.assign(new Error('FCM refused'), {
        statusCode: res.status,
        body: (await res.text()).slice(0, 300),
      })
    return res.json()
  }
}

/** Google's OAuth for a service account: an RS256 JWT for the messaging scope. */
async function accessToken(account: ServiceAccount, fetcher: typeof fetch): Promise<string> {
  const uri = account.token_uri ?? 'https://oauth2.googleapis.com/token'
  const now = Math.floor(Date.now() / 1000)
  const enc = (o: object) => base64url(new TextEncoder().encode(JSON.stringify(o)))
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: uri,
    iat: now,
    exp: now + 3600,
  })}`
  const der = Uint8Array.from(
    atob(account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')),
    (c) => c.charCodeAt(0),
  )
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)),
  )
  const res = await fetcher(uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  })
  const body = (await res.json().catch(() => ({}))) as { access_token?: string }
  if (!res.ok || !body.access_token) throw new Error(`Google token: ${res.status}`)
  return body.access_token
}

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
const fromBase64url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))

/**
 * The VAPID keys: kept in Vault, and made here the first time, so the
 * private key is never copied anywhere (integration-setup.md#web-push).
 */
export async function vapidKeys(rpc: Rpc): Promise<{ publicKey: string; privateKey: string }> {
  const [stored] = (await rpc('push_keys', {})) as {
    public_key: string | null
    private_key: string | null
  }[]
  if (stored?.public_key && stored.private_key)
    return { publicKey: stored.public_key, privateKey: stored.private_key }
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as { privateKey: Parameters<typeof crypto.subtle.exportKey>[1] }
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  // The public key as Web Push wants it: the uncompressed point, 0x04 ‖ x ‖ y.
  const point = new Uint8Array([4, ...fromBase64url(jwk.x!), ...fromBase64url(jwk.y!)])
  const [kept] = (await rpc('set_push_keys', {
    p_public: base64url(point),
    p_private: jwk.d!,
  })) as { public_key: string; private_key: string }[]
  return { publicKey: kept!.public_key, privateKey: kept!.private_key }
}
