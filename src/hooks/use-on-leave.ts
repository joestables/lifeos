import { useEffect, useRef } from 'react'

/**
 * Runs `keep` when the field goes without being left in the usual way: its
 * page swiped back or navigated from, or the app hidden or closed
 * (RCP-006 4). `keep` must do nothing when there is nothing new.
 */
export function useOnLeave(keep: () => void) {
  const latest = useRef(keep)
  useEffect(() => {
    latest.current = keep
  })
  useEffect(() => {
    const leave = () => latest.current()
    window.addEventListener('pagehide', leave)
    return () => {
      window.removeEventListener('pagehide', leave)
      leave()
    }
  }, [])
}
