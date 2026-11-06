// send-notifications: sends what the minute job queued (ADR-0044), woken by
// core_private.notifications_tick through pg_net with a secret kept in
// Vault, which this function checks with the database
// (core.push_secret_ok); the Android app's devices by FCM, with the
// Firebase key in Vault (ADR-0063). Deployed by Claude through the Supabase
// MCP (runbook.md#notifications).
import webpush from 'npm:web-push@3.6.7'
import {
  fcmSender,
  sendAll,
  sendLooks,
  vapidKeys,
  type Rpc,
  type Send,
  type ServiceAccount,
} from './run.ts'

const url = Deno.env.get('SUPABASE_URL')!
// The project's secret key: the new kind if it has one, else the service role.
const key =
  Object.values(
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>,
  )[0] ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const rpc: Rpc = async (fn, args) => {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      // A new secret key isn't a JWT; the gateway makes one for it.
      ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }),
      'Content-Type': 'application/json',
      'Content-Profile': 'core',
      'Accept-Profile': 'core',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

Deno.serve(async (req) => {
  const secret = req.headers.get('x-push-secret')
  if (!secret || !(await rpc('push_secret_ok', { p_secret: secret })))
    return new Response('Forbidden', { status: 403 })
  const { publicKey, privateKey } = await vapidKeys(rpc)
  // The contact the Web Push spec asks for: how a push service reaches the sender.
  webpush.setVapidDetails('mailto:joestables2002@gmail.com', publicKey, privateKey)
  const send: Send = (subscription, payload, options) =>
    webpush.sendNotification(subscription, payload, options)
  // The Android app's devices go by FCM, when its key is in Vault; without
  // it, they wait (failed, tried again) and Web Push goes on regardless.
  const account = (await rpc('fcm_service_account', {}).catch(() => null)) as string | null
  const sendFcm = account ? fcmSender(JSON.parse(account) as ServiceAccount, fetch) : undefined
  const totals = await sendAll(rpc, send, 5, sendFcm)
  // The Android apps whose Reminders changed look again (ADR-0063).
  const looks = await sendLooks(rpc, sendFcm).catch(() => 0)
  console.log(JSON.stringify({ at: 'send-notifications', ...totals, looks }))
  return Response.json({ ...totals, looks })
})
