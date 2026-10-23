import type { ErrorComponentProps } from '@tanstack/react-router'
import { useEffect } from 'react'
import { PageHeader } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { reportEvent } from '@/data'
import { reloadForNewCode } from './reload'

/** A page's code from before a deploy, gone from the server. */
const STALE = /Failed to fetch dynamically imported module|Importing a module script failed/

/**
 * A screen that crashes (patterns.md#states): recorded, and one way out. A
 * page whose code went with a new deploy reloads instead, once.
 */
export function RouteError({ error }: ErrorComponentProps) {
  useEffect(() => {
    const e = error instanceof Error ? error : new Error(String(error))
    if (STALE.test(e.message) && reloadForNewCode()) return
    void reportEvent('crash', e.message, { name: e.name })
  }, [error])
  return (
    <>
      <PageHeader title="Something went wrong" />
      <div className="px-5 sm:px-9">
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </>
  )
}
