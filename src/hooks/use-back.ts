import { useLocation, useRouter, type AnyRouter } from '@tanstack/react-router'

/**
 * A page's BackLink does what the browser's Back does (Joe, 14 November):
 * it names the page Back would return to and goes there. Each entry LifeOS
 * pushes onto the history remembers the title of the page it was pushed
 * from; one that replaces another inherits what that one remembered. An
 * entry with nothing remembered (a link from outside, a notification, the
 * first page opened) keeps the page's own BackLink.
 */
const STORE = 'lifeos.back'
let from: Record<string, string> = {}
try {
  from = JSON.parse(sessionStorage.getItem(STORE) ?? '{}') as Record<string, string>
} catch {
  // Not kept across a reload, then; Back still works.
}

/** The page's title as it shows: PageHeader's or ItemPage's heading. */
const pageTitle = () =>
  document.querySelector('[data-slot="page-title"]')?.textContent?.trim() ?? ''

const keyOf = (state: { __TSR_key?: string; key?: string } | undefined) =>
  state?.__TSR_key ?? state?.key

/** Notes, for each entry pushed, the title of the page it was pushed from. */
export function trackBack(router: AnyRouter) {
  router.subscribe('onBeforeNavigate', ({ fromLocation, toLocation }) => {
    if (!fromLocation) return
    const to = keyOf(toLocation.state)
    const was = keyOf(fromLocation.state)
    if (!to || !was || to === was || to in from) return
    const step = toLocation.state.__TSR_index - fromLocation.state.__TSR_index
    if (step === 1) from[to] = pageTitle()
    else if (step === 0 && was in from) from[to] = from[was]!
    else return
    try {
      sessionStorage.setItem(STORE, JSON.stringify(from))
    } catch {
      // As above.
    }
  })
}

/**
 * A page's back: to where the browser's Back goes, named as that page
 * was, else the page's own (`given`). Nothing when the page has no back.
 */
export function useBack(
  given: { label: string; onClick: () => void } | undefined,
): { label: string; onClick: () => void } | undefined {
  const router = useRouter()
  const key = useLocation({ select: (l) => keyOf(l.state) })
  if (!given) return undefined
  const label = key === undefined ? undefined : from[key]
  if (label === undefined) return given
  return { label: label || given.label, onClick: () => router.history.back() }
}
