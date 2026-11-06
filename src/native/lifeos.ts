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
   * Ends this phone's FCM token, so nothing sent to it arrives any more
   * (signing out, or someone else signing in: ACC-003).
   */
  resetNotifications(): Promise<void>
}

export const LifeosNative = registerPlugin<LifeosNative>('LifeosNative')
