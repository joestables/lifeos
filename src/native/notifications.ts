import { registerAndroidDevice } from '@/data'
import { LifeosNative } from './lifeos'

const FUNCTIONS = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

/** This phone's FCM token, when Android lets LifeOS notify (REM-001 4). */
export async function androidToken(): Promise<string | null> {
  const { state, token } = await LifeosNative.notificationsState()
  return state === 'granted' ? (token ?? null) : null
}

/** Registers the token as my "Android app", and the phone sets its own Reminders. */
async function becomeDevice(token: string): Promise<void> {
  const { id, secret } = await registerAndroidDevice(token, 'Android app')
  await LifeosNative.setDevice({
    device: id,
    secret,
    remindersUrl: `${FUNCTIONS}/device-reminders`,
  })
  remember(token)
}

/**
 * Turns notifications on in the Android app (REM-001 4, ADR-0063): asks
 * Android, registers the phone as my "Android app" device, and it sets its
 * own Reminders, on time (REM-010).
 */
export async function turnOnAndroidNotifications(): Promise<'on' | 'denied' | 'failed'> {
  try {
    const { token } = await LifeosNative.enableNotifications({
      actionUrl: `${FUNCTIONS}/notification-action`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
    })
    await becomeDevice(token)
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
 * When the app opens, if notifications were turned on here: a token FCM
 * changed since is registered in the old one's place, a phone that doesn't
 * yet know its device (one turned on before 0.1.3) learns it, and the
 * phone's Reminders are fetched again (ADR-0063).
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
  if (!token) return
  const { hasDevice } = await LifeosNative.deviceState()
  if (token !== registered || !hasDevice) await becomeDevice(token)
  else await LifeosNative.syncReminders()
}
