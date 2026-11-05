import { useSyncExternalStore } from 'react'

/**
 * The Android app's one check (ADR-0061): Capacitor's bridge is injected
 * into the page only inside the app, so the web reads `undefined` here and
 * never loads anything from `src/native/` (AND-005). Read from the page's
 * global rather than imported, so the web's bundle carries no Capacitor.
 */
export function isAndroidApp(): boolean {
  const capacitor = (
    globalThis as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }
  ).Capacitor
  return capacitor?.isNativePlatform?.() === true && capacitor.getPlatform?.() === 'android'
}

/** Whether version `a` ("1.0.3") is newer than `b`. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return false
}

/** The app's version, and a newer one when it is ready (AND-001 2). */
export interface AppVersion {
  version: string
  ready?: string
  install: () => void
}

let current: AppVersion | null = null
const listeners = new Set<() => void>()

/** Set by the app's own start (`./app.ts`); null on the web. */
export function setAppVersion(v: AppVersion) {
  current = v
  for (const l of listeners) l()
}

/** The Android app's version for Settings; null on the web. */
export function useAppVersion(): AppVersion | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => null,
  )
}
