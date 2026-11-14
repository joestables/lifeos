import { CloudAlertIcon, CloudIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLasting } from '@/hooks/use-lasting'

/**
 * In the drawer footer, only while changes have waited to send a while
 * (3s, so one sent at once never shows) or weren't saved; changes not saved
 * can be cleared once seen.
 */
export function SyncStatus({
  pending,
  failed,
  onClear,
}: {
  pending: number
  failed: number
  onClear?: () => void
}) {
  const waiting = useLasting(pending > 0)
  if (failed === 0 && !waiting) return null
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
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs"
              onClick={onClear}
            >
              Clear
            </Button>
          )}
        </>
      ) : (
        <>
          <CloudIcon />
          {pending === 1 ? '1 change waiting to send' : `${pending} changes waiting to send`}
        </>
      )}
    </div>
  )
}
