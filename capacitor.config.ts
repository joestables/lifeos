import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The Android app (ADR-0061): it loads the live site, so every deploy
 * reaches the phone; `native-shell/` holds only the page shown when the very
 * first launch has no signal.
 */
const config: CapacitorConfig = {
  appId: 'uk.joestables.lifeos',
  appName: 'LifeOS',
  webDir: 'native-shell',
  server: {
    url: 'https://joestables.uk',
    errorPath: 'no-connection.html',
  },
  android: {
    // Only LifeOS's own site is loaded in the app; anything else opens in the browser.
    allowMixedContent: false,
  },
}

export default config
