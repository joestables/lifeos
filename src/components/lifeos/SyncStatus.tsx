import { CheckIcon, CloudAlertIcon, CloudIcon } from 'lucide-react'

/** In the drawer footer: "All changes saved", or what's waiting to send. */
export function SyncStatus({ pending, failed }: { pending: number; failed: number }) {
  return (
    <div
      role="status"
      className="flex items-center gap-1.5 px-2.5 text-xs text-muted-foreground [&_svg]:size-3.5"
    >
      {failed > 0 ? (
        <>
          <CloudAlertIcon className="text-destructive" />
          <span className="text-destructive">
            {failed === 1 ? '1 change not saved' : `${failed} changes not saved`}
          </span>
        </>
      ) : pending > 0 ? (
        <>
          <CloudIcon />
          {pending === 1 ? '1 change waiting to send' : `${pending} changes waiting to send`}
        </>
      ) : (
        <>
          <CheckIcon className="text-success" />
          All changes saved
        </>
      )}
    </div>
  )
}
