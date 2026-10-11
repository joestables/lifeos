import { createFileRoute } from '@tanstack/react-router'
import { Fab, PageHeader } from '@/components/lifeos'
import { useOpenCapture } from '@/app/open-capture'

/** Built in its own stage, from its spec (ADR-0026); capture is its main action on a phone. */
export const Route = createFileRoute('/_app/inbox')({
  component: Inbox,
})

function Inbox() {
  const openCapture = useOpenCapture()
  return (
    <>
      <PageHeader title="Inbox" />
      <Fab label="Capture" onClick={openCapture} />
    </>
  )
}
