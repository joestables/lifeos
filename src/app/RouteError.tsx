import type { ErrorComponentProps } from '@tanstack/react-router'
import { useEffect, useSyncExternalStore } from 'react'
import { PageHeader } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { reportEvent } from '@/data'
import { reloadForNewCode, reloadingForNewCode, subscribeReloading } from './reload'

/** A page's code from before a deploy, gone from the server. */
const STALE = /Failed to fetch dynamically imported module|Importing a module script failed/

/**
 * A screen that crashes (patterns.md#states): recorded, and one way out. A
 * page whose code went with a new deploy reloads instead, once; while that
 * reload is on its way nothing is shown or recorded (the page opened then
 * has no code, which the router reports as an error of its own).
 */
export function RouteError({ error }: ErrorComponentProps) {
  const reloading = useSyncExternalStore(subscribeReloading, reloadingForNewCode)
  useEffect(() => {
    if (reloading) return
    const e = error instanceof Error ? error : new Error(String(error))
    if (STALE.test(e.message) && reloadForNewCode()) return
    void reportEvent('crash', e.message, { name: e.name })
  }, [error, reloading])
  if (reloading) return null
  return (
    <>
      <PageHeader title="Something went wrong" />
      <div className="px-5 sm:px-9">
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </>
  )
}
