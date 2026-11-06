import { registerPlugin } from '@capacitor/core'

/** LifeOS's own native plugin (ADR-0061; `LifeosNativePlugin.kt`). */
interface LifeosNative {
  /** Keeps the screen on, or lets it sleep (AND-003 5). */
  keepAwake(options: { on: boolean }): Promise<void>
  /**
   * Whether Android lets LifeOS notify, and this phone's FCM token when it
   * does (REM-001 4, ADR-0063).
   */
  notificationsState(): Promise<{ state: 'granted' | 'denied' | 'prompt'; token?: string }>
  /**
   * Asks Android to let LifeOS notify, keeps where Done and Snooze are sent,
   * and answers with this phone's FCM token; rejects with "denied".
   */
  enableNotifications(options: { actionUrl: string; apikey: string }): Promise<{ token: string }>
  /**
   * Keeps which device this phone is and its secret, and sets its Reminders
   * from `remindersUrl` from now on (REM-010, ADR-0063).
   */
  setDevice(options: { device: string; secret: string; remindersUrl: string }): Promise<void>
  /** Whether this phone knows which device it is, to set its own Reminders. */
  deviceState(): Promise<{ hasDevice: boolean }>
  /** Fetches and sets the phone's Reminders again (the app opening). */
  syncReminders(): Promise<void>
  /**
   * Ends this phone's FCM token and forgets its device and Reminders, so
   * nothing more arrives (signing out, or someone else signing in: ACC-003).
   */
  resetNotifications(): Promise<void>
}

export const LifeosNative = registerPlugin<LifeosNative>('LifeosNative')
