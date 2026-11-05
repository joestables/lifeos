import { useEffect } from 'react'
import { isAndroidApp } from '@/native/platform'

/**
 * Keeps the screen awake while mounted (RCP-011 1, ADR-0056), asking again
 * when the page is shown; where the browser can't, the screen sleeps as
 * usual. Inside the Android app without the Screen Wake Lock API, LifeOS's
 * own plugin keeps it on (AND-003 5).
 */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let gone = false
    if (!('wakeLock' in navigator) && isAndroidApp()) {
      const keep = (on: boolean) =>
        void import('@/native/lifeos').then(({ LifeosNative }) => LifeosNative.keepAwake({ on }))
      keep(true)
      return () => keep(false)
    }
    const ask = async () => {
      if (gone || document.hidden || !('wakeLock' in navigator)) return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (gone) void lock.release()
      } catch {
        // Refused (low battery, no permission): the screen may sleep.
      }
    }
    const onShow = () => void ask()
    void ask()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      gone = true
      document.removeEventListener('visibilitychange', onShow)
      void lock?.release()
    }
  }, [])
}
