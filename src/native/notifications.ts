import { registerFcmDevice } from '@/data'
import { LifeosNative } from './lifeos'

/** Where Done and Snooze are sent from a notification, as the service worker does. */
const ACTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notification-action`

/** This phone's FCM token, when Android lets LifeOS notify (REM-001 4). */
export async function androidToken(): Promise<string | null> {
  const { state, token } = await LifeosNative.notificationsState()
  return state === 'granted' ? (token ?? null) : null
}

/** Whether Android has refused LifeOS's notifications. */
export async function androidDenied(): Promise<boolean> {
  return (await LifeosNative.notificationsState()).state === 'denied'
}

/**
 * Turns notifications on in the Android app (REM-001 4, ADR-0063): asks
 * Android, then registers the phone's FCM token as my "Android app" device.
 */
export async function turnOnAndroidNotifications(): Promise<'on' | 'denied' | 'failed'> {
  try {
    const { token } = await LifeosNative.enableNotifications({
      actionUrl: ACTION_URL,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
    })
    registerFcmDevice(token, 'Android app')
    remember(token)
    return 'on'
  } catch (e) {
    return String((e as Error).message).includes('denied') ? 'denied' : 'failed'
  }
}

/** The token last registered here, so a new one FCM gives is registered too. */
const REGISTERED = 'lifeos.android.token'

function remember(token: string) {
  try {
    localStorage.setItem(REGISTERED, token)
  } catch {
    // Without storage, a new token waits for Turn on in Settings.
  }
}

/**
 * When the app opens: FCM may have given this phone a new token since
 * notifications were turned on here, and it's registered as the "Android
 * app" in the old one's place (ADR-0063).
 */
export async function keepTokenCurrent(): Promise<void> {
  const registered = (() => {
    try {
      return localStorage.getItem(REGISTERED)
    } catch {
      return null
    }
  })()
  if (!registered) return
  const token = await androidToken()
  if (!token || token === registered) return
  registerFcmDevice(token, 'Android app')
  remember(token)
}
