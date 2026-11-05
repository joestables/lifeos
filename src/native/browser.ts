import { Browser } from '@capacitor/browser'

/** Where Google sends the Android app back to (ADR-0062). */
export const APP_RETURN = {
  signIn: 'uk.joestables.lifeos://auth/callback',
  settings: 'uk.joestables.lifeos://settings',
} as const

/** Opens an address in the phone's browser, over the app (a Custom Tab). */
export async function openInBrowser(url: string): Promise<void> {
  await Browser.open({ url })
}
