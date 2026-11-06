import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { toast } from '@/components/ui/sonner'
import { finishSignIn } from '@/data'
import { APP_RETURN } from './browser'
import { isNewer, setAppVersion } from './platform'

/** Where a new APK is downloaded (integration-setup.md#android-app-stage-7). */
const RELEASES = 'https://github.com/joestables/lifeos/releases/latest'
const SITE = 'https://joestables.uk'
const TOLD = 'lifeos.android.told'

/** A popup, Sheet or menu open on the page (Base UI marks them `data-open`). */
const openPopup = () =>
  document.querySelector(
    '[data-open][role="dialog"], [data-open][role="alertdialog"], [data-open][role="menu"], [data-open][role="listbox"]',
  )

/**
 * The Android app's start (ADR-0061), loaded only inside it: Back (AND-003
 * 2), LifeOS links opened in the app (AND-003 3), coming back from Google
 * (AND-002), and a new APK said to be ready (AND-001 2).
 */
export function startAndroidApp(navigate: (href: string) => void) {
  // Back closes what's open first, then goes back, then leaves the app.
  void App.addListener('backButton', ({ canGoBack }) => {
    const popup = openPopup()
    if (popup) {
      popup.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    } else if (canGoBack) {
      window.history.back()
    } else {
      void App.exitApp()
    }
  })

  void App.addListener('appUrlOpen', ({ url }) => {
    // Back from Google's sign-in in the phone's browser (AND-002, ADR-0062).
    if (url.startsWith(APP_RETURN.signIn)) {
      void Browser.close().catch(() => {})
      const code = new URL(url).searchParams.get('code')
      if (!code) return
      void finishSignIn(code)
        .then(() => navigate('/inbox'))
        .catch(() => toast.error("Couldn't sign in. Try again"))
      return
    }
    // Back from connecting Google Calendar: Settings finishes it, as on the web.
    if (url.startsWith(APP_RETURN.settings)) {
      void Browser.close().catch(() => {})
      navigate(`/settings${new URL(url).search}`)
      return
    }
    // A joestables.uk link from another app opens on its page here.
    if (!url.startsWith(SITE)) return
    const { pathname, search, hash } = new URL(url)
    navigate(`${pathname}${search}${hash}`)
  })

  void checkVersion()
  void import('./notifications').then(({ keepTokenCurrent }) => keepTokenCurrent())
}

/** The site says which native version it expects (`/android.json`). */
async function checkVersion() {
  const install = () => void Browser.open({ url: RELEASES })
  const { version } = await App.getInfo()
  setAppVersion({ version, install })
  let expected: string | undefined
  try {
    const res = await fetch('/android.json', { cache: 'no-store' })
    expected = ((await res.json()) as { version?: string }).version
  } catch {
    return
  }
  if (!expected || !isNewer(expected, version)) return
  setAppVersion({ version, ready: expected, install })
  try {
    if (localStorage.getItem(TOLD) === expected) return
    localStorage.setItem(TOLD, expected)
  } catch {
    // Told every time when the device can't remember.
  }
  toast('A new version of the app is ready', {
    action: { label: 'Install', onClick: install },
    duration: Infinity,
  })
}
