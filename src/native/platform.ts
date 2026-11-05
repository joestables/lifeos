import { Capacitor } from '@capacitor/core'

/**
 * Whether LifeOS is running inside the Android app (ADR-0061). The one
 * check: everything only the app does is reached through `src/native/`,
 * behind it, so the web never runs it (AND-005).
 */
export function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}
