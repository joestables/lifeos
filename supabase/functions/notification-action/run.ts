import { afterCompletion, todayIn } from '../../../packages/recurrence/src/index.ts'

/** Calls a core database function as the service role. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

/**
 * Done or Snooze from a notification's button (REM-005), proved by the
 * delivery's token, since the service worker has no session (ADR-0044).
 * Done on a Task repeated after completion makes its next, worked out with
 * the same engine as the app (ADR-0045). Both are safe to press twice.
 */
export async function act(
  rpc: Rpc,
  press: {
    delivery?: unknown
    token?: unknown
    action: unknown
    device?: unknown
    secret?: unknown
    alert?: unknown
    /** The Alert's id as the Android app before 0.1.13 sends it (ADR-0065 4). */
    reminder?: unknown
  },
  now: Date = new Date(),
): Promise<boolean> {
  const { delivery, token, action } = press
  // An Alert the Android app set itself, proved by the device's secret
  // (REM-010, ADR-0063).
  const alert = press.alert ?? press.reminder
  if (typeof alert === 'string') return actOnAlert(rpc, { ...press, alert }, now)
  if (typeof delivery !== 'number' || typeof token !== 'string') return false
  if (action !== 'done' && action !== 'snooze') return false
  const [found] = (await rpc('delivery_for_action', { p_delivery: delivery, p_token: token })) as {
    mode: string | null
    rule: string | null
    timezone: string | null
  }[]
  if (!found) return false
  const nextOn =
    action === 'done' && found.mode === 'after_completion' && found.rule && found.timezone
      ? afterCompletion(found.rule, todayIn(found.timezone, now))
      : null
  return (await rpc('act_on_delivery', {
    p_delivery: delivery,
    p_token: token,
    p_action: action,
    p_next: null,
    p_next_on: nextOn,
  })) as boolean
}

/** When Done makes a repeated-after-completion Task's next (ADR-0045). */
function nextOn(
  action: string,
  found: { mode: string | null; rule: string | null; timezone: string | null },
  now: Date,
): string | null {
  return action === 'done' && found.mode === 'after_completion' && found.rule && found.timezone
    ? afterCompletion(found.rule, todayIn(found.timezone, now))
    : null
}

async function actOnAlert(
  rpc: Rpc,
  {
    device,
    secret,
    alert,
    action,
  }: { device?: unknown; secret?: unknown; alert: string; action: unknown },
  now: Date,
): Promise<boolean> {
  if (typeof device !== 'string' || typeof secret !== 'string') return false
  if (action !== 'done' && action !== 'snooze') return false
  const [found] = (await rpc('alert_for_action', {
    p_device: device,
    p_secret: secret,
    p_alert: alert,
  })) as { mode: string | null; rule: string | null; timezone: string | null }[]
  if (!found) return false
  return (await rpc('act_on_alert', {
    p_device: device,
    p_secret: secret,
    p_alert: alert,
    p_action: action,
    p_next: null,
    p_next_on: nextOn(action, found, now),
  })) as boolean
}
