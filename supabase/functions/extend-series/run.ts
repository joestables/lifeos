import { afterCompletion, todayIn, windowOf } from '../../../packages/recurrence/src/index.ts'

/** A series as core.series_to_extend returns it. */
export interface SeriesToExtend {
  id: string
  mode: 'schedule' | 'after_completion'
  rule: string
  starts_on: string
  timezone: string
  generated_until: string | null
  ended_on: string | null
  /** After completion, with nothing open: the day its last one was done. */
  last_done_on: string | null
}

/** Calls a core database function as the service role. */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

/**
 * The nightly series run (ADR-0045), with the same engine as the app: each
 * series made 12 weeks ahead in its own timezone; an after-completion series
 * whose last one is done gets its next; then untouched occurrences overtaken
 * by a newer due one are skipped and the run's heartbeat recorded. One
 * series failing doesn't stop the rest; the run reports it.
 */
export async function extendAll(rpc: Rpc, now: Date = new Date()) {
  const series = (await rpc('series_to_extend', {})) as SeriesToExtend[]
  let made = 0
  const failed: { series: string; message: string }[] = []
  for (const s of series) {
    try {
      const today = todayIn(s.timezone, now)
      if (s.mode === 'schedule') {
        const { days, until } = windowOf(s.rule, s.starts_on, s.generated_until, today)
        const kept = s.ended_on ? days.filter((d) => d <= s.ended_on!) : days
        if (kept.length === 0 && until === s.generated_until) continue
        await rpc('extend_series', { p_series: s.id, p_days: kept, p_until: until })
        made += kept.length
      } else if (s.last_done_on) {
        const next = afterCompletion(s.rule, s.last_done_on)
        await rpc('extend_series', { p_series: s.id, p_days: [next], p_until: next })
        made += 1
      }
    } catch (e) {
      failed.push({ series: s.id, message: String(e).slice(0, 300) })
    }
  }
  const skipped = await rpc('finish_series_run', {
    p_ok: failed.length === 0,
    p_details: { series: series.length, made, failed: failed.slice(0, 10) },
  })
  return { series: series.length, made, skipped, failed: failed.length }
}
