/** Calls a core database function as the service role. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

/** A Reminder for the phone to set: when, and what its notification says. */
export interface Firing {
  reminder: string
  at: string
  payload: Record<string, unknown> | null
}

/**
 * The device's Reminders (REM-010, ADR-0063), or null when it hasn't said
 * which device it is; a wrong secret is refused by the database.
 */
export async function firings(
  rpc: Rpc,
  { device, secret }: { device?: unknown; secret?: unknown },
): Promise<{ firings: Firing[] } | null> {
  if (typeof device !== 'string' || typeof secret !== 'string') return null
  const rows = (await rpc('device_reminders', { p_device: device, p_secret: secret })) as {
    reminder_id: string
    fires_at: string
    payload: Record<string, unknown> | null
  }[]
  return {
    firings: rows
      .filter((r) => r.payload !== null)
      .map((r) => ({ reminder: r.reminder_id, at: r.fires_at, payload: r.payload })),
  }
}
