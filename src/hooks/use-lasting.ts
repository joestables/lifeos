import { createContext, useContext, useEffect, useState } from 'react'

/** How long a change may take to send before it is said to be waiting. */
export const SYNC_GRACE_MS = 3000

/** The wait before a change is said to be waiting: 0 on the design pages, which show every state. */
export const SyncGrace = createContext(SYNC_GRACE_MS)

/**
 * Whether `on` has stayed true for the SyncGrace: a change waiting to send
 * is said only once it has waited that long, so one that reaches the server
 * at once never flashes "Not sent yet" (Joe, 14 November;
 * patterns.md#states).
 */
export function useLasting(on: boolean): boolean {
  const ms = useContext(SyncGrace)
  // Set once `on` has waited `ms`; cleared when it turns false.
  const [lasted, setLasted] = useState(false)
  useEffect(() => {
    if (!on || ms === 0) return
    const id = setTimeout(() => setLasted(true), ms)
    return () => {
      clearTimeout(id)
      setLasted(false)
    }
  }, [on, ms])
  return on && (lasted || ms === 0)
}
