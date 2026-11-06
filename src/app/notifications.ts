import { useCallback, useEffect, useState } from 'react'
import { fetchVapidPublicKey, registerDevice } from '@/data'
import { isAndroidApp } from '@/native/platform'

/**
 * Whether this device can show LifeOS's notifications (REM-001): an iPhone
 * can only from the Home Screen app, as iOS allows them nowhere else.
 */
export type PushSupport = 'ok' | 'ios-browser' | 'unsupported'

export function pushSupport(): PushSupport {
  // The Android app notifies by FCM, not the web view's Web Push (ADR-0063).
  if (isAndroidApp()) return 'ok'
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const installed =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (ios && !installed) return 'ios-browser'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'unsupported'
  return 'ok'
}

/** A name for this device in Settings: "Android · Chrome", "Mac · Safari". */
export function deviceLabel(ua = navigator.userAgent): string {
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iPhone'
      : /Mac OS X|Macintosh/.test(ua)
        ? 'Mac'
        : /Windows/.test(ua)
          ? 'Windows'
          : /CrOS/.test(ua)
            ? 'Chromebook'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'This device'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : ''
  return browser ? `${os} · ${browser}` : os
}

const fromBase64url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))

/**
 * Turns notifications on for this device: asks the browser, subscribes with
 * the sender's key and registers the subscription as mine (REM-001 2).
 */
export async function turnOnNotifications(): Promise<'on' | 'denied' | 'failed'> {
  if (isAndroidApp()) return (await import('@/native/notifications')).turnOnAndroidNotifications()
  if ((await Notification.requestPermission()) !== 'granted') return 'denied'
  try {
    const key = await fetchVapidPublicKey()
    if (!key) return 'failed'
    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: fromBase64url(key),
      }))
    const json = sub.toJSON()
    registerDevice({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      label: deviceLabel(),
    })
    return 'on'
  } catch {
    return 'failed'
  }
}

/** This device's push subscription endpoint, if it has one: which of my devices it is. */
export function useThisDevice(): { endpoint: string | null; refresh: () => void } {
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const refresh = useCallback(() => {
    if (isAndroidApp()) {
      void import('@/native/notifications')
        .then(({ androidToken }) => androidToken())
        .then(setEndpoint)
      return
    }
    if (pushSupport() !== 'ok') return
    void navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription()
      setEndpoint(sub?.endpoint ?? null)
    })
  }, [])
  useEffect(refresh, [refresh])
  return { endpoint, refresh }
}

/**
 * Listens to the service worker: a tapped notification opens its Item in
 * this window (REM-006); and asks it to send Done and Snooze pressed with
 * no signal (REM-005 1).
 */
export function listenToServiceWorker(navigate: (url: string) => void) {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; url?: string }
    if (data?.type === 'navigate' && data.url?.startsWith('/')) navigate(data.url)
  })
  void navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: 'flush' }))
}
