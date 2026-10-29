import { supabase } from './supabase'

/**
 * Problems the app notices go to ops.events (runbook.md#noticing-problems):
 * what happened, the screen, and the last few actions — never the content of
 * Items. Actions are recorded by kind of control and path, not by their text.
 */

type Action = { at: string; did: string }
const LAST_ACTIONS = 10
const KEEP_UNSENT = 20

const actions: Action[] = []
const unsent: Parameters<typeof send>[0][] = []
let sending = false

/** Remembers one action, keeping the last ten. */
export function noteAction(did: string): void {
  actions.push({ at: new Date().toISOString(), did })
  if (actions.length > LAST_ACTIONS) actions.shift()
}

export function lastActions(): readonly Action[] {
  return actions
}

function send(report: {
  p_kind: string
  p_message: string
  p_screen: string
  p_actions: Action[]
  p_details: Record<string, string | number | boolean | null>
  p_app_version: string
}) {
  return supabase().rpc('report_event', report)
}

/** Sends what is waiting; anything that can't be sent now waits for the next try. */
export async function sendReports(): Promise<void> {
  if (sending) return
  sending = true
  try {
    while (unsent.length > 0) {
      const { error } = await send(unsent[0]!)
      if (error) break
      unsent.shift()
    }
  } catch {
    // Offline or signed out: kept for the next try.
  } finally {
    sending = false
  }
}

/** Records a problem. Never throws: reporting must not cause a second one. */
export function reportEvent(
  kind: string,
  message: string,
  details: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  unsent.push({
    p_kind: kind,
    p_message: message,
    p_screen: typeof location === 'undefined' ? '' : location.pathname,
    p_actions: [...actions],
    p_details: details,
    p_app_version: __APP_VERSION__,
  })
  if (unsent.length > KEEP_UNSENT) unsent.shift()
  return sendReports()
}

/** What a click is recorded as: the kind of control and where a link goes, never its text. */
export function describeClick(target: Element): string | undefined {
  const control = target.closest('button, a, [role]')
  if (!control) return undefined
  const kind =
    control.getAttribute('data-slot') ??
    control.getAttribute('role') ??
    control.tagName.toLowerCase()
  const href = control.getAttribute('href')
  return href?.startsWith('/') ? `click ${kind} ${href}` : `click ${kind}`
}

/** Starts noticing: uncaught errors and rejections, clicks, and reconnecting. */
export function startReporting(): void {
  window.addEventListener('error', (e) => {
    // The browser's notice that a resize took two frames: harmless.
    if (/^ResizeObserver loop/.test(e.message)) return
    void reportEvent('error', e.message, { file: e.filename ?? null, line: e.lineno ?? null })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as { message?: unknown } | undefined
    void reportEvent('error', String(reason?.message ?? e.reason))
  })
  document.addEventListener(
    'click',
    (e) => {
      const did = e.target instanceof Element ? describeClick(e.target) : undefined
      if (did) noteAction(did)
    },
    true,
  )
  window.addEventListener('online', () => void sendReports())
}
