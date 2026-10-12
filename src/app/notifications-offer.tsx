import { BellIcon } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { queue, useDevices } from '@/data'
import { pushSupport, turnOnNotifications } from './notifications'

const NOT_NOW = 'lifeos.notifications-offer'

/** "Not now", remembered on this device; private windows may not keep it. */
function dismissed(): boolean {
  try {
    return localStorage.getItem(NOT_NOW) === 'no'
  } catch {
    return false
  }
}

/**
 * Inbox offers to turn notifications on while none of my devices has them
 * (REM-001 1); on an iPhone's browser it says to add LifeOS to the Home
 * Screen first.
 */
export function NotificationsOffer() {
  const { devices, isLoading } = useDevices(queue)
  const [hidden, setHidden] = useState(dismissed)
  const support = pushSupport()
  const anyOn = devices.some((d) => d.enabled && d.gone_at === null)
  if (isLoading || anyOn || hidden || support === 'unsupported') return null

  const notNow = () => {
    try {
      localStorage.setItem(NOT_NOW, 'no')
    } catch {
      // Hidden for now, anyway.
    }
    setHidden(true)
  }
  const turnOn = async () => {
    const result = await turnOnNotifications()
    if (result === 'denied') toast("Notifications are blocked in this browser's settings")
    if (result === 'failed') toast("Couldn't turn notifications on. Try again")
  }

  return (
    <Alert>
      <BellIcon />
      <AlertTitle>Notifications are off</AlertTitle>
      <AlertDescription>
        {support === 'ios-browser'
          ? 'Add LifeOS to your Home Screen first'
          : 'Reminders can’t reach you'}
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="sm" onClick={notNow}>
          Not now
        </Button>
        {support === 'ok' && (
          <Button variant="outline" size="sm" onClick={() => void turnOn()}>
            Turn on
          </Button>
        )}
      </AlertAction>
    </Alert>
  )
}
