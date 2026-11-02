import { useEffect, useState } from 'react'

/**
 * The time now, kept current: every minute, and at once when the app comes
 * back into view, so a page left open overnight (an installed app) shows
 * this morning's readiness, not last night's.
 */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, everyMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [everyMs])
  return now
}
