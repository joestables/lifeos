/// <reference lib="webworker" />
/**
 * LifeOS's service worker (ADR-0044): the app's files kept for offline use,
 * as before, photos once seen (ADR-0052), and notifications — showing a
 * push, opening its Item when tapped (REM-006), and Done and Snooze from its
 * buttons (REM-005), kept and sent later with no signal.
 */
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { notificationFor, type NotificationData } from './lib/notification'

declare let self: ServiceWorkerGlobalScope

// A new build takes over at once (registerType: autoUpdate).
void self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))
// Photos seen before show offline (RCP-016 1): kept by their week-long link.
registerRoute(
  ({ url }) => url.pathname.includes('/storage/v1/object/sign/photos/'),
  new CacheFirst({
    cacheName: 'photos',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 8 * 24 * 3600 }),
    ],
  }),
)

self.addEventListener('push', (event) => {
  const { title, options } = notificationFor(event.data?.text())
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options as NotificationOptions),
      // A good moment to send buttons pressed with no signal.
      flush(),
    ]),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = (event.notification.data ?? {}) as Partial<NotificationData>
  if ((event.action === 'done' || event.action === 'snooze') && data.delivery && data.token) {
    event.waitUntil(press({ delivery: data.delivery, token: data.token, action: event.action }))
    return
  }
  event.waitUntil(open(data.url ?? '/today'))
})

// LifeOS asks for anything kept to be sent when it opens.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string })?.type === 'flush') event.waitUntil(flush())
})

self.addEventListener('sync', (event) => {
  const e = event as ExtendableEvent & { tag: string }
  if (e.tag === 'notification-actions') e.waitUntil(flush())
})

/** Opens the Item in the window already open, or a new one (REM-006). */
async function open(url: string) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const client = windows[0]
  if (client) {
    // LifeOS routes it itself rather than reloading.
    client.postMessage({ type: 'navigate', url })
    return client.focus()
  }
  return self.clients.openWindow(url)
}

type Press = { delivery: number; token: string; action: string }

const ACTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notification-action`

/** Sends a button press; false when there is no signal (REM-005 1). */
async function send(press: Press): Promise<boolean> {
  try {
    const res = await fetch(ACTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(press),
    })
    // Refused (an old notification, a Task already deleted): nothing to retry.
    return res.ok || (res.status >= 400 && res.status < 500)
  } catch {
    return false
  }
}

async function press(p: Press) {
  if (await send(p)) return
  await keep(p)
  const reg = self.registration as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> }
  }
  await reg.sync?.register('notification-actions').catch(() => undefined)
}

// Presses kept with no signal, in IndexedDB, until they can be sent.
const DB = 'lifeos-sw'
const STORE = 'presses'

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function keep(p: Press) {
  const d = await db()
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(p)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function flush() {
  const d = await db()
  const kept = await new Promise<[IDBValidKey, Press][]>((resolve, reject) => {
    const out: [IDBValidKey, Press][] = []
    const req = d.transaction(STORE).objectStore(STORE).openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return resolve(out)
      out.push([cursor.key, cursor.value as Press])
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
  for (const [key, p] of kept) {
    if (!(await send(p))) return
    await new Promise<void>((resolve) => {
      const tx = d.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  }
}
