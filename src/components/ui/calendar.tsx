import { lazy, Suspense, type ComponentProps } from 'react'
import type { Calendar as CalendarMonth } from './calendar-month'

const load = () => import('./calendar-month')
const Month = lazy(() => load().then((m) => ({ default: m.Calendar })))

// The Calendar's code is a tenth of what a page needs and is only seen in an
// open Popover: it is fetched once the page is idle, not before it shows.
if (typeof window !== 'undefined') {
  const fetchIt = () => void load().catch(() => undefined)
  if (window.requestIdleCallback) window.requestIdleCallback(fetchIt)
  else setTimeout(fetchIt, 2000)
}

/** Picking a do-on or due date, inside a Popover. Weeks start on Monday. */
function Calendar(props: ComponentProps<typeof CalendarMonth>) {
  return (
    <Suspense fallback={null}>
      <Month {...props} />
    </Suspense>
  )
}

export { Calendar }
