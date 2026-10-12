/** Calls a core database function as the service role. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

/** A delivery core.claim_deliveries hands over: where, how long it may wait, what it says. */
export interface Claimed {
  id: number
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
export async function sendAll(rpc: Rpc, send: Send, rounds = 5) {
  const totals = { sent: 0, failed: 0, gone: 0, skipped: 0 }
  for (let round = 0; round < rounds; round++) {
    const claimed = (await rpc('claim_deliveries', { p_limit: 100 })) as Claimed[]
    if (claimed.length === 0) break
    const results = await Promise.all(claimed.map((c) => sendOne(send, c)))
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
