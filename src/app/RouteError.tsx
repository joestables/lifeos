import type { ErrorComponentProps } from '@tanstack/react-router'
import { useEffect } from 'react'
import { PageHeader } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { reportEvent } from '@/data'

/** A screen that crashes (patterns.md#states): recorded, and one way out. */
export function RouteError({ error }: ErrorComponentProps) {
  useEffect(() => {
    const e = error instanceof Error ? error : new Error(String(error))
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
