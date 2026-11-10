/** What core_private.notification_payload sends in a push (ADR-0044). */
export interface Payload {
  title?: string
  body?: string
  url?: string
  tag?: string
  actions?: { action: string; title: string }[]
  delivery?: number
  token?: string
}

/** What the service worker keeps on a notification, for when it is tapped. */
export interface NotificationData {
  url: string
  delivery?: number
  token?: string
}

/**
 * The notification a push becomes (REM-004 1, REM-005, REM-006): its
 * title, its time, its tag (so the same one sent twice replaces itself),
 * the Item's link, and at most two buttons, as Android and computers show
 * (iOS shows none). A push that can't be read still shows something:
 * silence would read as broken.
 */
export function notificationFor(raw: string | null | undefined): {
  title: string
  options: {
    body: string
    icon: string
    tag?: string
    data: NotificationData
    actions: { action: string; title: string }[]
  }
} {
  let p: Payload
  try {
    p = raw ? (JSON.parse(raw) as Payload) : {}
  } catch {
    p = {}
  }
  return {
    title: p.title || 'LifeOS',
    options: {
      body: p.body ?? '',
      icon: '/icon-192.png',
      tag: p.tag,
      data: {
        url: p.url?.startsWith('/') ? p.url : '/today',
        delivery: p.delivery,
        token: p.token,
      },
      actions: (p.actions ?? []).slice(0, 2),
    },
  }
}
