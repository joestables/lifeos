import { CardRow } from '@/components/lifeos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAppVersion } from '@/native/platform'

/**
 * Settings → Android app (AND-001 2, patterns.md#the-android-app): its
 * version and, when a newer APK is ready, Install. Only inside the app.
 */
export function AndroidAppCard() {
  const app = useAppVersion()
  if (!app) return null
  return (
    <Card className="gap-1.5">
      <h2 className="mb-2 flex h-8 items-center text-h2">Android app</h2>
      <CardRow label="Version" value={app.version} />
      {app.ready && (
        <CardRow label="Update ready" value={app.ready}>
          <Button variant="outline" size="sm" onClick={app.install}>
            Install
          </Button>
        </CardRow>
      )}
    </Card>
  )
}
