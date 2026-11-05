/**
 * Whose this device's kept data is (ACC-003): the cache, the write queue and
 * what pages remember are one person's. A session can end without signing
 * out here — signed out on another device, or expired — so when someone
 * else signs in next, the last person's things are cleared first.
 */

const KEY = 'lifeos-device-owner'

/** Who signed in here last, or null if no one has since it was cleared. */
export function deviceOwner(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setDeviceOwner(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Storage refused (private browsing): nothing to keep apart.
  }
}

/**
 * Forgets what pages remembered: localStorage but Supabase's own session
 * (its keys start "sb-"), and sessionStorage. The owner goes with it.
 */
export function forgetStorage(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('sb-')) localStorage.removeItem(key)
    }
    sessionStorage.clear()
  } catch {
    // Nothing kept, or storage refused.
  }
}

/** Photos kept for offline (the service worker's cache). */
export async function forgetPhotos(): Promise<void> {
  try {
    await globalThis.caches?.delete('photos')
  } catch {
    // No cache to clear.
  }
}
