import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@/components/lifeos'
import { LabelsCard } from '@/app/labels'

/** Labels on a page of their own: on a phone, Settings links here (ITM-005). */
export const Route = createFileRoute('/_app/settings/labels')({
  component: Labels,
})

function Labels() {
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  return (
    <>
      <PageHeader
        title="Labels"
        back={{ label: 'Settings', onClick: () => void navigate({ to: '/settings' }) }}
        action={{ label: 'New label', onClick: () => setAdding(true) }}
      />
      <div className="max-w-3xl px-5 pb-8 sm:px-9">
        <LabelsCard titled={false} adding={adding} onAddingChange={setAdding} />
      </div>
    </>
  )
}
