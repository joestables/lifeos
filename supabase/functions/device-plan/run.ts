/** Calls a core database function as the service role. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

/** A day's cards for the widget, as src/lib/today-widget.ts makes them. */
export interface PlanDay {
  day: string
  cards: unknown[]
}

/**
 * Today's and tomorrow's cards for the device's person (WID-002, ADR-0064),
 * or null when it hasn't said which device it is; a wrong secret is
 * refused by the database.
 */
export async function plan(
  rpc: Rpc,
  { device, secret }: { device?: unknown; secret?: unknown },
): Promise<{ days: PlanDay[] } | null> {
  if (typeof device !== 'string' || typeof secret !== 'string') return null
  const rows = (await rpc('device_plan', { p_device: device, p_secret: secret })) as {
    day: string
    cards: unknown[]
  }[]
  return { days: rows.map((r) => ({ day: r.day, cards: r.cards ?? [] })) }
}
