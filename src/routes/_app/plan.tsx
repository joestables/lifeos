import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageAction, PageHeader } from '@/components/lifeos'
import { NewEventDialog } from '@/app/event-details'
import { isoDayOf } from '@/lib/dates'

/**
 * Plan (views/plan.md). Until its week and day are built (plan step 7), it
 * offers "New event" (EVT-001), on a phone as the Fab.
 */
export const Route = createFileRoute('/_app/plan')({
  component: Plan,
})

function Plan() {
  const [adding, setAdding] = useState(false)
  return (
    <>
      <PageHeader title="Plan" action={{ label: 'New event', onClick: () => setAdding(true) }} />
      <div className="flex px-5 sm:px-9">
        <PageAction label="New event" onClick={() => setAdding(true)} />
      </div>
      {adding && <NewEventDialog day={isoDayOf(new Date())} onClose={() => setAdding(false)} />}
    </>
  )
}
