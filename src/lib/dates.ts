const DAY = 24 * 60 * 60 * 1000

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** "Fri 9 Oct" (patterns.md#copy). */
export function shortDate(d: Date): string {
  return `${weekday.format(d)} ${dayMonth.format(d)}`
}

/**
 * When something happened, as Recently deleted says it: "Just now",
 * "10 min ago", "Today 14:05", "Yesterday", or "Thu 8 Oct".
 */
export function whenAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / DAY)
  if (days === 0) return `Today ${time.format(then)}`
  if (days === 1) return 'Yesterday'
  return shortDate(then)
}
