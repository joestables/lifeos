import { useEffect, useState, useSyncExternalStore } from 'react'
import { isAndroidApp } from '@/native/platform'

/** A Cooking timer (RCP-011 3, ADR-0056), on this device. */
export interface CookTimer {
  /** `${variation}:${step}` */
  key: string
  recipe: string
  title: string
  label: string
  seconds: number
  /** When it ends while running; null while paused or done. */
  endsAt: number | null
  /** Seconds left while paused. */
  left: number
  done: boolean
}

const TIMERS = 'lifeos.cooking.timers'
const COOKING = 'lifeos.cooking'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Kept for this visit only.
  }
}

let timers: CookTimer[] = load(TIMERS, [])
const listeners = new Set<() => void>()

function set(next: CookTimer[]) {
  timers = next
  save(TIMERS, timers)
  for (const l of listeners) l()
  if (isAndroidApp()) onPhone(timers)
}

/**
 * In the Android app, the running timers' ends are set on the phone too,
 * to the second, so one ends on time with the app closed (REM-010 5,
 * ADR-0063).
 */
function onPhone(list: readonly CookTimer[]) {
  const running = list
    .filter((t) => !t.done && t.endsAt !== null)
    .map((t) => ({
      key: t.key,
      at: t.endsAt!,
      title: `${t.label} is done`,
      body: t.title,
      url: `/recipes/${t.recipe}?variation=${t.key.split(':')[0]}&cook=true`,
    }))
  void import('@/native/lifeos').then(({ LifeosNative }) =>
    LifeosNative.setTimers({ timers: running }).catch(() => undefined),
  )
}

/** Changes one timer. */
export const changeTimer = (key: string, f: (t: CookTimer) => CookTimer) =>
  set(timers.map((t) => (t.key === key ? f(t) : t)))

export const cookTimers = {
  start(t: Omit<CookTimer, 'endsAt' | 'left' | 'done'>) {
    set([
      ...timers.filter((x) => x.key !== t.key),
      { ...t, endsAt: Date.now() + t.seconds * 1000, left: t.seconds, done: false },
    ])
  },
  pause(key: string) {
    changeTimer(key, (t) =>
      t.endsAt === null
        ? t
        : { ...t, endsAt: null, left: Math.max(0, (t.endsAt - Date.now()) / 1000) },
    )
  },
  resume(key: string) {
    changeTimer(key, (t) => ({ ...t, endsAt: Date.now() + t.left * 1000 }))
  },
  stop(key: string) {
    set(timers.filter((t) => t.key !== key))
  },
  /** Every timer of a Recipe, when its cooking ends. */
  clear(recipe: string) {
    set(timers.filter((t) => t.recipe !== recipe))
  },
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Seconds left on a timer now. */
export const secondsLeft = (t: CookTimer, now: number) =>
  t.done ? 0 : t.endsAt === null ? t.left : Math.max(0, (t.endsAt - now) / 1000)

/** The timers, and the time, every second while one runs. */
export function useCookTimers(): { timers: CookTimer[]; now: number } {
  const list = useSyncExternalStore(subscribe, () => timers)
  const [now, setNow] = useState(() => Date.now())
  const running = list.some((t) => t.endsAt !== null && !t.done)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])
  return { timers: list, now }
}

/** Where I am in a cook (RCP-011 5): its servings and step, kept on this device. */
export interface Cooking {
  variation: string
  servings: number | null
  current: string | null
}

/** Each cook in progress, by Variation: starting one leaves another as it was. */
const cooks = () => {
  const kept = load<Record<string, Cooking> | Cooking | null>(COOKING, null)
  // Kept before there could be more than one.
  if (kept && 'variation' in kept && typeof kept.variation === 'string')
    return { [kept.variation]: kept as Cooking }
  return (kept ?? {}) as Record<string, Cooking>
}

export const cooking = {
  get(variation: string): Cooking | null {
    return cooks()[variation] ?? null
  },
  set(c: Cooking) {
    save(COOKING, { ...cooks(), [c.variation]: c })
  },
  end(variation: string) {
    const rest = cooks()
    delete rest[variation]
    save(COOKING, rest)
  },
}
